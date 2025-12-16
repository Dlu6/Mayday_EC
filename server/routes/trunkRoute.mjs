// routes/trunkRoutes.js
import express from "express";
import {
  createTrunk,
  updateTrunk,
  deleteTrunk,
  getTrunks,
  getTrunkById,
} from "../controllers/trunkController.js";

const router = express.Router();

router.post("/create", createTrunk);
router.get("/read", getTrunks);
router.get("/:trunkId", getTrunkById);
router.put("/update/:trunkId", updateTrunk);
router.delete("/delete/:trunkId", deleteTrunk);

export default router;
