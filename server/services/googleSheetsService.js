// server/services/googleSheetsService.js
/**
 * Google Sheets Integration Service
 * 
 * Provides optional export of ticket submissions to Google Sheets.
 * Requires a Google Cloud service account with Sheets API access.
 * 
 * Setup:
 * 1. Create a Google Cloud Project
 * 2. Enable Google Sheets API
 * 3. Create a Service Account and download JSON key
 * 4. Add service account email to your Google Sheet as editor
 * 5. Set environment variables:
 *    - GOOGLE_SERVICE_ACCOUNT_EMAIL
 *    - GOOGLE_PRIVATE_KEY (with \n for newlines)
 */

// Note: Uncomment and use when google-spreadsheet is installed
// import { GoogleSpreadsheet } from 'google-spreadsheet';
// import { JWT } from 'google-auth-library';

/**
 * Check if Google Sheets integration is configured
 */
export function isGoogleSheetsConfigured() {
    return !!(
        process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL &&
        process.env.GOOGLE_PRIVATE_KEY
    );
}

/**
 * Get authenticated Google Sheets client
 * @param {string} sheetId - Google Sheet ID
 * @returns {Promise<GoogleSpreadsheet|null>}
 */
export async function getSheetClient(sheetId) {
    if (!isGoogleSheetsConfigured()) {
        console.warn("[GoogleSheets] Not configured - missing credentials");
        return null;
    }

    try {
        // Uncomment when google-spreadsheet is installed:
        /*
        const serviceAccountAuth = new JWT({
          email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
          key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
          scopes: ['https://www.googleapis.com/auth/spreadsheets'],
        });
    
        const doc = new GoogleSpreadsheet(sheetId, serviceAccountAuth);
        await doc.loadInfo();
        return doc;
        */

        console.log(`[GoogleSheets] Would connect to sheet: ${sheetId}`);
        return null;
    } catch (error) {
        console.error("[GoogleSheets] Failed to connect:", error.message);
        return null;
    }
}

/**
 * Validate that service account has access to the sheet
 * @param {string} sheetId - Google Sheet ID
 * @returns {Promise<{success: boolean, title?: string, error?: string}>}
 */
export async function validateSheetAccess(sheetId) {
    if (!isGoogleSheetsConfigured()) {
        return {
            success: false,
            error: "Google Sheets not configured. Set GOOGLE_SERVICE_ACCOUNT_EMAIL and GOOGLE_PRIVATE_KEY in .env",
        };
    }

    try {
        const doc = await getSheetClient(sheetId);
        if (!doc) {
            return {
                success: false,
                error: "Failed to connect to Google Sheets",
            };
        }

        return {
            success: true,
            title: doc.title,
        };
    } catch (error) {
        return {
            success: false,
            error: `Access denied or sheet not found: ${error.message}`,
        };
    }
}

/**
 * Append a ticket submission to a Google Sheet
 * @param {string} sheetId - Google Sheet ID
 * @param {Object} submission - Ticket submission data
 * @param {Object} formSchema - Form schema for field order
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function appendSubmissionToSheet(sheetId, submission, formSchema) {
    if (!isGoogleSheetsConfigured()) {
        return {
            success: false,
            error: "Google Sheets not configured",
        };
    }

    try {
        const doc = await getSheetClient(sheetId);
        if (!doc) {
            return {
                success: false,
                error: "Failed to connect to sheet",
            };
        }

        // Uncomment when google-spreadsheet is installed:
        /*
        // Get first sheet or create one
        let sheet = doc.sheetsByIndex[0];
        if (!sheet) {
          sheet = await doc.addSheet({ title: 'Submissions' });
        }
    
        // Build header row from form schema
        const headers = [
          'Submission ID',
          'Date/Time',
          'Agent Extension',
          'Caller Number',
          'Call ID',
          'Status',
          ...formSchema.fields.map(f => f.label),
        ];
    
        // Check if headers exist, add them if not
        await sheet.loadHeaderRow();
        if (!sheet.headerValues || sheet.headerValues.length === 0) {
          await sheet.setHeaderRow(headers);
        }
    
        // Build row data
        const rowData = {
          'Submission ID': submission.id,
          'Date/Time': new Date(submission.createdAt).toISOString(),
          'Agent Extension': submission.agentExtension || '',
          'Caller Number': submission.callerNumber || '',
          'Call ID': submission.callId || '',
          'Status': submission.status,
        };
    
        // Add form field responses
        for (const field of formSchema.fields) {
          const value = submission.responses[field.id];
          rowData[field.label] = Array.isArray(value) ? value.join(', ') : (value || '');
        }
    
        await sheet.addRow(rowData);
        */

        console.log(`[GoogleSheets] Would append submission ${submission.id} to sheet ${sheetId}`);

        return {
            success: true,
        };
    } catch (error) {
        console.error("[GoogleSheets] Failed to append row:", error.message);
        return {
            success: false,
            error: error.message,
        };
    }
}

/**
 * Sync a batch of submissions to Google Sheets
 * Useful for retry/bulk sync operations
 * @param {string} sheetId - Google Sheet ID  
 * @param {Array} submissions - Array of submission objects
 * @param {Object} formSchema - Form schema
 * @returns {Promise<{success: boolean, synced: number, failed: number}>}
 */
export async function syncBatchToSheet(sheetId, submissions, formSchema) {
    let synced = 0;
    let failed = 0;

    for (const submission of submissions) {
        const result = await appendSubmissionToSheet(sheetId, submission, formSchema);
        if (result.success) {
            synced++;
        } else {
            failed++;
        }
    }

    return {
        success: failed === 0,
        synced,
        failed,
    };
}

export default {
    isGoogleSheetsConfigured,
    getSheetClient,
    validateSheetAccess,
    appendSubmissionToSheet,
    syncBatchToSheet,
};
