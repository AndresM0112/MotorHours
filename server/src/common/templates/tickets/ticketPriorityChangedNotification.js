import { emailBaseTemplate } from "../email.template.js";
import { renderTicketSummary, padRef, renderCTA } from "./_utils.js";

export function ticketPriorityChangedNotification({ resumen, destinatario = "Usuario", linkSite }) {
  const pri = resumen?.prioridad?.pri_nombre || "Prioridad";
  const title = `⚠️ Cambio de prioridad a ${pri} – ${padRef(resumen?.ticket?.tkt_id)}`;
  const body = `
    <p>Hola <strong>${destinatario}</strong>, se actualizó la prioridad a <strong>${pri}</strong>.</p>
    ${renderTicketSummary(resumen)}
    ${renderCTA(linkSite)}
  `;
  return emailBaseTemplate(title, body);
}
