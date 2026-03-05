import express from "express";
import { verifyToken } from "../../../common/middlewares/authjwt.middleware.js";
import {
  getStatusOperationReport,
  getTopEquipmentsUsage,
  getOperationsByProject,
  getAverageClosureTimePerDay,
} from "./dashboard.controller.js";

const dashboardRoutes = express.Router();

dashboardRoutes.get(
  "/status-operation-report",
  verifyToken,
  getStatusOperationReport
);

dashboardRoutes.get(
  "/top-equipment-usage-report",
  verifyToken,
  getTopEquipmentsUsage
);

dashboardRoutes.get(
  "/operations-by-project-report",
  verifyToken,
  getOperationsByProject
);

dashboardRoutes.get(
  "/average-closure-time-report",
  verifyToken,
  getAverageClosureTimePerDay
);

export default dashboardRoutes;
