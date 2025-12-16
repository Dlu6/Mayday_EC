import express from "express";
import {
  updateSystem,
  getSystemInfo,
} from "../controllers/systemController.js";

const router = express.Router();

router.post("/update", updateSystem);
router.get("/info", getSystemInfo);

export default router;
