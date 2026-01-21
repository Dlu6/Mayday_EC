// server/services/googleFormsService.js
/**
 * Google Forms Integration Service
 * 
 * Provides:
 * 1. URL parsing to extract form ID
 * 2. Form structure fetching (fields and entry IDs)
 * 3. Submission posting to Google Forms
 * 
 * Note: Only works with public Google Forms (Anyone with the link can respond)
 */

import fetch from "node-fetch";

// Regex patterns for extracting form IDs from various URL formats
// IMPORTANT: Order matters! More specific patterns must come first
const FORM_ID_PATTERNS = [
    // Published form URL: /forms/d/e/RESPONSE_ID/viewform (must come first!)
    /\/forms\/d\/e\/([a-zA-Z0-9_-]+)/,
    // Standard form URL: /forms/d/FORM_ID/edit or /forms/d/FORM_ID/viewform
    /\/forms\/d\/([a-zA-Z0-9_-]+)/,
];

/**
 * Parse a Google Form URL to extract the form ID
 * @param {string} url - Google Form URL
 * @returns {{formId: string, isPublished: boolean} | null}
 */
export function parseGoogleFormUrl(url) {
    if (!url || typeof url !== "string") {
        return null;
    }

    // Check if it's a published form (/d/e/) or edit form (/d/)
    const isPublished = url.includes("/d/e/");

    for (const pattern of FORM_ID_PATTERNS) {
        const match = url.match(pattern);
        if (match && match[1]) {
            return {
                formId: match[1],
                isPublished,
            };
        }
    }

    return null;
}

/**
 * Build the form response URL for submitting data
 * @param {string} formId - Google Form ID
 * @param {boolean} isPublished - Whether it's a published form ID
 * @returns {string}
 */
export function buildFormResponseUrl(formId, isPublished = true) {
    if (isPublished) {
        return `https://docs.google.com/forms/d/e/${formId}/formResponse`;
    }
    return `https://docs.google.com/forms/d/${formId}/formResponse`;
}

/**
 * Build the viewform URL for fetching structure
 * @param {string} formId - Google Form ID
 * @param {boolean} isPublished - Whether it's a published form ID
 * @returns {string}
 */
export function buildViewFormUrl(formId, isPublished = true) {
    if (isPublished) {
        return `https://docs.google.com/forms/d/e/${formId}/viewform`;
    }
    return `https://docs.google.com/forms/d/${formId}/viewform`;
}

/**
 * Fetch and parse Google Form structure
 * Extracts field IDs, labels, types, and options
 * @param {string} formId - Google Form ID
 * @param {boolean} isPublished - Whether it's a published form ID
 * @returns {Promise<{success: boolean, fields?: Array, title?: string, error?: string}>}
 */
export async function fetchFormStructure(formId, isPublished = true) {
    try {
        const viewFormUrl = buildViewFormUrl(formId, isPublished);
        console.log(`[GoogleForms] Fetching form structure from: ${viewFormUrl}`);

        const response = await fetch(viewFormUrl, {
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            },
        });

        if (!response.ok) {
            return {
                success: false,
                error: `Failed to fetch form: HTTP ${response.status}`,
            };
        }

        const html = await response.text();

        // Extract FB_PUBLIC_LOAD_DATA_ which contains form structure
        const dataMatch = html.match(/FB_PUBLIC_LOAD_DATA_\s*=\s*(\[[\s\S]*?\]);/);
        if (!dataMatch) {
            return {
                success: false,
                error: "Could not parse form structure. Is the form public?",
            };
        }

        // Parse the JSON-like data
        let formData;
        try {
            // The data is JavaScript, need to evaluate carefully
            // Using JSON.parse after cleaning
            const jsonString = dataMatch[1]
                .replace(/\\x([0-9a-fA-F]{2})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
                .replace(/\\'/g, "'");
            formData = JSON.parse(jsonString);
        } catch (parseError) {
            console.error("[GoogleForms] Parse error:", parseError);
            return {
                success: false,
                error: "Failed to parse form data structure",
            };
        }

        // Extract form title
        const title = formData[1]?.[8] || formData[3] || "Untitled Form";

        // Extract fields from the structure
        // Form fields are typically in formData[1][1]
        const fieldsData = formData[1]?.[1] || [];
        const fields = [];

        for (const fieldArray of fieldsData) {
            if (!Array.isArray(fieldArray) || fieldArray.length < 2) continue;

            const fieldTitle = fieldArray[1];
            const fieldId = fieldArray[4]?.[0]?.[0]; // entry.XXXXXX ID
            const fieldType = fieldArray[3]; // Field type code
            const options = fieldArray[4]?.[0]?.[1] || []; // Options for dropdowns/checkboxes

            if (!fieldId) continue;

            // Map Google Form field types to our types
            const typeMap = {
                0: "text",           // Short answer
                1: "textarea",       // Paragraph
                2: "radio",          // Multiple choice
                3: "select",         // Dropdown
                4: "checkbox",       // Checkboxes
                5: "scale",          // Linear scale
                7: "checkbox",       // Checkbox grid (simplified)
                9: "date",           // Date
                10: "time",          // Time
            };

            const field = {
                id: `entry.${fieldId}`,
                entryId: fieldId,
                label: fieldTitle || `Field ${fieldId}`,
                type: typeMap[fieldType] || "text",
                googleType: fieldType,
                required: fieldArray[4]?.[0]?.[2] === 1,
                options: [],
                autoMap: null, // Will be set by auto-mapping
            };

            // Extract options for choice fields
            if ([2, 3, 4].includes(fieldType) && Array.isArray(options)) {
                field.options = options.map((opt) => opt[0]).filter(Boolean);
            }

            fields.push(field);
        }

        // Auto-map common call data fields
        autoMapCallDataFields(fields);

        console.log(`[GoogleForms] Parsed ${fields.length} fields from form: ${title}`);

        return {
            success: true,
            title,
            fields,
            formId,
            isPublished,
        };
    } catch (error) {
        console.error("[GoogleForms] Error fetching form:", error);
        return {
            success: false,
            error: error.message,
        };
    }
}

/**
 * Auto-map call data to form fields based on label keywords
 * @param {Array} fields - Array of field objects
 */
function autoMapCallDataFields(fields) {
    const mappings = [
        {
            key: "callerNumber",
            keywords: ["phone", "caller", "number", "contact", "mobile", "tel"],
            label: "Caller Number",
        },
        {
            key: "agentExtension",
            keywords: ["agent", "extension", "ext", "operator", "rep"],
            label: "Agent Extension",
        },
        {
            key: "callId",
            keywords: ["call id", "reference", "ticket", "case", "unique"],
            label: "Call ID",
        },
        {
            key: "timestamp",
            keywords: ["date", "time", "when", "timestamp"],
            label: "Timestamp",
        },
    ];

    for (const field of fields) {
        const labelLower = field.label.toLowerCase();

        for (const mapping of mappings) {
            if (mapping.keywords.some((kw) => labelLower.includes(kw))) {
                field.autoMap = mapping.key;
                field.autoMapLabel = mapping.label;
                break;
            }
        }
    }
}

/**
 * Submit data to a Google Form
 * @param {string} formId - Google Form ID
 * @param {boolean} isPublished - Whether it's a published form ID
 * @param {Object} entries - Key-value pairs of entry.XXXXX: value
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function submitToGoogleForm(formId, isPublished, entries) {
    try {
        const formResponseUrl = buildFormResponseUrl(formId, isPublished);
        console.log(`[GoogleForms] Submitting to: ${formResponseUrl}`);
        console.log(`[GoogleForms] Entries to submit:`, JSON.stringify(entries, null, 2));

        // Build form data
        const formData = new URLSearchParams();
        for (const [key, value] of Object.entries(entries)) {
            if (value !== undefined && value !== null && value !== "") {
                // Handle arrays (multi-select)
                if (Array.isArray(value)) {
                    for (const v of value) {
                        formData.append(key, v);
                    }
                } else {
                    formData.append(key, String(value));
                }
            }
        }

        console.log(`[GoogleForms] Form data string: ${formData.toString()}`);

        const response = await fetch(formResponseUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            },
            body: formData.toString(),
            redirect: "manual", // Google Forms redirects on success
        });

        console.log(`[GoogleForms] Response status: ${response.status}`);

        // Google Forms returns 302/303 redirect on successful submission
        if (response.status === 302 || response.status === 303 || response.status === 200) {
            console.log(`[GoogleForms] Submission successful (HTTP ${response.status})`);
            return { success: true };
        }

        // Log error response body for debugging
        const responseText = await response.text();
        console.error(`[GoogleForms] Error response body (first 500 chars): ${responseText.substring(0, 500)}`);

        return {
            success: false,
            error: `Unexpected response: HTTP ${response.status}`,
        };
    } catch (error) {
        console.error("[GoogleForms] Submission error:", error);
        return {
            success: false,
            error: error.message,
        };
    }
}

/**
 * Build submission entries from form values and field mapping
 * @param {Object} formValues - User-entered values keyed by internal field id (field_XXX)
 * @param {Array} googleFormFields - Google Form field definitions with entry.XXX ids
 * @param {Object} callData - Call context {callerNumber, agentExtension, callId, timestamp}
 * @param {Object} formSchema - Internal form schema with field_XXX ids
 * @returns {Object} Entries object for submission
 */
export function buildSubmissionEntries(formValues, googleFormFields, callData = {}, formSchema = null) {
    const entries = {};

    // Parse schema if it's a string
    let parsedSchema = formSchema;
    if (typeof formSchema === "string") {
        try {
            parsedSchema = JSON.parse(formSchema);
        } catch (e) {
            console.error("[GoogleForms] Failed to parse schema:", e.message);
            parsedSchema = null;
        }
    }

    console.log("[GoogleForms] formValues received:", JSON.stringify(formValues));
    console.log("[GoogleForms] parsedSchema fields:", parsedSchema?.fields?.length || 0);

    // Build a map of label -> value from formValues using formSchema
    const labelToValue = {};
    if (parsedSchema && parsedSchema.fields) {
        for (const schemaField of parsedSchema.fields) {
            const value = formValues[schemaField.id];
            console.log(`[GoogleForms] Checking field ${schemaField.id} (${schemaField.label}): ${value}`);
            if (value !== undefined && value !== null && value !== "") {
                // Normalize label for matching (lowercase, trimmed)
                const normalizedLabel = (schemaField.label || "").toLowerCase().trim();
                labelToValue[normalizedLabel] = value;
            }
        }
    }

    console.log("[GoogleForms] Label to value map:", labelToValue);

    // Parse googleFormFields if it's a string
    let parsedGoogleFields = googleFormFields;
    if (typeof googleFormFields === "string") {
        try {
            parsedGoogleFields = JSON.parse(googleFormFields);
        } catch (e) {
            console.error("[GoogleForms] Failed to parse googleFormFields:", e.message);
            parsedGoogleFields = [];
        }
    }

    console.log("[GoogleForms] Google form fields count:", (parsedGoogleFields || []).length);

    for (const field of (parsedGoogleFields || [])) {
        const entryKey = field.id; // e.g., entry.123456789
        const normalizedGoogleLabel = (field.label || "").toLowerCase().trim();
        let value = null;

        // For fields with options (radio, checkbox, select), always use user-entered values
        // Auto-mapping only makes sense for text fields
        const hasOptions = field.type === "radio" || field.type === "checkbox" || field.type === "select" ||
            field.googleType === 2 || field.googleType === 4; // googleType 2=radio, 4=checkbox

        // 1. Check if this field is auto-mapped to call data AND call data exists
        //    BUT only for text fields (not radio/checkbox/select)
        if (!hasOptions && field.autoMap && callData[field.autoMap]) {
            value = callData[field.autoMap];
            console.log(`[GoogleForms] Auto-mapped ${entryKey} (${field.label}) -> ${value}`);
        }

        // 2. If no auto-map value, try to match by label
        if (value === null && labelToValue[normalizedGoogleLabel] !== undefined) {
            value = labelToValue[normalizedGoogleLabel];
            console.log(`[GoogleForms] Mapped ${entryKey} (${field.label}) -> ${value}`);
        }

        // 3. Fallback: try direct field.id match (old behavior)
        if (value === null && formValues[field.id] !== undefined) {
            value = formValues[field.id];
            console.log(`[GoogleForms] Direct match ${entryKey} (${field.label}) -> ${value}`);
        }

        // Set the entry if we found a value
        if (value !== null && value !== undefined && value !== "") {
            entries[entryKey] = value;
        } else {
            console.log(`[GoogleForms] WARNING: No value for ${entryKey} (${field.label}) - required: ${field.required}`);
        }
    }

    console.log("[GoogleForms] Final entries:", entries);
    return entries;
}

export default {
    parseGoogleFormUrl,
    buildFormResponseUrl,
    buildViewFormUrl,
    fetchFormStructure,
    submitToGoogleForm,
    buildSubmissionEntries,
};
