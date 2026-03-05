import express from "express";
import { verifyToken } from "../../../common/middlewares/authjwt.middleware.js";
import { 
    getAll,
    getById,
    getPaginated,
    save,
    remove,
    getDropdown,
} from "./pilotos.controller.js";

const PilotosRoutes = express.Router();

PilotosRoutes.get("/all", getAll);
PilotosRoutes.get("/dropdown", getDropdown);
PilotosRoutes.get("/:id", getById);
PilotosRoutes.post("/paginate", getPaginated);
PilotosRoutes.post("/save", verifyToken, save);        // crear o editar
PilotosRoutes.post("/delete", verifyToken, remove);     // eliminar

export default PilotosRoutes;