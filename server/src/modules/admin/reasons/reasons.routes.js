import express from "express";
import { verifyToken } from "../../../common/middlewares/authjwt.middleware.js";
import {
  deleteReason,
  getReasons,
  paginationReasons,
  saveReason,
  updateModulesReason,
} from "./reasons.controller.js";

const reasonsRoutes = express.Router();

reasonsRoutes.get("/get_reasons", verifyToken, getReasons);
reasonsRoutes.post("/pagination_reasons", verifyToken, paginationReasons);
reasonsRoutes.post("/save_reason", verifyToken, saveReason);
reasonsRoutes.put("/update_modules_reason", verifyToken, updateModulesReason);
reasonsRoutes.put("/delete_reason", verifyToken, deleteReason);

export default reasonsRoutes;
