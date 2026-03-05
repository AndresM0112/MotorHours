import express from "express";
import { verifyToken } from "../../../common/middlewares/authjwt.middleware.js";
import { reportInventory, reportMovements } from "./reports.controller.js";

const reportsRoutes = express.Router();

reportsRoutes.post(
  "/report_inventory",
  verifyToken,
  reportInventory
);

reportsRoutes.post(
  "/report_movements",
  verifyToken,
  reportMovements
);

export default reportsRoutes;
