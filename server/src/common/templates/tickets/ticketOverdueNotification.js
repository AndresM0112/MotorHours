import { emailBaseTemplate } from "../email.template.js";
import { renderTicketSummary, padRef, renderCTA } from "./_utils.js";
import { formatElapsed } from "../../../tasks/helpers/helpersTikets.js";

export function ticketOverdueNotification({ resumen, periodIdx, intervaloMin, linkSite, destinatario = "Usuario" }) {
  const title = `⏰ Alerta de vencimiento – ${padRef(resumen?.ticket?.tkt_id)}`;

 const elapsedTxt = formatElapsed(Number(periodIdx), Number(intervaloMin)); // p.ej. "3 días (72 horas)"
  const slaTxt = formatElapsed(1, Number(intervaloMin)); 
  
  const body = `
    <p>Hola <strong>${destinatario}</strong>,</p>
    <p>Este ticket superó su SLA de <strong>${slaTxt}</strong>.</p>
    <p>Tiempo transcurrido desde su creación: <strong>${elapsedTxt}</strong>.</p>
    ${renderTicketSummary(resumen)}
    ${renderCTA(linkSite, `Abrir ${padRef(resumen?.ticket?.tkt_id)}`)}
  `;
  return emailBaseTemplate(title, body);
}
// export function ticketOverdueNotification({ resumen, periodIdx, intervaloMin, linkSite, destinatario = "Usuario" }) {
//   const title = `⏰ Alerta de vencimiento – ${padRef(resumen?.ticket?.tkt_id)}`;
//   const body = `
//     <p>Hola <strong>${destinatario}</strong>, este ticket alcanzó el período <strong>${periodIdx}</strong> × (<strong>${intervaloMin} min</strong>) desde su creación.</p>
//     ${renderTicketSummary(resumen)}
//     ${renderCTA(linkSite, `Abrir ${padRef(resumen?.ticket?.tkt_id)}`)}
//   `;
//   return emailBaseTemplate(title, body);
// }
