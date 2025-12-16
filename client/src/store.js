//store.js

import { configureStore } from "@reduxjs/toolkit";
import authReducer from "./features/auth/authSlice";
import agentsReducer from "./features/agents/agentsSlice";
// import { apiService } from './api/apiService';
import networkReducer from "./features/network/networkSlice.js";
import trunkReducer from "./features/trunks/trunkSlice.js";
import inboundRouteReducer from "./features/inboundRoutes/inboundRouteSlice.js";
import voiceQueueReducer from "./features/voiceQueues/voiceQueueSlice.js";
import audioReducer from "./features/audio/audioSlice.js";
import outboundRouteReducer from "./features/outboundRoutes/outboundRouteSlice.js";
import reportsReducer from "./features/reports/reportsSlice.js";
import ivrReducer from "./features/ivr/ivrSlice.js";
import intervalReducer from "./features/intervals/intervalSlice.js";
import recordingsReducer from "./features/recordings/recordingsSlice.js";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    agents: agentsReducer,
    network: networkReducer,
    trunk: trunkReducer,
    inboundRoute: inboundRouteReducer,
    voiceQueue: voiceQueueReducer,
    audio: audioReducer,
    outboundRoute: outboundRouteReducer,
    reports: reportsReducer,
    ivr: ivrReducer,
    intervals: intervalReducer,
    recordings: recordingsReducer,

    // [apiService.reducerPath]: apiService.reducer,
    // other reducers...
  },
  // middleware: (getDefaultMiddleware) =>
  //   getDefaultMiddleware().concat(apiService.middleware),
});

export default store;
