import { useState, useEffect, useCallback, useRef } from "react";
import {
  Box,
  Paper,
  Typography,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControlLabel,
  Switch,
  Chip,
  Tooltip,
  CircularProgress,
  Alert,
  Grid,
  InputAdornment,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  useTheme,
  alpha,
} from "@mui/material";
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
  PauseCircle,
  History,
  Settings as SettingsIcon,
  Search as SearchIcon,
  // FilterList as FilterIcon,
  Download as DownloadIcon,
  Speed as SpeedIcon,
  Save as SaveIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
} from "@mui/icons-material";
import { useSnackbar } from "notistack";
import axios from "axios";

// API configuration
const API = axios.create({
  baseURL: process.env.REACT_APP_API_URL,
  headers: { "Content-Type": "application/json" },
});

API.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Tab Panel Component
function TabPanel({ children, value, index, ...other }) {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`settings-tabpanel-${index}`}
      aria-labelledby={`settings-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

// Format duration helper
const formatDuration = (seconds) => {
  if (!seconds) return "0:00";
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }
  return `${minutes}:${secs.toString().padStart(2, "0")}`;
};

// Format date helper
const formatDate = (dateString) => {
  if (!dateString) return "-";
  const date = new Date(dateString);
  return date.toLocaleString();
};

// ============== PAUSE REASONS TAB ==============
const PauseReasonsTab = () => {
  const theme = useTheme();
  const { enqueueSnackbar } = useSnackbar();
  const [reasons, setReasons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingReason, setEditingReason] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [reasonToDelete, setReasonToDelete] = useState(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const initialFormDataRef = useRef(null);
  const [formData, setFormData] = useState({
    code: "",
    label: "",
    description: "",
    color: "#ff9800",
    icon: "pause",
    maxDurationMinutes: "",
    requiresApproval: false,
    sortOrder: 0,
  });

  const fetchReasons = useCallback(async () => {
    try {
      setLoading(true);
      const response = await API.get("/pause/reasons");
      if (response.data.success) {
        setReasons(response.data.data || []);
      }
    } catch (error) {
      enqueueSnackbar("Failed to fetch pause reasons", { variant: "error" });
    } finally {
      setLoading(false);
    }
  }, [enqueueSnackbar]);

  useEffect(() => {
    fetchReasons();
  }, [fetchReasons]);

  const handleOpenDialog = (reason = null) => {
    const newFormData = reason
      ? {
          code: reason.code || "",
          label: reason.label || "",
          description: reason.description || "",
          color: reason.color || "#ff9800",
          icon: reason.icon || "pause",
          maxDurationMinutes: reason.maxDurationMinutes || "",
          requiresApproval: reason.requiresApproval || false,
          sortOrder: reason.sortOrder || 0,
        }
      : {
          code: "",
          label: "",
          description: "",
          color: "#ff9800",
          icon: "pause",
          maxDurationMinutes: "",
          requiresApproval: false,
          sortOrder: 0,
        };
    setEditingReason(reason);
    setFormData(newFormData);
    initialFormDataRef.current = JSON.stringify(newFormData);
    setHasUnsavedChanges(false);
    setDialogOpen(true);
  };

  // Track unsaved changes
  useEffect(() => {
    if (dialogOpen && initialFormDataRef.current) {
      const currentData = JSON.stringify(formData);
      setHasUnsavedChanges(currentData !== initialFormDataRef.current);
    }
  }, [formData, dialogOpen]);

  // Keyboard shortcut: Escape to close dialog
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        if (deleteDialogOpen) {
          setDeleteDialogOpen(false);
        } else if (dialogOpen) {
          handleCloseDialog();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [dialogOpen, deleteDialogOpen]);

  const handleCloseDialog = () => {
    if (hasUnsavedChanges) {
      const confirmClose = window.confirm(
        "You have unsaved changes. Are you sure you want to close?"
      );
      if (!confirmClose) return;
    }
    setDialogOpen(false);
    setEditingReason(null);
    setHasUnsavedChanges(false);
    initialFormDataRef.current = null;
  };

  const handleSave = async () => {
    try {
      if (!formData.code || !formData.label) {
        enqueueSnackbar("Code and Label are required", { variant: "warning" });
        return;
      }

      setSaving(true);
      const payload = {
        ...formData,
        maxDurationMinutes: formData.maxDurationMinutes ? parseInt(formData.maxDurationMinutes) : null,
      };

      if (editingReason) {
        await API.put(`/pause/reasons/${editingReason.id}`, payload);
        enqueueSnackbar("Pause reason updated successfully", { variant: "success" });
      } else {
        await API.post("/pause/reasons", payload);
        enqueueSnackbar("Pause reason created successfully", { variant: "success" });
      }

      setHasUnsavedChanges(false);
      initialFormDataRef.current = null;
      setDialogOpen(false);
      setEditingReason(null);
      fetchReasons();
    } catch (error) {
      const message = error.response?.data?.message || "Failed to save pause reason";
      enqueueSnackbar(message, { variant: "error" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      setDeleting(true);
      await API.delete(`/pause/reasons/${reasonToDelete.id}`);
      enqueueSnackbar("Pause reason deactivated successfully", { variant: "success" });
      setDeleteDialogOpen(false);
      setReasonToDelete(null);
      fetchReasons();
    } catch (error) {
      enqueueSnackbar("Failed to delete pause reason", { variant: "error" });
    } finally {
      setDeleting(false);
    }
  };

  const colorOptions = [
    { value: "#ff9800", label: "Orange" },
    { value: "#f44336", label: "Red" },
    { value: "#4caf50", label: "Green" },
    { value: "#2196f3", label: "Blue" },
    { value: "#9c27b0", label: "Purple" },
    { value: "#607d8b", label: "Gray" },
    { value: "#795548", label: "Brown" },
    { value: "#00bcd4", label: "Cyan" },
  ];

  const iconOptions = [
    { value: "pause", label: "Pause" },
    { value: "coffee", label: "Coffee/Break" },
    { value: "lunch", label: "Lunch" },
    { value: "meeting", label: "Meeting" },
    { value: "training", label: "Training" },
    { value: "phone", label: "Phone" },
    { value: "computer", label: "Computer" },
    { value: "person", label: "Personal" },
  ];

  return (
    <Box>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
        <Typography variant="h6">Pause Reasons Configuration</Typography>
        <Box sx={{ display: "flex", gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={
              loading ? (
                <CircularProgress size={16} sx={{ color: "inherit" }} />
              ) : (
                <RefreshIcon />
              )
            }
            onClick={fetchReasons}
            disabled={loading}
          >
            {loading ? "Loading..." : "Refresh"}
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog()}
          >
            Add Reason
          </Button>
        </Box>
      </Box>

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
          <CircularProgress />
        </Box>
      ) : reasons.length === 0 ? (
        <Alert severity="info">No pause reasons configured. Click &quot;Add Reason&quot; to create one.</Alert>
      ) : (
        <TableContainer component={Paper} elevation={0} sx={{ border: 1, borderColor: "divider" }}>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: alpha(theme.palette.primary.main, 0.05) }}>
                <TableCell>Code</TableCell>
                <TableCell>Label</TableCell>
                <TableCell>Description</TableCell>
                <TableCell>Color</TableCell>
                <TableCell>Max Duration</TableCell>
                <TableCell>Requires Approval</TableCell>
                <TableCell>Sort Order</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {reasons.map((reason) => (
                <TableRow key={reason.id} hover>
                  <TableCell>
                    <Chip label={reason.code} size="small" sx={{ fontWeight: 600 }} />
                  </TableCell>
                  <TableCell>{reason.label}</TableCell>
                  <TableCell>{reason.description || "-"}</TableCell>
                  <TableCell>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <Box
                        sx={{
                          width: 20,
                          height: 20,
                          borderRadius: 1,
                          bgcolor: reason.color || "#ff9800",
                        }}
                      />
                      {reason.color}
                    </Box>
                  </TableCell>
                  <TableCell>
                    {reason.maxDurationMinutes ? `${reason.maxDurationMinutes} min` : "Unlimited"}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={reason.requiresApproval ? "Yes" : "No"}
                      size="small"
                      color={reason.requiresApproval ? "warning" : "default"}
                    />
                  </TableCell>
                  <TableCell>{reason.sortOrder}</TableCell>
                  <TableCell align="right">
                    <Tooltip title="Edit">
                      <IconButton size="small" onClick={() => handleOpenDialog(reason)}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete">
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => {
                          setReasonToDelete(reason);
                          setDeleteDialogOpen(true);
                        }}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>{editingReason ? "Edit Pause Reason" : "Add Pause Reason"}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={6}>
              <TextField
                label="Code"
                fullWidth
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                placeholder="e.g., LUNCH"
                disabled={!!editingReason}
                helperText="Unique identifier (cannot be changed)"
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                label="Label"
                fullWidth
                value={formData.label}
                onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                placeholder="e.g., Lunch Break"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Description"
                fullWidth
                multiline
                rows={2}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Optional description"
              />
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth>
                <InputLabel>Color</InputLabel>
                <Select
                  value={formData.color}
                  label="Color"
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                >
                  {colorOptions.map((opt) => (
                    <MenuItem key={opt.value} value={opt.value}>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <Box sx={{ width: 16, height: 16, borderRadius: 0.5, bgcolor: opt.value }} />
                        {opt.label}
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth>
                <InputLabel>Icon</InputLabel>
                <Select
                  value={formData.icon}
                  label="Icon"
                  onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                >
                  {iconOptions.map((opt) => (
                    <MenuItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}>
              <TextField
                label="Max Duration (minutes)"
                fullWidth
                type="number"
                value={formData.maxDurationMinutes}
                onChange={(e) => setFormData({ ...formData, maxDurationMinutes: e.target.value })}
                placeholder="Leave empty for unlimited"
                helperText="Auto-unpause after this duration"
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                label="Sort Order"
                fullWidth
                type="number"
                value={formData.sortOrder}
                onChange={(e) => setFormData({ ...formData, sortOrder: parseInt(e.target.value) || 0 })}
                helperText="Lower numbers appear first"
              />
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.requiresApproval}
                    onChange={(e) => setFormData({ ...formData, requiresApproval: e.target.checked })}
                  />
                }
                label="Requires supervisor approval"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={handleCloseDialog} disabled={saving}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={saving}
            startIcon={
              saving ? (
                <CircularProgress size={16} sx={{ color: "inherit" }} />
              ) : null
            }
          >
            {saving
              ? editingReason
                ? "Updating..."
                : "Creating..."
              : editingReason
              ? "Update"
              : "Create"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Confirm Deactivation</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to deactivate the pause reason &quot;{reasonToDelete?.label}&quot;?
            This will hide it from the pause options but preserve historical data.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)} disabled={deleting}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleDelete}
            disabled={deleting}
            startIcon={
              deleting ? (
                <CircularProgress size={16} sx={{ color: "inherit" }} />
              ) : null
            }
          >
            {deleting ? "Deactivating..." : "Deactivate"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

// ============== PAUSE LOGS TAB ==============
const PauseLogsTab = () => {
  const theme = useTheme();
  const { enqueueSnackbar } = useSnackbar();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [pagination, setPagination] = useState({ total: 0, limit: 25, offset: 0 });
  const [filters, setFilters] = useState({
    startDate: "",
    endDate: "",
    extension: "",
  });
  const [totalPauseTime, setTotalPauseTime] = useState("0:00");

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true);
      const params = {
        limit: pagination.limit,
        offset: pagination.offset,
      };
      if (filters.startDate) params.startDate = filters.startDate;
      if (filters.endDate) params.endDate = filters.endDate;
      if (filters.extension) params.extension = filters.extension;

      const response = await API.get("/pause/logs", { params });
      if (response.data.success) {
        setLogs(response.data.data.pauseLogs || []);
        setPagination((prev) => ({
          ...prev,
          total: response.data.data.pagination?.total || 0,
        }));
        setTotalPauseTime(response.data.data.totalPauseFormatted || "0:00");
      }
    } catch (error) {
      enqueueSnackbar("Failed to fetch pause logs", { variant: "error" });
    } finally {
      setLoading(false);
    }
  }, [enqueueSnackbar, pagination.limit, pagination.offset, filters]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleChangePage = (event, newPage) => {
    setPagination((prev) => ({ ...prev, offset: newPage * prev.limit }));
  };

  const handleChangeRowsPerPage = (event) => {
    setPagination((prev) => ({ ...prev, limit: parseInt(event.target.value, 10), offset: 0 }));
  };

  const handleFilterChange = (field, value) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
    setPagination((prev) => ({ ...prev, offset: 0 }));
  };

  const handleExportCSV = async () => {
    try {
      setExporting(true);
      // Small delay to show loading state for UX feedback
      await new Promise((resolve) => setTimeout(resolve, 300));
      
      const csvContent = [
        ["Extension", "Reason Code", "Reason Label", "Start Time", "End Time", "Duration", "Auto Unpaused", "Queue"].join(","),
        ...logs.map((log) =>
          [
            log.extension,
            log.pauseReasonCode,
            log.pauseReasonLabel || "",
            formatDate(log.startTime),
            log.endTime ? formatDate(log.endTime) : "Still Paused",
            formatDuration(log.durationSeconds),
            log.autoUnpaused ? "Yes" : "No",
            log.queueName || "",
          ].join(",")
        ),
      ].join("\n");

      const blob = new Blob([csvContent], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `pause-logs-${new Date().toISOString().split("T")[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
      enqueueSnackbar("CSV exported successfully", { variant: "success" });
    } catch (error) {
      enqueueSnackbar("Failed to export CSV", { variant: "error" });
    } finally {
      setExporting(false);
    }
  };

  return (
    <Box>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
        <Typography variant="h6">Pause Audit Logs</Typography>
        <Box sx={{ display: "flex", gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={
              exporting ? (
                <CircularProgress size={16} sx={{ color: "inherit" }} />
              ) : (
                <DownloadIcon />
              )
            }
            onClick={handleExportCSV}
            disabled={logs.length === 0 || exporting}
          >
            {exporting ? "Exporting..." : "Export CSV"}
          </Button>
          <Button
            variant="outlined"
            startIcon={
              loading ? (
                <CircularProgress size={16} sx={{ color: "inherit" }} />
              ) : (
                <RefreshIcon />
              )
            }
            onClick={fetchLogs}
            disabled={loading}
          >
            {loading ? "Loading..." : "Refresh"}
          </Button>
        </Box>
      </Box>

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3 }} elevation={0} variant="outlined">
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={3}>
            <TextField
              label="Start Date"
              type="date"
              fullWidth
              size="small"
              InputLabelProps={{ shrink: true }}
              value={filters.startDate}
              onChange={(e) => handleFilterChange("startDate", e.target.value)}
            />
          </Grid>
          <Grid item xs={12} sm={3}>
            <TextField
              label="End Date"
              type="date"
              fullWidth
              size="small"
              InputLabelProps={{ shrink: true }}
              value={filters.endDate}
              onChange={(e) => handleFilterChange("endDate", e.target.value)}
            />
          </Grid>
          <Grid item xs={12} sm={3}>
            <TextField
              label="Extension"
              fullWidth
              size="small"
              value={filters.extension}
              onChange={(e) => handleFilterChange("extension", e.target.value)}
              placeholder="Filter by extension"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>
          <Grid item xs={12} sm={3}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Chip
                icon={<History />}
                label={`Total: ${totalPauseTime}`}
                color="primary"
                variant="outlined"
              />
            </Box>
          </Grid>
        </Grid>
      </Paper>

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
          <CircularProgress />
        </Box>
      ) : logs.length === 0 ? (
        <Alert severity="info">No pause logs found for the selected filters.</Alert>
      ) : (
        <>
          <TableContainer component={Paper} elevation={0} sx={{ border: 1, borderColor: "divider" }}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: alpha(theme.palette.primary.main, 0.05) }}>
                  <TableCell>Extension</TableCell>
                  <TableCell>Reason</TableCell>
                  <TableCell>Start Time</TableCell>
                  <TableCell>End Time</TableCell>
                  <TableCell>Duration</TableCell>
                  <TableCell>Auto Unpaused</TableCell>
                  <TableCell>Queue</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id} hover>
                    <TableCell>
                      <Chip label={log.extension} size="small" />
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <Box
                          sx={{
                            width: 12,
                            height: 12,
                            borderRadius: 0.5,
                            bgcolor: log.pauseReason?.color || "#ff9800",
                          }}
                        />
                        <Typography variant="body2">
                          {log.pauseReasonLabel || log.pauseReasonCode}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>{formatDate(log.startTime)}</TableCell>
                    <TableCell>
                      {log.endTime ? (
                        formatDate(log.endTime)
                      ) : (
                        <Chip label="Active" size="small" color="warning" />
                      )}
                    </TableCell>
                    <TableCell>{formatDuration(log.durationSeconds)}</TableCell>
                    <TableCell>
                      {log.autoUnpaused ? (
                        <Chip label="Yes" size="small" color="info" />
                      ) : (
                        "-"
                      )}
                    </TableCell>
                    <TableCell>{log.queueName || "-"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          <TablePagination
            component="div"
            count={pagination.total}
            page={Math.floor(pagination.offset / pagination.limit)}
            onPageChange={handleChangePage}
            rowsPerPage={pagination.limit}
            onRowsPerPageChange={handleChangeRowsPerPage}
            rowsPerPageOptions={[10, 25, 50, 100]}
          />
        </>
      )}
    </Box>
  );
};

// ============== SLA MANAGEMENT TAB ==============
const SLAManagementTab = () => {
  const theme = useTheme();
  const { enqueueSnackbar } = useSnackbar();
  const [queues, setQueues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingQueue, setEditingQueue] = useState(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [slaValue, setSlaValue] = useState("");

  // SLA Presets with professional explanations
  const slaPresets = [
    {
      label: "Aggressive",
      value: 20,
      description: "20 seconds",
      explanation: "Best for emergency services or high-priority support. Requires high agent availability and may increase staffing costs.",
      useCase: "Emergency hotlines, VIP support, critical incident response",
    },
    {
      label: "Standard",
      value: 30,
      description: "30 seconds",
      explanation: "Industry-standard target for most call centers. Balances customer satisfaction with operational efficiency.",
      useCase: "General customer support, sales inquiries, technical helpdesk",
    },
    {
      label: "Moderate",
      value: 45,
      description: "45 seconds",
      explanation: "Suitable for queues with complex routing or when callers expect brief hold times. Good for mixed-priority environments.",
      useCase: "Billing inquiries, appointment scheduling, order status",
    },
    {
      label: "Relaxed",
      value: 60,
      description: "60 seconds",
      explanation: "Default setting. Appropriate for non-urgent inquiries where callers are willing to wait. Reduces staffing pressure.",
      useCase: "General inquiries, feedback lines, non-urgent support",
    },
    {
      label: "Extended",
      value: 90,
      description: "90 seconds",
      explanation: "For low-priority queues or overflow scenarios. Callers may experience longer waits but reduces abandoned calls.",
      useCase: "Callback requests, survey lines, after-hours support",
    },
  ];

  const fetchQueues = useCallback(async () => {
    try {
      setLoading(true);
      const response = await API.get("/voice-queues");
      if (response.data) {
        const queueList = Array.isArray(response.data) ? response.data : response.data.data || [];
        setQueues(queueList);
      }
    } catch (error) {
      enqueueSnackbar("Failed to fetch queues", { variant: "error" });
    } finally {
      setLoading(false);
    }
  }, [enqueueSnackbar]);

  useEffect(() => {
    fetchQueues();
  }, [fetchQueues]);

  const handleEditQueue = (queue) => {
    setEditingQueue(queue);
    setSlaValue(queue.servicelevel || 60);
    setEditDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setEditDialogOpen(false);
    setEditingQueue(null);
    setSlaValue("");
  };

  const handleSaveSLA = async () => {
    try {
      setSaving(true);
      const slaSeconds = parseInt(slaValue) || 60;
      
      await API.put(`/voice-queues/${editingQueue.name}`, {
        ...editingQueue,
        servicelevel: slaSeconds,
      });
      
      enqueueSnackbar(`SLA updated for ${editingQueue.name}`, { variant: "success" });
      handleCloseDialog();
      fetchQueues();
    } catch (error) {
      const message = error.response?.data?.message || "Failed to update SLA";
      enqueueSnackbar(message, { variant: "error" });
    } finally {
      setSaving(false);
    }
  };

  const handleApplyPreset = (presetValue) => {
    setSlaValue(presetValue);
  };

  const getSLAStatus = (servicelevel) => {
    if (!servicelevel || servicelevel === 0) {
      return { color: "warning", label: "Not Set", icon: <WarningIcon fontSize="small" /> };
    }
    if (servicelevel <= 30) {
      return { color: "error", label: "Aggressive", icon: <SpeedIcon fontSize="small" /> };
    }
    if (servicelevel <= 60) {
      return { color: "success", label: "Standard", icon: <CheckCircleIcon fontSize="small" /> };
    }
    return { color: "info", label: "Relaxed", icon: <CheckCircleIcon fontSize="small" /> };
  };

  // Calculate average SLA across all queues
  const calculateAverageSLA = () => {
    const validQueues = queues.filter(q => q.servicelevel && q.servicelevel > 0);
    if (validQueues.length === 0) return 60;
    return Math.round(validQueues.reduce((sum, q) => sum + q.servicelevel, 0) / validQueues.length);
  };

  const averageSLA = calculateAverageSLA();
  const configuredQueues = queues.filter(q => q.servicelevel && q.servicelevel > 0).length;

  return (
    <Box>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
        <Typography variant="h6">SLA Configuration</Typography>
        <Button
          variant="outlined"
          startIcon={
            loading ? (
              <CircularProgress size={16} sx={{ color: "inherit" }} />
            ) : (
              <RefreshIcon />
            )
          }
          onClick={fetchQueues}
          disabled={loading}
        >
          {loading ? "Loading..." : "Refresh"}
        </Button>
      </Box>

      {/* SLA Overview Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={4}>
          <Paper
            sx={{
              p: 2,
              textAlign: "center",
              bgcolor: alpha(theme.palette.primary.main, 0.05),
              border: 1,
              borderColor: "divider",
            }}
            elevation={0}
          >
            <Typography variant="h4" color="primary" fontWeight={600}>
              {averageSLA}s
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Average SLA Threshold
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Paper
            sx={{
              p: 2,
              textAlign: "center",
              bgcolor: alpha(theme.palette.success.main, 0.05),
              border: 1,
              borderColor: "divider",
            }}
            elevation={0}
          >
            <Typography variant="h4" color="success.main" fontWeight={600}>
              {configuredQueues}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Queues with SLA Configured
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Paper
            sx={{
              p: 2,
              textAlign: "center",
              bgcolor: alpha(theme.palette.warning.main, 0.05),
              border: 1,
              borderColor: "divider",
            }}
            elevation={0}
          >
            <Typography variant="h4" color="warning.main" fontWeight={600}>
              {queues.length - configuredQueues}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Queues Using Default (60s)
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      {/* SLA Explanation Section */}
      <Paper sx={{ p: 2, mb: 3, bgcolor: alpha(theme.palette.info.main, 0.05), border: 1, borderColor: alpha(theme.palette.info.main, 0.2) }} elevation={0}>
        <Typography variant="subtitle1" fontWeight={600} gutterBottom color="info.main">
          Understanding SLA (Service Level Agreement)
        </Typography>
        <Typography variant="body2" paragraph>
          <strong>What is SLA?</strong> SLA defines the maximum time (in seconds) a caller should wait before their call is answered by an agent. 
          It&apos;s a key performance indicator that measures how quickly your team responds to incoming calls.
        </Typography>
        <Typography variant="body2" paragraph>
          <strong>How is it calculated?</strong> SLA compliance = (Calls answered within threshold ÷ Total answered calls) × 100%. 
          For example, if your threshold is 30 seconds and 80 out of 100 calls are answered within 30 seconds, your SLA is 80%.
        </Typography>
        <Typography variant="body2">
          <strong>Industry benchmark:</strong> The standard target is &quot;80/20&quot; — 80% of calls answered within 20 seconds. 
          However, this varies by industry: emergency services aim for 90/10, while general support may use 80/60.
        </Typography>
      </Paper>

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
          <CircularProgress />
        </Box>
      ) : queues.length === 0 ? (
        <Alert severity="info">No queues configured. Create queues in the Voice Queues section first.</Alert>
      ) : (
        <TableContainer component={Paper} elevation={0} sx={{ border: 1, borderColor: "divider" }}>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: alpha(theme.palette.primary.main, 0.05) }}>
                <TableCell>Queue Name</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>SLA Threshold</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Strategy</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {queues.map((queue) => {
                const slaStatus = getSLAStatus(queue.servicelevel);
                return (
                  <TableRow key={queue.name} hover>
                    <TableCell>
                      <Chip
                        label={queue.name}
                        size="small"
                        sx={{ fontWeight: 600 }}
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={queue.type || "inbound"}
                        size="small"
                        variant="outlined"
                        color={queue.type === "outbound" ? "secondary" : "primary"}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight={600}>
                        {queue.servicelevel || 60} seconds
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        icon={slaStatus.icon}
                        label={slaStatus.label}
                        size="small"
                        color={slaStatus.color}
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ textTransform: "capitalize" }}>
                        {queue.strategy || "ringall"}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title="Edit SLA">
                        <IconButton
                          size="small"
                          onClick={() => handleEditQueue(queue)}
                          color="primary"
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Edit SLA Dialog */}
      <Dialog
        open={editDialogOpen}
        onClose={handleCloseDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Edit SLA for {editingQueue?.name}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <TextField
              label="SLA Threshold (seconds)"
              type="number"
              fullWidth
              value={slaValue}
              onChange={(e) => setSlaValue(e.target.value)}
              helperText="Time in seconds within which calls should be answered"
              InputProps={{
                endAdornment: <InputAdornment position="end">seconds</InputAdornment>,
              }}
              sx={{ mb: 3 }}
            />

            <Typography variant="subtitle2" gutterBottom>
              Quick Presets
            </Typography>
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mb: 2 }}>
              {slaPresets.map((preset) => (
                <Chip
                  key={preset.value}
                  label={`${preset.label} (${preset.value}s)`}
                  onClick={() => handleApplyPreset(preset.value)}
                  color={parseInt(slaValue) === preset.value ? "primary" : "default"}
                  variant={parseInt(slaValue) === preset.value ? "filled" : "outlined"}
                  sx={{ cursor: "pointer" }}
                />
              ))}
            </Box>

            {/* Show explanation for selected preset */}
            {slaPresets.find(p => p.value === parseInt(slaValue)) && (
              <Paper sx={{ p: 2, bgcolor: alpha(theme.palette.primary.main, 0.05), border: 1, borderColor: alpha(theme.palette.primary.main, 0.2) }} elevation={0}>
                <Typography variant="subtitle2" color="primary" gutterBottom>
                  {slaPresets.find(p => p.value === parseInt(slaValue))?.label} Threshold
                </Typography>
                <Typography variant="body2" paragraph>
                  {slaPresets.find(p => p.value === parseInt(slaValue))?.explanation}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  <strong>Recommended for:</strong> {slaPresets.find(p => p.value === parseInt(slaValue))?.useCase}
                </Typography>
              </Paper>
            )}

            {/* Custom value explanation */}
            {!slaPresets.find(p => p.value === parseInt(slaValue)) && slaValue && (
              <Paper sx={{ p: 2, bgcolor: alpha(theme.palette.grey[500], 0.1), border: 1, borderColor: "divider" }} elevation={0}>
                <Typography variant="subtitle2" gutterBottom>
                  Custom Threshold: {slaValue} seconds
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  You&apos;ve entered a custom SLA threshold. Ensure this aligns with your service commitments and staffing capacity.
                  {parseInt(slaValue) < 20 && " Very aggressive targets may require significant staffing resources."}
                  {parseInt(slaValue) > 90 && " Extended thresholds may impact customer satisfaction."}
                </Typography>
              </Paper>
            )}

            <Alert severity="info" sx={{ mt: 2 }} icon={false}>
              <Typography variant="body2">
                <strong>Change Summary:</strong> {editingQueue?.servicelevel || 60}s → {slaValue || 60}s
                {parseInt(slaValue) < (editingQueue?.servicelevel || 60) && (
                  <Chip label="More Aggressive" size="small" color="warning" sx={{ ml: 1 }} />
                )}
                {parseInt(slaValue) > (editingQueue?.servicelevel || 60) && (
                  <Chip label="More Relaxed" size="small" color="info" sx={{ ml: 1 }} />
                )}
              </Typography>
            </Alert>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={handleCloseDialog} disabled={saving}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSaveSLA}
            disabled={saving}
            startIcon={
              saving ? (
                <CircularProgress size={16} sx={{ color: "inherit" }} />
              ) : (
                <SaveIcon />
              )
            }
          >
            {saving ? "Saving..." : "Save SLA"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

// ============== MAIN SETTINGS COMPONENT ==============
const Settings = () => {
  const theme = useTheme();
  const [tabValue, setTabValue] = useState(0);

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Paper
        elevation={0}
        sx={{
          p: 3,
          mb: 3,
          borderRadius: 2,
          background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.primary.dark})`,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <SettingsIcon sx={{ fontSize: 40, color: "white" }} />
          <Box>
            <Typography variant="h4" sx={{ color: "white", fontWeight: 600 }}>
              Settings
            </Typography>
            <Typography variant="body2" sx={{ color: "white", opacity: 0.8 }}>
              Configure system settings, manage pause reasons, and SLA thresholds
            </Typography>
          </Box>
        </Box>
      </Paper>

      {/* Tabs */}
      <Paper sx={{ borderRadius: 2 }} elevation={0} variant="outlined">
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          sx={{
            borderBottom: 1,
            borderColor: "divider",
            px: 2,
          }}
        >
          <Tab
            icon={<PauseCircle />}
            iconPosition="start"
            label="Pause Reasons"
            sx={{ minHeight: 64 }}
          />
          <Tab
            icon={<History />}
            iconPosition="start"
            label="Pause Logs"
            sx={{ minHeight: 64 }}
          />
          <Tab
            icon={<SpeedIcon />}
            iconPosition="start"
            label="SLA Management"
            sx={{ minHeight: 64 }}
          />
        </Tabs>

        <Box sx={{ p: 3 }}>
          <TabPanel value={tabValue} index={0}>
            <PauseReasonsTab />
          </TabPanel>
          <TabPanel value={tabValue} index={1}>
            <PauseLogsTab />
          </TabPanel>
          <TabPanel value={tabValue} index={2}>
            <SLAManagementTab />
          </TabPanel>
        </Box>
      </Paper>
    </Box>
  );
};

export default Settings;
