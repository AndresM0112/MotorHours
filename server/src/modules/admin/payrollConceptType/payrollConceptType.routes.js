import { Router } from "express";
import {
  getAllController,
  getByIdController,
  paginationController,
  saveController,
  removeController,
} from "./payrollConceptType.controller.js";
import { verifyToken } from "../../../common/middlewares/authjwt.middleware.js";

const payrollConceptTypeRoutes = Router();

payrollConceptTypeRoutes.get("/all", verifyToken, getAllController);
payrollConceptTypeRoutes.get("/get-by-id/:tirId", verifyToken, getByIdController);
payrollConceptTypeRoutes.post("/pagination", verifyToken, paginationController);
payrollConceptTypeRoutes.post("/save", verifyToken, saveController);
payrollConceptTypeRoutes.post("/delete", verifyToken, removeController);

export default payrollConceptTypeRoutes;
