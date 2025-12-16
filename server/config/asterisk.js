// // config/asterisk.js
// import { ariService } from "../services/ariService.js";

// export const initializeAsteriskServices = async () => {
//   try {
//     console.log("Starting Asterisk services initialization...");
//     const connected = await ariService.connect();

//     if (!connected) {
//       console.error("Failed to initialize ARI - connection unsuccessful");
//       return false;
//     }

//     // Keep the process alive
//     process.stdin.resume();

//     console.log("Asterisk ARI initialized successfully");
//     return true;
//   } catch (error) {
//     console.error("Failed to initialize Asterisk ARI:", error);
//     return false;
//   }
// };

// // Add cleanup method
// initializeAsteriskServices.cleanup = async () => {
//   try {
//     await ariService.cleanup();
//     console.log("ARI service cleaned up");
//   } catch (error) {
//     console.error("Error cleaning up ARI service:", error);
//   }
// };
