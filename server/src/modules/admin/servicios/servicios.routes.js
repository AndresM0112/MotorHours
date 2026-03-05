import express from "express";
import { verifyToken } from "../../../common/middlewares/authjwt.middleware.js";
import { 
    getAll,
    getById,
    getPaginated,
    save,
    remove,
    getDropdown,
} from "./servicios.controller.js";

const ServiciosRoutes = express.Router();

ServiciosRoutes.get("/all", getAll);
ServiciosRoutes.get("/dropdown", getDropdown);
ServiciosRoutes.get("/:id", getById);
ServiciosRoutes.post("/paginate", getPaginated);
ServiciosRoutes.post("/save", verifyToken, save);        // crear o editar
ServiciosRoutes.post("/delete", verifyToken, remove);    // eliminar

export default ServiciosRoutes;
