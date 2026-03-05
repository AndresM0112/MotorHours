import Queue from "bull";
import { config } from "dotenv";
import { getConnection, releaseConnection } from "../db.config.js";
// import { cargarASharepoint, eliminarArchivoSharepoint, SeeFile } from "../../microsftGraph/funciones.js"
import {
  cargarASharepoint,
  eliminarArchivoSharepoint,
} from "../../microsftGraph/funciones.js";
// import { getIO } from "../socket.manager.js";
import { tryGetIO } from "../socket.manager.js";
import "colors";
config();

const sharepointQueue = new Queue("sharepoint-lamayorista", {
  redis: { host: process.env.REDIS_HOST, port: process.env.REDIS_PORT },
});

sharepointQueue.on("ready", () => {
  console.log("🚀 Cola SharePoint conectada a Redis");
});

sharepointQueue.on("completed", (job, result) => {
  console.log("✅ Carga completada:", job.id, "result:", result);
});

sharepointQueue.on("failed", (job, err) => {
  console.error("❌ Carga fallo: ", job.id, "error:", err);
});

// Reconstruir buffer si viene serializado desde el front
const normalizeDocBuffer = (doc = {}) => {
  if (doc?.buffer?.type === "Buffer") {
    doc.buffer = Buffer.from(doc.buffer.data);
  }
  return doc;
};

// Procesador de eliminación
sharepointQueue.process("tickets.saveEvidence", async (job) => {
  const io = tryGetIO();
  const { tktId, tipo, doc, usuarioId, fileIdPrev = null } = job.data;

  let conn;
  try {
    if (!tktId || ![1, 2, 3].includes(Number(tipo))) {
      throw new Error("Payload inválido: { tktId, tipo(1|2) } requerido.");
    }

    normalizeDocBuffer(doc);

    // Subir a SharePoint
    // Ideal: que retornar incluya publicUrl, size y mimetype. Ajusta a tu implementación real.
    const { fileId, filename, urlPublica, urlLocal } = await cargarASharepoint(
      tktId,
      tipo,
      doc,
      null, // << NO usar upsert aquí
      usuarioId
    );
    if (!fileId) throw new Error("No se obtuvo fileId de SharePoint.");

    conn = await getConnection();

    // Si te pasan fileIdPrev explícito y quieres “reemplazar”, elimina esa fila (y opcionalmente el archivo SP)
    if (fileIdPrev) {
      try {
        await conn.query(
          `DELETE FROM tbl_tickets_evidencias WHERE tkt_id = ? AND tke_file_id = ?`,
          [tktId, fileIdPrev]
        );
        // Opcional (si quieres borrar también en SharePoint el previo):
        // await eliminarArchivoSharepoint(fileIdPrev).catch(()=>{});
      } catch {
        /* noop */
      }
    }

     // 1) Resolver actorId (siempre un entero válido)
    let actorId = Number.isFinite(Number(usuarioId)) ? Number(usuarioId) : null;

    if (!actorId) {
      // fallback: el que creó el ticket
      const [[ticket]] = await conn.query(
        `SELECT tkt_usu_reg FROM tbl_tickets WHERE tkt_id = ?`,
        [tktId]
      );
      const fallbackId = Number(ticket?.tkt_usu_reg);
      actorId = Number.isFinite(fallbackId) ? fallbackId : 1;
    }

    // 2) Obtener el nombre del usuario para guardar snapshot
    const [[userRow]] = await conn.query(
      `SELECT CONCAT(usu_nombre, ' ', IFNULL(usu_apellido, '')) AS nombre
       FROM tbl_usuarios
       WHERE usu_id = ?`,
      [actorId]
    );
    const actorName = (userRow?.nombre || "").trim() || null;

    // INSERT de la evidencia (una fila por archivo)
    await conn.query(
      `
      INSERT INTO tbl_tickets_evidencias
        (tkt_id, tke_url_local, tke_file_id, tke_nombre, tke_ext, tke_mimetype, tke_size, tke_url_publica, tke_tipo, tke_usu_reg,tke_usu_reg_nombre,tke_usu_act,tke_usu_act_nombre)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)
      `,
      [
        tktId,
        urlLocal, // tke_url_local
        fileId, // tke_file_id
        filename || doc?.originalname || "", // tke_nombre
        String(doc?.extension || "").toLowerCase(), // tke_ext
        doc?.mimetype || null, // tke_mimetype (del payload)
        Number(doc?.size ?? doc?.buffer?.length ?? 0) || null, // tke_size (del payload)
        urlPublica, // tke_url_publica (se resuelve on-demand con SeeFile/downloadFile)
        tipo,
        actorId,
        actorName,
        actorId,
        actorName,
      ]
    );

    io.emit("tickets_evidencias_procesadas", {
      ok: true,
      tktId,
      tipo,
      fileId,
      filename,
      usuarioId,
    });
    io.emit("upsertTickets");

    return { ok: true, tktId, tipo, fileId, filename };
  } catch (error) {
    console.error("[tickets.saveEvidence] error:", error?.message || error);
    const payload = {
      ok: false,
      tktId,
      tipo,
      error: error?.message || "Error al subir evidencia",
    };
    tryGetIO().emit("tickets_evidencias_procesadas", payload);
    return payload;
  } finally {
    if (conn) releaseConnection(conn);
  }
});

sharepointQueue.process("tickets.deleteEvidence", async (job) => {
  const io = tryGetIO();
  const { tktId, tipos = [], fileIds = [] } = job.data;

  let conn;
  const borrados = [];
  const errores = [];

  try {
    conn = await getConnection();

    // 1) Resolver fileIds por tipos si aplican
    let idsAEliminar = [...fileIds];

    if (tktId && Array.isArray(tipos) && tipos.length > 0) {
      const [rows] = await conn.query(
        `SELECT tke_file_id AS fileId
           FROM tbl_tickets_evidencias
          WHERE tkt_id = ? AND tke_tipo IN (?) AND COALESCE(tke_file_id,'') <> ''`,
        [tktId, tipos]
      );
      rows.forEach((r) => r?.fileId && idsAEliminar.push(r.fileId));
    }

    // Eliminar duplicados / falsy
    idsAEliminar = Array.from(new Set(idsAEliminar.filter(Boolean)));

    // 2) Eliminar en SharePoint + limpiar DB
    for (const fid of idsAEliminar) {
      try {
        const resp = await eliminarArchivoSharepoint(fid);
        borrados.push({ fileId: fid, status: resp?.status || 200 });

        // Borrado en DB (si se pasa tktId acotamos, si no, borramos por fileId)
        if (tktId) {
          await conn.query(
            `DELETE FROM tbl_tickets_evidencias WHERE tkt_id = ? AND tke_file_id = ?`,
            [tktId, fid]
          );
        } else {
          await conn.query(
            `DELETE FROM tbl_tickets_evidencias WHERE tke_file_id = ?`,
            [fid]
          );
        }
      } catch (e) {
        errores.push({ fileId: fid, error: e?.message || "Error al eliminar" });
      }
    }

    io.emit("tickets_evidencias_eliminadas", {
      tktId: tktId || null,
      borrados,
      errores,
    });
    io.emit("upsertTickets");

    return {
      ok: errores.length === 0,
      tktId: tktId || null,
      borrados,
      errores,
    };
  } catch (error) {
    console.error("[tickets.deleteEvidence] error:", error?.message || error);
    const payload = {
      ok: false,
      tktId: tktId || null,
      error: error?.message || "Error eliminando evidencias",
    };
    io.emit("tickets_evidencias_eliminadas", payload);
    return payload;
  } finally {
    if (conn) releaseConnection(conn);
  }
});

// sharepointQueue.process("tickets.saveEvidence", async (job) => {
//   const io = getIO();
//   const { tktId, tipo, doc, usuarioId, fileIdPrev = null } = job.data;

//   let conn;
//   try {
//     if (!tktId || ![1, 2].includes(Number(tipo))) {
//       throw new Error("Payload inválido: { tktId, tipo(1|2) } requerido.");
//     }

//     normalizeDocBuffer(doc);

//     const { fileId, filename } = await cargarASharepoint(
//       tktId,
//       tipo,
//       doc,
//       fileIdPrev,
//       usuarioId
//     );

//     if (!fileId) throw new Error("No se obtuvo fileId de SharePoint.");

//     conn = await getConnection();

//     // UPSERT por (tkt_id, tke_tipo)
//     await conn.query(
//       `
//       INSERT INTO tbl_tickets_evidencias
//         (tkt_id, tke_url_local, tke_file_id, tke_ext, tke_tipo, tke_usu_reg, tke_usu_act)
//       VALUES (?, ?, ?, ?, ?, ?, ?)
//       ON DUPLICATE KEY UPDATE
//         tke_file_id = VALUES(tke_file_id),
//         tke_ext     = VALUES(tke_ext),
//         tke_usu_act = VALUES(tke_usu_act),
//         tke_fec_act = NOW()
//       `,
//       [
//         tktId,
//         null, // tke_url_local (no se usa)
//         fileId,
//         String(doc?.extension || "").toLowerCase(),
//         tipo,
//         usuarioId || null,
//         usuarioId || null,
//       ]
//     );

//     io.emit("tickets_evidencias_procesadas", {
//       ok: true,
//       tktId,
//       tipo,
//       fileId,
//       filename,
//       usuarioId,
//     });
//     io.emit("upsertTickets");

//     return { ok: true, tktId, tipo, fileId, filename };
//   } catch (error) {
//     console.error("[tickets.saveEvidence] error:", error?.message || error);
//     const payload = { ok: false, tktId, tipo, error: error?.message || "Error al subir evidencia" };
//     getIO().emit("tickets_evidencias_procesadas", payload);
//     return payload;
//   } finally {
//     if (conn) releaseConnection(conn);
//   }
// });

export default sharepointQueue;
