import { Router } from "express";
import {
  getAll,
  getById,
  save,
  remove,
  getPaginated,
  getAllManagerByArea,
  getAreasWithEncargados,
  getAllByProject,
} from "./areas.controller.js";
import { verifyToken } from "../../../common/middlewares/authjwt.middleware.js";

const areasRoutes = Router();

areasRoutes.get("/all-by-project/:projectId", verifyToken, getAllByProject);
areasRoutes.get("/all", verifyToken, getAll);
areasRoutes.get("/:id", verifyToken, getById);
areasRoutes.post("/paginate", verifyToken, getPaginated);
areasRoutes.post("/save", verifyToken, save);
areasRoutes.post("/delete", verifyToken, remove);
areasRoutes.post("/getAllManagerByIdAreas", verifyToken, getAllManagerByArea);
areasRoutes.post("/getAreasWithEncargados", getAreasWithEncargados);

export default areasRoutes;
