export function formatElapsed(periodIdx, intervaloMin) {
  const totalMin = periodIdx * intervaloMin;
  const horas = Math.floor(totalMin / 60);
  const dias = Math.floor(totalMin / 1440);

  return `${dias} días (${horas} horas)`;
}

export async function resolveNotifUserId(conn, ...candidates) {
  for (const id of candidates) {
    if (!id) continue;
    const [[row]] = await conn.query(
      "SELECT usu_id FROM tbl_usuarios WHERE usu_id = ? LIMIT 1",
      [id]
    );
    if (row?.usu_id) return row.usu_id;
  }
  return null; // no hay usuario válido
}

// Acciones estándar para historial (ajusta a tus códigos si manejas enteros)
// export const ACCIONES = {
//   RECORDATORIO: "recordatorio",
//   VENCIDO: "vencido",
// };

export const ACCIONES = {
  REGISTRO: 1,
  CAMBIO_ESTADO: 2,
  RESULTADO: 3,
  ELIMINACION: 4,
  RESTAURACION: 5,
  COMENTARIO: 6,
  REASIGNACION: 7,
  MODIFICACION: 8,
  CAMBIO_AREA: 9,
  CAMBIO_PRIORIDAD: 10,
  RECORDATORIO: 11,
  VENCIDO: 12,
};


// Inserta una línea en tbl_tickets_historial de forma segura
export async function insertHistorial({
  conn,
  tktId,
  usuId,            // quién “origina” el evento; si no aplica, usa SYSTEM_USER_ID o null
  accion,           // usar ACCIONES.RECORDATORIO o ACCIONES.VENCIDO
  comentario = "",  // texto descriptivo
  estadoAnterior = null,
  estadoNuevo = null,
}) {
  try {
    await conn.query(
      `
      INSERT INTO tbl_tickets_historial
        (tkt_id, usu_id, tht_accion, tht_estado_anterior, tht_estado_nuevo, tht_comentario, tht_fecha)
      VALUES (?, ?, ?, ?, ?, ?, NOW())
      `,
      [tktId, usuId ?? null, accion, estadoAnterior, estadoNuevo, comentario]
    );
  } catch (err) {
    console.warn(`[HISTORIAL] No se pudo insertar historial para ticket ${tktId}: ${err.message}`);
  }
}

// ⬆️ Coloca este helper arriba del archivo (o en un utils e impórtalo)
export const DEFAULT_SLA_MIN = Number(process.env.DEFAULT_SLA_MIN ?? 48 * 60); // 48h fallback

export async function getSlaMinByArea(conn, areaId) {
  if (!areaId) return DEFAULT_SLA_MIN;

  const [[row]] = await conn.query(
    `
    SELECT COALESCE(
             a.are_tiempo_estimado_minutos,
             CASE
               WHEN a.are_cantidad_estimado IS NOT NULL AND f.fre_multiplicador IS NOT NULL
                 THEN a.are_cantidad_estimado * f.fre_multiplicador
               ELSE NULL
             END
           ) AS sla_min
      FROM tbl_areas a
      LEFT JOIN tbl_frecuencias f ON a.fre_id = f.fre_id
     WHERE a.are_id = ?
     LIMIT 1
    `,
    [areaId]
  );

  const slaMin = Number(row?.sla_min);
  return Number.isFinite(slaMin) && slaMin > 0 ? slaMin : DEFAULT_SLA_MIN;
}
