import { Router } from "express";
import {
  getAllController,
  getByIdController,
  paginationController,
  saveController,
  removeController,
} from "./insurerTypeService.controller.js";
import { verifyToken } from "../../../common/middlewares/authjwt.middleware.js";

const insureTypeRoutes = Router();

insureTypeRoutes.get("/all", verifyToken, getAllController);
insureTypeRoutes.get("/get-by-id/:tiaId", verifyToken, getByIdController);
insureTypeRoutes.post("/pagination", verifyToken, paginationController);
insureTypeRoutes.post("/save", verifyToken, saveController);
insureTypeRoutes.post("/delete", verifyToken, removeController);

export default insureTypeRoutes;
