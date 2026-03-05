import { Router } from "express";
import {
  getAllController,
  getByIdController,
  paginationController,
  saveController,
  removeController,
} from "./management.controller.js";
import { verifyToken } from "../../../common/middlewares/authjwt.middleware.js";

const managementRoutes = Router();

managementRoutes.get("/all", verifyToken, getAllController);
managementRoutes.get("/get-by-id/:tiaId", verifyToken, getByIdController);
managementRoutes.post("/pagination", verifyToken, paginationController);
managementRoutes.post("/save", verifyToken, saveController);
managementRoutes.post("/delete", verifyToken, removeController);

export default managementRoutes;
