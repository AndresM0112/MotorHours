import express from "express";
import { verifyToken } from "../../../common/middlewares/authjwt.middleware.js";
import { 
    getAll,
    getById,
    getPaginated,
    save,
    remove,
    getDropdown,
} from "./motos.controller.js";

const MotosRoutes = express.Router();

MotosRoutes.get("/all", getAll);
MotosRoutes.get("/dropdown", getDropdown);
MotosRoutes.get("/:id", getById);
MotosRoutes.post("/paginate", getPaginated);
MotosRoutes.post("/save", verifyToken, save);        // crear
// MotosRoutes.put("/motos/:id", verifyToken, save);   // actualizar
MotosRoutes.post("/delete", verifyToken, remove);     // eliminar

export default MotosRoutes;