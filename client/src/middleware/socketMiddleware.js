// export const socketMiddleware = (socketClient) => {
//     let socket;
  
//     return (store) => (next) => (action) => {
//       switch (action.type) {
//         case 'WS_CONNECT':
//           if (socket !== undefined) {
//             socket.disconnect();
//           }
  
//           // Initialize WebSocket connection
//           socket = socketClient.connect(action.payload.url);
  
//           // Listen for messages from the server
//           socket.on('agent-updated', (agent) => {
//             store.dispatch({ type: 'agents/agentUpdated', payload: agent });
//           });
//           socket.on('agent-created', (agent) => {
//             store.dispatch({ type: 'agents/agentCreated', payload: agent });
//           });
//           socket.on('agent-deleted', (agentId) => {
//             store.dispatch({ type: 'agents/agentDeleted', payload: agentId });
//           });
//           break;
  
//         case 'WS_DISCONNECT':
//           if (socket) {
//             socket.disconnect();
//           }
//           socket = undefined;
//           break;
  
//         // Can add more cases here to emit events to the server
//         // For example, when creating, updating, or deleting an agent
  
//         default:
//           return next(action);
//       }
//     };
//   };