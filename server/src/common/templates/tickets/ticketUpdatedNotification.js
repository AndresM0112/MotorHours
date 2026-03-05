import { emailBaseTemplate } from "../email.template.js";
import { renderTicketSummary, padRef, renderCTA } from "./_utils.js";

export function ticketUpdatedNotification({ resumen, cambios = "El ticket ha sido actualizado.", destinatario = "Usuario", linkSite }) {
  const title = `✏️ Actualización en ticket ${padRef(resumen?.ticket?.tkt_id)}`;
  const body = `
    <p>Hola <strong>${destinatario}</strong>, ${cambios}</p>
    ${renderTicketSummary(resumen)}
    ${renderCTA(linkSite)}
  `;
  return emailBaseTemplate(title, body);
}
