import { Router } from "express";
import {
  getAllController,
  getByIdController,
  paginationController,
  saveController,
  removeController,
} from "./position.controller.js";
import { verifyToken } from "../../../common/middlewares/authjwt.middleware.js";

const positionRoutes = Router();

positionRoutes.get("/all", verifyToken, getAllController);
positionRoutes.get("/get-by-id/:tiaId", verifyToken, getByIdController);
positionRoutes.post("/pagination", verifyToken, paginationController);
positionRoutes.post("/save", verifyToken, saveController);
positionRoutes.post("/delete", verifyToken, removeController);

export default positionRoutes;
