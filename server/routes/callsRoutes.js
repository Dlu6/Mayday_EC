import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import { originateCall, hangupCall } from "../controllers/callsController.js";

const router = express.Router();

router.use(authMiddleware);

// POST /api/calls/originate
router.post("/originate", originateCall);

// POST /api/calls/hangup
router.post("/hangup", hangupCall);

export default router;
