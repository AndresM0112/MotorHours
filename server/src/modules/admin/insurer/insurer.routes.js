import { Router } from "express";
import {
  getAllController,
  getByIdController,
  paginationController,
  saveController,
  removeController,
} from "./insurer.controller.js";
import { verifyToken } from "../../../common/middlewares/authjwt.middleware.js";

const insurerRoutes = Router();

insurerRoutes.get("/all", verifyToken, getAllController);
insurerRoutes.get("/get-by-id/:tirId", verifyToken, getByIdController);
insurerRoutes.post("/pagination", verifyToken, paginationController);
insurerRoutes.post("/save", verifyToken, saveController);
insurerRoutes.post("/delete", verifyToken, removeController);

export default insurerRoutes;
