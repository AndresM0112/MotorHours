import express from "express";
import { verifyToken } from "../../../common/middlewares/authjwt.middleware.js";
import {
// BLOQUES
  getAll,
  getById,
  getPaginated,
  save,
  remove,

  // LOCALES
  getLocalesByBlock,
  createLocal,
  updateLocalById,
  deleteLocalById,
  getAllLocales,


  // PROPIETARIOS / CLIENTES
  getPropietarios,
  setPropietarios,

  // CONSULTAS POR CLIENTE
  getBlocksByClient,
  getLocalesByBlockAndClientController,

  importProperties,
  importPropertiesExcel,
} from "./blocks.controller.js";

const blocksRoutes = express.Router();


/* ============================
   BLOQUES
   ============================ */
blocksRoutes.get("/all", getAll);

blocksRoutes.post("/paginate", getPaginated);

// usa verifyToken para operaciones de escritura
blocksRoutes.post("/save", verifyToken, save);
blocksRoutes.post("/delete", verifyToken, remove);

/* ============================
   LOCALES 
   ============================ */

//  listar TODOS los locales (activo/no eliminado)
blocksRoutes.get("/locales/all", verifyToken, getAllLocales);

// Locales por bloque, filtrable por clientId (?clientId=123)
blocksRoutes.get("/:bloId/locales/by-client", getLocalesByBlockAndClientController);


// locales de un bloque
blocksRoutes.get("/:bloId/locales", getLocalesByBlock);

// CRUD locales
blocksRoutes.post("/locales", verifyToken, createLocal);
blocksRoutes.put("/locales/:id", verifyToken, updateLocalById);
blocksRoutes.delete("/locales/:id", verifyToken, deleteLocalById);

/* ============================
   PROPIETARIOS / ENCARGADOS DE LOCAL
   ============================ */
blocksRoutes.get("/locales/:locId/propietarios", getPropietarios);
blocksRoutes.put("/locales/:locId/propietarios", verifyToken, setPropietarios);

/* ============================
   CONSULTAS POR CLIENTE
   ============================ */
// Bloques donde el cliente tiene al menos un local
blocksRoutes.get("/clients/:clientId/blocks", getBlocksByClient);

/* DETALLE BLOQUE (genérica, al FINAL) */
blocksRoutes.get("/:id", getById);


/* ============================
   IMPORTACIÓN UNIFICADA (Bloque + Local + Propietarios)
   ============================ */
blocksRoutes.post("/import_properties", verifyToken, importProperties);         // JSON
blocksRoutes.post("/import_properties_excel", verifyToken, importPropertiesExcel); // Excel

export default blocksRoutes;
