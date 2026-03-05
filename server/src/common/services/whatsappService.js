// server/src/common/services/whatsappService.js
import twilio from "twilio";
import dotenv from "dotenv";
import moment from "moment";
import "moment/locale/es.js";
moment.locale("es");
dotenv.config();

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken  = process.env.TWILIO_AUTH_TOKEN;
const whatsappFromEnv = process.env.TWILIO_WHATSAPP_FROM;

const toWhatsAddr = (phone) => {
  if (!phone) return null;
  let p = String(phone).replace(/\D/g, ""); // solo dígitos
  if (!p.startsWith("57")) p = `57${p}`;
  return `whatsapp:+${p}`;
};

const fromWhatsAddr = () => {
  const raw = whatsappFromEnv || "+18159348861";
  return raw.startsWith("whatsapp:") ? raw : `whatsapp:${raw}`;
};

export const sendWhatsAppMessage = async ({
  to,
  from,
  contentSid,
  contentVariables,
  twilioAccountSid = accountSid,
  twilioAuthToken = authToken,
  connection = null,  // <-- viene de saveTicket (transacción abierta)
  tktId = null,
  usuId = null,
  saveToDb = false,
}) => {
  if (!to || !contentSid || !contentVariables) {
    return { success: false, error: "Faltan parámetros obligatorios." };
  }
  if (!twilioAccountSid || !twilioAuthToken) {
    return { success: false, error: "Credenciales Twilio no configuradas." };
  }

  const toAddr   = to.startsWith("whatsapp:") ? to : toWhatsAddr(to);
  const fromAddr = from ? (from.startsWith("whatsapp:") ? from : `whatsapp:${from}`) : fromWhatsAddr();

  // 🔧 Normaliza variables para Content API
  const vars = {};
  for (const [k, v] of Object.entries(contentVariables)) {
    vars[String(k)] = String(v ?? ""); // claves y valores string, sin null/undefined
  }

  const client = new twilio(twilioAccountSid, twilioAuthToken);

  console.log(
    {
      from: fromAddr,
      to: toAddr,
      contentSid,
      contentVariables: JSON.stringify(vars),
    }
  )
 

  try {
    const response = await client.messages.create({
      from: fromAddr,
      to: toAddr,
      contentSid,
      contentVariables: JSON.stringify(vars), // 👈 usar vars, NO contentVariables
    });

    console.log("[Twilio] WhatsApp enviado:", {
      sid: response.sid,
      to: response.to,
      status: response.status,
      dateCreated: response.dateCreated,
    });

    if (saveToDb && tktId && usuId && connection) {
  const sqlOk = `
    INSERT INTO tbl_mensajes_enviados
      (tkt_id, usu_id, msg_medio, msg_id_envio, msg_estado, msg_vars, msg_texto)
    VALUES
      (?, ?, 'whatsapp', ?, 'enviado', ?, NULL)
  `;
  await connection.execute(sqlOk, [tktId, usuId, response.sid, JSON.stringify(vars)]);
}

    return { success: true, sid: response.sid, to: response.to, status: response.status };
  } catch (error) {
  console.error("[Twilio] Error WhatsApp:", error?.message || error);

  if (saveToDb && tktId && usuId && connection) {
    const sqlErr = `
      INSERT INTO tbl_mensajes_enviados
        (tkt_id, usu_id, msg_medio, msg_id_envio, msg_estado, msg_vars, msg_texto)
      VALUES
        (?, ?, 'whatsapp', ?, 'fallido', ?, ?)
    `;
    try {
      await connection.execute(sqlErr, [tktId, usuId, "ERR", JSON.stringify(vars), error?.message || String(error)]);
    } catch {}
  }
  return { success: false, error: error?.message || String(error) };
}
};


// import twilio from "twilio";
// import dotenv from "dotenv";
// import moment from "moment";
// import "moment/locale/es.js"; // Importa el locale español
// import { executeQuery } from "../configs/db.config.js";
// moment.locale("es");
// dotenv.config();

// const accountSid = process.env.TWILIO_ACCOUNT_SID;
// const authToken = process.env.TWILIO_AUTH_TOKEN;
// // const whatsappFrom = `whatsapp:${process.env.TWILIO_WHATSAPP_FROM}`;
// const whatsappFromEnv = process.env.TWILIO_WHATSAPP_FROM;
// //---Helpers ---

// const toWhatsAddr = (phone) => {
//   // Acepta "3001234567", "+573001234567", "573001234567" y devuelve "whatsapp:+573001234567"
//   if (!phone) return null;
//   let p = String(phone).replace(/\s+/g, "");
//   if (p.startsWith("+")) p = p.slice(1);
//   if (!p.startsWith("57")) p = `57${p}`;
//   return `whatsapp:+${p}`;
// };

// const fromWhatsAddr = () => {
//   // Usa el FROM del .env
//   const raw = whatsappFromEnv || "+14155238886";
//   return raw.startsWith("whatsapp:") ? raw : `whatsapp:${raw}`;
// };
// // =======================================================
// // 2) Enviar mensaje genérico (también Content API), útil
// //    cuando ya tienes contentSid y variables armadas.
// //    OJO: también guarda en tbl_mensajes_enviados si pasas tktId/usuId y saveToDb=true
// // =======================================================

// export const sendWhatsAppMessage = async ({
//   to,
//   from,
//   contentSid,
//   contentVariables,
//   twilioAccountSid = accountSid,
//   twilioAuthToken = authToken,
//   connection = null,
//   tktId = null,
//   usuId = null,
//   saveToDb = false,
// }) => {
//   if (
//     !to || !contentSid || !contentVariables 
//   ) {
//     return { success: false, error: "Faltan parámetros obligatorios." };
//   }

//   // const clientScoped = new twilio(twilioAccountSid, twilioAuthToken);
//   const toAddr   = to.startsWith("whatsapp:") ? to : toWhatsAddr(to);
//   const fromAddr = from ? (from.startsWith("whatsapp:") ? from : `whatsapp:${from}`) : fromWhatsAddr();

//   // 🔧 Content Variables: claves y valores como string, sin null/undefined
//   //    Si tu plantilla espera {1}, {2}, ... asegúrate de enviar exactamente esas.
//   const vars = {};
//   Object.entries(contentVariables).forEach(([k, v]) => {
//     const key = String(k);           // "1","2",...
//     const val = (v ?? "");           // evita null/undefined
//     vars[key] = String(val);         // Twilio quiere strings
//   });
  
//   const client = new twilio(twilioAccountSid, twilioAuthToken);

//   try {
//      const response = await client.messages.create({
//       from: fromAddr,
//       to: toAddr,
//       contentSid,
//       contentVariables: JSON.stringify(contentVariables),
//     });

//     console.log("[WA] Resultado envío:", response);
//     // 🔎 Log mínimo para trazar
//     console.log("[Twilio] WhatsApp enviado:", {
//       sid: response.sid,
//       to: response.to,
//       status: response.status,           // queued/sent/…
//       dateCreated: response.dateCreated,
//     });


//     if (saveToDb && tktId  && usuId) {
      
//       await executeQuery(
//         `
//         INSERT INTO tbl_mensajes_enviados
//           (tkt_id, usu_id, msg_medio, msg_id_envio, msg_estado, msg_vars, msg_texto)
//         VALUES
//           (?, ?, 'whatsapp', ?, 'enviado', ?, NULL)
//         `,
//         [tktId, usuId, response.sid,JSON.stringify(contentVariables)],
//          connection
//       );
//        console.warn("No se pudo guardar el envío de WhatsApp:", e?.message || e);
//     }

//     return {
//       success: true,
//       sid: response.sid,
//       to: response.to,
//       date: response.dateCreated,
//     };
//   } catch (error) {
//     if (saveToDb && tktId && usuId) {
//        console.error("[Twilio] Error WhatsApp:", error?.message || error);
//       try {
//         await executeQuery(
//           `
//           INSERT INTO tbl_mensajes_enviados
//             (tkt_id, usu_id, msg_medio, msg_id_envio, msg_estado, msg_vars, msg_texto)
//           VALUES
//             (?, ?, 'whatsapp', ?, 'fallido', ?, ?)
//           `,
//           [tktId, usuId, "ERR", JSON.stringify(contentVariables), error?.message || String(error)],
//          connection
//         );
//       } catch {}
//     }
//     return { success: false, error: error.message || String(error) };
//   }
// };