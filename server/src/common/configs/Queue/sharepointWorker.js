import { config } from "dotenv";
import { getConnection, releaseConnection } from "../db.config.js";
import {
  cargarASharepoint,
  eliminarArchivoSharepoint,
} from "../../microsftGraph/funciones.js";
import { tryGetIO } from "../socket.manager.js";
import "colors";
config();

console.log("📋 SharePoint Worker iniciado (modo directo - sin Redis)".green);

// Reconstruir buffer si viene serializado desde el front
const normalizeDocBuffer = (doc = {}) => {
  if (doc?.buffer?.type === "Buffer") {
    doc.buffer = Buffer.from(doc.buffer.data);
  }
  return doc;
};

// Función para procesar guardado de evidencias
const processSaveEvidenceDirectly = async (jobData) => {
  const io = tryGetIO();  
  const { tktId, tipo, doc, usuarioId, fileIdPrev = null } = jobData;

  let conn;
  try {
    if (!tktId || ![1, 2, 3].includes(Number(tipo))) {
      throw new Error("Payload inválido: { tktId, tipo(1|2|3) } requerido.");
    }

    normalizeDocBuffer(doc);
    
    conn = await getConnection();
    let fileId = null;

    // Eliminar archivo anterior si existe
    if (fileIdPrev) {
      await eliminarArchivoSharepoint(fileIdPrev);
    }

    // Subir nuevo archivo si hay buffer
    if (doc?.buffer) {
      const respuesta = await cargarASharepoint(doc);
      fileId = respuesta?.id;
      console.log("📁 Archivo cargado:", respuesta?.name, "| ID:", fileId);
    }

    // Guardar en base de datos
    const [rows] = await conn.execute(
      `INSERT INTO t_tickets_evidencias 
       (tke_tickets_id, tke_url_local, tke_file_id, tke_ext, tke_tipo, tke_usu_crea, tke_usu_act) 
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE 
         tke_file_id = VALUES(tke_file_id),
         tke_ext     = VALUES(tke_ext),
         tke_usu_act = VALUES(tke_usu_act),
         tke_fec_act = NOW()`,
      [
        tktId,
        null, // tke_url_local (no se usa)
        fileId,
        String(doc?.extension || "").toLowerCase(),
        tipo,
        usuarioId || null,
        usuarioId || null,
      ]
    );

    const payload = {
      ok: true,
      tktId,
      tipo,
      fileId,
      filename: doc?.filename,
      usuarioId,
    };
    
    // Emitir eventos Socket.io
    tryGetIO().emit("tickets_evidencias_procesadas", payload);

    console.log("✅ Evidencia guardada exitosamente:", payload);
    return payload;
  } catch (error) {
    console.error("[processSaveEvidenceDirectly] error:", error?.message || error);
    const payload = { ok: false, tktId, tipo, error: error?.message || "Error al subir evidencia" };
    tryGetIO().emit("tickets_evidencias_procesadas", payload);
    return payload;
  } finally {
    if (conn) releaseConnection(conn);
  }
};

// Función para procesar eliminación de evidencias
const processDeleteEvidenceDirectly = async (jobData) => {
  const { tktId, tipo, fileId } = jobData;
  let conn;
  
  try {
    // Eliminar archivo de SharePoint
    await eliminarArchivoSharepoint(fileId);
    
    // Eliminar registro de base de datos
    conn = await getConnection();
    await conn.execute(
      `DELETE FROM t_tickets_evidencias WHERE tke_tickets_id = ? AND tke_tipo = ?`,
      [tktId, tipo]
    );

    const payload = { ok: true, tktId, tipo, fileId };
    tryGetIO().emit("tickets_evidencias_procesadas", payload);
    
    console.log("🗑️ Evidencia eliminada exitosamente:", payload);
    return payload;
  } catch (error) {
    console.error("[processDeleteEvidenceDirectly] error:", error?.message || error);
    const payload = { ok: false, tktId, tipo, error: error?.message || "Error al eliminar evidencia" };
    tryGetIO().emit("tickets_evidencias_procesadas", payload);
    return payload;
  } finally {
    if (conn) releaseConnection(conn);
  }
};

// API del trabajador SharePoint - procesamiento directo
const sharepointWorker = {
  // Agregar trabajo de guardado (procesa inmediatamente)
  async addSaveEvidenceJob(jobData) {
    console.log("📋 Procesando guardado de evidencia directamente...".cyan);
    return await processSaveEvidenceDirectly(jobData);
  },

  // Agregar trabajo de eliminación (procesa inmediatamente)
  async addDeleteEvidenceJob(jobData) {
    console.log("🗑️ Procesando eliminación de evidencia directamente...".cyan);
    return await processDeleteEvidenceDirectly(jobData);
  },

  // Para compatibilidad con código existente
  get isQueueAvailable() {
    return true; // Siempre disponible en modo directo
  },

  // Para compatibilidad (sin funcionalidad real de cola)
  get queue() {
    return null;
  }
};

export default sharepointWorker;
