import { Router } from "express";
import {
  getAllController,
  getByIdController,
  paginationController,
  saveController,
  removeController,
} from "./centerCost.controller.js";
import { verifyToken } from "../../../common/middlewares/authjwt.middleware.js";

const centerCostRoutes = Router();

centerCostRoutes.get("/all", verifyToken, getAllController);
centerCostRoutes.get("/get-by-id/:tiaId", verifyToken, getByIdController);
centerCostRoutes.post("/pagination", verifyToken, paginationController);
centerCostRoutes.post("/save", verifyToken, saveController);
centerCostRoutes.post("/delete", verifyToken, removeController);

export default centerCostRoutes;
