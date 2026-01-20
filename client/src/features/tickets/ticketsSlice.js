// src/features/tickets/ticketsSlice.js
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import apiClient from "../../api/apiClient.js";

// ============================================
// FORM MANAGEMENT THUNKS
// ============================================

/**
 * Fetch all ticket forms
 */
export const fetchTicketForms = createAsyncThunk(
    "tickets/fetchForms",
    async ({ includeInactive = false } = {}, { rejectWithValue }) => {
        try {
            const response = await apiClient.get("/tickets/forms", {
                params: { includeInactive },
            });
            return response.data.forms;
        } catch (error) {
            return rejectWithValue(
                error.response?.data?.message || "Could not fetch ticket forms"
            );
        }
    }
);

/**
 * Fetch a single ticket form
 */
export const fetchTicketForm = createAsyncThunk(
    "tickets/fetchForm",
    async (formId, { rejectWithValue }) => {
        try {
            const response = await apiClient.get(`/tickets/forms/${formId}`);
            return response.data.form;
        } catch (error) {
            return rejectWithValue(
                error.response?.data?.message || "Could not fetch ticket form"
            );
        }
    }
);

/**
 * Create a new ticket form
 */
export const createTicketForm = createAsyncThunk(
    "tickets/createForm",
    async (formData, { dispatch, rejectWithValue }) => {
        try {
            const response = await apiClient.post("/tickets/forms", formData);
            await dispatch(fetchTicketForms({ includeInactive: true }));
            return response.data;
        } catch (error) {
            return rejectWithValue(
                error.response?.data?.message || "Could not create ticket form"
            );
        }
    }
);

/**
 * Update a ticket form
 */
export const updateTicketForm = createAsyncThunk(
    "tickets/updateForm",
    async ({ formId, formData }, { rejectWithValue }) => {
        try {
            const response = await apiClient.put(`/tickets/forms/${formId}`, formData);
            return response.data.form;
        } catch (error) {
            return rejectWithValue(
                error.response?.data?.message || "Could not update ticket form"
            );
        }
    }
);

/**
 * Delete a ticket form
 */
export const deleteTicketForm = createAsyncThunk(
    "tickets/deleteForm",
    async (formId, { dispatch, rejectWithValue }) => {
        try {
            await apiClient.delete(`/tickets/forms/${formId}`);
            await dispatch(fetchTicketForms({ includeInactive: true }));
            return formId;
        } catch (error) {
            return rejectWithValue(
                error.response?.data?.message || "Could not delete ticket form"
            );
        }
    }
);

/**
 * Toggle form active status
 */
export const toggleFormStatus = createAsyncThunk(
    "tickets/toggleStatus",
    async (formId, { rejectWithValue }) => {
        try {
            const response = await apiClient.patch(`/tickets/forms/${formId}/toggle`);
            return response.data.form;
        } catch (error) {
            return rejectWithValue(
                error.response?.data?.message || "Could not toggle form status"
            );
        }
    }
);

// ============================================
// AGENT ASSIGNMENT THUNKS
// ============================================

/**
 * Fetch agents assigned to a form
 */
export const fetchFormAgents = createAsyncThunk(
    "tickets/fetchFormAgents",
    async (formId, { rejectWithValue }) => {
        try {
            const response = await apiClient.get(`/tickets/forms/${formId}/agents`);
            return response.data;
        } catch (error) {
            return rejectWithValue(
                error.response?.data?.message || "Could not fetch form agents"
            );
        }
    }
);

/**
 * Assign agents to a form
 */
export const assignAgentsToForm = createAsyncThunk(
    "tickets/assignAgents",
    async ({ formId, agentIds }, { rejectWithValue }) => {
        try {
            const response = await apiClient.post(`/tickets/forms/${formId}/agents`, {
                agentIds,
            });
            return response.data;
        } catch (error) {
            return rejectWithValue(
                error.response?.data?.message || "Could not assign agents"
            );
        }
    }
);

/**
 * Remove agents from a form
 */
export const removeAgentsFromForm = createAsyncThunk(
    "tickets/removeAgents",
    async ({ formId, agentIds }, { rejectWithValue }) => {
        try {
            const response = await apiClient.delete(`/tickets/forms/${formId}/agents`, {
                data: { agentIds },
            });
            return response.data;
        } catch (error) {
            return rejectWithValue(
                error.response?.data?.message || "Could not remove agents"
            );
        }
    }
);

// ============================================
// SUBMISSION THUNKS
// ============================================

/**
 * Fetch ticket submissions
 */
export const fetchSubmissions = createAsyncThunk(
    "tickets/fetchSubmissions",
    async (filters = {}, { rejectWithValue }) => {
        try {
            const response = await apiClient.get("/tickets/submissions", {
                params: filters,
            });
            return response.data;
        } catch (error) {
            return rejectWithValue(
                error.response?.data?.message || "Could not fetch submissions"
            );
        }
    }
);

/**
 * Update submission status
 */
export const updateSubmissionStatus = createAsyncThunk(
    "tickets/updateSubmissionStatus",
    async ({ submissionId, status, notes }, { rejectWithValue }) => {
        try {
            const response = await apiClient.patch(
                `/tickets/submissions/${submissionId}/status`,
                { status, notes }
            );
            return response.data.submission;
        } catch (error) {
            return rejectWithValue(
                error.response?.data?.message || "Could not update submission status"
            );
        }
    }
);

// ============================================
// SLICE DEFINITION
// ============================================

const ticketsSlice = createSlice({
    name: "tickets",
    initialState: {
        // Forms
        forms: [],
        currentForm: null,
        formLoading: false,
        formError: null,

        // Agent assignments
        assignedAgents: [],
        availableAgents: [],
        agentLoading: false,

        // Submissions
        submissions: [],
        submissionTotal: 0,
        submissionLoading: false,
        submissionError: null,

        // General
        status: "idle",
    },
    reducers: {
        // Real-time event reducers
        formUpdated: (state, action) => {
            const { formId, action: updateAction } = action.payload;
            if (updateAction === "toggled") {
                const index = state.forms.findIndex((f) => f.id === formId);
                if (index !== -1) {
                    state.forms[index].isActive = action.payload.isActive;
                }
            }
        },
        setCurrentForm: (state, action) => {
            state.currentForm = action.payload;
        },
        clearFormError: (state) => {
            state.formError = null;
        },
        clearSubmissionError: (state) => {
            state.submissionError = null;
        },
    },
    extraReducers: (builder) => {
        // Fetch forms
        builder
            .addCase(fetchTicketForms.pending, (state) => {
                state.formLoading = true;
                state.status = "loading";
            })
            .addCase(fetchTicketForms.fulfilled, (state, action) => {
                state.formLoading = false;
                state.forms = action.payload;
                state.status = "succeeded";
            })
            .addCase(fetchTicketForms.rejected, (state, action) => {
                state.formLoading = false;
                state.formError = action.payload;
                state.status = "failed";
            });

        // Fetch single form
        builder
            .addCase(fetchTicketForm.pending, (state) => {
                state.formLoading = true;
            })
            .addCase(fetchTicketForm.fulfilled, (state, action) => {
                state.formLoading = false;
                state.currentForm = action.payload;
            })
            .addCase(fetchTicketForm.rejected, (state, action) => {
                state.formLoading = false;
                state.formError = action.payload;
            });

        // Create form
        builder
            .addCase(createTicketForm.pending, (state) => {
                state.formLoading = true;
            })
            .addCase(createTicketForm.fulfilled, (state) => {
                state.formLoading = false;
            })
            .addCase(createTicketForm.rejected, (state, action) => {
                state.formLoading = false;
                state.formError = action.payload;
            });

        // Update form
        builder
            .addCase(updateTicketForm.pending, (state) => {
                state.formLoading = true;
            })
            .addCase(updateTicketForm.fulfilled, (state, action) => {
                state.formLoading = false;
                state.currentForm = action.payload;
                const index = state.forms.findIndex((f) => f.id === action.payload.id);
                if (index !== -1) {
                    state.forms[index] = action.payload;
                }
            })
            .addCase(updateTicketForm.rejected, (state, action) => {
                state.formLoading = false;
                state.formError = action.payload;
            });

        // Delete form
        builder
            .addCase(deleteTicketForm.pending, (state) => {
                state.formLoading = true;
            })
            .addCase(deleteTicketForm.fulfilled, (state, action) => {
                state.formLoading = false;
                state.forms = state.forms.filter((f) => f.id !== action.payload);
            })
            .addCase(deleteTicketForm.rejected, (state, action) => {
                state.formLoading = false;
                state.formError = action.payload;
            });

        // Toggle status
        builder
            .addCase(toggleFormStatus.fulfilled, (state, action) => {
                const index = state.forms.findIndex((f) => f.id === action.payload.id);
                if (index !== -1) {
                    state.forms[index] = action.payload;
                }
            });

        // Fetch form agents
        builder
            .addCase(fetchFormAgents.pending, (state) => {
                state.agentLoading = true;
            })
            .addCase(fetchFormAgents.fulfilled, (state, action) => {
                state.agentLoading = false;
                state.assignedAgents = action.payload.assignedAgents || [];
                state.availableAgents = action.payload.availableAgents || [];
            })
            .addCase(fetchFormAgents.rejected, (state) => {
                state.agentLoading = false;
            });

        // Fetch submissions
        builder
            .addCase(fetchSubmissions.pending, (state) => {
                state.submissionLoading = true;
            })
            .addCase(fetchSubmissions.fulfilled, (state, action) => {
                state.submissionLoading = false;
                state.submissions = action.payload.submissions || [];
                state.submissionTotal = action.payload.total || 0;
            })
            .addCase(fetchSubmissions.rejected, (state, action) => {
                state.submissionLoading = false;
                state.submissionError = action.payload;
            });

        // Update submission status
        builder
            .addCase(updateSubmissionStatus.fulfilled, (state, action) => {
                const index = state.submissions.findIndex(
                    (s) => s.id === action.payload.id
                );
                if (index !== -1) {
                    state.submissions[index] = action.payload;
                }
            });
    },
});

export const {
    formUpdated,
    setCurrentForm,
    clearFormError,
    clearSubmissionError,
} = ticketsSlice.actions;

export default ticketsSlice.reducer;
