import express from "express";
import {
  createInboundRoute,
  deleteInboundRoute,
  getApplications,
  getInboundRoutes,
  getOneInboundRoute,
  updateInboundRoute,
} from "../controllers/inboundRouteController.js";

const router = express.Router();

router.post("/create", createInboundRoute);
router.get("/read", getInboundRoutes);
router.get("/get-one/:routeId", getOneInboundRoute);

router.get("/", getApplications);
// router.post("/create", createInboundRoute);
router.put("/update-inbound-route/:routeId", updateInboundRoute);
router.delete("/delete-inbound/:routeId", deleteInboundRoute);

export default router;
