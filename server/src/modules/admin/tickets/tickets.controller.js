import {
  getAllTickets,
  getTicketById,
  paginationTickets,
  saveTicket,
  updateTicketEstado,
  updateTicketResultado,
  deleteTickets,
  restoreTicket,
  countTicketsByEstado,
  addTicketHistorial,
  getHistorialByTicket,
  getAllEstados,
  getAllAcciones,
  getAllResultados,
  getAllPrioridades,
  asignarUsuariosATicket,
  getAsignadosByTicket,
  reasignarTicket,
  getResumenPorEstados,
  getTicketReportePDF,
  // getTicketReporteHTML,
} from "./tickets.service.js";
import sharepointQueue from "../../../common/configs/Queue/sharepointWorker.js";
import { SeeFile, downloadFile } from "../../../common/microsftGraph/funciones.js";
import { htmlToPDFBuffer } from "../../../common/services/saveFormTickets.js";

const getFilesArray = (req) => {
  if (Array.isArray(req.files)) return req.files;
  if (req.file) return [req.file];
  return [];
};

const mapFile = (f, tipo) => ({
  buffer: f.buffer,
  extension: (f.originalname?.split(".").pop() || "").toLowerCase(),
  originalname: f.originalname,
  mimetype: f.mimetype,
  size: f.size,
  nombre: f.originalname?.replace(/\.[^.]+$/, "") || `evidencia_${tipo}`,
});

// === TICKETS ===
export const getAll = async (_, res) => {
  try {
    const result = await getAllTickets();
    res.status(200).json(result);
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error al obtener tickets", error: err.message });
  }
};

export const getById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await getTicketById(id);
    if (!result)
      return res.status(404).json({ message: "Ticket no encontrado" });
    res.status(200).json(result);
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error al obtener ticket", error: err.message });
  }
};

// export const getFormatoTicket = async (req, res) => {
//   try {
//     const { ticketId } = req.body;
//     if (!ticketId) throw new Error("Faltan datos");

//     // Genera el HTML del ticket usando tu servicio
//     const { html } = await getTicketReporteHTML(ticketId);
//     if (!html) throw new Error("No se pudo generar el HTML del ticket");

//     // Convierte HTML a PDF
//     const buffer = await htmlToPDFBuffer(html);
//     if (!buffer) throw new Error("No se generó el buffer PDF");

//     // Configura headers
//     res.setHeader("Content-Type", "application/pdf");
//     res.setHeader("Content-Disposition", "inline; filename=ticket.pdf");
//     res.setHeader("Access-Control-Expose-Headers", "Content-Disposition, Content-Type");
//     res.setHeader("Cache-Control", "no-store");

//     return res.status(200).end(buffer);
//   } catch (error) {
//     return res.status(500).json({
//       message: error?.message ?? "Error generando el PDF del ticket",
//     });
//   }
// };

export const getFormatoTicket = async (req, res) => {
  try {
    const { ticketId } = req.body;
    if (!ticketId) throw new Error("Faltan datos");

    const { success, buffer, filename, extension, error } =
      await getTicketReportePDF(ticketId);

    if (!success || !buffer) {
      throw new Error(error || "No se pudo generar el PDF del ticket");
    }

    const finalName = filename || `ticket_${ticketId}`;
    const ext = extension || "pdf";

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `inline; filename="${finalName}.${ext}"`
    );
    res.setHeader(
      "Access-Control-Expose-Headers",
      "Content-Disposition, Content-Type"
    );
    res.setHeader("Cache-Control", "no-store");

    return res.status(200).end(buffer);
  } catch (error) {
    console.error("[getFormatoTicket] error:", error?.message || error);
    return res.status(500).json({
      message: error?.message ?? "Error generando el PDF del ticket",
    });
  }
};

export const obtenerEstadisticasTickets = async (req, res) => {
  try {
    const usuarioId = +req.headers["currenuserapp"];
    const permisos = JSON.parse(
      req.headers["currentpermissionsuserapp"] || "[]"
    ).map((p) => String(p.perId));

    const data = await getResumenPorEstados(usuarioId, permisos);
    res.status(200).json({ data });
  } catch (error) {
    console.error("Error en obtenerEstadisticasTickets:", error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
};

export const getPaginated = async (req, res) => {
  try {
    const usuarioId = +req.headers["currenuserapp"];
    const permisos = JSON.parse(
      req.headers["currentpermissionsuserapp"] || "[]"
    ).map((p) => String(p.perId));

    const result = await paginationTickets({
      ...req.body,
      usuarioId,
      permisos,
    });
    res.status(200).json(result);
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error al paginar tickets", error: err.message });
  }
};

export const save = async (req, res) => {
  try {
    const result = await saveTicket(req.body);
    res.status(200).json(result);
  } catch (err) {
    res
      .status(400)
      .json({ message: "Error al guardar ticket", error: err.message });
  }
};

export const remove = async (req, res) => {
  try {
    const { ticketIds, usuarioId } = req.body;
    if (!ticketIds || !usuarioId) {
      return res
        .status(400)
        .json({ message: "Faltan datos para eliminar el ticket" });
    }
    await deleteTickets(ticketIds, usuarioId);
    res.status(200).json({ message: "Ticket(s) eliminado(s)" });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error al eliminar ticket", error: err.message });
  }
};

export const restore = async (req, res) => {
  try {
    const { id } = req.params;
    const { usuarioId } = req.body;
    const result = await restoreTicket(id, usuarioId);
    res.status(200).json(result);
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error al restaurar ticket", error: err.message });
  }
};

export const updateEstado = async (req, res) => {
  try {
    const { tktId, nuevoEstado, usuarioId, comentario } = req.body;
    const result = await updateTicketEstado(
      tktId,
      nuevoEstado,
      usuarioId,
      comentario
    );
    res.status(200).json(result);
  } catch (err) {
    res
      .status(400)
      .json({ message: "Error al actualizar estado", error: err.message });
  }
};

export const updateResultado = async (req, res) => {
  try {
    const { tktId, resultadoId, usuarioId } = req.body;
    const result = await updateTicketResultado(tktId, resultadoId, usuarioId);
    res.status(200).json(result);
  } catch (err) {
    res
      .status(400)
      .json({ message: "Error al actualizar resultado", error: err.message });
  }
};

export const countByEstado = async (req, res) => {
  try {
    const usuarioId = +req.headers["currenuserapp"];
    const permisos = JSON.parse(
      req.headers["currentpermissionsuserapp"] || "[]"
    ).map((p) => String(p.perId));

    const result = await countTicketsByEstado({ usuarioId, permisos });

    res.status(200).json(result);
  } catch (err) {
    res.status(500).json({
      message: "Error al contar por estado",
      error: err.message,
    });
  }
};

// === HISTORIAL ===
export const historialByTicket = async (req, res) => {
  try {
    const { tktId } = req.params;
    const result = await getHistorialByTicket(tktId);
    res.status(200).json(result);
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error al obtener historial", error: err.message });
  }
};

export const agregarHistorial = async (req, res) => {
  try {
    const result = await addTicketHistorial(req.body);
    res.status(200).json(result);
  } catch (err) {
    res
      .status(400)
      .json({ message: "Error al agregar historial", error: err.message });
  }
};

// === CATÁLOGOS ===
export const getEstados = async (_, res) => {
  try {
    const result = await getAllEstados();
    res.status(200).json(result);
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error al obtener estados", error: err.message });
  }
};

export const getAcciones = async (_, res) => {
  try {
    const result = await getAllAcciones();
    res.status(200).json(result);
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error al obtener acciones", error: err.message });
  }
};

export const getResultados = async (_, res) => {
  try {
    const result = await getAllResultados();
    res.status(200).json(result);
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error al obtener resultados", error: err.message });
  }
};

export const getPrioridades = async (_, res) => {
  try {
    const result = await getAllPrioridades();
    res.status(200).json(result);
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error al obtener prioridades", error: err.message });
  }
};

// === ASIGNACIÓN ===
export const asignarUsuarios = async (req, res) => {
  try {
    const { tktId, usuarios } = req.body;
    const result = await asignarUsuariosATicket(tktId, usuarios);
    res.status(200).json(result);
  } catch (err) {
    res
      .status(400)
      .json({ message: "Error al asignar usuarios", error: err.message });
  }
};

export const obtenerAsignados = async (req, res) => {
  try {
    const { tktId } = req.params;
    const { onlyActual = false } = req.query;
    const result = await getAsignadosByTicket(tktId, onlyActual === "true");
    res.status(200).json(result);
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error al obtener asignados", error: err.message });
  }
};

export const reasignar = async (req, res) => {
  try {
    const { tktId, nuevoUsuarioId } = req.body;
    const result = await reasignarTicket(tktId, nuevoUsuarioId);
    res.status(200).json(result);
  } catch (err) {
    res
      .status(400)
      .json({ message: "Error al reasignar ticket", error: err.message });
  }
};


// export const uploadEvidence = async (req, res) => {
//   const { tktId } = req.params;
//   const { tipo } = req.body; // 1 ó 2 
//   const files = req.files || (req.files ? [req.files] : []); // soporta single o array

//   console.log(tktId);
  
//   if (!tktId || ![1,2].includes(Number(tipo))) {
//     return res.status(400).json({ ok: false, message: "Parámetros inválidos" });
//   }
//   if (!files.length) {
//     return res.status(400).json({ ok: false, message: "No se recibieron archivos" });
//   }

//   const mapFile = (f) => ({
//     buffer: f.buffer,
//     extension: (f.originalname?.split(".").pop() || "").toLowerCase(),
//     originalname: f.originalname,
//     mimetype: f.mimetype,
//     size: f.size,
//     nombre: f.originalname?.replace(/\.[^.]+$/, "") || `evidencia_${tipo}`,
//   });

//   const payloads = files.map((f) => ({
//     tktId: Number(tktId),
//     tipo: Number(tipo),
//     doc: mapFile(f),
//     usuarioId: req?.user?.id || null,
//   }));

//   // Encola un job por archivo
//   await Promise.all(payloads.map(p =>
//     sharepointQueue.add("tickets.saveEvidence", p, {
//       attempts: 3,
//       backoff: { type: "exponential", delay: 5000 },
//       removeOnComplete: true
//     })
//   ));

//   return res.status(202).json({ ok: true, message: "Evidencias guardar" });
// };

export const uploadEvidence = (req, res) => {
  const { tktId } = req.params;
  const { tipo } = req.body;

  if (!tktId || ![1, 2, 3].includes(Number(tipo))) {
    return res.status(400).json({ ok: false, message: "Parámetros inválidos" });
  }
  const files = getFilesArray(req);
  if (!files.length) {
    return res.status(400).json({ ok: false, message: "No se recibieron archivos" });
  }

  // const usuarioId = req?.user?.id || null;

  const currentUserId =
  Number(req.headers["currentuserapp"]) ||   // 👈 header correcto desde el front
  Number(req.user?.usuId) ||                // 👈 lo que suele venir del middleware de auth
  Number(req.user?.id) ||                   // por si tu middleware usa id
  0;


  for (const f of files) {
    const payload = {
      tktId: Number(tktId),
      tipo: Number(tipo),
      doc: mapFile(f, tipo),
      usuarioId: currentUserId,
    };
    void sharepointQueue.add("tickets.saveEvidence", payload, {
      attempts: 3,
      backoff: { type: "exponential", delay: 5000 },
      removeOnComplete: true,
      removeOnFail: 20,
    }).catch(err => {
      console.error("[tickets.saveEvidence][enqueue] error:", err?.message || err, { tktId, tipo });
    });
  }

  return res.status(202).json({
    ok: true,
    ticketId: Number(tktId),
    tipo: Number(tipo),
    accepted: files.length,
    message: "Evidencias encoladas para procesamiento.",
  });
};

export const deleteEvidence = async (req, res) => {
  const { tktId } = req.params;
  const { tipos = [], fileIds = [] } = req.body || {};

  await sharepointQueue.add("tickets.deleteEvidence", {
    tktId: Number(tktId),
    tipos: Array.isArray(tipos) ? tipos : [],
    fileIds: Array.isArray(fileIds) ? fileIds : [],
  }, {
    attempts: 3, backoff: { type: "exponential", delay: 5000 },
    removeOnComplete: true
  });

  return res.status(202).json({ ok: true, message: "Eliminación encolada" });
};

// === EVIDENCIAS: PREVIEW / DOWNLOAD ===
export const previewEvidence = async (req, res) => {
  try {
    const { fileId } = req.params;
    if (!fileId) return res.status(400).json({ message: "fileId requerido" });

    // (opcional) validar pertenencia a un tktId aquí
    const data = await SeeFile(fileId);      // -> { preview: url }
    return res.status(200).json(data);
  } catch (err) {
    return res.status(500).json({ message: err?.message || "Error al previsualizar" });
  }
};

export const getEvidenceDownload = async (req, res) => {
  try {
    const { fileId } = req.params;
    if (!fileId) return res.status(400).json({ message: "fileId requerido" });

    // (opcional) validar pertenencia/permiso
    const data = await downloadFile(fileId); // -> { id, name, webUrl, downloadUrl }
    return res.status(200).json(data);
  } catch (err) {
    return res.status(500).json({ message: err?.message || "Error al descargar" });
  }
};