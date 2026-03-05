import { emailBaseTemplate } from "../email.template.js";
import { renderTicketSummary, padRef, renderCTA } from "./_utils.js";

export function ticketStateChangedNotification({ resumen, comentario = "", destinatario = "Usuario", linkSite }) {
  const nuevo = resumen?.estado?.tkt_est_nombre || "nuevo estado";
  const title = `🔔 Estado actualizado a ${nuevo} – ${padRef(resumen?.ticket?.tkt_id)}`;
  const body = `
    <p>Hola <strong>${destinatario}</strong>, el ticket cambió de estado a <strong>${nuevo}</strong>.</p>
    ${comentario ? `<p><strong>Comentario:</strong> ${comentario}</p>` : ""}
    ${renderTicketSummary(resumen)}
    ${renderCTA(linkSite)}
  `;
  return emailBaseTemplate(title, body);
}
