import { emailBaseTemplate } from "../email.template.js";
import { renderTicketSummary, renderCTA, padRef } from "./_utils.js"; 
import { hoursUntil } from "../../utils/reminder.utils.js";

/**
 * Construye el asunto dinámico según último aviso.
 */
function buildReminderSubject({ ticket, horasHastaLimite, nroRecordatorio = 1, esUltimoAviso = false }) {
  const ref = padRef(ticket?.tkt_id);
  if (esUltimoAviso) return `⏰ Último aviso: Ticket ${ref} requiere acción inmediata`;
  if (horasHastaLimite != null) {
    if (horasHastaLimite <= 0) return `⚠️ Ticket ${ref} con SLA vencido`;
    if (horasHastaLimite <= 4) return `⚠️ Quedan ${horasHastaLimite}h para el SLA - Ticket ${ref}`;
    if (horasHastaLimite <= 12) return `🕒 Recordatorio (${nroRecordatorio}) - Ticket ${ref} se acerca al SLA`;
  }
  return `🔔 Recordatorio (${nroRecordatorio}) - Ticket ${ref}`;
}

/**
 * Encabezado corto según rol
 */
function buildLead({ rol, horasHastaLimite, esUltimoAviso }) {
  const base = rol === "Encargado"
    ? "Tienes un ticket pendiente de gestión."
    : "Hay un ticket pendiente de actualización.";

  if (esUltimoAviso) return `<p><strong>${rol}</strong>, este es el <strong>último aviso</strong> antes de escalar.</p>`;
  if (horasHastaLimite == null) return `<p><strong>${rol}</strong>, ${base}</p>`;
  if (horasHastaLimite <= 0) return `<p><strong>${rol}</strong>, el ticket <strong>ya superó</strong> la fecha límite (SLA).</p>`;
  if (horasHastaLimite <= 4) return `<p><strong>${rol}</strong>, quedan <strong>${horasHastaLimite} horas</strong> para el SLA.</p>`;
  if (horasHastaLimite <= 12) return `<p><strong>${rol}</strong>, el ticket está próximo al SLA.</p>`;
  return `<p><strong>${rol}</strong>, ${base}</p>`;
}

/**
 * Pie con SLA y fechas de alerta.
 */
function renderSlaFooter({ ticket }) {
  const fmt = (s) => (s ? new Date(s).toLocaleString("es-CO", { hour12: false }) : "—");
  return `
    <hr style="margin:16px 0;border:none;border-top:1px solid #eee;" />
    <table width="100%" style="font-size:12px;color:#555;">
      <tr>
        <td><strong>Última alerta:</strong> ${fmt(ticket?.tkt_ult_alerta)}</td>
        <td><strong>Próxima alerta:</strong> ${fmt(ticket?.tkt_prox_alerta)}</td>
        <td><strong>Fecha límite (SLA):</strong> ${fmt(ticket?.tkt_fec_limite)}</td>
      </tr>
    </table>
  `;
}

/**
 * Recordatorio para encargado
 */
export function ticketReminderForAssignee({ resumen, linkSite, nroRecordatorio = 1 }) {
  const horasHastaLimite = hoursUntil(resumen.ticket?.tkt_fec_limite);
  const esUltimoAviso = horasHastaLimite != null && horasHastaLimite <= 0;

  const subject = buildReminderSubject({ ticket: resumen.ticket, horasHastaLimite, nroRecordatorio, esUltimoAviso });
  const lead = buildLead({ rol: "Encargado", horasHastaLimite, esUltimoAviso });

  const body = `
    ${lead}
    ${renderTicketSummary(resumen)}
    <ul>
      <li>Actualiza estado, comentarios y próximas acciones.</li>
      <li>Si necesitas apoyo, reasigna o comenta en el ticket.</li>
      <li>Evita que el ticket llegue a vencido para no activar escalamiento automático.</li>
    </ul>
    ${renderCTA(linkSite, `Abrir ticket ${padRef(resumen.ticket.tkt_id)}`)}
    ${renderSlaFooter({ ticket: resumen.ticket })}
  `;

  return { subject, html: emailBaseTemplate(subject, body) };
}

/**
 * Recordatorio para solicitante
 */
export function ticketReminderForRequester({ resumen, linkSite, nroRecordatorio = 1 }) {
  const horasHastaLimite = hoursUntil(resumen.ticket?.tkt_fec_limite);
  const esUltimoAviso = horasHastaLimite != null && horasHastaLimite <= 0;

  const subject = buildReminderSubject({ ticket: resumen.ticket, horasHastaLimite, nroRecordatorio, esUltimoAviso });
  const lead = buildLead({ rol: "Solicitante", horasHastaLimite, esUltimoAviso });

  const body = `
    ${lead}
    ${renderTicketSummary(resumen)}
    <p>
      Si tienes más información (ej. capturas, detalles), compártela para agilizar la solución. 
      También puedes confirmar si la situación ya fue resuelta.
    </p>
    ${renderCTA(linkSite, `Ver ticket ${padRef(resumen.ticket.tkt_id)}`)}
    ${renderSlaFooter({ ticket: resumen.ticket })}
  `;

  return { subject, html: emailBaseTemplate(subject, body) };
}
