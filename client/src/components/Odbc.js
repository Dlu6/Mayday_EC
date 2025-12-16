import { useState, useEffect } from "react";
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControlLabel,
  Switch,
  Tab,
  Tabs,
  TextField,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Alert,
  Snackbar,
  Typography,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import CloseIcon from "@mui/icons-material/Close";
import StorageIcon from "@mui/icons-material/Storage";
import FunctionsIcon from "@mui/icons-material/Functions";
// eslint-disable-next-line no-unused-vars
import apiClient from "../api/apiClient";

const Odbc = () => {
  const [currentTab, setCurrentTab] = useState("connections");
  const [functionDialogOpen, setFunctionDialogOpen] = useState(false);
  const [selectedFunction, setSelectedFunction] = useState(null);
  const [odbcFunctions, setOdbcFunctions] = useState([]);
  // eslint-disable-next-line no-unused-vars
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [functionFormData, setFunctionFormData] = useState({
    name: "",
    dsn: "asterisk",
    readsql: "",
    writesql: "",
    syntax: "",
    synopsis: "",
    enabled: true,
  });
  const [alert, setAlert] = useState({
    open: false,
    message: "",
    severity: "success",
  });

  // Fetch ODBC functions on component mount
  useEffect(() => {
    fetchOdbcFunctions();
  }, []);

  const showAlert = (message, severity) => {
    setAlert({
      open: true,
      message,
      severity,
    });
  };

  // ODBC Functions handlers
  const fetchOdbcFunctions = async () => {
    try {
      const response = await apiClient.get("/users/odbc/functions");
      setOdbcFunctions(response.data || []);
    } catch (error) {
      // Functions endpoint may not exist yet, use default functions
      setOdbcFunctions([
        {
          id: "agent_paused",
          name: "AGENT_PAUSED",
          dsn: "asterisk",
          readsql: "SELECT COALESCE(MAX(CASE WHEN paused = 1 THEN 1 ELSE 0 END), 0) FROM queue_members WHERE interface = CONCAT('PJSIP/', '${ARG1}')",
          syntax: "<extension>",
          synopsis: "Check if an agent extension is currently paused",
          enabled: true,
          isSystem: true,
        },
        {
          id: "user_presence",
          name: "USER_PRESENCE",
          dsn: "asterisk",
          readsql: "SELECT COALESCE(presence, 'UNKNOWN') FROM Users WHERE extension = '${ARG1}'",
          syntax: "<extension>",
          synopsis: "Get user presence status by extension",
          enabled: true,
          isSystem: true,
        },
      ]);
    }
  };

  const handleOpenFunctionDialog = (func = null) => {
    setSelectedFunction(func);
    setFunctionFormData({
      name: func?.name || "",
      dsn: func?.dsn || "asterisk",
      readsql: func?.readsql || "",
      writesql: func?.writesql || "",
      syntax: func?.syntax || "",
      synopsis: func?.synopsis || "",
      enabled: func?.enabled !== false,
    });
    setFunctionDialogOpen(true);
  };

  const handleCloseFunctionDialog = () => {
    setFunctionDialogOpen(false);
    setSelectedFunction(null);
    setFunctionFormData({
      name: "",
      dsn: "asterisk",
      readsql: "",
      writesql: "",
      syntax: "",
      synopsis: "",
      enabled: true,
    });
  };

  const handleFunctionInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFunctionFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSaveFunction = async () => {
    try {
      if (!functionFormData.name || !functionFormData.readsql) {
        showAlert("Name and Read SQL are required", "error");
        return;
      }

      setSaving(true);

      if (selectedFunction && !selectedFunction.isSystem) {
        await apiClient.put(`/users/odbc/functions/${selectedFunction.id}`, functionFormData);
        showAlert("Function updated successfully", "success");
      } else if (!selectedFunction) {
        await apiClient.post("/users/odbc/functions", functionFormData);
        showAlert("Function created successfully", "success");
      } else {
        showAlert("System functions cannot be modified", "warning");
      }

      handleCloseFunctionDialog();
      fetchOdbcFunctions();
    } catch (error) {
      showAlert(
        error.response?.data?.error || "Failed to save function",
        "error"
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteFunction = async (id, isSystem) => {
    if (isSystem) {
      showAlert("System functions cannot be deleted", "warning");
      return;
    }
    
    if (!window.confirm("Are you sure you want to delete this function?")) {
      return;
    }
    
    try {
      await apiClient.delete(`/users/odbc/functions/${id}`);
      showAlert("Function deleted successfully", "success");
      fetchOdbcFunctions();
    } catch (error) {
      showAlert(
        error.response?.data?.error || "Failed to delete function",
        "error"
      );
    }
  };

  const handleTabChange = (event, newValue) => {
    setCurrentTab(newValue);
  };

  return (
    <Box>
      <Tabs
        value={currentTab}
        onChange={handleTabChange}
        sx={{ mb: 2, borderBottom: 1, borderColor: "divider" }}
      >
        <Tab
          icon={<StorageIcon />}
          iconPosition="start"
          label="Connections"
          value="connections"
        />
        <Tab
          icon={<FunctionsIcon />}
          iconPosition="start"
          label="ODBC Functions"
          value="functions"
        />
      </Tabs>

      {/* Connections Tab - Read-only informational view */}
      {currentTab === "connections" && (
        <Box>
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              mb: 2,
            }}
          >
            <Typography variant="h5">ODBC Connections</Typography>
            <Chip label="Read-only" color="info" size="small" />
          </Box>

          <Alert severity="info" sx={{ mb: 2 }}>
            ODBC connections are configured at the system level on the Asterisk server (/etc/odbc.ini).
            These connections provide database access for realtime configuration, CDR logging, and dialplan functions.
          </Alert>

          {loading ? (
            <Box display="flex" justifyContent="center" p={4}>
              <CircularProgress />
            </Box>
          ) : (
            <TableContainer component={Paper} variant="outlined">
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Connection Name</TableCell>
                    <TableCell>DSN</TableCell>
                    <TableCell>Purpose</TableCell>
                    <TableCell>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {/* Show default Asterisk ODBC connections */}
                  <TableRow>
                    <TableCell>
                      <Typography fontWeight="medium">asterisk</Typography>
                    </TableCell>
                    <TableCell sx={{ fontFamily: "monospace", fontSize: "0.85rem" }}>
                      asterisk-connector
                    </TableCell>
                    <TableCell>Main Asterisk database for realtime config, CDR, and dialplan functions</TableCell>
                    <TableCell>
                      <Chip label="Active" color="success" size="small" />
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>
                      <Typography fontWeight="medium">asterisk-cdr</Typography>
                    </TableCell>
                    <TableCell sx={{ fontFamily: "monospace", fontSize: "0.85rem" }}>
                      asterisk-connector
                    </TableCell>
                    <TableCell>Call Detail Records (CDR) logging</TableCell>
                    <TableCell>
                      <Chip label="Active" color="success" size="small" />
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>
          )}

          <Box mt={2} p={2} bgcolor="grey.100" borderRadius={1}>
            <Typography variant="subtitle2" gutterBottom>
              Configuration Files
            </Typography>
            <Typography variant="body2" color="textSecondary" component="div">
              <ul style={{ margin: 0, paddingLeft: 20 }}>
                <li><code>/etc/odbc.ini</code> - System ODBC data source definitions</li>
                <li><code>/etc/asterisk/res_odbc.conf</code> - Asterisk ODBC connection pooling</li>
                <li><code>/etc/asterisk/func_odbc.conf</code> - ODBC functions for dialplan</li>
              </ul>
            </Typography>
          </Box>
        </Box>
      )}

      {/* ODBC Functions Tab */}
      {currentTab === "functions" && (
        <Box>
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              mb: 2,
            }}
          >
            <Typography variant="h5">ODBC Functions</Typography>
            <Button
              variant="contained"
              color="primary"
              startIcon={<AddIcon />}
              onClick={() => handleOpenFunctionDialog()}
            >
              Add Function
            </Button>
          </Box>

          <TableContainer component={Paper} variant="outlined">
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Function Name</TableCell>
                  <TableCell>DSN</TableCell>
                  <TableCell>SQL Query</TableCell>
                  <TableCell>Description</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {odbcFunctions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center">
                      <Typography color="textSecondary" py={2}>
                        No ODBC functions configured.
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  odbcFunctions.map((func) => (
                    <TableRow key={func.id}>
                      <TableCell>
                        <Typography fontWeight="medium">ODBC_{func.name}</Typography>
                      </TableCell>
                      <TableCell>{func.dsn}</TableCell>
                      <TableCell
                        sx={{
                          maxWidth: 250,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          fontFamily: "monospace",
                          fontSize: "0.8rem",
                        }}
                        title={func.readsql}
                      >
                        {func.readsql}
                      </TableCell>
                      <TableCell>{func.synopsis || "-"}</TableCell>
                      <TableCell>
                        <Chip
                          label={func.isSystem ? "System" : "Custom"}
                          color={func.isSystem ? "primary" : "success"}
                          size="small"
                        />
                      </TableCell>
                      <TableCell align="right">
                        <IconButton
                          onClick={() => handleOpenFunctionDialog(func)}
                          color="primary"
                          title={func.isSystem ? "View function" : "Edit function"}
                        >
                          <EditIcon />
                        </IconButton>
                        {!func.isSystem && (
                          <IconButton
                            onClick={() => handleDeleteFunction(func.id, func.isSystem)}
                            color="error"
                            title="Delete function"
                          >
                            <DeleteIcon />
                          </IconButton>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>

          <Box mt={2}>
            <Typography variant="caption" color="textSecondary">
              ODBC functions allow Asterisk dialplan to query databases. System functions (like AGENT_PAUSED) are required for core functionality.
            </Typography>
          </Box>
        </Box>
      )}

      {/* Function Dialog */}
      <Dialog open={functionDialogOpen} onClose={handleCloseFunctionDialog} maxWidth="md" fullWidth>
        <DialogTitle
          sx={{
            bgcolor: "#0f4c75",
            color: "white",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          {selectedFunction ? (selectedFunction.isSystem ? "View System Function" : "Edit ODBC Function") : "New ODBC Function"}
          <IconButton onClick={handleCloseFunctionDialog} sx={{ color: "white" }}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <TextField
            required
            margin="dense"
            label="Function Name"
            name="name"
            fullWidth
            value={functionFormData.name}
            onChange={handleFunctionInputChange}
            helperText="Function will be available as ODBC_[NAME] in dialplan"
            disabled={selectedFunction?.isSystem}
          />
          <TextField
            required
            margin="dense"
            label="DSN"
            name="dsn"
            fullWidth
            value={functionFormData.dsn}
            onChange={handleFunctionInputChange}
            helperText="ODBC connection name to use (e.g., asterisk)"
            sx={{ mt: 2 }}
            disabled={selectedFunction?.isSystem}
          />
          <TextField
            required
            margin="dense"
            label="Read SQL Query"
            name="readsql"
            fullWidth
            multiline
            rows={3}
            value={functionFormData.readsql}
            onChange={handleFunctionInputChange}
            helperText="SQL query to execute. Use ${ARG1}, ${ARG2}, etc. for parameters"
            sx={{ mt: 2 }}
            disabled={selectedFunction?.isSystem}
          />
          <TextField
            margin="dense"
            label="Write SQL Query (Optional)"
            name="writesql"
            fullWidth
            multiline
            rows={2}
            value={functionFormData.writesql}
            onChange={handleFunctionInputChange}
            helperText="SQL query for writing data (optional)"
            sx={{ mt: 2 }}
            disabled={selectedFunction?.isSystem}
          />
          <TextField
            margin="dense"
            label="Syntax"
            name="syntax"
            fullWidth
            value={functionFormData.syntax}
            onChange={handleFunctionInputChange}
            helperText="Function syntax (e.g., <extension> or <queue>,<agent>)"
            sx={{ mt: 2 }}
            disabled={selectedFunction?.isSystem}
          />
          <TextField
            margin="dense"
            label="Synopsis"
            name="synopsis"
            fullWidth
            value={functionFormData.synopsis}
            onChange={handleFunctionInputChange}
            helperText="Brief description of what this function does"
            sx={{ mt: 2 }}
            disabled={selectedFunction?.isSystem}
          />
          <FormControlLabel
            control={
              <Switch
                checked={functionFormData.enabled}
                onChange={handleFunctionInputChange}
                name="enabled"
                color="primary"
                disabled={selectedFunction?.isSystem}
              />
            }
            label="Enabled"
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2, gap: 1 }}>
          <Button variant="outlined" onClick={handleCloseFunctionDialog}>
            {selectedFunction?.isSystem ? "Close" : "Cancel"}
          </Button>
          {!selectedFunction?.isSystem && (
            <Button
              variant="contained"
              onClick={handleSaveFunction}
              disabled={saving}
              startIcon={saving ? <CircularProgress size={20} color="inherit" /> : null}
            >
              {saving ? "Saving..." : selectedFunction ? "Save Changes" : "Add Function"}
            </Button>
          )}
        </DialogActions>
      </Dialog>

      <Snackbar
        open={alert.open}
        autoHideDuration={6000}
        onClose={() => setAlert({ ...alert, open: false })}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert
          severity={alert.severity}
          sx={{ width: "100%" }}
          onClose={() => setAlert({ ...alert, open: false })}
        >
          {alert.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default Odbc;
