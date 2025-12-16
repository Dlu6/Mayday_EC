import { useEffect, useState } from "react";
import {
  Avatar,
  Box,
  Fab,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Paper,
  Checkbox,
  Divider,
  Alert,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import { useDispatch, useSelector } from "react-redux";
import IconButton from "@mui/material/IconButton";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import { useSnackbar } from "notistack";
import { useNavigate } from "react-router-dom";
import { getSocket, connectWebSocket } from "../services/websocketService";
import useAuth from "../hooks/useAuth";

import NewAgentForm from "./forms/NewAgentForm";
import {
  agentDeleted,
  deleteAgent,
  fetchAgents,
} from "../features/agents/agentsSlice.js";
// import TableLoadingIndicator from "../assets/tableLoadingIndicator.json";
import ConfirmDeletionDialog from "../utils/ConfirmDeletionDialog";
import LoadingIndicator from "./common/LoadingIndicator";

const AgentsComponent = () => {
  const { agents, status, error, loading } = useSelector(
    (state) => state.agents
  );
  const dispatch = useDispatch();
  const { handleTokenInvalidation } = useAuth();

  useEffect(() => {
    const fetchData = async () => {
      try {
        await dispatch(fetchAgents()).unwrap();
      } catch (error) {
        console.error("Error fetching agents:", error);
        if (error.response && error.response.status === 401) {
          handleTokenInvalidation();
        }
      }
    };

    fetchData();
  }, [dispatch, handleTokenInvalidation]);

  const [open, setOpen] = useState(false);
  const [selectedAgents, setSelectedAgents] = useState([]);

  const [anchorEl, setAnchorEl] = useState(null);
  const [currentAgentId, setCurrentAgentId] = useState(null);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const { enqueueSnackbar } = useSnackbar();
  const [isDeleting, setIsDeleting] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    dispatch(fetchAgents())
      .unwrap()
      .catch((error) => {
        console.error("Fetch failed:", error);
      });
  }, [dispatch]);

  useEffect(() => {
    let socket = getSocket();

    if (!socket) {
      socket = connectWebSocket();
      if (!socket) {
        console.error("Failed to initialize WebSocket");
        return;
      }
    }

    const handleAgentDeleted = (deletedAgentId) => {
      dispatch(agentDeleted(deletedAgentId));
    };

    const handleAgentUpdated = () => {
      dispatch(fetchAgents());
    };

    socket.on("agent-deleted", handleAgentDeleted);
    socket.on("agent-updated", handleAgentUpdated);

    // Initial fetch
    dispatch(fetchAgents());

    return () => {
      if (socket) {
        socket.off("agent-deleted", handleAgentDeleted);
        socket.off("agent-updated", handleAgentUpdated);
      }
    };
  }, [dispatch]);

  const handleOpen = () => setOpen(true);
  const handleClose = () => setOpen(false);

  // Update handleNewAgent to refresh the agents list
  const handleNewAgent = async () => {
    try {
      await dispatch(fetchAgents()).unwrap(); // Refresh the agents list
      enqueueSnackbar("Agent created successfully", { variant: "success" });
      handleClose();
    } catch (error) {
      enqueueSnackbar("Error refreshing agents list", { variant: "error" });
    }
  };

  //Handle individual row checkbox change
  const handleCheckboxChange = (agentId) => {
    const currentIndex = selectedAgents.indexOf(agentId);
    const newSelectedAgents = [...selectedAgents];

    if (currentIndex === -1) {
      newSelectedAgents.push(agentId);
    } else {
      newSelectedAgents.splice(currentIndex, 1);
    }

    setSelectedAgents(newSelectedAgents);
  };

  //Check if all rows are selected
  const isAllSelected =
    agents.length > 0 && selectedAgents.length === agents.length;

  //Handle select all checkbox change
  const handleSelectAllClick = () => {
    if (isAllSelected) {
      setSelectedAgents([]);
    } else {
      setSelectedAgents(agents.map((agent) => agent.id));
    }
  };

  //More agent options
  const handleMenuClick = (event, agentId) => {
    setCurrentAgentId(agentId);
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  //Delete agent account
  const showDeleteConfirmation = (agentId) => {
    setCurrentAgentId(agentId);
    setConfirmOpen(true);
    handleMenuClose();
  };

  const handleDeleteAgent = async () => {
    setIsDeleting(true);
    dispatch(deleteAgent(currentAgentId))
      .unwrap()
      .then(() => {
        enqueueSnackbar("Agent deleted successfully", { variant: "success" });
      })
      .catch((error) => {
        const errorMessage = error.message || "Failed to delete agent";
        enqueueSnackbar(errorMessage, { variant: "error" });
      })
      .finally(() => {
        setIsDeleting(false);
        setConfirmOpen(false);
      });
  };

  const handleEditAgent = (agentId, extension) => {
    navigate(`/agents/edit/${agentId}`, { state: { extension } });
  };

  // Modify the Menu component implementation
  const renderAgentMenu = (agent) => {
    const menuId = `menu-${agent.id}`;
    const isMenuOpen = Boolean(anchorEl) && currentAgentId === agent.id;

    return (
      <>
        <IconButton
          aria-label={`more options for ${agent.fullName}`}
          aria-controls={isMenuOpen ? menuId : undefined}
          aria-expanded={isMenuOpen}
          aria-haspopup="menu"
          onClick={(event) => handleMenuClick(event, agent.id)}
          size="small"
        >
          <MoreVertIcon />
        </IconButton>
        <Menu
          id={menuId}
          anchorEl={anchorEl}
          open={isMenuOpen}
          onClose={handleMenuClose}
          MenuListProps={{
            "aria-labelledby": `menu-button-${agent.id}`,
            role: "menu",
          }}
          anchorOrigin={{
            vertical: "bottom",
            horizontal: "right",
          }}
          transformOrigin={{
            vertical: "top",
            horizontal: "right",
          }}
          slotProps={{
            paper: {
              elevation: 3,
              sx: { width: "20ch" },
            },
          }}
        >
          <MenuItem
            onClick={() => {
              handleEditAgent(agent.id, agent.extension);
              handleMenuClose();
            }}
            role="menuitem"
            sx={{ fontStyle: "italic", fontSize: "14px" }}
          >
            Edit Agent
          </MenuItem>
          <MenuItem
            onClick={() => {
              showDeleteConfirmation(agent.id);
              handleMenuClose();
            }}
            role="menuitem"
            sx={{ fontStyle: "italic", fontSize: "14px", color: "#BD2A2E" }}
          >
            Delete Agent
          </MenuItem>
        </Menu>
      </>
    );
  };

  return (
    <>
      <Box sx={{ position: "relative", height: "100%", pb: 8 }}>
        {status === "failed" && (
          <Alert severity="error" sx={{ mb: 2 }}>
            Error loading agents: {error}
          </Alert>
        )}

        {status === "loading" ? (
          <LoadingIndicator />
        ) : agents.length === 0 ? (
          <Alert severity="info" sx={{ mb: 2 }}>
            No agents found. Create one using the + button below.
          </Alert>
        ) : (
          <Paper sx={{ width: "100%", overflowX: "auto" }}>
            <Table stickyHeader aria-label="agents table">
              <TableHead>
                <TableRow>
                  <TableCell padding="checkbox">
                    <Checkbox
                      indeterminate={
                        selectedAgents.length > 0 &&
                        selectedAgents.length < agents.length
                      }
                      checked={isAllSelected}
                      onChange={handleSelectAllClick}
                    />
                  </TableCell>
                  <TableCell
                    sx={{
                      backgroundColor: "rgba(255, 255, 255, 0.1)",
                      color: "rgba(0, 0, 0, 0.54)",
                    }}
                  >
                    Avatar
                  </TableCell>
                  <TableCell
                    sx={{
                      backgroundColor: "rgba(255, 255, 255, 0.1)",
                      color: "rgba(0, 0, 0, 0.54)",
                    }}
                  >
                    Full Name
                  </TableCell>
                  <TableCell
                    sx={{
                      backgroundColor: "rgba(255, 255, 255, 0.1)",
                      color: "rgba(0, 0, 0, 0.54)",
                    }}
                  >
                    Username
                  </TableCell>
                  <TableCell
                    sx={{
                      backgroundColor: "rgba(255, 255, 255, 0.1)",
                      color: "rgba(0, 0, 0, 0.54)",
                    }}
                  >
                    Typology
                  </TableCell>
                  <TableCell
                    sx={{
                      backgroundColor: "rgba(255, 255, 255, 0.1)",
                      color: "rgba(0, 0, 0, 0.54)",
                    }}
                  >
                    Email
                  </TableCell>
                  <TableCell
                    sx={{
                      backgroundColor: "rgba(255, 255, 255, 0.1)",
                      color: "rgba(0, 0, 0, 0.54)",
                    }}
                  >
                    Internal Number
                  </TableCell>
                  <TableCell
                    sx={{
                      backgroundColor: "rgba(255, 255, 255, 0.1)",
                      color: "rgba(0, 0, 0, 0.54)",
                    }}
                  >
                    Actions
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {agents.map((agent) => {
                  const isSelected = selectedAgents.indexOf(agent.id) !== -1;

                  return (
                    <TableRow key={agent.id} selected={isSelected} hover>
                      <TableCell padding="checkbox">
                        <Checkbox
                          checked={isSelected}
                          onChange={() => handleCheckboxChange(agent.id)}
                        />
                      </TableCell>
                      <TableCell>
                        <Avatar>
                          {typeof agent.fullName === "string"
                            ? agent.fullName[0]
                            : "?"}
                        </Avatar>
                      </TableCell>
                      <TableCell>{agent.fullName || "N/A"}</TableCell>
                      <TableCell>{agent.username}</TableCell>
                      <TableCell>{agent.typology}</TableCell>
                      <TableCell>{agent.email}</TableCell>
                      <TableCell>{agent?.extension}</TableCell>
                      <TableCell>{renderAgentMenu(agent)}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Paper>
        )}
        <Fab
          color="primary"
          aria-label="add"
          sx={{ position: "fixed", bottom: 16, right: 16 }}
          onClick={handleOpen}
        >
          <AddIcon />
        </Fab>
        <NewAgentForm
          open={open}
          handleClose={handleClose}
          handleNewAgent={handleNewAgent}
        />
      </Box>

      <Divider sx={{ my: 2 }} />
      <ConfirmDeletionDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleDeleteAgent}
        title={loading ? "Deleting Profile..." : "Confirm Deletion!"}
        message="Are you sure you want to delete this agent? This action cannot be undone."
        isDeleting={isDeleting}
      />
    </>
  );
};
export default AgentsComponent;
