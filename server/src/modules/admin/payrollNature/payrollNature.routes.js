import { Router } from "express";
import {
  getAllController,
  getByIdController,
  paginationController,
  saveController,
  removeController,
} from "./payrollNature.controller.js";
import { verifyToken } from "../../../common/middlewares/authjwt.middleware.js";

const payrollNatureRoutes = Router();

payrollNatureRoutes.get("/all", verifyToken, getAllController);
payrollNatureRoutes.get("/get-by-id/:tirId", verifyToken, getByIdController);
payrollNatureRoutes.post("/pagination", verifyToken, paginationController);
payrollNatureRoutes.post("/save", verifyToken, saveController);
payrollNatureRoutes.post("/delete", verifyToken, removeController);

export default payrollNatureRoutes;
