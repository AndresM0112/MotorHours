import { Router } from "express";
import {
  getAllController,
  getByIdController,
  paginationController,
  saveController,
  removeController,
} from "./RefundableType.controller.js";
import { verifyToken } from "../../../common/middlewares/authjwt.middleware.js";

const RefundableTypeRoutes = Router();

RefundableTypeRoutes.get("/all", verifyToken, getAllController);
RefundableTypeRoutes.get("/get-by-id/:tirId", verifyToken, getByIdController);
RefundableTypeRoutes.post("/pagination", verifyToken, paginationController);
RefundableTypeRoutes.post("/save", verifyToken, saveController);
RefundableTypeRoutes.post("/delete", verifyToken, removeController);

export default RefundableTypeRoutes;
