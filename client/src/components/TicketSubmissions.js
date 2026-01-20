// client/src/components/TicketSubmissions.js
import React, { useState, useEffect, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import {
    Box,
    Paper,
    Typography,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TablePagination,
    Chip,
    IconButton,
    Tooltip,
    TextField,
    InputAdornment,
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Divider,
    CircularProgress,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import VisibilityIcon from "@mui/icons-material/Visibility";
import RefreshIcon from "@mui/icons-material/Refresh";
import PageTitle from "./PageTitle";
import apiClient from "../api";

const TicketSubmissions = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const formId = searchParams.get("formId");

    const [submissions, setSubmissions] = useState([]);
    const [form, setForm] = useState(null);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [total, setTotal] = useState(0);
    const [searchQuery, setSearchQuery] = useState("");
    const [viewDialog, setViewDialog] = useState({ open: false, submission: null });

    // Normalize label to sentence case
    const normalizeLabel = (label) => {
        if (!label) return "";
        return label.charAt(0).toUpperCase() + label.slice(1).toLowerCase();
    };

    // Fetch form details
    const fetchForm = useCallback(async () => {
        if (!formId) return;
        try {
            const response = await apiClient.get(`/api/tickets/forms/${formId}`);
            setForm(response.data.form);
        } catch (error) {
            console.error("Failed to fetch form:", error);
        }
    }, [formId]);

    // Fetch submissions
    const fetchSubmissions = useCallback(async () => {
        if (!formId) return;
        setLoading(true);
        try {
            const params = new URLSearchParams({
                formId,
                limit: rowsPerPage,
                offset: page * rowsPerPage,
            });
            if (searchQuery) params.append("callerNumber", searchQuery);

            const response = await apiClient.get(`/api/tickets/submissions?${params}`);
            setSubmissions(response.data.submissions || []);
            setTotal(response.data.total || 0);
        } catch (error) {
            console.error("Failed to fetch submissions:", error);
            setSubmissions([]);
        } finally {
            setLoading(false);
        }
    }, [formId, page, rowsPerPage, searchQuery]);

    useEffect(() => {
        fetchForm();
        fetchSubmissions();
    }, [fetchForm, fetchSubmissions]);

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

    // Parse responses JSON
    const parseResponses = (responses) => {
        if (!responses) return {};
        if (typeof responses === "string") {
            try { return JSON.parse(responses); } catch (e) { return {}; }
        }
        return responses;
    };

    // Get form schema fields
    const getFormFields = () => {
        if (!form?.schema) return [];
        let schema = form.schema;
        if (typeof schema === "string") {
            try { schema = JSON.parse(schema); } catch (e) { return []; }
        }
        return schema?.fields || [];
    };

    const handleViewSubmission = (submission) => {
        setViewDialog({ open: true, submission });
    };

    return (
        <Box sx={{ p: 3 }}>
            <PageTitle title={form?.name ? `Submissions: ${form.name}` : "Ticket Submissions"} />

            {/* Header */}
            <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 3 }}>
                <Button
                    startIcon={<ArrowBackIcon />}
                    onClick={() => navigate("/tools/ticket-forms")}
                >
                    Back to Forms
                </Button>
                <Typography variant="h5" sx={{ flex: 1 }}>
                    {form?.name || "Loading..."}
                </Typography>
                <Tooltip title="Refresh">
                    <IconButton onClick={fetchSubmissions} disabled={loading}>
                        <RefreshIcon />
                    </IconButton>
                </Tooltip>
            </Box>

            {/* Search */}
            <Paper sx={{ p: 2, mb: 2 }}>
                <TextField
                    size="small"
                    placeholder="Search by caller number..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    sx={{ width: 300 }}
                    InputProps={{
                        startAdornment: (
                            <InputAdornment position="start">
                                <SearchIcon fontSize="small" />
                            </InputAdornment>
                        ),
                    }}
                />
            </Paper>

            {/* Table */}
            <TableContainer component={Paper}>
                <Table>
                    <TableHead>
                        <TableRow sx={{ backgroundColor: "#f5f5f5" }}>
                            <TableCell>ID</TableCell>
                            <TableCell>Caller</TableCell>
                            <TableCell>Status</TableCell>
                            <TableCell>Submitted</TableCell>
                            <TableCell align="right">Actions</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                                    <CircularProgress size={24} />
                                </TableCell>
                            </TableRow>
                        ) : submissions.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                                    No submissions yet
                                </TableCell>
                            </TableRow>
                        ) : (
                            submissions.map((sub) => (
                                <TableRow key={sub.id} hover>
                                    <TableCell>{sub.id}</TableCell>
                                    <TableCell>{sub.callerNumber || "N/A"}</TableCell>
                                    <TableCell>
                                        <Chip
                                            size="small"
                                            label={sub.status}
                                            color={getStatusColor(sub.status)}
                                        />
                                    </TableCell>
                                    <TableCell>
                                        {new Date(sub.createdAt).toLocaleString()}
                                    </TableCell>
                                    <TableCell align="right">
                                        <Tooltip title="View Details">
                                            <IconButton
                                                size="small"
                                                onClick={() => handleViewSubmission(sub)}
                                            >
                                                <VisibilityIcon fontSize="small" />
                                            </IconButton>
                                        </Tooltip>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
                <TablePagination
                    component="div"
                    count={total}
                    page={page}
                    onPageChange={(_, newPage) => setPage(newPage)}
                    rowsPerPage={rowsPerPage}
                    onRowsPerPageChange={(e) => {
                        setRowsPerPage(parseInt(e.target.value, 10));
                        setPage(0);
                    }}
                    rowsPerPageOptions={[10, 25, 50]}
                />
            </TableContainer>

            {/* View Dialog */}
            <Dialog
                open={viewDialog.open}
                onClose={() => setViewDialog({ open: false, submission: null })}
                maxWidth="md"
                fullWidth
            >
                <DialogTitle>Submission Details</DialogTitle>
                <DialogContent dividers>
                    {viewDialog.submission && (
                        <>
                            <Box sx={{ display: "flex", gap: 4, mb: 3 }}>
                                <Box>
                                    <Typography variant="caption" color="text.secondary">Status</Typography>
                                    <Box>
                                        <Chip
                                            size="small"
                                            label={viewDialog.submission.status}
                                            color={getStatusColor(viewDialog.submission.status)}
                                        />
                                    </Box>
                                </Box>
                                <Box>
                                    <Typography variant="caption" color="text.secondary">Caller</Typography>
                                    <Typography>{viewDialog.submission.callerNumber || "N/A"}</Typography>
                                </Box>
                                <Box>
                                    <Typography variant="caption" color="text.secondary">Submitted</Typography>
                                    <Typography>
                                        {new Date(viewDialog.submission.createdAt).toLocaleString()}
                                    </Typography>
                                </Box>
                            </Box>

                            <Divider sx={{ mb: 2 }} />
                            <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                                Form Responses
                            </Typography>

                            {getFormFields().map((field) => {
                                const values = parseResponses(viewDialog.submission.responses);
                                return (
                                    <Box key={field.id} sx={{ mb: 2 }}>
                                        <Typography variant="caption" color="text.secondary">
                                            {normalizeLabel(field.label)}
                                        </Typography>
                                        <Typography>{values[field.id] || "-"}</Typography>
                                    </Box>
                                );
                            })}
                        </>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setViewDialog({ open: false, submission: null })}>
                        Close
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default TicketSubmissions;
