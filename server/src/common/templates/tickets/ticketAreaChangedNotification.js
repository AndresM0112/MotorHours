import { emailBaseTemplate } from "../email.template.js";
import { renderTicketSummary, padRef, renderCTA } from "./_utils.js";

export function ticketAreaChangedNotification({ resumen, destinatario = "Usuario", linkSite }) {
  const title = `🏷️ Cambio de área – ${padRef(resumen?.ticket?.tkt_id)}`;
  const body = `
    <p>Hola <strong>${destinatario}</strong>, el ticket cambió de área.</p>
    ${renderTicketSummary(resumen)}
    ${renderCTA(linkSite)}
  `;
  return emailBaseTemplate(title, body);
}
