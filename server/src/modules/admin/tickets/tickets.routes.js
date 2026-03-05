import { Router } from "express";
import multer from "multer";
import {
  // Tickets
  getAll,
  getById,
  getPaginated,
  save,
  remove,
  restore,
  updateEstado,
  updateResultado,
  countByEstado,

  // Historial
  historialByTicket,
  agregarHistorial,

  // Catálogos
  getEstados,
  getAcciones,
  getResultados,
  getPrioridades,

  // Asignación
  asignarUsuarios,
  obtenerAsignados,
  reasignar,
  obtenerEstadisticasTickets,

  //Evidencias
  uploadEvidence,
  deleteEvidence,
  previewEvidence,
  getEvidenceDownload,
  getFormatoTicket,
} from "./tickets.controller.js";
import routerGraph from "../../../common/microsftGraph/graphThumb.js";
const upload = multer()
const ticketsRoutes = Router();

// --- Gestión de Tickets
ticketsRoutes.get("/all", getAll);
ticketsRoutes.get("/getById/:id", getById);
ticketsRoutes.post("/paginate", getPaginated);
ticketsRoutes.post("/save", save);
ticketsRoutes.post("/delete", remove);
ticketsRoutes.put("/restore/:id", restore);
ticketsRoutes.put("/estado", updateEstado);
ticketsRoutes.put("/resultado", updateResultado);
ticketsRoutes.get("/count-by-estado", countByEstado);
ticketsRoutes.get("/resumen-estados", obtenerEstadisticasTickets);

// --- Historial
ticketsRoutes.get("/historial/:tktId", historialByTicket);
ticketsRoutes.post("/historial", agregarHistorial);

// --- Catálogos
ticketsRoutes.get("/estados", getEstados);
ticketsRoutes.get("/acciones", getAcciones);
ticketsRoutes.get("/resultados", getResultados);
ticketsRoutes.get("/prioridades", getPrioridades);

// --- Asignación
ticketsRoutes.post("/asignar", asignarUsuarios);
ticketsRoutes.get("/asignados/:tktId", obtenerAsignados);
ticketsRoutes.post("/reasignar", reasignar);

//Evidencias
// ticketsRoutes.post("/:tktId/evidencias",upload.single("files"),uploadEvidence);
ticketsRoutes.post("/evidencias/:tktId/", upload.array("files[]", 20), uploadEvidence);

// Evidencias (delete por tipo o por fileId)
ticketsRoutes.delete("/evidencias/:tktId",deleteEvidence);

ticketsRoutes.get("/evidencias/:fileId/preview", previewEvidence);
ticketsRoutes.get("/evidencias/:fileId/download", getEvidenceDownload);

//PDF Ticket
ticketsRoutes.post("/see_formulario",getFormatoTicket);

ticketsRoutes.use("/", routerGraph);

export default ticketsRoutes;
