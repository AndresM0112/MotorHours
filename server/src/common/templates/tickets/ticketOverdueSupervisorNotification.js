// common/templates/tickets/ticketOverdueSupervisorNotification.js
import { emailBaseTemplate } from "../email.template.js";
import { renderTicketSummary, padRef, renderCTA } from "./_utils.js";
// Reusa tu helper existente:
import { formatElapsed } from "../../../tasks/helpers/helpersTikets.js";

const toTitleCase = (s) =>
  String(s ?? "Supervisor")
    .toLowerCase()
    .replace(/\p{L}\S*/gu, (w) => w[0].toUpperCase() + w.slice(1));

export function ticketOverdueSupervisorNotification({
  resumen,
  periodIdx,
  intervaloMin,
  linkSite,
  supervisorNombre = "Supervisor",
  encargadoNombre = "Sin asignar",
}) {
  const ref = padRef(resumen?.ticket?.tkt_id);
  const elapsedTxt = formatElapsed(Number(periodIdx), Number(intervaloMin)); // "X días (Y horas)"
  const slaTxt = formatElapsed(1, Number(intervaloMin));                    // "SLA legible"

  const title = `⏰ Ticket vencido – ${ref}`;
  const body = `
    <p>Hola <strong>${toTitleCase(supervisorNombre)}</strong>,</p>
    <p>El ticket <strong>${ref}</strong> superó su SLA de <strong>${slaTxt}</strong>.</p>
    <p><strong>Encargado actual:</strong> ${encargadoNombre}</p>
    <p><strong>Tiempo transcurrido:</strong> ${elapsedTxt}.</p>

    ${renderTicketSummary(resumen)}

    <p style="margin-top:10px">
      <em>Sugerencia:</em> revisa el caso con el encargado, añade comentarios o reasigna si corresponde.
    </p>

    ${renderCTA(linkSite, `Abrir ${padRef(resumen?.ticket?.tkt_id)}`)}
  `;
  return emailBaseTemplate(title, body);
}
