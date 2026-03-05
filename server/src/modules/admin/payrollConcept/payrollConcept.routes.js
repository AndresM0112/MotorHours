import { Router } from "express";
import {
  getAllController,
  getByIdController,
  paginationController,
  saveController,
  removeController,
} from "./payrollConcept.controller.js";
import { verifyToken } from "../../../common/middlewares/authjwt.middleware.js";

const payrollConceptRoutes = Router();

payrollConceptRoutes.get("/all", verifyToken, getAllController);
payrollConceptRoutes.get("/get-by-id/:conId", verifyToken, getByIdController);
payrollConceptRoutes.post("/pagination", verifyToken, paginationController);
payrollConceptRoutes.post("/save", verifyToken, saveController);
payrollConceptRoutes.post("/delete", verifyToken, removeController);

export default payrollConceptRoutes;
