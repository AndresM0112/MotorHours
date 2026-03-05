import express from "express";
import { verifyToken } from "../../../common/middlewares/authjwt.middleware.js";
import { 
    getAll,
    getById,
    getPaginated,
    save,
    remove,
    getUbicaciones,
} from "./location.controller.js";

const locationRoutes = express.Router();

locationRoutes.get("/all", getAll);
locationRoutes.get("/ubicaciones",getUbicaciones)
locationRoutes.get("/:id", getById);
locationRoutes.post("/paginate", getPaginated);
locationRoutes.post("/save", verifyToken, save);        // crear
// locationRoutes.put("/location/:id",verifyToken, save);      // actualizar
locationRoutes.post("/delete",verifyToken, remove); // eliminar


export default locationRoutes;