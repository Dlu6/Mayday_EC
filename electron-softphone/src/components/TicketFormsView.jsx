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
    Tabs,
    Tab,
    Grid,
    TextField,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    InputAdornment,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import HistoryIcon from "@mui/icons-material/History";
import SendIcon from "@mui/icons-material/Send";
import SaveIcon from "@mui/icons-material/Save";
import RefreshIcon from "@mui/icons-material/Refresh";
import SearchIcon from "@mui/icons-material/Search";
import CloseIcon from "@mui/icons-material/Close";
import AssignmentIcon from "@mui/icons-material/Assignment";
import PhoneIcon from "@mui/icons-material/Phone";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
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
    // Tab state
    const [activeTab, setActiveTab] = useState(0); // 0 = Submit, 1 = My Tickets

    // Submit Ticket State
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

    // My Tickets State
    const [myTickets, setMyTickets] = useState([]);
    const [ticketsLoading, setTicketsLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [viewingTicket, setViewingTicket] = useState(null); // For detail view

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
            if (form) {
                // Parse schema if it's a JSON string from API
                let parsedSchema = { fields: [] };
                if (form.schema) {
                    if (typeof form.schema === "string") {
                        try {
                            parsedSchema = JSON.parse(form.schema);
                        } catch (e) {
                            console.error("Failed to parse form schema:", e);
                        }
                    } else {
                        parsedSchema = form.schema;
                    }
                }
                // Ensure fields array exists
                if (!parsedSchema.fields) {
                    parsedSchema.fields = [];
                }
                setSelectedForm({ ...form, schema: parsedSchema });
            } else {
                setSelectedForm(null);
            }
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

    // ========================================
    // MY TICKETS FUNCTIONS
    // ========================================

    // Fetch agent's tickets
    const fetchMyTickets = useCallback(async () => {
        setTicketsLoading(true);
        try {
            const result = await apiCall(`/api/tickets/submissions?agentId=${agentId}&limit=100`);
            setMyTickets(result.submissions || []);
        } catch (error) {
            console.error("Failed to fetch tickets:", error);
        } finally {
            setTicketsLoading(false);
        }
    }, [apiCall, agentId]);

    // Load tickets when My Tickets tab is active
    useEffect(() => {
        if (activeTab === 1 && open) {
            fetchMyTickets();
        }
    }, [activeTab, open, fetchMyTickets]);

    // Filter tickets by search
    const filteredTickets = myTickets.filter(ticket => {
        if (!searchQuery) return true;
        const query = searchQuery.toLowerCase();
        return (
            ticket.callerNumber?.toLowerCase().includes(query) ||
            ticket.form?.name?.toLowerCase().includes(query) ||
            ticket.status?.toLowerCase().includes(query)
        );
    });

    // View ticket details
    const handleViewTicket = (ticket) => {
        setViewingTicket(ticket);
    };

    // Normalize label to sentence case for professional display
    const normalizeLabel = (label) => {
        if (!label) return "";
        // Convert to lowercase, then capitalize first letter of the sentence
        return label.charAt(0).toUpperCase() + label.slice(1).toLowerCase();
    };

    // Get status color
    const getStatusColor = (status) => {
        switch (status) {
            case "draft": return "default";
            case "submitted": return "primary";
            case "reviewed": return "success";
            case "closed": return "secondary";
            default: return "default";
        }
    };

    // Parse form responses for display
    const getFormValuesDisplay = (ticket) => {
        // The field is named 'responses' in the database model
        let values = ticket.responses;
        if (typeof values === "string") {
            try { values = JSON.parse(values); } catch (e) { return {}; }
        }
        return values || {};
    };

    // Get form schema for viewing
    const getFormSchemaForTicket = (ticket) => {
        // Schema is included directly in ticket.form from the API
        if (!ticket.form?.schema) return [];
        let schema = ticket.form.schema;
        if (typeof schema === "string") {
            try { schema = JSON.parse(schema); } catch (e) { schema = { fields: [] }; }
        }
        return schema?.fields || [];
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
            <Box sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
                {/* Tabs */}
                <Tabs
                    value={activeTab}
                    onChange={(_, v) => setActiveTab(v)}
                    sx={{ borderBottom: 1, borderColor: "divider" }}
                >
                    <Tab label="Submit Ticket" />
                    <Tab label="My Tickets" />
                </Tabs>

                {/* Tab Content */}
                <Box sx={{ p: 2, flex: 1, overflow: "auto" }}>
                    {/* SUBMIT TICKET TAB */}
                    {activeTab === 0 && (
                        <>
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
                                        display: "flex",
                                        flexDirection: "column",
                                        maxWidth: 1200,
                                        mx: "auto",
                                        width: "100%",
                                    }}
                                >
                                    {/* Form Header Card */}
                                    <Card
                                        elevation={0}
                                        sx={{
                                            mb: 2,
                                            background: "#be0055f6",
                                            borderRadius: 2,
                                        }}
                                    >
                                        <CardContent sx={{ py: 2 }}>
                                            <Typography
                                                variant="h6"
                                                sx={{
                                                    fontWeight: 600,
                                                    color: "white",
                                                    display: "flex",
                                                    alignItems: "center",
                                                    gap: 1,
                                                }}
                                            >
                                                {selectedForm.name}
                                            </Typography>
                                            {selectedForm.description && (
                                                <Typography
                                                    variant="body2"
                                                    sx={{
                                                        color: "rgba(255,255,255,0.85)",
                                                        mt: 0.2,
                                                        mb: 0.5,
                                                    }}
                                                >
                                                    {selectedForm.description}
                                                </Typography>
                                            )}
                                        </CardContent>
                                    </Card>

                                    {/* Call Info Banner */}
                                    {currentCall && (
                                        <Card
                                            elevation={0}
                                            sx={{
                                                mb: 2,
                                                bgcolor: "rgba(25, 118, 210, 0.08)",
                                                border: "1px solid rgba(25, 118, 210, 0.2)",
                                                borderRadius: 2,
                                            }}
                                        >
                                            <CardContent sx={{ py: 1.5, "&:last-child": { pb: 1.5 } }}>
                                                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                                                    <Box
                                                        sx={{
                                                            width: 8,
                                                            height: 8,
                                                            borderRadius: "50%",
                                                            bgcolor: "success.main",
                                                            animation: "pulse 2s infinite",
                                                            "@keyframes pulse": {
                                                                "0%": { opacity: 1 },
                                                                "50%": { opacity: 0.4 },
                                                                "100%": { opacity: 1 },
                                                            },
                                                        }}
                                                    />
                                                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                                        📞 Active Call: {currentCall.callerNumber || "Unknown"}
                                                    </Typography>
                                                    {currentCall.callId && (
                                                        <Typography variant="caption" color="text.secondary">
                                                            ID: {currentCall.callId}
                                                        </Typography>
                                                    )}
                                                </Box>
                                            </CardContent>
                                        </Card>
                                    )}

                                    {/* Form Fields Container */}
                                    <Card
                                        elevation={0}
                                        sx={{
                                            flexGrow: 1,
                                            border: "1px solid",
                                            borderColor: "divider",
                                            borderRadius: 2,
                                            overflow: "auto",
                                        }}
                                    >
                                        <CardContent sx={{ p: 2 }}>
                                            <Typography
                                                variant="overline"
                                                sx={{
                                                    display: "block",
                                                    mb: 2,
                                                    color: "text.secondary",
                                                    fontWeight: 300,
                                                    letterSpacing: 0.2,
                                                    fontSize: 15,
                                                }}
                                            >
                                                Form Fields ({(selectedForm.schema?.fields || []).length})
                                            </Typography>

                                            <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                                                {(selectedForm.schema?.fields || []).map((field) => (
                                                    <DynamicFormField
                                                        key={field.id}
                                                        field={field}
                                                        value={formValues[field.id]}
                                                        onChange={handleFieldChange}
                                                        error={formErrors[field.id]}
                                                    />
                                                ))}
                                            </Box>

                                            {(selectedForm.schema?.fields || []).length === 0 && (
                                                <Box sx={{ textAlign: "center", py: 4 }}>
                                                    <Typography color="text.secondary">
                                                        No fields in this form
                                                    </Typography>
                                                </Box>
                                            )}
                                        </CardContent>
                                    </Card>

                                    {/* Submit Status */}
                                    {submitStatus && (
                                        <Alert
                                            severity={submitStatus.type}
                                            sx={{
                                                mt: 2,
                                                borderRadius: 2,
                                            }}
                                        >
                                            {submitStatus.message}
                                        </Alert>
                                    )}

                                    {/* Action Buttons */}
                                    <Box
                                        sx={{
                                            display: "flex",
                                            gap: 1.5,
                                            mt: 2,
                                            pt: 2,
                                            borderTop: "1px solid",
                                            borderColor: "divider",
                                        }}
                                    >
                                        <Button
                                            variant="outlined"
                                            startIcon={<SaveIcon />}
                                            onClick={() => handleSubmit("draft")}
                                            disabled={submitting}
                                            sx={{
                                                borderRadius: 2,
                                                textTransform: "none",
                                                px: 3,
                                            }}
                                        >
                                            Save Draft
                                        </Button>
                                        <Button
                                            variant="contained"
                                            startIcon={<SendIcon />}
                                            onClick={() => handleSubmit("submitted")}
                                            disabled={submitting}
                                            sx={{
                                                borderRadius: 2,
                                                textTransform: "none",
                                                px: 3,
                                                background: "#001ea2ff",
                                                "&:hover": {
                                                    background: "#001ea2ff",
                                                },
                                            }}
                                        >
                                            {submitting ? "Submitting..." : "Submit Ticket"}
                                        </Button>
                                    </Box>
                                </Box>
                            )}
                        </>
                    )}

                    {/* MY TICKETS TAB */}
                    {activeTab === 1 && (
                        <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
                            {/* Search Bar */}
                            <TextField
                                size="small"
                                placeholder="Search by caller, form name..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                sx={{ mb: 2 }}
                                InputProps={{
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <SearchIcon fontSize="small" />
                                        </InputAdornment>
                                    ),
                                    endAdornment: searchQuery && (
                                        <InputAdornment position="end">
                                            <IconButton size="small" onClick={() => setSearchQuery("")}>
                                                <CloseIcon fontSize="small" />
                                            </IconButton>
                                        </InputAdornment>
                                    ),
                                }}
                            />

                            {/* Loading State */}
                            {ticketsLoading && (
                                <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
                                    <CircularProgress />
                                </Box>
                            )}

                            {/* Empty State */}
                            {!ticketsLoading && filteredTickets.length === 0 && (
                                <Box sx={{ textAlign: "center", py: 4 }}>
                                    <Typography color="text.secondary">
                                        {searchQuery ? "No tickets match your search" : "No tickets yet"}
                                    </Typography>
                                </Box>
                            )}

                            {/* Ticket Cards */}
                            {!ticketsLoading && filteredTickets.length > 0 && (
                                <Grid container spacing={2}>
                                    {filteredTickets.map((ticket) => (
                                        <Grid item xs={12} sm={6} key={ticket.id}>
                                            <Card
                                                sx={{
                                                    transition: "all 0.2s ease",
                                                    "&:hover": {
                                                        transform: "translateY(-2px)",
                                                        boxShadow: 4,
                                                    },
                                                }}
                                            >
                                                <CardContent>
                                                    <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
                                                        <Typography variant="subtitle1" fontWeight={600}>
                                                            {ticket.form?.name || "Unknown Form"}
                                                        </Typography>
                                                        <Chip
                                                            size="small"
                                                            label={ticket.status}
                                                            color={getStatusColor(ticket.status)}
                                                        />
                                                    </Box>

                                                    <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
                                                        <PhoneIcon fontSize="small" color="action" />
                                                        <Typography variant="body2">
                                                            {ticket.callerNumber || "No caller"}
                                                        </Typography>
                                                    </Box>

                                                    <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
                                                        <CalendarTodayIcon fontSize="small" color="action" />
                                                        <Typography variant="body2">
                                                            {new Date(ticket.createdAt).toLocaleString()}
                                                        </Typography>
                                                    </Box>

                                                    {/* Show first 2 form field values */}
                                                    {ticket.form?.schema?.fields?.slice(0, 2).map((field) => {
                                                        const responses = typeof ticket.responses === "string"
                                                            ? JSON.parse(ticket.responses)
                                                            : ticket.responses;
                                                        const value = responses?.[field.id];
                                                        if (!value) return null;
                                                        return (
                                                            <Box key={field.id} sx={{ mb: 0.5 }}>
                                                                <Typography variant="caption" color="text.secondary">
                                                                    {field.label}
                                                                </Typography>
                                                                <Typography variant="body2" noWrap>
                                                                    {String(value).substring(0, 30)}{String(value).length > 30 ? "..." : ""}
                                                                </Typography>
                                                            </Box>
                                                        );
                                                    })}

                                                    <Divider sx={{ my: 1 }} />

                                                    <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
                                                        <Button
                                                            size="small"
                                                            startIcon={<AssignmentIcon />}
                                                            onClick={() => handleViewTicket(ticket)}
                                                        >
                                                            View Details
                                                        </Button>
                                                    </Box>
                                                </CardContent>
                                            </Card>
                                        </Grid>
                                    ))}
                                </Grid>
                            )}

                            {/* Refresh Button */}
                            <Box sx={{ mt: 2, display: "flex", justifyContent: "center" }}>
                                <Button
                                    startIcon={<RefreshIcon />}
                                    onClick={fetchMyTickets}
                                    disabled={ticketsLoading}
                                >
                                    Refresh
                                </Button>
                            </Box>
                        </Box>
                    )}
                </Box>
            </Box>

            {/* View Ticket Details Dialog */}
            <Dialog open={!!viewingTicket} onClose={() => setViewingTicket(null)} maxWidth="sm" fullWidth>
                <DialogTitle>
                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <Typography variant="h6">Ticket Details</Typography>
                        <IconButton onClick={() => setViewingTicket(null)}>
                            <CloseIcon />
                        </IconButton>
                    </Box>
                </DialogTitle>
                <DialogContent dividers>
                    {viewingTicket && (
                        <>
                            {/* Header Info */}
                            <Box sx={{ mb: 2, p: 2, bgcolor: "grey.50", borderRadius: 1 }}>
                                <Typography variant="subtitle2" color="text.secondary">Form</Typography>
                                <Typography variant="body1" fontWeight={600} gutterBottom>
                                    {viewingTicket.form?.name || "Unknown Form"}
                                </Typography>

                                <Box sx={{ display: "flex", gap: 3, mt: 1 }}>
                                    <Box>
                                        <Typography variant="subtitle2" color="text.secondary">Status</Typography>
                                        <Chip size="small" label={viewingTicket.status} color={getStatusColor(viewingTicket.status)} />
                                    </Box>
                                    <Box>
                                        <Typography variant="subtitle2" color="text.secondary">Caller</Typography>
                                        <Typography variant="body2">{viewingTicket.callerNumber || "N/A"}</Typography>
                                    </Box>
                                    <Box>
                                        <Typography variant="subtitle2" color="text.secondary">Submitted</Typography>
                                        <Typography variant="body2">
                                            {new Date(viewingTicket.createdAt).toLocaleString()}
                                        </Typography>
                                    </Box>
                                </Box>
                            </Box>

                            {/* Form Fields */}
                            <Typography variant="subtitle1" sx={{
                                display: "block",
                                mb: 2,
                                color: "text.secondary",
                                fontWeight: 400,
                                letterSpacing: 0.2,
                                fontSize: 19,
                                textTransform: "uppercase",
                            }}>
                                Form Values
                            </Typography>
                            <Divider sx={{ mb: 2 }} />

                            {getFormSchemaForTicket(viewingTicket).map((field) => {
                                const values = getFormValuesDisplay(viewingTicket);
                                return (
                                    <Box key={field.id} sx={{ mb: 2 }}>
                                        <Typography variant="subtitle2" color="text.secondary">
                                            {normalizeLabel(field.label)}
                                        </Typography>
                                        <Typography variant="body1">
                                            {values[field.id] || "-"}
                                        </Typography>
                                    </Box>
                                );
                            })}

                            {getFormSchemaForTicket(viewingTicket).length === 0 && (
                                <Typography color="text.secondary" sx={{ fontStyle: "italic" }}>
                                    No form fields available
                                </Typography>
                            )}
                        </>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setViewingTicket(null)}>Close</Button>
                </DialogActions>
            </Dialog>
        </ContentFrame>
    );
};

export default TicketFormsView;
