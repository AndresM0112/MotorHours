// helpers para armar el bloque resumen
export const padRef = (id) => `#${String(id ?? "").padStart(4, "0")}`;

export const renderTicketSummary = ({
  ticket,
  cliente,
  bloque,
  local,
  prioridad,
  estado,
  localizacion,

  // tolerancia a legacy (por si algún caller viejo aún manda estos)
  proyecto, // == bloque
  etapa, // == local
  unidad, // == local (muy legacy)
  opcnot = 3,
}) => {
  const safe = (v) => (v == null ? "" : String(v));

  // fallback inteligente para no romper llamadas previas
  const _bloque = bloque ?? proyecto ?? null;
  const _local = local ?? etapa ?? unidad ?? null;

  const fullCliente = [safe(cliente?.usu_nombre), safe(cliente?.usu_apellido)]
    .join(" ")
    .trim();

  // 👇 nombre legible de localización, soporta objeto o string
  const localizacionNombre =
    localizacion && typeof localizacion === "object"
      ? safe(localizacion.lca_nombre)
      : safe(localizacion);

  let contenido = ``;
  if (opcnot === 1) {
    contenido += `<li><strong>Localización:</strong> ${
      localizacionNombre || "—"
    }</li>`;
  }
  if (opcnot === 2) {
    contenido += `
       <li><strong>Localización:</strong> ${localizacionNombre || "—"}</li>
       <li><strong>Bloque:</strong> ${
         safe(_bloque?.blo_nombre) || "No definido"
       }</li>
       `;
  }
  if (opcnot === 3) {
    contenido += `
      <li><strong>Cliente:</strong> ${fullCliente || "—"}</li>
      <li><strong>Bloque:</strong> ${
        safe(_bloque?.blo_nombre) || "No definido"
      }</li>
      <li><strong>Local:</strong> ${
        safe(_local?.loc_nombre) || "No definido"
      }</li>      
        `;
  }

  return `
    <p><strong>Resumen del Ticket:</strong></p>
    <ul style="line-height:1.6">
      <li><strong>ID:</strong> ${padRef(ticket?.tkt_id)}</li>
      ${contenido}
      <li><strong>Descripción:</strong> ${safe(ticket?.tkt_descripcion)}</li>
      <li><strong>Prioridad:</strong> ${safe(prioridad?.pri_nombre) || "—"}</li>
      <li><strong>Estado:</strong> ${safe(estado?.tkt_est_nombre) || "—"}</li>
    </ul>
  `;
};

export const renderCTA = (href, label = "Ver ticket") =>
  href
    ? `<p style="margin-top:16px">
         <a href="${href}" style="display:inline-block;padding:10px 16px;border-radius:8px;background:#e63743;color:#fff;text-decoration:none">${label}</a>
       </p>`
    : "";
