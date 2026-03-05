import cron from "node-cron";
import {
  getConnection,
  releaseConnection,
} from "../common/configs/db.config.js";
import { sendEmail } from "../common/services/mailerService.js";
import { construirResumenCorreo } from "../modules/admin/tickets/tickets.service.js";
import { urlBase } from "../common/constants/app.constants.js";
import { ticketOverdueNotification } from "../common/templates/tickets/ticketOverdueNotification.js";
import { ticketOverdueSupervisorNotification } from "../common/templates/tickets/ticketOverdueSupervisorNotification.js";
import { insertNotification } from "../modules/app/notifications/notifications.controller.js";
import {
  ticketReminderForAssignee,
  // ticketReminderForRequester
} from "../common/templates/tickets/ticketReminderNotification.js";
import {
  resolveNotifUserId,
  formatElapsed,
  insertHistorial,
  ACCIONES,
} from "./helpers/helpersTikets.js";
import { getUsuariosConPermiso } from "../modules/admin/tickets/tickets.service.js";


// ===== NUEVO: constantes afinables
const BATCH_SIZE = Number(process.env.REMINDER_BATCH_SIZE ?? 100);
const CLAIM_MINUTES = Number(process.env.REMINDER_CLAIM_MINUTES ?? 5);

// async function resolveNotifUserId(conn, ...candidates) {
//   for (const id of candidates) {
//     if (!id) continue;
//     const [[row]] = await conn.query(
//       "SELECT usu_id FROM tbl_usuarios WHERE usu_id = ? LIMIT 1",
//       [id]
//     );
//     if (row?.usu_id) return row.usu_id;
//   }
//   return null; // no hay usuario válido
// }

/**
 * Notifica tickets vencidos según intervalo en MINUTOS.
 * period_idx = FLOOR(mins_desde_registro / intervalo_min)
 * Notifica solo si period_idx > tkt_venc_period_idx.
 */
// export const verificarTicketsVencidos = async () => {
//   let conn;
//   try {
//     conn = await getConnection();

//     const [tickets] = await conn.query(`
//       SELECT
//         T.tkt_id,
//         T.tkt_fec_reg,
//         T.tkt_asignado_a,
//         T.usu_id,
//         T.tkt_venc_period_idx,
//         T.tkt_ult_notif_venc,
//         U.usu_correo,
//         CONCAT(U.usu_nombre, ' ', IFNULL(U.usu_apellido, '')) AS asignado_nombre,

//         X.intervalo_min,
//         X.mins_desde_registro,
//         FLOOR(X.mins_desde_registro / X.intervalo_min) AS period_idx

//       FROM (
//         SELECT
//           t.tkt_id,
//           t.tkt_fec_reg,
//           t.tkt_asignado_a,
//           t.usu_id,
//           t.tkt_venc_period_idx,
//           t.tkt_ult_notif_venc,
//           -- intervalo_min en MINUTOS
//           COALESCE(
//             a.are_tiempo_estimado_minutos,
//             CASE
//               WHEN a.are_cantidad_estimado IS NOT NULL AND f.fre_multiplicador IS NOT NULL
//                 THEN a.are_cantidad_estimado * f.fre_multiplicador
//               ELSE NULL
//             END
//           ) AS intervalo_min,
//           -- minutos transcurridos desde la creación
//           TIMESTAMPDIFF(MINUTE, t.tkt_fec_reg, NOW()) AS mins_desde_registro
//           -- Si guardas UTC, cambia NOW() por UTC_TIMESTAMP() en ambas apariciones
//         FROM tbl_tickets t
//         JOIN tbl_areas a            ON t.are_id = a.are_id
//         LEFT JOIN tbl_frecuencias f ON a.fre_id = f.fre_id
//         WHERE t.tkt_eliminado = 0
//           AND t.est_id NOT IN (4, 6)  -- no cerrado ni anulado
//       ) AS X
//       LEFT JOIN tbl_usuarios U ON X.tkt_asignado_a = U.usu_id
//       LEFT JOIN tbl_tickets   T ON T.tkt_id = X.tkt_id

//       WHERE X.intervalo_min IS NOT NULL
//         AND X.intervalo_min > 0
//         AND X.mins_desde_registro >= X.intervalo_min
//         AND FLOOR(X.mins_desde_registro / X.intervalo_min) > IFNULL(T.tkt_venc_period_idx, 0)
//     `);

//     const procesados = [];

//     for (const t of tickets) {
//       const intervaloMin = Number(t.intervalo_min);
//       const periodIdx = Number(t.period_idx);

//       if (!Number.isFinite(intervaloMin) || intervaloMin <= 0) continue;
//       if (!Number.isFinite(periodIdx) || periodIdx < 1) continue;

//       // Anti-doble disparo (si corre el cron dos veces casi juntas)
//       if (t.tkt_ult_notif_venc) {
//         const minutosDesdeUlt = await minutesSince(conn, t.tkt_ult_notif_venc);
//         if (minutosDesdeUlt < 1) continue;
//       }

//       const resumen = await construirResumenCorreo(t.tkt_id, conn);
//       const ticketRef = `#${String(t.tkt_id).padStart(4, "0")}`;
//       const titulo = `Alerta de Ticket Vencido ${ticketRef}`;
//       const mensaje = `El ticket lleva ${formatElapsed(
//         periodIdx,
//         intervaloMin
//       )} abierto sin resolverse.`;

//       const notifUserId = await resolveNotifUserId(
//         conn,
//         t.tkt_asignado_a,
//         t.usu_id
//       );

//       if (notifUserId) {
//         await insertNotification({
//           userId: notifUserId,
//           prioridad:
//             (resumen.prioridad && resumen.prioridad.pri_nombre) || "media",
//           titulo,
//           mensaje,
//           tipo: "ticket",
//           modulo: "tickets",
//           accion: "vencido",
//           data: { ticketId: t.tkt_id, periodIdx, intervaloMin },
//           connection: conn,
//         });
//       } else {
//         console.warn(
//           `[CRON vencidos] Ticket ${t.tkt_id} sin usuario válido (asignado_a=${t.tkt_asignado_a}, usu_id=${t.usu_id}). Se omite insertNotification.`
//         );
//       }

//       if (t.usu_correo) {
//         await sendEmail({
//           to: t.usu_correo,
//           subject: titulo,
//           html: ticketOverdueNotification({
//             resumen,
//             periodIdx,
//             intervaloMin,
//             linkSite: `${urlBase}/tickets/${t.tkt_id}`,
//             destinatario: t.asignado_nombre || "Usuario",
//           }),
//         });
//       }

//       // === SUPERVISORES (permiso 97): notificar a todos los que tengan el permiso, sin duplicar con el encargado
//       try {
//         const permSupervisor = config?.home?.tickets?.ticketSupervisor ?? 97;

//         // Obtén los IDs de usuarios con el permiso (tu service ya lo hace)
//         const supervisorIds = await getUsuariosConPermiso(permSupervisor, conn);
//         if (Array.isArray(supervisorIds) && supervisorIds.length) {
//           // Dedupe por usu_id para evitar doble envío si el encargado también es supervisor
//           const skipIds = new Set();
//           if (notifUserId) skipIds.add(Number(notifUserId));

//           // Traemos nombre/correo en un solo query (más eficiente que uno por ID)
//           const placeholders = supervisorIds.map(() => "?").join(",");
//           const [supUsers] = await conn.query(
//             `
//       SELECT u.usu_id, u.usu_nombre, u.usu_apellido, u.usu_correo
//         FROM tbl_usuarios u
//        WHERE u.usu_id IN (${placeholders})
//          AND u.usu_activo = 1
//          AND u.usu_eliminado = 0
//          AND COALESCE(u.usu_correo,'') <> ''
//       `,
//             supervisorIds
//           );

//           const encargadoNombre = t.asignado_nombre || "Sin asignar";
//           const link = `${urlBase}/tickets/${t.tkt_id}`;

//           for (const sup of supUsers) {
//             const supId = Number(sup.usu_id);
//             if (skipIds.has(supId)) continue; // ya notificado como encargado

//             const supNombre =
//               `${sup.usu_nombre ?? ""} ${sup.usu_apellido ?? ""}`.trim() ||
//               "Supervisor";

//             // Email a supervisor
//             await sendEmail({
//               to: sup.usu_correo,
//               subject: `⏰ [Supervisor] Ticket vencido – ${ticketRef}`,
//               html: ticketOverdueSupervisorNotification({
//                 resumen,
//                 periodIdx,
//                 intervaloMin,
//                 linkSite: link,
//                 supervisorNombre: supNombre,
//                 encargadoNombre,
//               }),
//             });

//             // Notificación in-app a supervisor
//             await insertNotification({
//               userId: supId,
//               prioridad:
//                 (resumen.prioridad && resumen.prioridad.pri_nombre) || "media",
//               titulo,
//               mensaje: `Ticket vencido. Encargado actual: ${encargadoNombre}.`,
//               tipo: "ticket",
//               modulo: "tickets",
//               accion: "vencido",
//               data: { ticketId: t.tkt_id, periodIdx, intervaloMin },
//               connection: conn,
//             });

//             skipIds.add(supId);
//           }
//         }
//       } catch (e) {
//         console.warn(
//           `[CRON vencidos] Error al notificar supervisores para ticket ${t.tkt_id}:`,
//           e?.message
//         );
//       }

//       // === HISTORIAL: registrar notificación de vencido
//       const minutosTotales = periodIdx * intervaloMin;
//       const horasTotales = Math.floor(minutosTotales / 60);
//       const diasTotales = Math.floor(minutosTotales / 1440);

//       await insertHistorial({
//         conn,
//         tktId: t.tkt_id,
//         // puedes usar notifUserId si existió, o null si no hubo receptor válido
//         usuId: notifUserId ?? null,
//         accion: ACCIONES.VENCIDO,
//         comentario: `Notificación de vencido (periodIdx=${periodIdx}, intervaloMin=${intervaloMin} -> ${diasTotales} días / ${horasTotales} horas).`,
//         estadoAnterior: null,
//         estadoNuevo: null,
//       });

//       await conn.query(
//         `
//         UPDATE tbl_tickets
//            SET tkt_venc_period_idx = ?,
//                tkt_ult_notif_venc = NOW()  -- usa UTC_TIMESTAMP() si aplicas UTC
//          WHERE tkt_id = ?
//         `,
//         [periodIdx, t.tkt_id]
//       );

//       procesados.push(t.tkt_id);
//     }

//     console.log(
//       `[CRON] Tickets vencidos: ${tickets.length} candidatos, ${procesados.length} notificados (nuevos períodos).`
//     );
//   } catch (error) {
//     console.error("[CRON] Error al verificar tickets vencidos:", error);
//   } finally {
//     if (conn) releaseConnection(conn);
//   }
// };

const PERM_TICKET_SUPERVISOR = 97;

export const verificarTicketsVencidos = async () => {
  let conn;
  try {
    conn = await getConnection();

    // 0) Cargar SUPERVISORES 1 sola vez (permiso 97 configurable)
  
   const supervisorIds = await getUsuariosConPermiso(PERM_TICKET_SUPERVISOR /* o 97 */, conn);


    let supUsers = [];
    if (Array.isArray(supervisorIds) && supervisorIds.length) {
  const placeholders = supervisorIds.map(() => "?").join(",");
  const [rows] = await conn.query(
    `
    SELECT u.usu_id, u.usu_nombre, u.usu_apellido, u.usu_correo
      FROM tbl_usuarios u
     WHERE u.usu_id IN (${placeholders})
       AND u.est_id != 3
       AND COALESCE(u.usu_correo,'') <> ''
    `,
    supervisorIds
  );
  supUsers = rows;
}

    const [tickets] = await conn.query(`
      SELECT
        T.tkt_id,
        T.tkt_fec_reg,
        T.tkt_asignado_a,
        T.usu_id,
        T.tkt_venc_period_idx,
        T.tkt_ult_notif_venc,
        U.usu_correo,
        CONCAT(U.usu_nombre, ' ', IFNULL(U.usu_apellido, '')) AS asignado_nombre,

        X.intervalo_min,
        X.mins_desde_registro,
        FLOOR(X.mins_desde_registro / X.intervalo_min) AS period_idx

      FROM (
        SELECT
          t.tkt_id,
          t.tkt_fec_reg,
          t.tkt_asignado_a,
          t.usu_id,
          t.tkt_venc_period_idx,
          t.tkt_ult_notif_venc,
          COALESCE(
            a.are_tiempo_estimado_minutos,
            CASE
              WHEN a.are_cantidad_estimado IS NOT NULL AND f.fre_multiplicador IS NOT NULL
                THEN a.are_cantidad_estimado * f.fre_multiplicador
              ELSE NULL
            END
          ) AS intervalo_min,
          TIMESTAMPDIFF(MINUTE, t.tkt_fec_reg, NOW()) AS mins_desde_registro
        FROM tbl_tickets t
        JOIN tbl_areas a            ON t.are_id = a.are_id
        LEFT JOIN tbl_frecuencias f ON a.fre_id = f.fre_id
        WHERE t.tkt_eliminado = 0
          AND t.est_id NOT IN (4,6)  -- NO cerrado ni anulado
      ) AS X
      LEFT JOIN tbl_usuarios U ON X.tkt_asignado_a = U.usu_id
      LEFT JOIN tbl_tickets   T ON T.tkt_id = X.tkt_id
      WHERE X.intervalo_min IS NOT NULL
        AND X.intervalo_min > 0
        AND X.mins_desde_registro >= X.intervalo_min
        AND FLOOR(X.mins_desde_registro / X.intervalo_min) > IFNULL(T.tkt_venc_period_idx, 0)
    `);

    const procesados = [];

    for (const t of tickets) {
      const intervaloMin = Number(t.intervalo_min);
      const periodIdx = Number(t.period_idx);
      if (!Number.isFinite(intervaloMin) || intervaloMin <= 0) continue;
      if (!Number.isFinite(periodIdx) || periodIdx < 1) continue;

      if (t.tkt_ult_notif_venc) {
        const minutosDesdeUlt = await minutesSince(conn, t.tkt_ult_notif_venc);
        if (minutosDesdeUlt < 1) continue; // anti doble disparo
      }

      const resumen = await construirResumenCorreo(t.tkt_id, conn);
      const ticketRef = `#${String(t.tkt_id).padStart(4, "0")}`;
      const titulo = `Alerta de Ticket Vencido ${ticketRef}`;
      const mensaje = `El ticket lleva ${formatElapsed(periodIdx, intervaloMin)} abierto sin resolverse.`;

      // ——— Encargado (in-app + email)
      const notifUserId = await resolveNotifUserId(conn, t.tkt_asignado_a, t.usu_id);

      if (notifUserId) {
        await insertNotification({
          userId: notifUserId,
          prioridad: (resumen.prioridad && resumen.prioridad.pri_nombre) || "media",
          titulo,
          mensaje,
          tipo: "ticket",
          modulo: "tickets",
          accion: "vencido",
          data: { ticketId: t.tkt_id, periodIdx, intervaloMin },
          connection: conn,
        });
      } else {
        console.warn(`[CRON vencidos] Ticket ${t.tkt_id} sin usuario válido (asignado_a=${t.tkt_asignado_a}, usu_id=${t.usu_id}).`);
      }

      if (t.usu_correo) {
        await sendEmail({
          to: t.usu_correo,
          subject: titulo,
          html: ticketOverdueNotification({
            resumen,
            periodIdx,
            intervaloMin,
            linkSite: `${urlBase}/tickets/${t.tkt_id}`,
            destinatario: t.asignado_nombre || "Usuario",
          }),
        });
      }

      // ——— Supervisores (permiso 97): email + in-app, sin duplicar con encargado
      try {
        if (supUsers.length) {
          const skipIds = new Set();
          const skipEmails = new Set();
          if (notifUserId) skipIds.add(Number(notifUserId));
          if (t.usu_correo) skipEmails.add(String(t.usu_correo).toLowerCase());

          const encargadoNombre = t.asignado_nombre || "Sin asignar";
          const link = `${urlBase}/tickets/${t.tkt_id}`;

          for (const sup of supUsers) {
            const supId = Number(sup.usu_id);
            const supEmail = (sup.usu_correo || "").toLowerCase();
            if (skipIds.has(supId) || !supEmail || skipEmails.has(supEmail)) continue;

            const supNombre = `${sup.usu_nombre ?? ""} ${sup.usu_apellido ?? ""}`.trim() || "Supervisor";

            await sendEmail({
              to: sup.usu_correo,
              subject: `⏰ [Supervisor] Ticket vencido – ${ticketRef}`,
              html: ticketOverdueSupervisorNotification({
                resumen,
                periodIdx,
                intervaloMin,
                linkSite: link,
                supervisorNombre: supNombre,
                encargadoNombre,
              }),
            });

            await insertNotification({
              userId: supId,
              prioridad: (resumen.prioridad && resumen.prioridad.pri_nombre) || "media",
              titulo,
              mensaje: `Ticket vencido. Encargado actual: ${encargadoNombre}.`,
              tipo: "ticket",
              modulo: "tickets",
              accion: "vencido",
              data: { ticketId: t.tkt_id, periodIdx, intervaloMin },
              connection: conn,
            });

            skipIds.add(supId);
            skipEmails.add(supEmail);
          }
        }
      } catch (e) {
        console.warn(`[CRON vencidos] Error al notificar supervisores para ticket ${t.tkt_id}:`, e?.message);
      }

      // ——— Historial + actualización de período de vencido
      const minutosTotales = periodIdx * intervaloMin;
      const horasTotales = Math.floor(minutosTotales / 60);
      const diasTotales = Math.floor(minutosTotales / 1440);

      await insertHistorial({
        conn,
        tktId: t.tkt_id,
        usuId: notifUserId ?? null,
        accion: ACCIONES.VENCIDO,
        comentario: `Notificación de vencido (periodIdx=${periodIdx}, intervaloMin=${intervaloMin} -> ${diasTotales} días / ${horasTotales} horas).`,
        estadoAnterior: null,
        estadoNuevo: null,
      });

      await conn.query(
        `
        UPDATE tbl_tickets
           SET tkt_venc_period_idx = ?,
               tkt_ult_notif_venc = NOW()
         WHERE tkt_id = ?
        `,
        [periodIdx, t.tkt_id]
      );

      procesados.push(t.tkt_id);
    }

    console.log(`[CRON] Tickets vencidos: ${tickets.length} candidatos, ${procesados.length} notificados (nuevos períodos).`);
  } catch (error) {
    console.error("[CRON] Error al verificar tickets vencidos:", error);
  } finally {
    if (conn) releaseConnection(conn);
  }
};

async function minutesSince(conn, mysqlTs) {
  const [[row]] = await conn.query(
    `SELECT TIMESTAMPDIFF(MINUTE, ?, NOW()) AS mins`, // cambia a UTC_TIMESTAMP() si trabajas UTC
    [mysqlTs]
  );
  return Number(row && row.mins != null ? row.mins : 0);
}

export const cronTicketsVencidos = () =>
  cron.schedule("0 6 * * *", async () => {
    console.log("[CRON] Ejecutando verificación de tickets vencidos...");
    await verificarTicketsVencidos();
  });

/**
 * Estrategia "claim & process":
 * 1) Selecciona candidatos (tkt_prox_alerta <= NOW()).
 * 2) Reclama moviendo tkt_prox_alerta +5 min (evita duplicados si hay varios workers).
 * 3) Procesa: envía correos/notifications y reprograma +24h.
 */
export const verificarTicketsRecordatorio24h = async () => {
  let conn;
  const reclamados = [];
  try {
    conn = await getConnection();
    await conn.beginTransaction();

    // 1) Candidatos
    const [candidatos] = await conn.query(
      `
      SELECT tkt_id
        FROM tbl_tickets
       WHERE tkt_eliminado = 0
         AND est_id NOT IN (4, 6)                 
         AND tkt_prox_alerta IS NOT NULL
         AND tkt_prox_alerta <= NOW()
       ORDER BY tkt_prox_alerta ASC
       LIMIT ?
      `,
      [BATCH_SIZE]
    );

    if (!candidatos.length) {
      await conn.commit();
      console.log("[CRON-24h] No hay candidatos.");
      return { processed: 0 };
    }

    const ids = candidatos.map((x) => x.tkt_id);

    // 2) Claim temporal (+5 min) para evitar doble procesamiento entre instancias

    const [resClaim] = await conn.query(
      `
      UPDATE tbl_tickets
         SET tkt_prox_alerta = DATE_ADD(NOW(), INTERVAL ? MINUTE)
       WHERE tkt_id IN (${ids.map(() => "?").join(",")})
         AND tkt_prox_alerta <= NOW()
      `,
      [CLAIM_MINUTES, ...ids]
    );
    await conn.commit();

    if (!resClaim.affectedRows) {
      console.log(
        "[CRON-24h] Candidatos pero 0 reclamados (otro worker los tomó)."
      );
      return { processed: 0 };
    }
    reclamados.push(...ids);
  } catch (err) {
    if (conn)
      try {
        await conn.rollback();
      } catch {}
    console.error("[CRON-24h] Error reclamando tickets:", err);
    return { processed: 0, error: err?.message };
  } finally {
    if (conn) releaseConnection(conn);
  }

  // 3) Procesar cada ticket reclamado
  let ok = 0;
  for (const ticketId of reclamados) {
    try {
      await procesarRecordatorio24h(ticketId);
      ok++;
    } catch (e) {
      console.error(`[CRON-24h] Error en ticket ${ticketId}:`, e?.message);
    }
  }

  console.log(`[CRON-24h] Procesados ${ok}/${reclamados.length}.`);
  return { processed: ok };
};

/**
 * Envía recordatorio a encargado y solicitante (si tienen correo),
 * inserta notificación in-app y reprograma el próximo recordatorio (+24h).
 */
async function procesarRecordatorio24h(ticketId) {
  let conn;
  try {
    conn = await getConnection();

    // 1) Times consistentes desde la DB
    const [[time]] = await conn.query(`
      SELECT 
        NOW()                                     AS now_ts,          -- usa UTC_TIMESTAMP() si tu DB está en UTC
        DATE_ADD(NOW(), INTERVAL 24 HOUR)         AS next_ts
    `);

    // 2) (Opcional pero recomendado) Actualizar primero los timestamps del ticket
    await conn.query(
      `
      UPDATE tbl_tickets
         SET tkt_ult_alerta = ?,
             tkt_prox_alerta = ?,
             tkt_fec_act = NOW()
       WHERE tkt_id = ?
      `,
      [time.now_ts, time.next_ts, ticketId]
    );

    const resumen = await construirResumenCorreo(ticketId, conn);
    if (!resumen?.ticket) return;

    const linkSite = `${urlBase}/tickets/${ticketId}`;

    // Destinatarios: encargado
    const destinatarios = [];
    if (resumen?.encargado?.usu_correo) {
      const nombre =
        `${resumen.encargado.usu_nombre ?? ""} ${
          resumen.encargado.usu_apellido ?? ""
        }`.trim() || "Encargado";
      destinatarios.push({
        to: resumen.encargado.usu_correo,
        nombre,
        tipo: "encargado",
        uid: resumen.encargado.usu_id,
      });
    }

    //* (Deshabilitado por ahora) Notificar SOLICITANTE

    // if (resumen?.cliente?.usu_correo) {
    //   const nombre =
    //     `${resumen.cliente.usu_nombre ?? ""} ${
    //       resumen.cliente.usu_apellido ?? ""
    //     }`.trim() || "Cliente";
    //   destinatarios.push({
    //     to: resumen.cliente.usu_correo,
    //     nombre,
    //     tipo: "solicitante",
    //     uid: resumen.cliente.usu_id,
    //   });
    // }

    // Dedupe por correo
    const seen = new Set();
    const unique = destinatarios.filter((d) => {
      const k = (d.to || "").toLowerCase();
      if (!k || seen.has(k)) return false;
      seen.add(k);
      return true;
    });

    // Envío con plantillas con SLA
    for (const d of unique) {
      const { subject, html } = ticketReminderForAssignee({
        resumen,
        linkSite,
        nroRecordatorio: 1, // opcional: puedes calcularlo desde historial
        ultimaAlerta: time.now_ts, // override
        proximaAlerta: time.next_ts, // override
        fechaLimite: resumen?.ticket?.tkt_fec_limite ?? null, // override opcional
      });

      await sendEmail({ to: d.to, subject, html });

      await insertNotification({
        userId: d.uid,
        prioridad: resumen.ticket.pri_id,
        titulo: subject,
        mensaje:
          d.tipo === "encargado"
            ? "Tienes un ticket pendiente de gestión."
            : "Hay un ticket pendiente de actualización.",
        tipo: "ticket",
        modulo: "tickets",
        accion: "recordatorio",
        data: { ticketId },
        connection: conn,
      });

      // HISTORIAL
      await insertHistorial({
        conn,
        tktId: ticketId,
        usuId: d.uid ?? null,
        accion: ACCIONES.RECORDATORIO,
        comentario: `Recordatorio 24h enviado a ${d.tipo} <${d.to}>`,
      });
    }
  } finally {
    if (conn) releaseConnection(conn);
  }
}

// Scheduler del recordatorio 24h (cada minuto)
export const cronTicketsRecordatorio24h = () =>
  cron.schedule("0 6 * * *", async () => {
    console.log("[CRON-24h] Ejecutando verificación de recordatorios 24h...");
    await verificarTicketsRecordatorio24h();
  });
