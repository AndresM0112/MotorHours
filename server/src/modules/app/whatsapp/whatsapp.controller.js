// import {
//   getConnection,
//   releaseConnection,
//   executeQuery,
// } from "../../../common/configs/db.config.js";
// import twilio from "twilio";
// import dotenv from "dotenv";
// import moment from "moment";
// import "moment/locale/es.js"; // Importa el locale español
// import { insertNotification } from "../../app/notifications/notifications.controller.js";
// import { padRef } from "../../../common/templates/tickets/_utils.js";

// moment.locale("es");
// dotenv.config();

// const client = new twilio(
//   process.env.TWILIO_ACCOUNT_SID,
//   process.env.TWILIO_AUTH_TOKEN
// );
// // const whatsappFrom = `whatsapp:${process.env.TWILIO_WHATSAPP_FROM}`;

// const WHATSAPP_FROM = `whatsapp:${process.env.TWILIO_WHATSAPP_FROM || "+14155238886"}`

// export const receiveWhatsappResponseTickets = async (req, res) => {
//   const {
//     From,
//     Body,
//     SmsStatus,
//     ButtonPayload: respuesta,
//     OriginalRepliedMessageSid,
//     SmsSid,
//   } = req.body || {};

//   // Twilio exige una respuesta XML aunque no hagamos nada
//   const emptyTwiML = () => res.type("text/xml").send("<Response></Response>");

//   console.log("📩 [WHATS] Webhook (tickets) recibido", req.body);

//    if (!From || !SmsStatus) return emptyTwiML();
//     if (SmsStatus !== "received") return emptyTwiML();
// if (!OriginalRepliedMessageSid) {
//     console.warn("⚠️ OriginalRepliedMessageSid faltante. No se puede enlazar respuesta a un envío.");
//     return emptyTwiML();
//   }


//     // return res.type("text/xml").send("<Response></Response>");

//   // const numero = From.replace("whatsapp:+57", "").trim();
//   // const mensaje = Body.trim().toLowerCase();

//   let connection = null;
//   try {
//     connection = await getConnection();

//  // 1) Ubicar el envío original (tickets)
//     const [msg] = await executeQuery(
//       `
//       SELECT 
//         m.msg_id,
//         m.tkt_id,
//         m.usu_id             AS destinatario_id,   -- a quién le enviamos originalmente
//         t.tkt_id             AS ticket_id,
//         t.tkt_asignado_a     AS asignado_id,
//         t.usu_id             AS solicitante_id,
//         t.tkt_usu_reg        AS creador_id,
//         t.pri_id             AS prioridad_id,
//         t.est_id             AS estado_id,
//         t.tkt_descripcion    AS descripcion,
//         CONCAT(uCreador.usu_nombre, ' ', IFNULL(uCreador.usu_apellido, '')) AS creador_nombre,
//         CONCAT(uAsig.usu_nombre, ' ', IFNULL(uAsig.usu_apellido, '')) AS asignado_nombre
//       FROM tbl_mensajes_enviados m
//       JOIN tbl_tickets t ON t.tkt_id = m.tkt_id
//       LEFT JOIN tbl_usuarios uCreador ON uCreador.usu_id = t.tkt_usu_reg
//       LEFT JOIN tbl_usuarios uAsig    ON uAsig.usu_id = t.tkt_asignado_a
//       WHERE m.msg_id_envio = ?
//       LIMIT 1
//       `,
//       [OriginalRepliedMessageSid],
//       connection
//     );

//      if (!msg || !msg.ticket_id) {
//       console.warn("⚠️ No se encontró envío original para el SID:", OriginalRepliedMessageSid);
//       return emptyTwiML();
//     }

//     // 2) Guardar la respuesta en el registro del envío
//     await executeQuery(
//       `
//       UPDATE tbl_mensajes_enviados
//          SET msg_id_respuesta = ?,
//              msg_fec_respuesta = NOW(),
//              msg_estado = 'respondido',
//              msg_payload = ?
//        WHERE msg_id_envio = ?
//       `,
//       [SmsSid, Body || "", OriginalRepliedMessageSid],
//       conn
//     );

//      // 3) Armar notificación interna
//     const tktRef = padRef ? padRef(msg.ticket_id) : `#${String(msg.ticket_id).padStart(4, "0")}`;
//     const titulo = `Respuesta por WhatsApp en ticket ${tktRef}`;
//     const mensaje =
//       `Se recibió una respuesta por WhatsApp sobre el ticket ${tktRef}.\n\n` +
//       `Mensaje: "${(Body || "").trim()}"\n` +
//       `De: ${From.replace("whatsapp:", "")}`;

//     // Notificar a creador y a encargado (si existen). Evita duplicar si son el mismo.
//     const destinatarios = new Set();
//     if (msg.creador_id) destinatarios.add(Number(msg.creador_id));
//     if (msg.asignado_id) destinatarios.add(Number(msg.asignado_id));


//      for (const uid of destinatarios) {
//       await insertNotification({
//         userId: uid,
//         prioridad: "media",
//         titulo,
//         mensaje,
//         tipo: "ticket",
//         modulo: "tickets",
//         accion: "respuesta_whatsapp",
//         data: { tktId: msg.ticket_id, msgIdEnvio: OriginalRepliedMessageSid, msgIdRespuesta: SmsSid },
//         connection: conn
//       });
//     }


//     // // 4) (Opcional) Responder al usuario por WhatsApp con texto plano mientras no haya plantilla aprobada
//     // try {
//     //   await client.messages.create({
//     //     from: WHATSAPP_FROM,
//     //     to: From, // Twilio exige el formato "whatsapp:+<pais><numero>"
//     //     body: `Hemos recibido tu mensaje sobre el ticket ${tktRef}. ¡Gracias! Nuestro equipo te contactará pronto.`
//     //     // Si luego usas plantilla:
//     //     // contentSid: "HXXXX...", contentVariables: JSON.stringify({ "1": tktRef })
//     //   });
//     // } catch (e) {
//     //   console.warn("⚠️ No se pudo enviar acuse de recibo por WhatsApp:", e?.message);
//     // }

//     return emptyTwiML();
//   } catch (err) {
//     console.error("❌ Error en webhook de WhatsApp (tickets):", err);
//     return emptyTwiML();
//   } finally {
//     if (conn) releaseConnection(conn);
//   }
// };