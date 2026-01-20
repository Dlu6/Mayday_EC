// electron-softphone/src/components/TicketFormsView.jsx
import React, { useState, useEffect, useCallback } from "react";
import {
    Box,
    Typography,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Button,
    Card,
    CardContent,
    Divider,
    Alert,
    Collapse,
    IconButton,
    List,
    ListItem,
    ListItemText,
    Chip,
    CircularProgress,
    Tooltip,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import HistoryIcon from "@mui/icons-material/History";
import SendIcon from "@mui/icons-material/Send";
import SaveIcon from "@mui/icons-material/Save";
import RefreshIcon from "@mui/icons-material/Refresh";
import ContentFrame from "./ContentFrame";
import DynamicFormField from "./DynamicFormField";

/**
 * TicketFormsView - Main ticket form component for agents
 * 
 * Features:
 * - Form selector dropdown (shows only assigned forms)
 * - Dynamic form rendering based on schema
 * - Call data auto-population
 * - Caller history display
 * - Draft save and submit functionality
 */
const TicketFormsView = ({
    open,
    onClose,
    agentId,
    agentExtension,
    currentCall,  // { callId, callerNumber, timestamp }
    apiHost,
    authToken,
}) => {
    // State
    const [forms, setForms] = useState([]);
    const [selectedFormId, setSelectedFormId] = useState("");
    const [selectedForm, setSelectedForm] = useState(null);
    const [formValues, setFormValues] = useState({});
    const [formErrors, setFormErrors] = useState({});
    const [callerHistory, setCallerHistory] = useState([]);
    const [showHistory, setShowHistory] = useState(false);
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [submitStatus, setSubmitStatus] = useState(null); // { type: 'success'|'error', message }

    // API helper
    const apiCall = useCallback(async (endpoint, options = {}) => {
        const response = await fetch(`${apiHost}${endpoint}`, {
            ...options,
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${authToken}`,
                ...options.headers,
            },
        });

        if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
        }

        return response.json();
    }, [apiHost, authToken]);

    // Fetch forms assigned to this agent
    const fetchForms = useCallback(async () => {
        if (!agentId) return;

        setLoading(true);
        try {
            const data = await apiCall(`/api/tickets/forms/agent/${agentId}`);
            setForms(data.forms || []);
        } catch (error) {
            console.error("Failed to fetch forms:", error);
            setForms([]);
        } finally {
            setLoading(false);
        }
    }, [agentId, apiCall]);

    // Fetch caller history
    const fetchCallerHistory = useCallback(async (phoneNumber) => {
        if (!phoneNumber) return;

        try {
            const data = await apiCall(`/api/tickets/caller/${encodeURIComponent(phoneNumber)}?limit=5`);
            setCallerHistory(data.history || []);
        } catch (error) {
            console.error("Failed to fetch caller history:", error);
            setCallerHistory([]);
        }
    }, [apiCall]);

    // Load forms when component opens
    useEffect(() => {
        if (open) {
            fetchForms();
        }
    }, [open, fetchForms]);

    // Load caller history when call changes
    useEffect(() => {
        if (currentCall?.callerNumber) {
            fetchCallerHistory(currentCall.callerNumber);
        } else {
            setCallerHistory([]);
        }
    }, [currentCall?.callerNumber, fetchCallerHistory]);

    // Load selected form details
    useEffect(() => {
        if (selectedFormId) {
            const form = forms.find((f) => f.id === parseInt(selectedFormId));
            setSelectedForm(form || null);
            setFormValues({});
            setFormErrors({});
            setSubmitStatus(null);
        } else {
            setSelectedForm(null);
        }
    }, [selectedFormId, forms]);

    // Handle form value change
    const handleFieldChange = (fieldId, value) => {
        setFormValues((prev) => ({
            ...prev,
            [fieldId]: value,
        }));
        // Clear error when user starts typing
        if (formErrors[fieldId]) {
            setFormErrors((prev) => ({
                ...prev,
                [fieldId]: null,
            }));
        }
    };

    // Validate form
    const validateForm = () => {
        const errors = {};
        const fields = selectedForm?.schema?.fields || [];

        for (const field of fields) {
            const value = formValues[field.id];

            if (field.required) {
                if (value === undefined || value === null || value === "") {
                    errors[field.id] = `${field.label} is required`;
                }
                if (Array.isArray(value) && value.length === 0) {
                    errors[field.id] = `${field.label} is required`;
                }
            }
        }

        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    // Submit ticket
    const handleSubmit = async (status = "submitted") => {
        if (!selectedForm) return;

        if (status === "submitted" && !validateForm()) {
            setSubmitStatus({
                type: "error",
                message: "Please fill in all required fields",
            });
            return;
        }

        setSubmitting(true);
        setSubmitStatus(null);

        try {
            const payload = {
                formId: selectedForm.id,
                responses: formValues,
                callId: currentCall?.callId || null,
                callerNumber: currentCall?.callerNumber || null,
                callTimestamp: currentCall?.timestamp || null,
                status,
            };

            await apiCall("/api/tickets/submissions", {
                method: "POST",
                body: JSON.stringify(payload),
            });

            setSubmitStatus({
                type: "success",
                message: status === "draft"
                    ? "Draft saved successfully"
                    : "Ticket submitted successfully",
            });

            // Reset form after successful submit
            if (status === "submitted") {
                setFormValues({});
                // Refresh caller history to show new submission
                if (currentCall?.callerNumber) {
                    fetchCallerHistory(currentCall.callerNumber);
                }
            }
        } catch (error) {
            console.error("Failed to submit ticket:", error);
            setSubmitStatus({
                type: "error",
                message: "Failed to submit ticket. Please try again.",
            });
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <ContentFrame
            open={open}
            onClose={onClose}
            title={
                <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                    <Typography variant="h6">Tickets</Typography>
                    <Tooltip title="Refresh Forms">
                        <IconButton
                            size="small"
                            onClick={fetchForms}
                            disabled={loading}
                            sx={{ color: "#fefefdff" }}
                        >
                            {loading ? (
                                <CircularProgress size={20} color="inherit" />
                            ) : (
                                <RefreshIcon />
                            )}
                        </IconButton>
                    </Tooltip>
                </Box>
            }
            headerColor="#a21f4dff"
        >
            <Box sx={{ p: 2, height: "100%", display: "flex", flexDirection: "column" }}>
                {/* Form Selector */}
                <FormControl fullWidth size="small" sx={{ mb: 2 }}>
                    <InputLabel>Select Form</InputLabel>
                    <Select
                        value={selectedFormId}
                        onChange={(e) => setSelectedFormId(e.target.value)}
                        label="Select Form"
                        disabled={loading || forms.length === 0}
                    >
                        <MenuItem value="">
                            <em>Select a form...</em>
                        </MenuItem>
                        {forms.map((form) => (
                            <MenuItem key={form.id} value={form.id}>
                                {form.name}
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>

                {loading && (
                    <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
                        <CircularProgress size={24} />
                    </Box>
                )}

                {!loading && forms.length === 0 && (
                    <Alert severity="info">
                        No forms assigned to you. Contact your administrator.
                    </Alert>
                )}

                {/* Caller History */}
                {currentCall?.callerNumber && callerHistory.length > 0 && (
                    <Card variant="outlined" sx={{ mb: 2 }}>
                        <CardContent sx={{ py: 1, "&:last-child": { pb: 1 } }}>
                            <Box
                                sx={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "center",
                                    cursor: "pointer",
                                }}
                                onClick={() => setShowHistory(!showHistory)}
                            >
                                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                                    <HistoryIcon fontSize="small" color="primary" />
                                    <Typography variant="subtitle2">
                                        Caller History ({callerHistory.length})
                                    </Typography>
                                </Box>
                                <IconButton size="small">
                                    {showHistory ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                                </IconButton>
                            </Box>
                            <Collapse in={showHistory}>
                                <Divider sx={{ my: 1 }} />
                                <List dense disablePadding>
                                    {callerHistory.map((ticket) => (
                                        <ListItem key={ticket.id} disablePadding sx={{ py: 0.5 }}>
                                            <ListItemText
                                                primary={
                                                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                                                        <Typography variant="body2">
                                                            {ticket.form?.name || "Unknown Form"}
                                                        </Typography>
                                                        <Chip
                                                            label={ticket.status}
                                                            size="small"
                                                            color={
                                                                ticket.status === "closed"
                                                                    ? "success"
                                                                    : ticket.status === "reviewed"
                                                                        ? "info"
                                                                        : "default"
                                                            }
                                                        />
                                                    </Box>
                                                }
                                                secondary={new Date(ticket.createdAt).toLocaleString()}
                                            />
                                        </ListItem>
                                    ))}
                                </List>
                            </Collapse>
                        </CardContent>
                    </Card>
                )}

                {/* Dynamic Form */}
                {selectedForm && (
                    <Box
                        sx={{
                            flexGrow: 1,
                            overflow: "auto",
                            p: 2,
                            border: 1,
                            borderColor: "divider",
                            borderRadius: 1,
                            bgcolor: "background.paper",
                        }}
                    >
                        <Typography variant="subtitle1" gutterBottom>
                            {selectedForm.name}
                        </Typography>
                        {selectedForm.description && (
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                {selectedForm.description}
                            </Typography>
                        )}

                        <Divider sx={{ mb: 2 }} />

                        {/* Call Info */}
                        {currentCall && (
                            <Alert severity="info" sx={{ mb: 2 }}>
                                <Typography variant="body2">
                                    <strong>Caller:</strong> {currentCall.callerNumber || "Unknown"}
                                    {currentCall.callId && ` • Call ID: ${currentCall.callId}`}
                                </Typography>
                            </Alert>
                        )}

                        {/* Form Fields */}
                        {(selectedForm.schema?.fields || []).map((field) => (
                            <DynamicFormField
                                key={field.id}
                                field={field}
                                value={formValues[field.id]}
                                onChange={handleFieldChange}
                                error={formErrors[field.id]}
                            />
                        ))}

                        {/* Submit Status */}
                        {submitStatus && (
                            <Alert severity={submitStatus.type} sx={{ mb: 2 }}>
                                {submitStatus.message}
                            </Alert>
                        )}

                        {/* Action Buttons */}
                        <Box sx={{ display: "flex", gap: 1, mt: 2 }}>
                            <Button
                                variant="outlined"
                                startIcon={<SaveIcon />}
                                onClick={() => handleSubmit("draft")}
                                disabled={submitting}
                            >
                                Save Draft
                            </Button>
                            <Button
                                variant="contained"
                                startIcon={<SendIcon />}
                                onClick={() => handleSubmit("submitted")}
                                disabled={submitting}
                            >
                                {submitting ? "Submitting..." : "Submit Ticket"}
                            </Button>
                        </Box>
                    </Box>
                )}
            </Box>
        </ContentFrame>
    );
};

export default TicketFormsView;
