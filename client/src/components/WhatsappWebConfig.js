import { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  TextField,
  Button,
  Switch,
  FormControlLabel,
  Alert,
  CircularProgress,
  Paper,
  Stack,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
} from "@mui/material";
import {
  Save as SaveIcon,
  Refresh as RefreshIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
} from "@mui/icons-material";
import apiClient from "../api/apiClient";

const CreateTemplateDialog = ({ open, onClose, onSubmit }) => {
  const [template, setTemplate] = useState({
    friendly_name: "general_message",
    language: "en",
    category: "UTILITY",
    variables: { 1: "Hello! How are you today?" },
    types: {
      "twilio/text": {
        body: "{{1}}",
      },
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(template);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Create Chat Template</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Create a template for your WhatsApp messages. This template will be
          used for general chat messages.
        </Typography>

        <TextField
          fullWidth
          label="Template Name"
          value={template.friendly_name}
          onChange={(e) =>
            setTemplate((prev) => ({ ...prev, friendly_name: e.target.value }))
          }
          margin="normal"
          helperText="Use lowercase letters, numbers, and underscores only. Example: general_message"
        />

        <TextField
          fullWidth
          label="Sample Message"
          value={template.variables["1"]}
          onChange={(e) =>
            setTemplate((prev) => ({
              ...prev,
              variables: { 1: e.target.value },
            }))
          }
          margin="normal"
          helperText="Example message that will be sent. Example: Hello! How are you today?"
        />

        <Alert severity="info" sx={{ mt: 2 }}>
          <Typography variant="subtitle2">Template Guidelines:</Typography>
          <ul style={{ marginTop: 4, marginBottom: 0, paddingLeft: 20 }}>
            <li>Keep messages simple and conversational</li>
            <li>Avoid promotional content</li>
            <li>Use proper grammar and punctuation</li>
            <li>Template will be used for general chat messages</li>
          </ul>
        </Alert>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSubmit} variant="contained" color="primary">
          Create Template
        </Button>
      </DialogActions>
    </Dialog>
  );
};

const WhatsappWebConfig = () => {
  const [whatsappConfig, setWhatsappConfig] = useState({
    accountSid: "",
    authToken: "",
    phoneNumber: "",
    enabled: false,
    webhookUrl: "",
    contentSid: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [showAuthToken, setShowAuthToken] = useState(false);
  const [originalConfig, setOriginalConfig] = useState(null);
  const [templates, setTemplates] = useState([]);
  console.log(templates, "templates>>>>>");
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState(null);

  useEffect(() => {
    fetchWhatsAppConfig();
    fetchTemplates();
  }, []);

  const fetchWhatsAppConfig = async () => {
    try {
      const response = await apiClient.get(
        "/whatsapp/integrations/whatsapp/config"
      );
      if (response.data.success) {
        setWhatsappConfig(response.data.data);
        setOriginalConfig(response.data.data);
      }
    } catch (error) {
      setError(
        error.response?.data?.error || "Failed to load WhatsApp configuration"
      );
    } finally {
      setLoading(false);
    }
  };

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiClient.get("/whatsapp/templates");
      if (response.data.success) {
        setTemplates(response.data.data);
      } else {
        setError(response.data.error || "Failed to load templates");
      }
    } catch (error) {
      console.error("Template fetch error:", error);
      setError(error.response?.data?.error || "Failed to load templates");
    } finally {
      setLoading(false);
    }
  };

  const hasChanges = () => {
    if (!originalConfig) return false;

    return (
      originalConfig.accountSid !== whatsappConfig.accountSid ||
      originalConfig.authToken !== whatsappConfig.authToken ||
      originalConfig.phoneNumber !== whatsappConfig.phoneNumber ||
      originalConfig.enabled !== whatsappConfig.enabled ||
      originalConfig.webhookUrl !== whatsappConfig.webhookUrl ||
      originalConfig.contentSid !== whatsappConfig.contentSid
    );
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const response = await apiClient.post(
        "/whatsapp/integrations/whatsapp-config",
        whatsappConfig
      );

      if (response.data.success) {
        setSuccess(true);
        setOriginalConfig(whatsappConfig);
      } else {
        setError(response.data.error || "Failed to save configuration");
      }
    } catch (error) {
      setError(error.response?.data?.error || "Failed to save configuration");
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (field) => (event) => {
    setWhatsappConfig((prev) => ({
      ...prev,
      [field]:
        event.target.type === "checkbox"
          ? event.target.checked
          : event.target.value,
    }));
  };

  const handleCreateTemplate = async (templateData) => {
    try {
      const response = await apiClient.post(
        "/whatsapp/templates",
        templateData
      );
      if (response.data.success) {
        setTemplateDialogOpen(false);
        fetchTemplates(); // Refresh templates list
        setError(null);
      } else {
        setError(response.data.error || "Failed to create template");
      }
    } catch (error) {
      console.error("Template creation error:", error);
      setError(error.response?.data?.error || "Failed to create template");
    }
  };

  const handleDeleteTemplate = async (templateId) => {
    try {
      setLoading(true);
      await apiClient.delete(`/whatsapp/templates/${templateId}`);
      await fetchTemplates(); // Refresh the list
      setError(null);
    } catch (error) {
      console.error("Error deleting template:", error);
      setError(error.response?.data?.error || "Failed to delete template");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteConfirmation = (template) => {
    setTemplateToDelete(template);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirmed = async () => {
    if (templateToDelete) {
      await handleDeleteTemplate(templateToDelete.sid);
      setDeleteDialogOpen(false);
      setTemplateToDelete(null);
    }
  };

  if (loading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="200px"
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 1200, margin: "0 auto", p: 3 }}>
      <Paper
        elevation={0}
        sx={{
          p: 3,
          mb: 3,
          bgcolor: "primary.main",
          color: "white",
          borderRadius: 2,
        }}
      >
        <Typography variant="h4" gutterBottom fontWeight="500">
          WhatsApp Integration
        </Typography>
        <Typography variant="body1" sx={{ opacity: 0.8 }}>
          Configure your Twilio WhatsApp business account settings
        </Typography>
      </Paper>

      <Card sx={{ borderRadius: 2, boxShadow: "0 4px 6px rgba(0,0,0,0.3)" }}>
        <CardContent sx={{ p: 4 }}>
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
            mb={3}
          >
            <FormControlLabel
              control={
                <Switch
                  checked={whatsappConfig.enabled}
                  onChange={handleChange("enabled")}
                  color="primary"
                />
              }
              label={
                <Typography variant="h6" sx={{ ml: 1 }}>
                  {whatsappConfig.enabled ? "Active" : "Inactive"}
                </Typography>
              }
            />
            <Tooltip title="Refresh Configuration">
              <IconButton onClick={fetchWhatsAppConfig} disabled={loading}>
                <RefreshIcon />
              </IconButton>
            </Tooltip>
          </Stack>

          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Twilio Account SID"
                value={whatsappConfig.accountSid}
                onChange={handleChange("accountSid")}
                variant="outlined"
                sx={{ mb: 2 }}
                InputProps={{
                  sx: { borderRadius: 2 },
                }}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Twilio Auth Token"
                type={showAuthToken ? "text" : "password"}
                value={whatsappConfig.authToken}
                onChange={handleChange("authToken")}
                variant="outlined"
                sx={{ mb: 2 }}
                InputProps={{
                  sx: { borderRadius: 2 },
                  endAdornment: (
                    <IconButton
                      onClick={() => setShowAuthToken(!showAuthToken)}
                      edge="end"
                      size="large"
                    >
                      {showAuthToken ? (
                        <VisibilityOffIcon />
                      ) : (
                        <VisibilityIcon />
                      )}
                    </IconButton>
                  ),
                }}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="WhatsApp Phone Number"
                value={whatsappConfig.phoneNumber}
                onChange={handleChange("phoneNumber")}
                variant="outlined"
                helperText="Include country code (e.g., +1234567890)"
                sx={{ mb: 2 }}
                InputProps={{
                  sx: { borderRadius: 2 },
                }}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Content SID"
                value={whatsappConfig.contentSid}
                onChange={handleChange("contentSid")}
                variant="outlined"
                helperText="Twilio Content SID for WhatsApp templates"
                sx={{ mb: 2 }}
                InputProps={{
                  sx: { borderRadius: 2 },
                }}
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Webhook URL"
                value={whatsappConfig.webhookUrl}
                onChange={handleChange("webhookUrl")}
                variant="outlined"
                helperText="URL for receiving WhatsApp webhooks"
                sx={{ mb: 2 }}
                InputProps={{
                  sx: { borderRadius: 2 },
                }}
              />
            </Grid>
          </Grid>

          {(error || success) && (
            <Box sx={{ mt: 3 }}>
              {error && (
                <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
                  {error}
                </Alert>
              )}
              {success && (
                <Alert severity="success" sx={{ mb: 2, borderRadius: 2 }}>
                  Configuration saved successfully!
                </Alert>
              )}
            </Box>
          )}

          <Box mt={4} display="flex" justifyContent="flex-end">
            <Button
              variant="contained"
              color="primary"
              onClick={handleSave}
              disabled={saving || !hasChanges()}
              startIcon={saving ? <CircularProgress size={20} /> : <SaveIcon />}
              sx={{
                borderRadius: 2,
                px: 4,
                py: 1.5,
                textTransform: "none",
                fontSize: "1rem",
              }}
            >
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </Box>
        </CardContent>
      </Card>

      <Card
        sx={{ mt: 4, borderRadius: 2, boxShadow: "0 4px 6px rgba(0,0,0,0.3)" }}
      >
        <CardContent sx={{ p: 4 }}>
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
            mb={3}
          >
            <Typography variant="h6">WhatsApp Templates</Typography>
            <Button
              startIcon={
                loading ? <CircularProgress size={20} /> : <RefreshIcon />
              }
              variant="outlined"
              onClick={fetchTemplates}
              disabled={loading}
              sx={{ mr: 2 }}
            >
              {loading ? "Refreshing..." : "Refresh"}
            </Button>
            <Button
              startIcon={<AddIcon />}
              variant="contained"
              onClick={() => setTemplateDialogOpen(true)}
            >
              Create Template
            </Button>
          </Stack>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {templates.length === 0 ? (
            <Typography color="text.secondary" align="center" py={4}>
              No templates found. Create one to get started.
            </Typography>
          ) : (
            templates.map((template) => (
              <Card key={template.sid} sx={{ mb: 2, p: 2 }}>
                <Stack direction="row" spacing={2} alignItems="center">
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="subtitle1">{template.name}</Typography>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Typography variant="body2" color="text.secondary">
                        {template.category} • {template.language}
                      </Typography>
                      <Chip
                        size="small"
                        label={template.status}
                        color={
                          template.status === "active"
                            ? "success"
                            : template.status === "pending"
                            ? "warning"
                            : template.status === "rejected"
                            ? "error"
                            : "default"
                        }
                      />
                    </Stack>
                    {template.status === "rejected" &&
                      template.rejection_reason && (
                        <Typography
                          variant="body2"
                          color="error"
                          sx={{ mt: 1 }}
                        >
                          Rejection reason: {template.rejection_reason}
                        </Typography>
                      )}
                  </Box>
                  <Stack direction="row" spacing={1}>
                    <Button
                      variant="contained"
                      onClick={() => {
                        setWhatsappConfig((prev) => ({
                          ...prev,
                          contentSid: template.sid,
                        }));
                      }}
                      color={
                        whatsappConfig.contentSid === template.sid
                          ? "success"
                          : "inherit"
                      }
                    >
                      {whatsappConfig.contentSid === template.sid
                        ? "Selected"
                        : "Select"}
                    </Button>
                    <IconButton
                      onClick={() => handleDeleteConfirmation(template)}
                      color="error"
                      disabled={loading}
                      sx={{ ml: 1 }}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Stack>
                </Stack>
              </Card>
            ))
          )}
        </CardContent>
      </Card>

      <CreateTemplateDialog
        open={templateDialogOpen}
        onClose={() => setTemplateDialogOpen(false)}
        onSubmit={handleCreateTemplate}
      />

      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Confirm Template Deletion</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete the template &quot;
            {templateToDelete?.name}
            &quot;? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)} disabled={loading}>
            Cancel
          </Button>
          <Button
            onClick={handleDeleteConfirmed}
            color="error"
            variant="contained"
            disabled={loading}
            startIcon={
              loading ? <CircularProgress size={20} /> : <DeleteIcon />
            }
          >
            {loading ? "Deleting..." : "Delete Template"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default WhatsappWebConfig;
