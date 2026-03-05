import { emailBaseTemplate } from "../email.template.js";
import { renderTicketSummary, padRef, renderCTA } from "./_utils.js";

export function ticketReassignedNotification({ resumen, nuevoAsignadoNombre = "Usuario", linkSite }) {
  const title = `🔁 Ticket reasignado ${padRef(resumen?.ticket?.tkt_id)}`;
  const body = `
    <p><strong>${nuevoAsignadoNombre}</strong>, se te ha reasignado el siguiente ticket.</p>
    ${renderTicketSummary(resumen)}
    ${renderCTA(linkSite, "Abrir ticket")}
  `;
  return emailBaseTemplate(title, body);
}
