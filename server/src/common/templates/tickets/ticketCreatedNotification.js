import { emailBaseTemplate } from "../email.template.js";
import { renderTicketSummary, padRef, renderCTA } from "./_utils.js";

export function ticketCreatedNotification({ resumen, destinatario = "Encargado", linkSite, opcnot }) {
  const title = `🎫 Nuevo ticket ${padRef(resumen?.ticket?.tkt_id)} asignado`;
  const body = `
    <p><strong>${destinatario}</strong>, se te ha asignado un nuevo ticket.</p>
    ${renderTicketSummary({...resumen, opcnot})}
    ${renderCTA(linkSite, `Revisar ticket ${padRef(resumen?.ticket?.tkt_id)}`)}
  `;
  return emailBaseTemplate(title, body);
}
