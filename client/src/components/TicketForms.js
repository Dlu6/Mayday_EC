// client/src/components/TicketForms.js
import { useEffect, useState, useCallback } from "react";
import {
    Grid,
    Paper,
    Typography,
    Button,
    Box,
    Chip,
    Switch,
    FormControlLabel,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    List,
    ListItem,
    ListItemText,
    Card,
    CardContent,
    InputAdornment,
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import PeopleIcon from "@mui/icons-material/People";
import VisibilityIcon from "@mui/icons-material/Visibility";
import AddIcon from "@mui/icons-material/Add";
import SearchIcon from "@mui/icons-material/Search";
import CloseIcon from "@mui/icons-material/Close";
import KeyboardDoubleArrowLeftIcon from "@mui/icons-material/KeyboardDoubleArrowLeft";
import KeyboardDoubleArrowRightIcon from "@mui/icons-material/KeyboardDoubleArrowRight";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import { useSelector, useDispatch } from "react-redux";
import { useSnackbar } from "notistack";
import { useNavigate } from "react-router-dom";

import {
    fetchTicketForms,
    deleteTicketForm,
    toggleFormStatus,
    fetchFormAgents,
    assignAgentsToForm,
    removeAgentsFromForm,
} from "../features/tickets/ticketsSlice.js";
import ConfirmDeletionDialog from "../utils/ConfirmDeletionDialog";
import LoadingIndicator from "./common/LoadingIndicator.js";
import { getSocket } from "../services/websocketService.js";

const TicketForms = () => {
    const { forms, formLoading, formError, assignedAgents, availableAgents, agentLoading } = useSelector(
        (state) => state.tickets
    );
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [selectedForm, setSelectedForm] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [showInactive, setShowInactive] = useState(true);

    // Agent assignment dialog state
    const [agentDialogOpen, setAgentDialogOpen] = useState(false);
    const [agentDialogForm, setAgentDialogForm] = useState(null);
    const [selectedAgentsList, setSelectedAgentsList] = useState([]);
    const [availableAgentsList, setAvailableAgentsList] = useState([]);
    const [searchAvailable, setSearchAvailable] = useState("");
    const [searchSelected, setSearchSelected] = useState("");

    const { enqueueSnackbar } = useSnackbar();
    const dispatch = useDispatch();
    const navigate = useNavigate();

    // Fetch forms on mount and when showInactive changes
    useEffect(() => {
        dispatch(fetchTicketForms({ includeInactive: showInactive }));
    }, [dispatch, showInactive]);

    // Update agent lists when data is fetched
    useEffect(() => {
        setSelectedAgentsList(assignedAgents || []);
        setAvailableAgentsList(availableAgents || []);
    }, [assignedAgents, availableAgents]);

    // WebSocket listener for real-time updates
    const handleFormUpdate = useCallback((data) => {
        console.log("[TicketForms] Received form update:", data);
        // Refresh the forms list when any form is updated
        dispatch(fetchTicketForms({ includeInactive: showInactive }));

        if (data.action === "created") {
            enqueueSnackbar("New form created", { variant: "info" });
        } else if (data.action === "deleted") {
            enqueueSnackbar("Form deleted", { variant: "info" });
        }
    }, [dispatch, showInactive, enqueueSnackbar]);

    useEffect(() => {
        const socket = getSocket();
        if (socket) {
            socket.on("ticket:form_updated", handleFormUpdate);
        }

        return () => {
            if (socket) {
                socket.off("ticket:form_updated", handleFormUpdate);
            }
        };
    }, [handleFormUpdate]);

    useEffect(() => {
        if (formError) {
            enqueueSnackbar(formError, { variant: "error" });
        }
    }, [formError, enqueueSnackbar]);

    const handleAddForm = () => {
        navigate("/tools/ticket-forms/new");
    };

    const handleEditForm = (id, event) => {
        event?.stopPropagation();
        navigate(`/tools/ticket-forms/${id}`);
    };

    const handleViewSubmissions = (id, event) => {
        event?.stopPropagation();
        navigate(`/ticket-submissions?formId=${id}`);
    };

    const handleToggleStatus = async (id, event) => {
        event?.stopPropagation();
        try {
            const result = await dispatch(toggleFormStatus(id)).unwrap();
            enqueueSnackbar(
                `Form ${result.isActive ? "activated" : "deactivated"}`,
                { variant: "success" }
            );
        } catch (error) {
            enqueueSnackbar(error || "Failed to toggle form status", {
                variant: "error",
            });
        }
    };

    const handleDeleteForm = (id) => {
        setDeleteDialogOpen(true);
        setSelectedForm(forms.find((form) => form.id === id));
    };

    const handleConfirmDelete = async () => {
        if (selectedForm) {
            setIsDeleting(true);
            try {
                await dispatch(deleteTicketForm(selectedForm.id)).unwrap();
                enqueueSnackbar("Form deleted successfully", { variant: "success" });
            } catch (error) {
                enqueueSnackbar(error || "Failed to delete form", {
                    variant: "error",
                });
            } finally {
                setIsDeleting(false);
                setDeleteDialogOpen(false);
            }
        }
    };

    // ============================================
    // AGENT ASSIGNMENT DIALOG (Following QueueEdit.js pattern)
    // ============================================

    const handleOpenAgentDialog = (id, event) => {
        event?.stopPropagation();
        const form = forms.find((f) => f.id === id);
        setAgentDialogForm(form);
        setAgentDialogOpen(true);
        dispatch(fetchFormAgents(id));
    };

    const handleCloseAgentDialog = () => {
        setAgentDialogOpen(false);
        setAgentDialogForm(null);
        setSearchAvailable("");
        setSearchSelected("");
    };

    const handleToggleAgent = (agent) => {
        const isSelected = selectedAgentsList.some((a) => a.id === agent.id);

        if (isSelected) {
            setSelectedAgentsList(selectedAgentsList.filter((a) => a.id !== agent.id));
            setAvailableAgentsList([...availableAgentsList, agent]);
        } else {
            setSelectedAgentsList([...selectedAgentsList, agent]);
            setAvailableAgentsList(availableAgentsList.filter((a) => a.id !== agent.id));
        }
    };

    const handleAddAllAgents = () => {
        setSelectedAgentsList([...selectedAgentsList, ...availableAgentsList]);
        setAvailableAgentsList([]);
    };

    const handleRemoveAllAgents = () => {
        setAvailableAgentsList([...availableAgentsList, ...selectedAgentsList]);
        setSelectedAgentsList([]);
    };

    const handleSaveAgentAssignments = async () => {
        if (!agentDialogForm) return;

        try {
            const currentIds = (assignedAgents || []).map((a) => a.id);
            const newIds = selectedAgentsList.map((a) => a.id);

            const toAdd = newIds.filter((id) => !currentIds.includes(id));
            const toRemove = currentIds.filter((id) => !newIds.includes(id));

            if (toAdd.length > 0) {
                await dispatch(assignAgentsToForm({ formId: agentDialogForm.id, agentIds: toAdd })).unwrap();
            }

            if (toRemove.length > 0) {
                await dispatch(removeAgentsFromForm({ formId: agentDialogForm.id, agentIds: toRemove })).unwrap();
            }

            enqueueSnackbar(
                `Agent assignments updated (${toAdd.length} added, ${toRemove.length} removed)`,
                { variant: "success" }
            );

            // Refresh forms list to update agent counts
            dispatch(fetchTicketForms({ includeInactive: showInactive }));
            handleCloseAgentDialog();
        } catch (error) {
            enqueueSnackbar(error || "Failed to update agent assignments", {
                variant: "error",
            });
        }
    };

    const filteredAvailable = availableAgentsList.filter(
        (agent) =>
            agent.username?.toLowerCase().includes(searchAvailable.toLowerCase()) ||
            agent.name?.toLowerCase().includes(searchAvailable.toLowerCase()) ||
            agent.extension?.includes(searchAvailable)
    );

    const filteredSelected = selectedAgentsList.filter(
        (agent) =>
            agent.username?.toLowerCase().includes(searchSelected.toLowerCase()) ||
            agent.name?.toLowerCase().includes(searchSelected.toLowerCase()) ||
            agent.extension?.includes(searchSelected)
    );

    const renderStatusCell = (params) => (
        <Chip
            label={params.row.isActive ? "Active" : "Inactive"}
            color={params.row.isActive ? "success" : "default"}
            size="small"
            onClick={(e) => handleToggleStatus(params.row.id, e)}
            sx={{ cursor: "pointer" }}
        />
    );

    const renderActionCell = (params) => (
        <Box key={params.row.id}>
            <Tooltip title="Edit Form">
                <IconButton
                    aria-label="Edit"
                    onClick={(event) => handleEditForm(params.row.id, event)}
                    size="small"
                >
                    <EditIcon />
                </IconButton>
            </Tooltip>
            <Tooltip title="Manage Agent Assignments">
                <IconButton
                    aria-label="Agents"
                    onClick={(event) => handleOpenAgentDialog(params.row.id, event)}
                    size="small"
                    color="primary"
                >
                    <PeopleIcon />
                </IconButton>
            </Tooltip>
            <Tooltip title="View Submissions">
                <IconButton
                    aria-label="Submissions"
                    onClick={(event) => handleViewSubmissions(params.row.id, event)}
                    size="small"
                    color="info"
                >
                    <VisibilityIcon />
                </IconButton>
            </Tooltip>
            <Tooltip title="Delete Form">
                <IconButton
                    aria-label="Delete"
                    onClick={() => handleDeleteForm(params.row.id)}
                    size="small"
                >
                    <DeleteIcon color="error" />
                </IconButton>
            </Tooltip>
        </Box>
    );

    const columns = [
        { field: "id", headerName: "ID", width: 70 },
        { field: "name", headerName: "Form Name", width: 200, flex: 1 },
        {
            field: "description",
            headerName: "Description",
            width: 250,
            flex: 1,
            renderCell: (params) => (
                <Typography variant="body2" noWrap title={params.value}>
                    {params.value || "-"}
                </Typography>
            ),
        },
        {
            field: "isActive",
            headerName: "Status",
            width: 100,
            renderCell: renderStatusCell,
        },
        {
            field: "agentCount",
            headerName: "Agents",
            width: 80,
            renderCell: (params) => (
                <Chip
                    label={params.value || 0}
                    size="small"
                    variant="outlined"
                    icon={<PeopleIcon fontSize="small" />}
                />
            ),
        },
        {
            field: "schema",
            headerName: "Fields",
            width: 80,
            renderCell: (params) => (
                <Chip
                    label={params.value?.fields?.length || 0}
                    size="small"
                    variant="outlined"
                />
            ),
        },
        {
            field: "createdAt",
            headerName: "Created",
            width: 120,
            renderCell: (params) =>
                params.value
                    ? new Date(params.value).toLocaleDateString()
                    : "-",
        },
        {
            field: "actions",
            headerName: "Actions",
            width: 180,
            sortable: false,
            filterable: false,
            renderCell: renderActionCell,
        },
    ];

    return (
        <Paper sx={{ p: 3, borderRadius: 2 }}>
            <Grid container spacing={3} alignItems="center" mb={2}>
                <Grid item xs={12} sm={6}>
                    <Typography variant="h6">Ticket Forms</Typography>
                    <Typography variant="body2" color="text.secondary">
                        Create and manage dynamic ticket forms for agents
                    </Typography>
                </Grid>
                <Grid
                    item
                    xs={12}
                    sm={6}
                    sx={{
                        textAlign: { sm: "right" },
                        display: "flex",
                        justifyContent: { xs: "flex-start", sm: "flex-end" },
                        alignItems: "center",
                        gap: 2,
                    }}
                >
                    <FormControlLabel
                        control={
                            <Switch
                                checked={showInactive}
                                onChange={(e) => setShowInactive(e.target.checked)}
                                size="small"
                            />
                        }
                        label="Show Inactive"
                    />
                    <Button
                        variant="contained"
                        startIcon={<AddIcon />}
                        onClick={handleAddForm}
                    >
                        Create Form
                    </Button>
                </Grid>
            </Grid>

            {formLoading ? (
                <Box sx={{ textAlign: "center", mt: 2 }}>
                    <Typography>Loading ticket forms...</Typography>
                    <LoadingIndicator />
                </Box>
            ) : (
                <Box sx={{ height: 500, width: "100%" }}>
                    <DataGrid
                        rows={forms || []}
                        columns={columns}
                        autoHeight
                        getRowId={(row) => row.id}
                        loading={formLoading}
                        pageSizeOptions={[10, 25, 50]}
                        initialState={{
                            pagination: { paginationModel: { pageSize: 10 } },
                        }}
                        sx={{
                            "& .MuiDataGrid-cell:focus": {
                                outline: "solid 2px transparent",
                            },
                            "& .MuiDataGrid-cell:focus-within": {
                                outline: "solid 2px transparent",
                            },
                        }}
                    />
                </Box>
            )}

            {/* Delete Confirmation Dialog */}
            <ConfirmDeletionDialog
                open={deleteDialogOpen}
                onClose={() => setDeleteDialogOpen(false)}
                onConfirm={handleConfirmDelete}
                title={
                    isDeleting ? "Deleting Form..." : "Confirm Form Deletion"
                }
                message={`Are you sure you want to delete the form "${selectedForm?.name}"? If it has submissions, it will be deactivated instead.`}
                isDeleting={isDeleting}
            />

            {/* Agent Assignment Dialog (Following QueueEdit.js pattern) */}
            <Dialog
                open={agentDialogOpen}
                onClose={handleCloseAgentDialog}
                maxWidth="md"
                fullWidth
                PaperProps={{
                    sx: { borderRadius: 2, overflow: "hidden" },
                }}
            >
                <DialogTitle
                    sx={{
                        bgcolor: "primary.main",
                        color: "primary.contrastText",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                    }}
                >
                    Assign Agents to Form: {agentDialogForm?.name}
                    <IconButton onClick={handleCloseAgentDialog} sx={{ color: "inherit" }}>
                        <CloseIcon />
                    </IconButton>
                </DialogTitle>

                <DialogContent sx={{ mt: 2 }}>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 2, mb: 2 }}>
                        Select which agents can access this form in their Electron softphone.
                    </Typography>

                    {agentLoading ? (
                        <Box sx={{ textAlign: "center", py: 4 }}>
                            <LoadingIndicator />
                        </Box>
                    ) : (
                        <Grid container spacing={2}>
                            {/* Available Agents */}
                            <Grid item xs={5}>
                                <TextField
                                    margin="dense"
                                    value={searchAvailable}
                                    onChange={(e) => setSearchAvailable(e.target.value)}
                                    placeholder="Search..."
                                    type="search"
                                    fullWidth
                                    variant="standard"
                                    InputProps={{
                                        startAdornment: (
                                            <InputAdornment position="start">
                                                <SearchIcon />
                                            </InputAdornment>
                                        ),
                                    }}
                                    sx={{ mt: 1 }}
                                />
                                <Box sx={{ height: 350, display: "flex", flexDirection: "column", mt: 1 }}>
                                    <Card variant="outlined" sx={{ flexGrow: 1, overflow: "auto" }}>
                                        <CardContent>
                                            <Typography gutterBottom>
                                                Available Agents ({filteredAvailable.length})
                                            </Typography>
                                            <List sx={{ maxHeight: 260, overflow: "auto" }}>
                                                {filteredAvailable.map((agent) => (
                                                    <ListItem
                                                        key={agent.id}
                                                        button
                                                        onClick={() => handleToggleAgent(agent)}
                                                        sx={{
                                                            borderRadius: 1,
                                                            mb: 0.5,
                                                            "&:hover": { bgcolor: "action.hover" },
                                                        }}
                                                    >
                                                        <ListItemText
                                                            primary={agent.name || agent.username}
                                                            secondary={`Ext: ${agent.extension || "N/A"}`}
                                                        />
                                                    </ListItem>
                                                ))}
                                            </List>
                                        </CardContent>
                                    </Card>
                                </Box>
                            </Grid>

                            {/* Transfer buttons */}
                            <Grid
                                item
                                xs={2}
                                sx={{
                                    display: "flex",
                                    flexDirection: "column",
                                    alignItems: "center",
                                    justifyContent: "center",
                                }}
                            >
                                <IconButton onClick={handleAddAllAgents} title="Add all agents">
                                    <KeyboardDoubleArrowRightIcon />
                                </IconButton>
                                <IconButton onClick={handleRemoveAllAgents} title="Remove all agents">
                                    <KeyboardDoubleArrowLeftIcon />
                                </IconButton>
                            </Grid>

                            {/* Assigned Agents */}
                            <Grid item xs={5}>
                                <TextField
                                    margin="dense"
                                    value={searchSelected}
                                    onChange={(e) => setSearchSelected(e.target.value)}
                                    placeholder="Search..."
                                    type="search"
                                    fullWidth
                                    variant="standard"
                                    InputProps={{
                                        startAdornment: (
                                            <InputAdornment position="start">
                                                <SearchIcon />
                                            </InputAdornment>
                                        ),
                                    }}
                                    sx={{ mt: 1 }}
                                />
                                <Box sx={{ height: 350, display: "flex", flexDirection: "column", mt: 1 }}>
                                    <Card variant="outlined" sx={{ flexGrow: 1, overflow: "auto" }}>
                                        <CardContent>
                                            <Typography gutterBottom>
                                                Assigned Agents ({filteredSelected.length})
                                            </Typography>
                                            <List sx={{ maxHeight: 260, overflow: "auto" }}>
                                                {filteredSelected.map((agent) => (
                                                    <ListItem
                                                        key={agent.id}
                                                        button
                                                        onClick={() => handleToggleAgent(agent)}
                                                        sx={{
                                                            borderRadius: 1,
                                                            mb: 0.5,
                                                            bgcolor: "success.light",
                                                            "&:hover": { bgcolor: "success.main" },
                                                        }}
                                                    >
                                                        <ListItemText
                                                            primary={agent.name || agent.username}
                                                            secondary={`Ext: ${agent.extension || "N/A"}`}
                                                        />
                                                    </ListItem>
                                                ))}
                                            </List>
                                        </CardContent>
                                    </Card>
                                </Box>
                            </Grid>
                        </Grid>
                    )}
                </DialogContent>

                <DialogActions sx={{ p: 2 }}>
                    <Button onClick={handleCloseAgentDialog}>Cancel</Button>
                    <Button
                        variant="contained"
                        onClick={handleSaveAgentAssignments}
                        disabled={agentLoading}
                    >
                        Save Assignments
                    </Button>
                </DialogActions>
            </Dialog>
        </Paper>
    );
};

export default TicketForms;
