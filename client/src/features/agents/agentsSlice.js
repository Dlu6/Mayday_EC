// src/features/agents/agentsSlice.js
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import apiClient from "../../api/apiClient.js";

export const createAgent = createAsyncThunk(
  "agents/createAgent",
  async (agentData, { dispatch, rejectWithValue }) => {
    try {
      const response = await apiClient.post("/users/createAgent", agentData);
      await dispatch(fetchAgents());
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Could not create agent"
      );
    }
  }
);

// Async thunk for fetching agents
export const fetchAgents = createAsyncThunk(
  "agents/fetchAgents",
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiClient.get("/users/agents");
      return response.data.data;
      // const { data } = await apiClient.get("/users/agents");
      // return data.agents;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Could not fetch agents"
      );
    }
  }
);

export const fetchAgentDetailsByExtension = createAsyncThunk(
  "agents/fetchAgentDetailsByExtension",
  async (agentId, { rejectWithValue }) => {
    try {
      const { data } = await apiClient.get(`/users/agents/${agentId}`);
      if (!data) {
        throw new Error("Agent not found");
      }

      const agentData = {
        ...data,
        ...(data.PJSIPEndpoint && {
          webrtc: data.PJSIPEndpoint.webrtc,
          transport: data.ps_endpoint.transport,
        }),
        ...(data.PJSIPAuth && {
          sipUsername: data.PJSIPAuth.username,
        }),
      };
      return agentData;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Could not fetch agent details"
      );
    }
  }
);

// Async thunk for updating agent details
export const updateAgentDetails = createAsyncThunk(
  "agents/updateAgentDetails",
  async ({ agentId, agentDetails }, { rejectWithValue }) => {
    try {
      const { userData, pjsipData } = agentDetails;
      const response = await apiClient.put(`/users/agents/${agentId}`, {
        userData,
        pjsipData,
      });

      if (!response.data.success) {
        throw new Error(response.data.message || "Update failed");
      }
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Could not update agent details"
      );
    }
  }
);

//Delete Agent
export const deleteAgent = createAsyncThunk(
  "agents/deleteAgent",
  async (agentId, { rejectWithValue }) => {
    try {
      await apiClient.delete(`/users/agents/${agentId}`);
      return agentId;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Could not delete agent"
      );
    }
  }
);

// Reset Agent Password
export const resetAgentPassword = createAsyncThunk(
  "agents/resetAgentPassword",
  async ({ agentId, newPassword }, { rejectWithValue }) => {
    try {
      const response = await apiClient.post(`/users/agents/${agentId}/reset-password`, {
        newPassword,
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Could not reset password"
      );
    }
  }
);

const agentsSlice = createSlice({
  name: "agents",
  initialState: {
    agents: [],
    currentAgent: null,
    loading: false,
    error: null,
    socketConnected: false,
    status: "idle",
  },
  reducers: {
    // Real-time event reducers
    agentCreated: (state, action) => {
      state.agents.push(action.payload);
      state.loading = false;
      state.status = "succeeded";
    },
    agentUpdated: (state, action) => {
      const index = state.agents.findIndex(
        (agent) => agent.id === action.payload.id
      );
      if (index !== -1) {
        state.agents[index] = action.payload;
      }
    },
    agentDeleted: (state, action) => {
      state.agents = state.agents.filter(
        (agent) => agent.id !== action.payload
      );
    },
    updateAgentInState: (state, action) => {
      const index = state.agents.findIndex(
        (agent) => agent.id === action.payload.id
      );
      if (index !== -1) {
        state.agents[index] = action.payload;
      }
    },
    setCurrentAgent: (state, action) => {
      state.currentAgent = action.payload;
    },
    setSocketStatus: (state, action) => {
      state.socketConnected = action.payload;
    },
    updateAgentsList: (state, action) => {
      state.agents = action.payload;
      state.status = "succeeded";
      state.loading = false;
    },
    // Define other reducers that directly update the state if needed
  },
  extraReducers: (builder) => {
    builder
      .addCase(createAgent.pending, (state) => {
        state.status = "loading";
        state.loading = true;
      })
      .addCase(createAgent.fulfilled, (state) => {
        state.status = "succeeded";
        state.loading = false;
      })
      .addCase(createAgent.rejected, (state, action) => {
        state.status = "failed";
        state.loading = false;
        state.error = action.payload;
      });

    // Get agents
    builder
      .addCase(fetchAgents.pending, (state) => {
        state.status = "loading";
        state.loading = true;
      })
      .addCase(fetchAgents.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.agents = action.payload;
        state.loading = false;
      })
      .addCase(fetchAgents.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload;
        state.loading = false;
      });
    //Get Agent Details
    builder
      // Add handling for fetchAgentDetailsByExtension
      .addCase(fetchAgentDetailsByExtension.pending, (state) => {
        state.status = "loading";
        state.loading = true;
      })
      .addCase(fetchAgentDetailsByExtension.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.currentAgent = action.payload.data; // Update the state with the fetched agent details
        state.loading = false;
      })
      .addCase(fetchAgentDetailsByExtension.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload;
        state.loading = false;
      });
    // Updates Agent
    builder
      .addCase(updateAgentDetails.pending, (state) => {
        state.loading = true;
      })
      .addCase(updateAgentDetails.fulfilled, (state, action) => {
        const index = state.agents.findIndex(
          (agent) => agent.id === action.payload.id
        );
        if (index !== -1) {
          state.agents[index] = action.payload;
          state.currentAgent = action.payload; //To update the current agent being edited
        }
        state.loading = false;
      })
      .addCase(updateAgentDetails.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload;
        state.loading = false;
      });
    // Delete Agents
    builder
      .addCase(deleteAgent.pending, (state) => {
        state.loading = true;
      })
      .addCase(deleteAgent.fulfilled, (state, action) => {
        state.agents = state.agents.filter(
          (agent) => agent.id !== action.payload
        );
        state.loading = false;
      })
      .addCase(deleteAgent.rejected, (state, action) => {
        state.error = action.payload;
        state.loading = false;
      });
  },
});

export const {
  agentCreated,
  agentUpdated,
  agentDeleted,
  updateAgentInState,
  setCurrentAgent,
  setSocketStatus,
  updateAgentsList,
} = agentsSlice.actions;

export default agentsSlice.reducer;
