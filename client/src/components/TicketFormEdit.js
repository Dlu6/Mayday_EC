// client/src/components/TicketFormEdit.js
import { useEffect, useState } from "react";
import {
    Box,
    Paper,
    Typography,
    Button,
    IconButton,
    TextField,
    Switch,
    FormControlLabel,
    Grid,
    Card,
    CardContent,
    Tabs,
    Tab,
    AppBar,
    Toolbar,
    List,
    Checkbox,
    Chip,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Alert,
    CircularProgress,
    Divider,
    Tooltip,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import SaveIcon from "@mui/icons-material/Save";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import DragIndicatorIcon from "@mui/icons-material/DragIndicator";
import TextFieldsIcon from "@mui/icons-material/TextFields";
import FormatAlignLeftIcon from "@mui/icons-material/FormatAlignLeft";
import ArrowDropDownCircleIcon from "@mui/icons-material/ArrowDropDownCircle";
import RadioButtonCheckedIcon from "@mui/icons-material/RadioButtonChecked";
import CheckBoxIcon from "@mui/icons-material/CheckBox";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import NumbersIcon from "@mui/icons-material/Numbers";
import LinearScaleIcon from "@mui/icons-material/LinearScale";
import CloudDownloadIcon from "@mui/icons-material/CloudDownload";
import LinkIcon from "@mui/icons-material/Link";
import { useParams, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { useSnackbar } from "notistack";

import {
    fetchTicketForm,
    createTicketForm,
    updateTicketForm,
} from "../features/tickets/ticketsSlice.js";
import LoadingIndicator from "./common/LoadingIndicator.js";
import apiClient from "../api/apiClient.js";

// Field type definitions
const FIELD_TYPES = [
    { type: "text", label: "Short Text", icon: TextFieldsIcon },
    { type: "textarea", label: "Long Text", icon: FormatAlignLeftIcon },
    { type: "select", label: "Dropdown", icon: ArrowDropDownCircleIcon },
    { type: "radio", label: "Radio Buttons", icon: RadioButtonCheckedIcon },
    { type: "checkbox", label: "Checkboxes", icon: CheckBoxIcon },
    { type: "date", label: "Date", icon: CalendarTodayIcon },
    { type: "number", label: "Number", icon: NumbersIcon },
    { type: "scale", label: "Scale/Rating", icon: LinearScaleIcon },
];

const getFieldIcon = (type) => {
    const fieldType = FIELD_TYPES.find((f) => f.type === type);
    return fieldType ? fieldType.icon : TextFieldsIcon;
};

const TicketFormEdit = () => {
    const { formId } = useParams();
    const isNewForm = formId === "new";
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const { enqueueSnackbar } = useSnackbar();

    const { currentForm, formLoading } = useSelector((state) => state.tickets);

    const [currentTab, setCurrentTab] = useState("settings");
    const [addFieldDialogOpen, setAddFieldDialogOpen] = useState(false);

    // Form data state
    const [formData, setFormData] = useState({
        name: "",
        description: "",
        isActive: true,
        googleSheetId: "",
        sortOrder: 0,
        schema: { fields: [] },
        // Google Forms integration
        useGoogleForm: false,
        googleFormUrl: "",
        googleFormId: "",
        googleFormFields: null,
    });

    // Google Form fetching state
    const [fetchingGoogleForm, setFetchingGoogleForm] = useState(false);
    const [googleFormError, setGoogleFormError] = useState(null);

    // Load form data
    useEffect(() => {
        if (!isNewForm && formId) {
            dispatch(fetchTicketForm(formId));
        }
    }, [dispatch, formId, isNewForm]);

    // Populate form data when loaded
    useEffect(() => {
        if (currentForm && !isNewForm) {
            setFormData({
                name: currentForm.name || "",
                description: currentForm.description || "",
                isActive: currentForm.isActive !== false,
                googleSheetId: currentForm.googleSheetId || "",
                sortOrder: currentForm.sortOrder || 0,
                schema: currentForm.schema || { fields: [] },
                // Google Forms
                useGoogleForm: currentForm.useGoogleForm || false,
                googleFormUrl: currentForm.googleFormUrl || "",
                googleFormId: currentForm.googleFormId || "",
                googleFormFields: currentForm.googleFormFields || null,
            });
        }
    }, [currentForm, isNewForm]);

    const handleBack = () => {
        navigate("/tools/ticket-forms");
    };

    const handleTabChange = (event, newValue) => {
        setCurrentTab(newValue);
    };

    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: type === "checkbox" ? checked : value,
        }));
    };

    const handleSave = async () => {
        try {
            if (!formData.name.trim()) {
                enqueueSnackbar("Form name is required", { variant: "error" });
                return;
            }

            if (isNewForm) {
                const result = await dispatch(createTicketForm(formData)).unwrap();
                enqueueSnackbar("Form created successfully", { variant: "success" });
                navigate(`/tools/ticket-forms/${result.form.id}`);
            } else {
                await dispatch(
                    updateTicketForm({ formId, formData })
                ).unwrap();
                enqueueSnackbar("Form updated successfully", { variant: "success" });
            }
        } catch (error) {
            enqueueSnackbar(error || "Failed to save form", { variant: "error" });
        }
    };

    // ============================================
    // GOOGLE FORMS INTEGRATION
    // ============================================

    const fetchGoogleFormFields = async () => {
        if (!formData.googleFormUrl) {
            setGoogleFormError("Please enter a Google Form URL");
            return;
        }

        setFetchingGoogleForm(true);
        setGoogleFormError(null);

        try {
            const response = await apiClient.post("/tickets/parse-google-form", {
                url: formData.googleFormUrl,
            });

            if (response.data.success) {
                setFormData((prev) => ({
                    ...prev,
                    googleFormId: response.data.formId,
                    googleFormFields: response.data.fields,
                    // Auto-populate form name if empty
                    name: prev.name || response.data.title,
                }));
                enqueueSnackbar(`Fetched ${response.data.fields.length} fields from Google Form`, {
                    variant: "success",
                });
            } else {
                setGoogleFormError(response.data.message || "Failed to fetch form");
            }
        } catch (error) {
            console.error("Error fetching Google Form:", error);
            setGoogleFormError(
                error.response?.data?.message || "Failed to fetch Google Form. Make sure the form is public."
            );
        } finally {
            setFetchingGoogleForm(false);
        }
    };

    const handleToggleGoogleForm = (e) => {
        const checked = e.target.checked;
        setFormData((prev) => ({
            ...prev,
            useGoogleForm: checked,
            // Clear Google Form data when disabled
            ...(checked ? {} : { googleFormUrl: "", googleFormId: "", googleFormFields: null }),
        }));
        setGoogleFormError(null);
    };

    // ============================================
    // FIELD MANAGEMENT
    // ============================================

    const handleAddField = (type) => {
        const newField = {
            id: `field_${Date.now()}`,
            type,
            label: `New ${FIELD_TYPES.find((f) => f.type === type)?.label || "Field"}`,
            required: false,
            placeholder: "",
            options: type === "select" || type === "radio" || type === "checkbox"
                ? ["Option 1", "Option 2"]
                : undefined,
            rows: type === "textarea" ? 4 : undefined,
            min: type === "scale" || type === "number" ? 1 : undefined,
            max: type === "scale" || type === "number" ? 5 : undefined,
        };

        setFormData((prev) => ({
            ...prev,
            schema: {
                ...prev.schema,
                fields: [...prev.schema.fields, newField],
            },
        }));
        setAddFieldDialogOpen(false);
    };

    const handleUpdateField = (index, updates) => {
        setFormData((prev) => ({
            ...prev,
            schema: {
                ...prev.schema,
                fields: prev.schema.fields.map((field, i) =>
                    i === index ? { ...field, ...updates } : field
                ),
            },
        }));
    };

    const handleDeleteField = (index) => {
        setFormData((prev) => ({
            ...prev,
            schema: {
                ...prev.schema,
                fields: prev.schema.fields.filter((_, i) => i !== index),
            },
        }));
    };

    if (formLoading && !isNewForm) {
        return (
            <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}>
                <LoadingIndicator />
            </Box>
        );
    }

    return (
        <Box sx={{ width: "100%" }}>
            {/* Top Bar */}
            <AppBar
                position="static"
                elevation={0}
                sx={{
                    backgroundColor: "background.paper",
                    borderBottom: 1,
                    borderColor: "divider",
                }}
            >
                <Toolbar sx={{ minHeight: "64px", paddingY: "8px" }}>
                    <IconButton edge="start" sx={{ mr: 2 }} onClick={handleBack}>
                        <ArrowBackIcon />
                    </IconButton>
                    <Box sx={{ flexGrow: 1 }}>
                        <Typography variant="h6" sx={{ fontWeight: 500, color: "text.primary" }}>
                            {isNewForm ? "Create New Form" : `Edit: ${formData.name}`}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                            {isNewForm ? "Define form fields and settings" : `ID: ${formId}`}
                        </Typography>
                    </Box>
                    <Button
                        variant="contained"
                        color="primary"
                        startIcon={<SaveIcon />}
                        onClick={handleSave}
                        sx={{ borderRadius: 2, textTransform: "none", mr: 1 }}
                    >
                        Save Form
                    </Button>
                </Toolbar>
            </AppBar>

            {/* Tabs */}
            <Tabs
                value={currentTab}
                onChange={handleTabChange}
                aria-label="form edit tabs"
                sx={{
                    borderBottom: 1,
                    borderColor: "divider",
                    mb: 3,
                    "& .MuiTab-root": { textTransform: "none", minWidth: 120, fontWeight: 500 },
                }}
            >
                <Tab label="Settings" value="settings" />
                <Tab label="Fields" value="fields" />
            </Tabs>

            {/* Settings Tab */}
            {currentTab === "settings" && (
                <Card sx={{ boxShadow: 2, borderRadius: 2, mb: 3 }}>
                    <CardContent>
                        <Grid container spacing={3}>
                            <Grid item xs={12} md={6}>
                                <TextField
                                    fullWidth
                                    label="Form Name"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleInputChange}
                                    required
                                    helperText="Display name shown to agents"
                                />
                            </Grid>
                            <Grid item xs={12} md={6}>
                                <TextField
                                    fullWidth
                                    label="Sort Order"
                                    name="sortOrder"
                                    type="number"
                                    value={formData.sortOrder}
                                    onChange={handleInputChange}
                                    helperText="Lower numbers appear first"
                                />
                            </Grid>
                            <Grid item xs={12}>
                                <TextField
                                    fullWidth
                                    multiline
                                    rows={3}
                                    label="Description"
                                    name="description"
                                    value={formData.description}
                                    onChange={handleInputChange}
                                    helperText="Describe when agents should use this form"
                                />
                            </Grid>
                            <Grid item xs={12} md={6}>
                                <FormControlLabel
                                    control={
                                        <Switch
                                            name="isActive"
                                            checked={formData.isActive}
                                            onChange={handleInputChange}
                                        />
                                    }
                                    label="Active (visible to agents)"
                                />
                            </Grid>
                            <Grid item xs={12} md={6}>
                                <TextField
                                    fullWidth
                                    label="Google Sheet ID (Optional)"
                                    name="googleSheetId"
                                    value={formData.googleSheetId}
                                    onChange={handleInputChange}
                                    placeholder="e.g., 1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms"
                                    helperText={
                                        <>
                                            Find the ID in your Google Sheet URL between <code>/d/</code> and <code>/edit</code>
                                            <br />
                                            <Typography variant="caption" color="text.secondary" component="span">
                                                Example: docs.google.com/spreadsheets/d/<strong>[SHEET_ID]</strong>/edit
                                            </Typography>
                                        </>
                                    }
                                    FormHelperTextProps={{ component: "div" }}
                                />
                            </Grid>

                            {/* Google Forms Integration Section */}
                            <Grid item xs={12}>
                                <Divider sx={{ my: 2 }} />
                                <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
                                    <LinkIcon color="primary" />
                                    <Typography variant="h6">Google Forms Integration</Typography>
                                </Box>
                            </Grid>

                            <Grid item xs={12}>
                                <FormControlLabel
                                    control={
                                        <Switch
                                            checked={formData.useGoogleForm}
                                            onChange={handleToggleGoogleForm}
                                        />
                                    }
                                    label="Sync submissions to Google Form"
                                />
                                <Typography variant="caption" color="text.secondary" display="block">
                                    When enabled, agent submissions will automatically be sent to the linked Google Form
                                </Typography>
                            </Grid>

                            {formData.useGoogleForm && (
                                <>
                                    <Grid item xs={12} md={8}>
                                        <TextField
                                            fullWidth
                                            label="Google Form URL"
                                            name="googleFormUrl"
                                            value={formData.googleFormUrl}
                                            onChange={handleInputChange}
                                            placeholder="https://docs.google.com/forms/d/e/.../viewform"
                                            helperText="Paste the full Google Form URL here. The form must be public (anyone with the link can respond)."
                                        />
                                    </Grid>
                                    <Grid item xs={12} md={4}>
                                        <Button
                                            variant="contained"
                                            onClick={fetchGoogleFormFields}
                                            disabled={fetchingGoogleForm || !formData.googleFormUrl}
                                            startIcon={fetchingGoogleForm ? <CircularProgress size={20} /> : <CloudDownloadIcon />}
                                            fullWidth
                                            sx={{ height: 56 }}
                                        >
                                            {fetchingGoogleForm ? "Fetching..." : "Fetch Fields"}
                                        </Button>
                                    </Grid>

                                    {googleFormError && (
                                        <Grid item xs={12}>
                                            <Alert severity="error">{googleFormError}</Alert>
                                        </Grid>
                                    )}

                                    {formData.googleFormFields && formData.googleFormFields.length > 0 && (
                                        <Grid item xs={12}>
                                            <Alert severity="success" sx={{ mb: 2 }}>
                                                Successfully parsed {formData.googleFormFields.length} fields from Google Form
                                            </Alert>
                                            <Card variant="outlined">
                                                <CardContent>
                                                    <Typography variant="subtitle2" gutterBottom>
                                                        Parsed Fields (Auto-mapped call data highlighted)
                                                    </Typography>
                                                    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                                                        {formData.googleFormFields.map((field, idx) => (
                                                            <Tooltip
                                                                key={idx}
                                                                title={`Type: ${field.type}${field.autoMap ? ` • Auto-filled with: ${field.autoMapLabel}` : ""}`}
                                                            >
                                                                <Chip
                                                                    label={field.label}
                                                                    size="small"
                                                                    color={field.autoMap ? "primary" : "default"}
                                                                    variant={field.autoMap ? "filled" : "outlined"}
                                                                    icon={field.autoMap ? <LinkIcon /> : null}
                                                                />
                                                            </Tooltip>
                                                        ))}
                                                    </Box>
                                                    <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: "block" }}>
                                                        Blue chips = auto-filled with call data (Caller Number, Agent Extension, etc.)
                                                    </Typography>
                                                </CardContent>
                                            </Card>
                                        </Grid>
                                    )}
                                </>
                            )}
                        </Grid>
                    </CardContent>
                </Card>
            )
            }

            {/* Fields Tab */}
            {
                currentTab === "fields" && (
                    <Card sx={{ boxShadow: 2, borderRadius: 2, mb: 3 }}>
                        <CardContent>
                            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
                                <Typography variant="h6">Form Fields ({formData.schema.fields.length})</Typography>
                                <Button
                                    variant="contained"
                                    startIcon={<AddIcon />}
                                    onClick={() => setAddFieldDialogOpen(true)}
                                >
                                    Add Field
                                </Button>
                            </Box>

                            {formData.schema.fields.length === 0 ? (
                                <Box sx={{ textAlign: "center", py: 4 }}>
                                    <Typography color="text.secondary">
                                        No fields yet. Click &quot;Add Field&quot; to get started.
                                    </Typography>
                                </Box>
                            ) : (
                                <List>
                                    {formData.schema.fields.map((field, index) => {
                                        const FieldIcon = getFieldIcon(field.type);
                                        return (
                                            <Paper key={field.id} sx={{ mb: 2, p: 2 }} elevation={1}>
                                                <Grid container spacing={2} alignItems="center">
                                                    <Grid item>
                                                        <DragIndicatorIcon color="disabled" />
                                                    </Grid>
                                                    <Grid item>
                                                        <FieldIcon color="primary" />
                                                    </Grid>
                                                    <Grid item xs>
                                                        <TextField
                                                            fullWidth
                                                            size="small"
                                                            label="Field Label"
                                                            value={field.label}
                                                            onChange={(e) => handleUpdateField(index, { label: e.target.value })}
                                                        />
                                                    </Grid>
                                                    <Grid item>
                                                        <FormControlLabel
                                                            control={
                                                                <Checkbox
                                                                    checked={field.required || false}
                                                                    onChange={(e) => handleUpdateField(index, { required: e.target.checked })}
                                                                    size="small"
                                                                />
                                                            }
                                                            label="Required"
                                                        />
                                                    </Grid>
                                                    <Grid item>
                                                        <Chip label={field.type} size="small" variant="outlined" />
                                                    </Grid>
                                                    <Grid item>
                                                        <IconButton size="small" onClick={() => handleDeleteField(index)}>
                                                            <DeleteIcon fontSize="small" color="error" />
                                                        </IconButton>
                                                    </Grid>
                                                </Grid>

                                                {/* Options for select/radio/checkbox */}
                                                {(field.type === "select" || field.type === "radio" || field.type === "checkbox") && (
                                                    <Box sx={{ mt: 2, ml: 6 }}>
                                                        <TextField
                                                            fullWidth
                                                            size="small"
                                                            label="Options (comma-separated)"
                                                            value={field.options?.join(", ") || ""}
                                                            onChange={(e) =>
                                                                handleUpdateField(index, {
                                                                    options: e.target.value.split(",").map((o) => o.trim()),
                                                                })
                                                            }
                                                            helperText="Enter options separated by commas"
                                                        />
                                                    </Box>
                                                )}

                                                {/* Placeholder for text fields */}
                                                {(field.type === "text" || field.type === "textarea" || field.type === "number") && (
                                                    <Box sx={{ mt: 2, ml: 6 }}>
                                                        <TextField
                                                            fullWidth
                                                            size="small"
                                                            label="Placeholder"
                                                            value={field.placeholder || ""}
                                                            onChange={(e) => handleUpdateField(index, { placeholder: e.target.value })}
                                                        />
                                                    </Box>
                                                )}
                                            </Paper>
                                        );
                                    })}
                                </List>
                            )}
                        </CardContent>
                    </Card>
                )
            }

            {/* Add Field Dialog */}
            <Dialog open={addFieldDialogOpen} onClose={() => setAddFieldDialogOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Add Field</DialogTitle>
                <DialogContent>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        Select the type of field to add to your form:
                    </Typography>
                    <Grid container spacing={2}>
                        {FIELD_TYPES.map((fieldType) => {
                            const Icon = fieldType.icon;
                            return (
                                <Grid item xs={6} key={fieldType.type}>
                                    <Card
                                        variant="outlined"
                                        sx={{
                                            cursor: "pointer",
                                            "&:hover": { borderColor: "primary.main", bgcolor: "action.hover" },
                                        }}
                                        onClick={() => handleAddField(fieldType.type)}
                                    >
                                        <CardContent sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                                            <Icon color="primary" />
                                            <Typography>{fieldType.label}</Typography>
                                        </CardContent>
                                    </Card>
                                </Grid>
                            );
                        })}
                    </Grid>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setAddFieldDialogOpen(false)}>Cancel</Button>
                </DialogActions>
            </Dialog>
        </Box >
    );
};

export default TicketFormEdit;
