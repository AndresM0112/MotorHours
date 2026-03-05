import express from "express";
import { verifyToken } from "../../../common/middlewares/authjwt.middleware.js";
import { 
    getAll,
    getById,
    getPaginated,
    save,
    remove,
    getDropdown,
} from "./alistamiento.controller.js";

const AlistamientoRoutes = express.Router();

AlistamientoRoutes.get("/all", getAll);
AlistamientoRoutes.get("/dropdown", getDropdown);
AlistamientoRoutes.get("/:id", getById);
AlistamientoRoutes.post("/paginate", getPaginated);
AlistamientoRoutes.post("/save", verifyToken, save);        // crear
// AlistamientoRoutes.put("/:id", verifyToken, save);   // actualizar
AlistamientoRoutes.post("/delete", verifyToken, remove);     // eliminar

export default AlistamientoRoutes;