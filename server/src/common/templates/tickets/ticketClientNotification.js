import { emailBaseTemplate } from "../email.template.js";
import { renderTicketSummary, padRef, renderCTA } from "./_utils.js";

export function ticketClientNotification({ resumen, destinatario = "Cliente", linkSite }) {
  const title = `🎫 Hemos recibido tu solicitud ${padRef(resumen?.ticket?.tkt_id)}`;
  const body = `
    <p><strong>${destinatario}</strong>, tu ticket fue registrado correctamente.</p>
    <p>Nuestro equipo revisará tu solicitud y te mantendremos informado sobre el progreso.</p>
    ${renderTicketSummary(resumen)}
    ${renderCTA(linkSite, `Ver seguimiento de tu ticket`)}
  `;
  return emailBaseTemplate(title, body);
}
