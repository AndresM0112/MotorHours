import {
  getConnection,
  releaseConnection,
} from "../../../common/configs/db.config.js";
import { sendEmail } from "../../../common/services/mailerService.js";
import { emailBaseTemplate } from "../../../common/templates/email.template.js";
import { urlBase } from "../../../common/constants/app.constants.js";
import { insertNotification } from "../../app/notifications/notifications.controller.js";
import { ticketCreatedNotification } from "../../../common/templates/tickets/ticketCreatedNotification.js";
import { ticketReassignedNotification } from "../../../common/templates/tickets/ticketReassignedNotification.js";
import { ticketUpdatedNotification } from "../../../common/templates/tickets/ticketUpdatedNotification.js";
import { ticketStateChangedNotification } from "../../../common/templates/tickets/ticketStateChangedNotification.js";
import { ticketPriorityChangedNotification } from "../../../common/templates/tickets/ticketPriorityChangedNotification.js";
import { ticketAreaChangedNotification } from "../../../common/templates/tickets/ticketAreaChangedNotification.js";
import { ticketClientNotification } from "../../../common/templates/tickets/ticketClientNotification.js";
import sharepointQueue from "../../../common/configs/Queue/sharepointWorker.js";
import {
  ACCIONES,
  DEFAULT_SLA_MIN,
  getSlaMinByArea,
} from "../../../tasks/helpers/helpersTikets.js";
import { getReglas } from "../../app/general/app.controller.js";
import { sendWhatsAppMessage } from "../../../common/services/whatsappService.js";
import { generateTicketPdfWithMerge, generateHTMLInformeTicket } from "../../../common/services/saveFormTickets.js";
import { tryGetIO } from "../../../common/configs/socket.manager.js";
import { esNumero } from "../../../common/utils/funciones.js";

// const ACCIONES = {
//   REGISTRO: 1,
//   CAMBIO_ESTADO: 2,
//   CAMBIO_RESULTADO: 3,
//   ELIMINACION: 4,
//   RESTAURACION: 5,
//   COMENTARIO: 6,
//   REASIGNACION: 7,
//   MODIFICACION: 8,
//   CAMBIO_AREA: 9,
//   CAMBIO_PRIORIDAD: 10,
// };

export const getUsuariosConPermiso = async (perId, conn) => {
  const permisos = Array.isArray(perId)
    ? perId.map(Number)
    : typeof perId === "string"
    ? perId.split(",").map(Number)
    : [Number(perId)];

  const [rows] = await conn.query(
    `SELECT DISTINCT pu.usu_id
     FROM tbl_permisos_usuarios pu
     JOIN tbl_usuarios u ON u.usu_id = pu.usu_id
     WHERE pu.per_id IN (${permisos.join(",")}) AND u.est_id != 3`
  );

  return rows.map((row) => row.usu_id);
};

// Obtener todos los tickets activos
export const getAllTickets = async (connection = null) => {
  let conn = connection;
  let release = false;
  try {
    if (!conn) {
      conn = await getConnection();
      release = true;
    }
    const [rows] = await conn.query(
      `
      SELECT 
        t.tkt_id           AS tktId,
        t.usu_id           AS clienteId,
        t.loc_id           AS localId,
        t.blo_id           AS bloqueId,
        t.pri_id           AS prioridadId,
        p.pri_nombre       AS prioridad,
        p.pri_color        AS prioridadColor,
        t.est_id           AS estadoId,
        e.tkt_est_nombre       AS estado,
        t.tkt_resultado    AS resultadoId,
        r.res_nombre       AS resultado,
        t.tkt_asignado_a   AS asignadoA,
        t.tkt_fec_reg      AS fechaRegistro,
        t.tkt_fec_act      AS fechaActualizacion
      FROM tbl_tickets t
      LEFT JOIN tbl_tickets_prioridades p ON t.pri_id = p.pri_id
      LEFT JOIN tbl_tickets_estados e    ON t.est_id = e.est_id AND e.est_id NOT IN(3,5)
      LEFT JOIN tbl_tickets_resultados r ON t.tkt_resultado = r.res_id
      WHERE t.tkt_eliminado = 0
      ORDER BY t.tkt_fec_reg DESC
    `
    );
    return rows;
  } catch (err) {
    throw err;
  } finally {
    if (release) releaseConnection(conn);
  }
};

// Obtener un ticket por ID (incluye historial)
export const getTicketById = async (tktId, connection = null) => {
  let conn = connection;
  let release = false;

  try {
    if (!conn) {
      conn = await getConnection();
      release = true;
    }

    // 1. Obtener datos principales del ticket
    const [[ticket]] = await conn.query(
      `
        SELECT 
        t.tkt_id           AS tktId,
        t.usu_id           AS clienteId,
        t.tkt_descripcion  AS descripcion,
        t.loc_id           AS localId,
        t.blo_id           AS bloqueId,
        t.lca_id           AS localizacionId,
        t.are_id           AS areaId,
        t.tkt_asignado_a   AS asignado,
        t.pri_id           AS prioridadId,
        t.est_id           AS estadoId,
        t.tkt_fec_reg      AS fechaRegistro,
        t.tkt_fec_act      AS fechaActualizacion
      FROM tbl_tickets t
      WHERE t.tkt_id = ? AND t.tkt_eliminado = 0
      LIMIT 1
      `,
      [tktId]
    );

    if (!ticket) return null;

    // 2. Historial completo del ticket
    const [historial] = await conn.query(
      `
        SELECT 
        tht_id              AS historialId,
        usu_id              AS usuarioId,
        tht_accion          AS accionId,
        tht_estado_anterior AS estadoAnteriorId,
        tht_estado_nuevo    AS estadoNuevoId,
        mot_id              AS motivoId,
        tht_comentario      AS comentario,
        tkt_resultado       AS resultadoId,
        tht_fecha           AS fecha
      FROM tbl_tickets_historial
      WHERE tkt_id = ?
      ORDER BY tht_fecha ASC
      `,
      [tktId]
    );

    const [evidencias] = await conn.query(
      `
        SELECT 
          tke_id         AS evidenciaId,
          tkt_id         AS ticketId,
          tke_nombre     AS nombre,
          tke_url_local        AS urllocal,
          tke_url_publica    AS urlpublica,
          tke_file_id     AS fileId,
          tke_ext        AS extension,
          tke_mimetype   AS mimetype,
          tke_size       AS size,
          tke_tipo       AS tipo
        FROM tbl_tickets_evidencias
        WHERE tkt_id = ?
        ORDER BY tke_fec_reg DESC
      `,
      [tktId]
    );

    return {
      ...ticket,
      historial,
      evidencias,
    };
  } catch (err) {
    throw err;
  } finally {
    if (release) releaseConnection(conn);
  }
};

// resumen tickets por estado:
// export const getResumenPorEstados = async (usuarioId, permisos) => {
//   let conn;
//   try {
//     conn = await getConnection();
//     const puedeVerTodos = permisos.includes("37");
//     const values = [];

//     let filtroVisibilidad = "";

//     if (!puedeVerTodos) {
//       const [areasUsuario] = await conn.query(
//         `SELECT are_id FROM tbl_areas_usuarios WHERE usu_id = ?`,
//         [usuarioId]
//       );

//       const areaIds = areasUsuario.map((a) => a.are_id);

//       if (areaIds.length === 0) {
//         filtroVisibilidad = `AND t.tkt_asignado_a = ?`;
//         values.push(usuarioId);
//       } else {
//         const areaPlaceholders = areaIds.map(() => "?").join(",");
//         filtroVisibilidad = `
//           AND (
//             t.tkt_asignado_a = ? OR
//             (t.tkt_asignado_a IS NULL AND t.are_id IN (${areaPlaceholders}))
//           )`;
//         values.push(usuarioId, ...areaIds);
//       }
//     }

//     // Totales actuales por estado (para los contadores)
//     const [estados] = await conn.query(
//       `
//       SELECT
//         e.est_id AS id,
//         e.est_codigo AS slug,
//         e.est_nombre AS title,
//         COUNT(t.tkt_id) AS total
//       FROM tbl_tickets_estados e
//       LEFT JOIN tbl_tickets t
//         ON t.est_id = e.est_id
//         AND t.tkt_eliminado = 0
//         ${filtroVisibilidad}
//       WHERE e.est_id NOT IN (3, 5)
//       GROUP BY e.est_id, e.est_codigo, e.est_nombre
//       ORDER BY e.est_orden
//       `,
//       values
//     );

//     // Tickets por estado y mes del año actual (para gráficos y porcentaje)
//     const year = new Date().getFullYear();
//     const [ticketsPorEstadoYMes] = await conn.query(
//       `
//       SELECT
//         e.est_codigo AS slug,
//         MONTH(t.tkt_fec_reg) AS mes,
//         COUNT(t.tkt_id) AS total
//       FROM tbl_tickets t
//       INNER JOIN tbl_tickets_estados e ON t.est_id = e.est_id
//       WHERE
//         YEAR(t.tkt_fec_reg) = ?
//         AND t.tkt_eliminado = 0
//         ${filtroVisibilidad}
//       GROUP BY e.est_codigo, MONTH(t.tkt_fec_reg)
//       `,
//       [year, ...values]
//     );

//     // Agrupar los datos en { slug: [12 valores] }
//     const agrupadoPorEstado = {};

//     for (const row of ticketsPorEstadoYMes) {
//       if (!agrupadoPorEstado[row.slug]) {
//         agrupadoPorEstado[row.slug] = new Array(12).fill(0);
//       }
//       agrupadoPorEstado[row.slug][row.mes - 1] = row.total;
//     }

//     const mesActual = new Date().getMonth(); // 0 = enero

//     const colorMap = {
//       abierto: { color: "#4dabf7", background: "#e3f2fd" },
//       en_proceso: { color: "#f39c12", background: "#fef5e7" },
//       en_espera: { color: "#e74c3c", background: "#fdecea" },
//       cerrado: { color: "#2ecc71", background: "#eafaf1" },
//       reabierto: { color: "#3498db", background: "#e8f4fd" },
//       anulado: { color: "#c0392b", background: "#fdecea" },
//     };

//     const result = estados.map((row) => {
//       const chartData = agrupadoPorEstado[row.slug] || new Array(12).fill(0);
//       const actual = chartData[mesActual] || 0;
//       const anterior = chartData[mesActual - 1] || 0;

//       const percent =
//         anterior === 0
//           ? actual > 0
//             ? 100
//             : 0
//           : (((actual - anterior) / anterior) * 100).toFixed(1);

//       return {
//         id: row.slug,
//         title: row.title,
//         total: row.total, // estado actual
//         chartData, // evolución anual por estado
//         percent: parseFloat(percent),
//         ...(colorMap[row.slug] || { color: "#cccccc", background: "#f9f9f9" }),
//       };
//     });

//     return result;
//   } catch (error) {
//     console.error("Error en getResumenPorEstados:", error);
//     throw error;
//   } finally {
//     if (conn) releaseConnection(conn);
//   }
// };

export const getResumenPorEstados = async (usuarioId, permisos) => {
  let conn;
  try {
    conn = await getConnection();

    // 1) Normaliza permisos a strings igual que antes
    const permisosArr = Array.isArray(permisos)
      ? permisos.map((p) => String(p))
      : typeof permisos === "string"
      ? permisos.split(",").map((p) => p.trim())
      : [];

    const puedeVerTodos = permisosArr.includes("37");

    // 2) Filtros de visibilidad (ALINEADOS con paginationTickets / countTicketsByEstado)
    const filters = ["t.tkt_eliminado = 0"];
    const values = [];

    if (!puedeVerTodos) {
      const [areasUsuario] = await conn.query(
        `SELECT are_id FROM tbl_areas_usuarios WHERE usu_id = ?`,
        [usuarioId]
      );
      const areaIds = areasUsuario.map((a) => a.are_id);

      if (areaIds.length === 0) {
        // Mismo criterio que en paginationTickets / countTicketsByEstado:
        // puede ver tickets asignados a él o que él registró
        filters.push("(t.tkt_asignado_a = ? OR t.tkt_usu_reg = ?)");
        values.push(usuarioId, usuarioId);
      } else {
        // Asignados a él, registrados por él o sin asignar pero dentro de sus áreas
        const placeholdersAreas = areaIds.map(() => "?").join(",");

        filters.push(`(
          t.tkt_asignado_a = ?
          OR t.tkt_usu_reg = ?
          OR (t.tkt_asignado_a IS NULL AND t.are_id IN (${placeholdersAreas}))
        )`);

        values.push(usuarioId, usuarioId, ...areaIds);
      }
    }

    const whereClause = filters.length ? "WHERE " + filters.join(" AND ") : "";

    // 3) Base idéntica a la grilla / contador (mismos JOIN / LEFT JOIN)
    const baseSubquery = `
      SELECT
        t.tkt_id           AS tktId,
        e.est_id           AS estId,
        e.tkt_est_codigo   AS estCodigo,
        e.tkt_est_nombre   AS estNombre,
        e.tkt_est_color    AS estColor,
        t.tkt_fec_reg      AS fechaRegistro
      FROM tbl_tickets t
      LEFT JOIN tbl_usuarios u       ON u.usu_id   = t.usu_id
      LEFT JOIN tbl_usuarios ua      ON ua.usu_id  = t.tkt_asignado_a
      LEFT JOIN tbl_locales  loc     ON loc.loc_id = t.loc_id
      LEFT JOIN tbl_bloques  pro     ON pro.blo_id = t.blo_id
      LEFT JOIN tbl_localizacion lca ON lca.lca_id = t.lca_id
      JOIN tbl_areas a               ON a.are_id   = t.are_id
      JOIN tbl_tickets_prioridades p ON p.pri_id   = t.pri_id
      JOIN tbl_tickets_estados  e    ON e.est_id   = t.est_id AND e.est_id NOT IN (3,5)
      ${whereClause}
    `;

    // 4) Totales por estado (mismo universo de tickets que la grilla/contador)
    const [estados] = await conn.query(
      `
      SELECT
        e.est_id         AS id,
        e.tkt_est_codigo AS slug,
        e.tkt_est_nombre AS title,
        COALESCE(COUNT(b.tktId), 0) AS total
      FROM tbl_tickets_estados e
      LEFT JOIN (${baseSubquery}) b ON b.estId = e.est_id
      WHERE e.est_id NOT IN (3,5)
      GROUP BY e.est_id, e.tkt_est_codigo, e.tkt_est_nombre
      ORDER BY e.tkt_est_orden
      `,
      values
    );

    // 5) Serie mensual usando la misma base
    const year = new Date().getFullYear();
    const [ticketsPorEstadoYMes] = await conn.query(
      `
      SELECT
        b.estCodigo AS slug,
        MONTH(b.fechaRegistro) AS mes,
        COUNT(b.tktId) AS total
      FROM (${baseSubquery}) b
      WHERE YEAR(b.fechaRegistro) = ?
      GROUP BY b.estCodigo, MONTH(b.fechaRegistro)
      `,
      [...values, year]
    );

    // 6) Armar series por estado
    const agrupadoPorEstado = {};
    for (const row of ticketsPorEstadoYMes) {
      if (!agrupadoPorEstado[row.slug]) {
        agrupadoPorEstado[row.slug] = new Array(12).fill(0);
      }
      agrupadoPorEstado[row.slug][row.mes - 1] = row.total;
    }

    const mesActual = new Date().getMonth(); // 0..11
    const colorMap = {
      abierto: { color: "#4dabf7", background: "#e3f2fd" },
      en_proceso: { color: "#f39c12", background: "#fef5e7" },
      en_espera: { color: "#e74c3c", background: "#fdecea" },
      cerrado: { color: "#2ecc71", background: "#eafaf1" },
      reabierto: { color: "#3498db", background: "#e8f4fd" },
      anulado: { color: "#c0392b", background: "#fdecea" },
    };

    const result = estados.map((row) => {
      const chartData = agrupadoPorEstado[row.slug] || new Array(12).fill(0);
      const actual = chartData[mesActual] || 0;
      const anterior = chartData[Math.max(0, mesActual - 1)] || 0;

      const percent =
        anterior === 0
          ? actual > 0
            ? 100
            : 0
          : Number((((actual - anterior) / anterior) * 100).toFixed(1));

      return {
        id: row.slug,
        title: row.title,
        total: row.total,
        chartData,
        percent,
        ...(colorMap[row.slug] || { color: "#cccccc", background: "#f9f9f9" }),
      };
    });

    return result;
  } catch (error) {
    console.error("Error en getResumenPorEstados:", error);
    throw error;
  } finally {
    if (conn) releaseConnection(conn);
  }
};

// export const getResumenPorEstados = async (usuarioId, permisos) => {
//   let conn;
//   try {
//     conn = await getConnection();

//     // 1) Normaliza permisos a strings
//     const permisosArr = Array.isArray(permisos)
//       ? permisos.map((p) => String(p))
//       : typeof permisos === "string"
//       ? permisos.split(",").map((p) => p.trim())
//       : [];
//     const puedeVerTodos = permisosArr.includes("37");

//     // 2) Filtros de visibilidad (mismo criterio que la grilla)
//     const filters = ["t.tkt_eliminado = 0"];
//     const values = [];

//     if (!puedeVerTodos) {
//       const [areasUsuario] = await conn.query(
//         `SELECT are_id FROM tbl_areas_usuarios WHERE usu_id = ?`,
//         [usuarioId]
//       );
//       const areaIds = areasUsuario.map((a) => a.are_id);

//       if (areaIds.length === 0) {
//         filters.push("t.tkt_asignado_a = ?");
//         values.push(usuarioId);
//       } else {
//         filters.push(`(
//           t.tkt_asignado_a = ? OR
//           (t.tkt_asignado_a IS NULL AND t.are_id IN (${areaIds
//             .map(() => "?")
//             .join(",")}))
//         )`);
//         values.push(usuarioId, ...areaIds);
//       }
//     }

//     const whereClause = filters.length ? "WHERE " + filters.join(" AND ") : "";

//     // 3) Base idéntica a la grilla (INNER JOINs + NOT IN (3,5))
//     const baseSubquery = `
//       SELECT
//         t.tkt_id         AS tktId,
//         e.est_id         AS estId,
//         e.tkt_est_codigo     AS estCodigo,
//         e.tkt_est_nombre     AS estNombre,
//         e.tkt_est_color      AS estColor,
//         t.tkt_fec_reg    AS fechaRegistro
//       FROM tbl_tickets t
//       JOIN tbl_usuarios u    ON u.usu_id = t.usu_id
//       LEFT JOIN tbl_usuarios ua ON ua.usu_id = t.tkt_asignado_a
//       JOIN tbl_locales  loc  ON loc.loc_id = t.loc_id
//       JOIN tbl_bloques  pro  ON pro.blo_id = t.blo_id
//       JOIN tbl_areas    a    ON a.are_id   = t.are_id
//       JOIN tbl_tickets_prioridades p ON p.pri_id = t.pri_id
//       JOIN tbl_tickets_estados  e ON e.est_id = t.est_id AND e.est_id NOT IN (3,5)
//       ${whereClause}
//     `;

//     // 4) Totales por estado desde la base (alineado 1:1 con la grilla)
//     const [estados] = await conn.query(
//       `
//       SELECT
//         e.est_id     AS id,
//         e.tkt_est_codigo AS slug,
//         e.tkt_est_nombre AS title,
//         COALESCE(COUNT(b.tktId), 0) AS total
//       FROM tbl_tickets_estados e
//       LEFT JOIN (${baseSubquery}) b ON b.estId = e.est_id
//       WHERE e.est_id NOT IN (3,5)
//       GROUP BY e.est_id, e.tkt_est_codigo, e.tkt_est_nombre
//       ORDER BY e.tkt_est_orden
//       `,
//       values
//     );

//     // 5) Serie mensual (mismo origen base)
//     const year = new Date().getFullYear();
//     const [ticketsPorEstadoYMes] = await conn.query(
//       `
//       SELECT
//         b.estCodigo AS slug,
//         MONTH(b.fechaRegistro) AS mes,
//         COUNT(b.tktId) AS total
//       FROM (${baseSubquery}) b
//       WHERE YEAR(b.fechaRegistro) = ?
//       GROUP BY b.estCodigo, MONTH(b.fechaRegistro)
//       `,
//       [...values, year]
//     );

//     // 6) Armar respuesta
//     const agrupadoPorEstado = {};
//     for (const row of ticketsPorEstadoYMes) {
//       if (!agrupadoPorEstado[row.slug])
//         agrupadoPorEstado[row.slug] = new Array(12).fill(0);
//       agrupadoPorEstado[row.slug][row.mes - 1] = row.total;
//     }

//     const mesActual = new Date().getMonth(); // 0..11
//     const colorMap = {
//       abierto: { color: "#4dabf7", background: "#e3f2fd" },
//       en_proceso: { color: "#f39c12", background: "#fef5e7" },
//       en_espera: { color: "#e74c3c", background: "#fdecea" },
//       cerrado: { color: "#2ecc71", background: "#eafaf1" },
//       reabierto: { color: "#3498db", background: "#e8f4fd" },
//       anulado: { color: "#c0392b", background: "#fdecea" },
//     };

//     const result = estados.map((row) => {
//       const chartData = agrupadoPorEstado[row.slug] || new Array(12).fill(0);
//       const actual = chartData[mesActual] || 0;
//       const anterior = chartData[Math.max(0, mesActual - 1)] || 0;
//       const percent =
//         anterior === 0
//           ? actual > 0
//             ? 100
//             : 0
//           : Number((((actual - anterior) / anterior) * 100).toFixed(1));

//       return {
//         id: row.slug,
//         title: row.title,
//         total: row.total,
//         chartData,
//         percent,
//         ...(colorMap[row.slug] || { color: "#cccccc", background: "#f9f9f9" }),
//       };
//     });

//     return result;
//   } catch (error) {
//     console.error("Error en getResumenPorEstados:", error);
//     throw error;
//   } finally {
//     if (conn) releaseConnection(conn);
//   }
// };

// Tickets con paginación y filtros
export const paginationTickets = async (params, req, connection = null) => {
  let conn = connection;
  let release = false;

  try {
    if (!conn) {
      conn = await getConnection();
      release = true;
    }

    const {
      search = "",
      estado = null,
      clienteId = null,
      bloqueId = null,
      localId = null,
      prioridadId = null,
      resultadoId = null,
      rows = 10,
      first = 0,
      sortField = "fechaRegistro",
      sortOrder = -1,
      usuarioId,
      permisos,
    } = params;

    const puedeVerTodos = permisos.includes("37");

    const order = sortOrder === 1 ? "ASC" : "DESC";
    const sortMap = {
      tktId: "t.tkt_id",
      fechaRegistro: "t.tkt_fec_reg",
      fechaActualizacion: "t.tkt_fec_act",
      // si quieres permitir ordenar por columnas visibles:
      clienteNombre: "u.usu_nombre",
      bloqueNombre: "pro.blo_nombre",
      localNombre: "loc.loc_nombre",
      localizacionNombre: "lca.lca_nombre",
      areaNombre: "a.are_nombre",
      prioridadNombre: "p.pri_nombre",
      estadoNombre: "e.tkt_est_nombre",
      asignadoNombre: "ua.usu_nombre",
    };
    const sortColumn = sortMap[sortField] || "t.tkt_fec_reg";

    const filters = ["t.tkt_eliminado = 0"];
    const values = [];

    // if (search) {
    //   filters.push(`(
    //     t.tkt_descripcion LIKE ? OR
    //     u.usu_nombre LIKE ? OR
    //     pro.blo_nombre LIKE ? OR
    //     loc.loc_nombre LIKE ? OR
    //     a.are_nombre LIKE ?
    //   )`);
    //   values.push(
    //     `%${search}%`,
    //     `%${search}%`,
    //     `%${search}%`,
    //     `%${search}%`,
    //     `%${search}%`
    //   );
    // }
    if (search && String(search).trim() !== "") {
      const q = String(search).trim();
      const qLike = `%${q}%`;

      // atajo: si el usuario escribe "#123" o solo números -> prioriza ID exacto
      const qNumeric = q.startsWith("#") ? q.slice(1) : q;
      const isNumeric = /^\d+$/.test(qNumeric);

      if (isNumeric) {
        // match exacto por ID + fallback LIKE por si quieren "12" y ver "120, 212, ..."
        filters.push(`(t.tkt_id = ? OR CAST(t.tkt_id AS CHAR) LIKE ?)`);
        values.push(Number(qNumeric), qLike);
      } else {
        // búsqueda multi-campo (case-insensitive según collation)
        filters.push(`(
      t.tkt_descripcion LIKE ? OR
      CAST(t.tkt_id AS CHAR) LIKE ? OR
      u.usu_nombre LIKE ? OR
      pro.blo_nombre LIKE ? OR
      loc.loc_nombre LIKE ? OR
      lca.lca_nombre LIKE ? OR
      a.are_nombre LIKE ? OR
      ua.usu_nombre LIKE ?
    )`);
        values.push(
          qLike, // descripcion
          qLike, // id como texto
          qLike, // cliente
          qLike, // bloque
          qLike, // local
          qLike, // localización
          qLike, // area
          qLike // asignado
        );
      }
    }
    if (estado) {
      filters.push("t.est_id = ?");
      values.push(estado);
    }
    if (clienteId) {
      filters.push("t.usu_id = ?");
      values.push(clienteId);
    }
    if (bloqueId) {
      filters.push("t.blo_id = ?");
      values.push(bloqueId);
    }
    if (localId) {
      filters.push("t.loc_id = ?");
      values.push(localId);
    }
    if (prioridadId) {
      filters.push("t.pri_id = ?");
      values.push(prioridadId);
    }
    if (resultadoId) {
      filters.push("t.tkt_resultado = ?");
      values.push(resultadoId);
    }

    // Si NO tiene permiso para ver todos, limitamos los resultados
    if (!puedeVerTodos) {
      // Obtener las áreas del usuario
      const [areasUsuario] = await conn.query(
        `SELECT are_id FROM tbl_areas_usuarios WHERE usu_id = ?`,
        [usuarioId]
      );
      const areaIds = areasUsuario.map((a) => a.are_id);

      if (areaIds.length === 0) {
        // No tiene áreas asignadas => solo puede ver los tickets que le asignaron
        filters.push("(t.tkt_asignado_a = ?  OR t.tkt_usu_reg = ?)");
        values.push(usuarioId, usuarioId);
      } else {
        // Ver los que está asignado o no asignados pero pertenecen a sus áreas
        filters.push(`(
          t.tkt_asignado_a = ? 
          OR t.tkt_usu_reg = ? 
          OR (t.tkt_asignado_a IS NULL AND t.are_id IN (${areaIds
            .map(() => "?")
            .join(",")}))
        )`);
        values.push(usuarioId, usuarioId, ...areaIds);
      }
    }

    const orderClause = `ORDER BY ${sortColumn} ${order}`;
    const whereClause = filters.length ? "WHERE " + filters.join(" AND ") : "";

    const fromClause = `FROM tbl_tickets t
      LEFT JOIN tbl_usuarios u ON u.usu_id = t.usu_id
      LEFT JOIN tbl_usuarios ua ON ua.usu_id = t.tkt_asignado_a
      LEFT JOIN tbl_locales  loc ON loc.loc_id = t.loc_id
      LEFT JOIN tbl_bloques pro ON pro.blo_id = t.blo_id
      LEFT JOIN tbl_localizacion lca ON lca.lca_id = t.lca_id
      JOIN tbl_areas a ON a.are_id = t.are_id
      JOIN tbl_tickets_prioridades p ON p.pri_id = t.pri_id
      JOIN tbl_tickets_estados e ON e.est_id = t.est_id  AND e.est_id NOT IN(3,5)`;

    const [results] = await conn.query(
      `SELECT
        t.tkt_id             AS tktId,
        t.usu_id             AS clienteId,
        u.usu_nombre         AS clienteNombre,

        t.blo_id             AS bloqueId,
        pro.blo_nombre       AS bloqueNombre,
        pro.blo_nombre       AS proyectoNombre,   -- alias legacy para front

        t.loc_id             AS localId,
        loc.loc_nombre       AS localNombre,
        loc.loc_nombre       AS unidadNombre,     -- alias legacy para front

        t.lca_id          AS localizacionId,     
        lca.lca_nombre    AS localizacionNombre, 
        lca.lca_bloque       AS lcaAplicaBloque,  --  1 = aplica bloque, 0 = no aplica
        lca.lca_local        AS lcaAplicaLocal,   --  1 = aplica local/propietario, 0 = no aplica

        t.are_id             AS areaId,
        a.are_nombre         AS areaNombre,

        t.tkt_asignado_a     AS asignadoId,
        ua.usu_nombre        AS asignadoNombre,

        t.pri_id             AS prioridadId,
        p.pri_nombre         AS prioridadNombre,
        p.pri_color          AS prioridadColor,

        t.est_id             AS estadoId,
        e.tkt_est_nombre         AS estadoNombre,
        e.tkt_est_color          AS estadoColor,

        t.tkt_resultado      AS resultadoId,
        t.tkt_descripcion    AS descripcion,
        t.tkt_fec_reg        AS fechaRegistro,
       t.tkt_usu_act        AS usuact,
        t.tkt_fec_act        AS fecact
      ${fromClause}
      ${whereClause}
      ${orderClause}
      LIMIT ${Number(rows)} OFFSET ${Number(first)}`,
      [...values]
    );

    const [[count]] = await conn.query(
      `SELECT COUNT(t.tkt_id) AS total
       ${fromClause}
       ${whereClause}`,
      values
    );

    return { results, total: count.total };
  } catch (err) {
    throw err;
  } finally {
    if (release) releaseConnection(conn);
  }
};

// export async function notifyTicketCreatedEmailSvc(
//   { ticketId, encargadoCorreo, encargadoNombre },
//   connection = null
// ) {
//   if (!encargadoCorreo) return { sent: false, reason: "no-recipient" };
//   let conn = connection,
//     release = false;
//   try {
//     if (!conn) {
//       conn = await getConnection();
//       release = true;
//     }
//     const resumen = await construirResumenCorreo(ticketId, conn);

//     const html = ticketCreatedNotification({
//       resumen,
//       linkSite: `${urlBase}/tickets/${ticketId}`,
//       destinatario: encargadoNombre || "Encargado",
//     });
//     await sendEmail({
//       to: encargadoCorreo,
//       subject: `🎫 Ticket ${String(ticketId).padStart(4, "0")} registrado`,
//       html,
//     });
//     return { sent: true };
//   } finally {
//     if (release) releaseConnection(conn);
//   }
// }

export async function notifyTicketCreatedEmailSvc(
  { ticketId, encargadoCorreo, encargadoNombre },
  connection = null
) {
  let conn = connection,
    release = false;
  try {
    if (!conn) {
      conn = await getConnection();
      release = true;
    }

    const resumen = await construirResumenCorreo(ticketId, conn);

    // destinatarios: encargado + solicitante
    const destinatarios = [];

    if (encargadoCorreo) {
      destinatarios.push({
        correo: encargadoCorreo,
        nombre: encargadoNombre || "Encargado",
      });
    }

    const clienteNombre = [
      resumen?.cliente?.usu_nombre,
      resumen?.cliente?.usu_apellido,
    ]
      .filter(Boolean)
      .join(" ")
      .trim();

    if (resumen?.cliente?.usu_correo) {
      destinatarios.push({
        correo: resumen.cliente.usu_correo,
        nombre: clienteNombre || "Cliente",
      });
    }

    // deduplicar por correo
    const unique = [];
    const seen = new Set();
    for (const d of destinatarios) {
      const key = (d.correo || "").toLowerCase();
      if (!key || seen.has(key)) continue;
      seen.add(key);
      unique.push(d);
    }

    if (unique.length === 0) return { sent: false, reason: "no-recipients" };

    const linkSite = `${urlBase}/tickets/${ticketId}`;
    const subject = `🎫 Ticket ${String(ticketId).padStart(4, "0")} registrado`;

    for (const dest of unique) {
      const html = ticketCreatedNotification({
        resumen,
        linkSite,
        destinatario: dest.nombre || "Usuario",
      });
      await sendEmail({ to: dest.correo, subject, html });
    }

    return { sent: true, total: unique.length };
  } finally {
    if (release) releaseConnection(conn);
  }
}

export const construirResumenCorreo = async (ticketId, conn) => {
  const [[ticket]] = await conn.query(
    `SELECT t.*,
            t.tkt_ult_alerta,
            t.tkt_prox_alerta,
            t.tkt_fec_limite
       FROM tbl_tickets t
      WHERE t.tkt_id = ?`,
    [ticketId]
  );

  if (!ticket) return null;

  const [[cliente]] = await conn.query(
    `SELECT usu_nombre, usu_apellido, usu_correo FROM tbl_usuarios WHERE usu_id = ?`,
    [ticket.usu_id]
  );

  const [[encargado]] = ticket.tkt_asignado_a
    ? await conn.query(
        `SELECT usu_id, usu_nombre, usu_apellido, usu_correo
           FROM tbl_usuarios
          WHERE usu_id = ?`,
        [ticket.tkt_asignado_a]
      )
    : [[null]];

  const bloque = ticket.blo_id
    ? (
        await conn.query(
          `SELECT blo_nombre FROM tbl_bloques WHERE blo_id = ?`,
          [ticket.blo_id]
        )
      )[0][0]
    : { blo_nombre: "No definido" };

  const local = ticket.loc_id
    ? (
        await conn.query(
          `SELECT loc_nombre FROM tbl_locales WHERE loc_id = ?`,
          [ticket.loc_id]
        )
      )[0][0]
    : { loc_nombre: "No definida" };

  const localizacion = ticket.lca_id
    ? (
        await conn.query(
          `SELECT lca_nombre FROM tbl_localizacion WHERE lca_id = ?`,
          [ticket.lca_id]
        )
      )[0][0]
    : { lca_nombre: "No definida" };
  // const unidad = ticket.uni_id
  //   ? (
  //       await conn.query(
  //         `SELECT uni_nombre FROM tbl_unidades WHERE uni_id = ?`,
  //         [ticket.uni_id]
  //       )
  //     )[0][0]
  //   : { uni_nombre: "No definida" };

  const prioridad = (
    await conn.query(
      `SELECT pri_nombre FROM tbl_tickets_prioridades WHERE pri_id = ?`,
      [ticket.pri_id]
    )
  )[0][0];

  const estado = (
    await conn.query(
      `SELECT tkt_est_nombre FROM tbl_tickets_estados WHERE est_id = ?`,
      [ticket.est_id]
    )
  )[0][0];

  return {
    ticket,
    cliente,
    encargado,
    bloque,
    local,
    prioridad,
    estado,
    localizacion,
  };
};
const normalizeDocBuffer = (doc = {}) => {
  if (doc?.buffer?.type === "Buffer") {
    doc.buffer = Buffer.from(doc.buffer.data);
  }
  return doc;
};

const toDoc = (raw = {}) => {
  // Soporta tanto objetos “multer-like” como los que ya envías desde front
  const ext = (
    raw.extension ||
    raw.originalname?.split(".").pop() ||
    ""
  ).toLowerCase();
  return {
    buffer:
      raw.buffer?.type === "Buffer" ? Buffer.from(raw.buffer.data) : raw.buffer,
    extension: ext,
    originalname: raw.originalname || raw.nombre || `evidencia.${ext || "bin"}`,
    mimetype: raw.mimetype || "application/octet-stream",
    nombre:
      (raw.nombre || raw.originalname || "").replace(/\.[^.]+$/, "") ||
      "evidencia",
    size: raw.size || undefined,
  };
};

const enqueueEvidenceBatch = (
  jobsToEnqueue,
  { docs, tktId, tipo, usuarioId }
) => {
  if (!docs) return;
  const list = Array.isArray(docs) ? docs : [docs];
  for (const raw of list) {
    const doc = toDoc(raw);
    if (!doc.buffer) continue; // defensivo
    jobsToEnqueue.push({
      name: "tickets.saveEvidence",
      payload: { tktId, tipo, doc, usuarioId }, // 👈 ya NO usamos fileIdPrev (no hay reemplazo implícito)
    });
  }
};

export const saveTicket = async (data, connection = null) => {
  let conn = connection;
  let release = false;

  const io = tryGetIO();

  const {
    tktId = 0,

    // campos que pueden venir con nombres viejos o nuevos
    unidadId, // legacy (ahora localId)
    proyectoId, // legacy (ahora bloqueId)
    areaId,
    prioridadId,
    descripcion,
    estadoId = 1,
    asignadoId,
    usuarioReg,
    usuarioAct,
    usuarioActId,

    // nombres nuevos
    bloqueId = null,
    localId = null,
    clienteId = null,
    localizacionId = null,
  } = data;

  // const opcnot =
  //   localizacionId && esNumero(localizacionId) && !bloqueId
  //     ? 1
  //     : localizacionId && esNumero(localizacionId) && bloqueId
  //     ? 2
  //     : 3;

  // normalización: si llegan ambos, priorizamos los nombres nuevos
  let _bloqueId = bloqueId ?? proyectoId ?? null;
  let _localId = localId ?? unidadId ?? null;
  let _lcaId = null;

  if (localizacionId != null) {
    if (typeof localizacionId === "string") {
      const [prefix, raw] = localizacionId.split("-");
      const numericId = Number(raw);

      if (!Number.isNaN(numericId)) {
        if (prefix === "LOC") {
          _localId = numericId;
          _lcaId = null;
        } else if (prefix === "LCA") {
          _lcaId = numericId;
        }
      }
    } else if (Number.isFinite(Number(localizacionId))) {
      _lcaId = Number(localizacionId);
    }
  }

  // AHORA sí decidimos qué tipo de notificación es
  let opcnot = 3; // por defecto: Cliente + Bloque + Local

  // Solo localización (sin bloque, sin local, sin cliente)
  if (_lcaId && !_bloqueId && !_localId && !clienteId) {
    opcnot = 1;
  }
  // Localización + bloque (sin local, sin cliente)
  else if (_lcaId && _bloqueId && !_localId && !clienteId) {
    opcnot = 2;
  }


  const contSID =
    opcnot === 1
      ? "HX25971f54e3e92df1f568c0aab460be85"
      : opcnot === 2
      ? "HXc98309106cd90e347bc0e8eeb22549d8"
      : opcnot === 3
      ? "HXe930b14e7472a64280921fdaf5dccf7f"
      : null;

  const isNew = !tktId;

  const postCommitTasks = [];

  try {
    if (!conn) {
      conn = await getConnection();
      release = true;
    }

    await conn.beginTransaction();

    let ticketId = tktId;
    const notificarGlobales = await getUsuariosConPermiso(41, conn);
    const usuariosNotificar = new Set();
    const jobsToEnqueue = [];

    // normalización: si llegan ambos, priorizamos los nombres nuevos
    let _bloqueId = bloqueId ?? proyectoId ?? null;
    let _localId = localId ?? unidadId ?? null;
    let _lcaId = null;

    // VenTickets arma un UID así:
    //  - LOCAL        → "LOC-<loc_id>"
    //  - LOCALIZACION → "LCA-<lca_id>"

    if (localizacionId != null) {
      if (typeof localizacionId === "string") {
        const [prefix, raw] = localizacionId.split("-");
        const numericId = Number(raw);

        if (!Number.isNaN(numericId)) {
          if (prefix === "LOC") {
            // Local clásico: usamos loc_id directamente
            _localId = numericId;
            _lcaId = null;
          } else if (prefix === "LCA") {
            // Localización genérica: guardamos en lca_id
            _lcaId = numericId;
            // _localId lo dejamos como venga (normalmente null)
          }
        }
      } else if (Number.isFinite(Number(localizacionId))) {
        // por si algún día mandas el ID numérico directo
        _lcaId = Number(localizacionId);
      }
    }

    if (ticketId === 0) {
      // === SLA por área (minutos)
      const slaMin = await getSlaMinByArea(conn, areaId);

      // INSERT con columnas nuevas: loc_id, blo_id (sin uni_id/eta_id)
      const [result] = await conn.query(
        `INSERT INTO tbl_tickets (
           usu_id, loc_id, blo_id, lca_id, are_id, tkt_asignado_a,
           pri_id, tkt_descripcion, est_id, tkt_usu_reg,tkt_usu_act, tkt_prox_alerta,tkt_fec_limite
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
           DATE_ADD(NOW(), INTERVAL 24 HOUR), 
           DATE_ADD(NOW(), INTERVAL ? MINUTE))`,
        [
          clienteId,
          _localId,
          _bloqueId,
          _lcaId ?? null,
          areaId,
          asignadoId,
          prioridadId,
          descripcion,
          estadoId,
          usuarioReg,
          usuarioAct,
          slaMin,
        ]
      );

      ticketId = result.insertId;

      enqueueEvidenceBatch(jobsToEnqueue, {
        docs:
          data?.evidenciaInicial ??
          data?.evidenciasIniciales ??
          data?.evidenciaInicialFiles,
        tktId: ticketId,
        tipo: 1,
        usuarioId: usuarioReg,
      });

      // historial: registro
      await conn.query(
        `INSERT INTO tbl_tickets_historial (
           tkt_id, usu_id, tht_accion, tht_estado_nuevo, tht_comentario, tht_fecha
         ) VALUES (?, ?, ?, ?, ?, NOW())`,
        [
          ticketId,
          usuarioReg,
          ACCIONES.REGISTRO,
          estadoId,
          "Registro inicial del ticket",
        ]
      );

      postCommitTasks.push(async () => {
        let connNotif;
        try {
          connNotif = await getConnection();

          // resumen para correo
          const resumen = await construirResumenCorreo(ticketId, conn);
          const linkSite = `${urlBase}/tickets/${ticketId}`;
          const subject = `🎫 Ticket ${String(ticketId).padStart(
            4,
            "0"
          )} registrado`;

          // para evitar correos duplicados
          const enviados = new Set();

          // notificación al asignado (si aplica)
          if (asignadoId) {
            const [[user]] = await conn.query(
              `SELECT usu_correo, CONCAT(usu_nombre, ' ', IFNULL(usu_apellido, '')) AS nombre, usu_telefono telefono
           FROM tbl_usuarios WHERE usu_id = ?`,
              [asignadoId]
            );

            await insertNotification({
              userId: asignadoId,
              prioridad: prioridadId,
              titulo: `Nuevo ticket asignado #${ticketId
                .toString()
                .padStart(4, "0")}`,
              mensaje: `Se te ha asignado un nuevo ticket.`,
              tipo: "ticket",
              modulo: "tickets",
              accion: "nuevo",
              data: { ticketId },
              connection: conn,
            });

            // const resumen = await construirResumenCorreo(ticketId, conn);
            const [reglas] = await getReglas({ connection: conn });
            if (user?.usu_correo) {
              const html = ticketCreatedNotification({
                resumen,
                destinatario: user?.nombre || "Encargado",
                linkSite,
                opcnot,
              });
              // await sendEmail({ to: user.usu_correo, subject, html });
              // enviados.add(String(user.usu_correo).toLowerCase());

              // Enviar en background sin bloquear el flujo
              sendEmail({ to: user.usu_correo, subject, html })
                .then(() => {
                  console.log(`Correo enviado a ${user.usu_correo}`);
                })
                .catch((err) => {
                  console.error(
                    `Error al enviar correo a ${user.usu_correo}:`,
                    err.message
                  );
                });

              enviados.add(String(user.usu_correo).toLowerCase());
            }

            //ENVIO DE MENSAJE AL WHATSAPP
            /**
         * 
         *    ticket,
    cliente,
    encargado,
    bloque,
    local,
    prioridad,
    estado,
         */
            // TODO: VALIDACION DE TELEFONO CORRECTO PARA ENVIO A WHATSAPP
            if (user?.telefono) {
              // Normalizar el número: eliminar espacios, guiones o caracteres no numéricos
              const phone = String(user.telefono).replace(/\D/g, "");

              // Validar longitud mínima (10 dígitos para Colombia)
              let notificado = null;
              if (phone.length === 10 && reglas.habilitarWhatsapp === 1) {
                try {
                  // && reglas.habilitarWhatsapp === 1
                  const descripcionString = (descripcion || '').slice(0, 40) + (descripcion.length > 40 ? '…' : '');
                  const nombreEncargado = user?.nombre || "Encargado";
                  const ticketIdStr = String(ticketId).padStart(4, "0");
                  const clienteNombre = [
                    resumen?.cliente?.usu_nombre,
                    resumen?.cliente?.usu_apellido,
                  ]
                    .filter(Boolean)
                    .join(" ")
                    .trim();

                  const cv =
                    opcnot == 1
                      ? {
                          1: nombreEncargado, // string
                          2: ticketIdStr, // string
                          3: resumen?.localizacion?.lca_nombre || "", // string
                          4: descripcionString || "", // string
                          5: resumen?.prioridad?.pri_nombre || "", // string
                          6: resumen?.estado?.tkt_est_nombre || "", // string
                          7: ticketIdStr, // string (url)
                        }
                      : opcnot == 2
                      ? {
                          1: nombreEncargado, // string
                          2: ticketIdStr, // string
                          3: resumen?.localizacion?.lca_nombre || "", // string
                          4: resumen?.bloque?.blo_nombre || "", // string
                          5: descripcionString || "", // string
                          6: resumen?.prioridad?.pri_nombre || "", // string
                          7: resumen?.estado?.tkt_est_nombre || "", // string
                          8: ticketIdStr || "", // string (url)
                        }
                      : opcnot === 3
                      ? {
                          1: nombreEncargado, // string
                          2: ticketIdStr, // string
                          3: clienteNombre || "", // string
                          4: resumen?.bloque?.blo_nombre || "", // string
                          5: resumen?.local?.loc_nombre || "", // string
                          6: descripcionString || "", // string
                          7: resumen?.prioridad?.pri_nombre || "", // string
                          8: resumen?.estado?.tkt_est_nombre || "", // string
                          9: ticketIdStr || "", // string (url)
                        }
                      : null;

                  // console.log({
                  //   whatsappNumero: reglas.whatsappNumero,
                  //   phone,
                  //   variables: JSON.stringify(cv),
                  //   contSID,
                  //   descripcionString,
                  // });

                  if (reglas.whatsappNumero && phone && cv && contSID) {
                    const response = await sendWhatsAppMessage({
                      to: `whatsapp:+57${phone}`,
                      // from: `whatsapp:+18159348861`, // TODO: cambiar por el numero de la mayorista
                      from: `whatsapp:${reglas.whatsappNumero}`, // TODO: cambiar por el numero de la mayorista
                      contentSid: contSID, // "HX0b0587edc220072adce18c4005094461", // SID DE CANCELACIÓN
                      contentVariables: cv,
                      twilioAccountSid: process.env.TWILIO_ACCOUNT_SID,
                      twilioAuthToken: process.env.TWILIO_AUTH_TOKEN,
                      connection: conn,
                      tktId: ticketId,
                      usuId: asignadoId,
                      saveToDb: true,
                    });
                    notificado = {
                      enviado: response.success,
                      medio: "whatsapp",
                      error: response.error || null,
                    };
                  }
                } catch (error) {
                  console.error("Error al enviar mensaje de WhatsApp:", error);
                }
              } else {
                console.warn(
                  `Teléfono inválido (${user.telefono}) - no se envió WhatsApp`
                );
              }
            }

            usuariosNotificar.add(asignadoId);
          }

          //TODO DESCOMENTAR CUANDO SE NECESITE NOTIFICAR AL COPROPIETARIO
          // 2) Notificación al SOLICITANTE (cliente)
          // if (clienteId) {
          //   const [[cli]] = await conn.query(
          //     `SELECT usu_correo, CONCAT(usu_nombre, ' ', IFNULL(usu_apellido, '')) AS nombre
          //    FROM tbl_usuarios WHERE usu_id = ?`,
          //     [clienteId]
          //   );

          //   const correoCli = String(cli?.usu_correo || "").toLowerCase();
          //   if (correoCli && !enviados.has(correoCli)) {
          //     const html = ticketClientNotification({
          //       resumen,
          //       destinatario: cli?.nombre || "Cliente",
          //       linkSite,
          //     });
          //     await sendEmail({ to: cli.usu_correo, subject, html });
          //     enviados.add(correoCli);
          //   }
          // }
        } catch (err) {
          console.error("Error en notificaciones post-commit (creación):", err);
        } finally {
          if (connNotif) releaseConnection(connNotif);
        }
      });
    } else {
      // UPDATE: mantenemos la misma lógica que tenías (no cambiamos bloque/local aquí)
      const [[actual]] = await conn.query(
        `SELECT * FROM tbl_tickets WHERE tkt_id = ?`,
        [ticketId]
      );

      const actorId = Number.isFinite(Number(usuarioActId))
        ? Number(usuarioActId)
        : Number(usuarioReg); // fallback defensivo

      // cambio de estado
      if (actual.est_id !== estadoId) {
        await conn.query(
          `INSERT INTO tbl_tickets_historial
             (tkt_id, usu_id, tht_accion, tht_estado_anterior, tht_estado_nuevo, tht_comentario, tht_fecha)
           VALUES (?, ?, ?, ?, ?, NOW())`,
          [
            ticketId,
            actorId,
            ACCIONES.CAMBIO_ESTADO,
            actual.est_id,
            estadoId,
            "Cambio de estado",
          ]
        );

        //TODO DESCOMENTAR CUANDO SE NECESITE NOTIFICAR AL COPROPIETARIO
        // usuariosNotificar.add(actual.usu_id);
        usuariosNotificar.add(actual.tkt_asignado_a);
        notificarGlobales.forEach((u) => usuariosNotificar.add(u));
      }

      // nuevos adjuntos iniciales (1)
      enqueueEvidenceBatch(jobsToEnqueue, {
        docs:
          data?.evidenciaInicial ??
          data?.evidenciasIniciales ??
          data?.evidenciaInicialFiles,
        tktId: ticketId,
        tipo: 1,
        usuarioId: actorId,
      });

      // nuevos adjuntos finales (2)
      enqueueEvidenceBatch(jobsToEnqueue, {
        docs:
          data?.evidenciaFinal ??
          data?.evidenciasFinales ??
          data?.evidenciaFinalFiles,
        tktId: ticketId,
        tipo: 2,
        usuarioId: actorId,
      });

      // cambio de área (y posible reasignación)
      if (actual.are_id !== areaId) {
        const [[areaEncargado]] = await conn.query(
          `SELECT usu_id FROM tbl_areas_usuarios WHERE are_id = ? LIMIT 1`,
          [areaId]
        );
        const nuevoAsignado = areaEncargado?.usu_id || asignadoId;

        if (nuevoAsignado && nuevoAsignado !== actual.tkt_asignado_a) {
          const [[nuevo]] = await conn.query(
            `SELECT usu_correo, CONCAT(usu_nombre, ' ', IFNULL(usu_apellido, '')) AS nombre
             FROM tbl_usuarios WHERE usu_id = ?`,
            [nuevoAsignado]
          );

          await conn.query(
            `INSERT INTO tbl_tickets_historial (tkt_id, usu_id, tht_accion, tht_comentario, tht_fecha)
             VALUES (?, ?, ?, ?, NOW())`,
            [
              ticketId,
              actorId,
              ACCIONES.REASIGNACION,
              `Reasignado a: ${nuevo?.nombre || "Usuario"}`,
            ]
          );

          await insertNotification({
            userId: nuevoAsignado,
            prioridad: prioridadId,
            titulo: `Ticket reasignado #${ticketId
              .toString()
              .padStart(4, "0")}`,
            mensaje: `Se te ha reasignado un ticket.`,
            tipo: "ticket",
            modulo: "tickets",
            accion: "reasignado",
            data: { ticketId },
            connection: conn,
          });

          const resumen = await construirResumenCorreo(ticketId, conn);
          if (nuevo?.usu_correo) {
            await sendEmail({
              to: nuevo.usu_correo,
              subject: `Ticket Reasignado #${ticketId
                .toString()
                .padStart(4, "0")}`,
              html: ticketReassignedNotification({
                resumen,
                nuevoAsignadoNombre: nuevo?.nombre || "Usuario",
                linkSite: `${urlBase}/tickets/${ticketId}`,
              }),
            });
          }

          usuariosNotificar.add(nuevoAsignado);
        }

        // 🔁 Recalcular SLA por NUEVA área y actualizar tkt_fec_limite
        const slaMinNuevaArea = await getSlaMinByArea(conn, areaId);
        await conn.query(
          `
          UPDATE tbl_tickets
             SET tkt_fec_limite = DATE_ADD(COALESCE(tkt_fec_reg, NOW()), INTERVAL ? MINUTE),
                 tkt_fec_act = NOW()
           WHERE tkt_id = ?
          `,
          [slaMinNuevaArea, ticketId]
        );
      }

      // cambio de prioridad
      if (actual.pri_id !== prioridadId) {
        await conn.query(
          `INSERT INTO tbl_tickets_historial (tkt_id, usu_id, tht_accion, tht_comentario, tht_fecha)
           VALUES (?, ?, ?, ?, NOW())`,
          [ticketId, actorId, ACCIONES.CAMBIO_PRIORIDAD, "Cambio de prioridad"]
        );
        usuariosNotificar.add(actual.tkt_asignado_a);
        notificarGlobales.forEach((u) => usuariosNotificar.add(u));
      }

      // cambio de descripción
      if (actual.tkt_descripcion !== descripcion) {
        await conn.query(
          `INSERT INTO tbl_tickets_historial (tkt_id, usu_id, tht_accion, tht_comentario, tht_fecha)
           VALUES (?, ?, ?, ?, NOW())`,
          [
            ticketId,
            actorId,
            ACCIONES.MODIFICACION,
            "Actualización de descripción",
          ]
        );
      }

      // UPDATE principal (mantenemos la misma firma, solo columnas actuales)
      await conn.query(
        `UPDATE tbl_tickets
           SET 
           usu_id = ?,
           loc_id =?,
           blo_id =?,
           lca_id =?,
           are_id = ?, pri_id = ?, tkt_descripcion = ?, tkt_asignado_a = ?,
               est_id = ?, tkt_usu_act = ?, tkt_fec_act = NOW()
         WHERE tkt_id = ?`,
        [
          clienteId ?? actual.usu_id, // si no mandas nada, puedes decidir mantener actual
          _localId ?? null,
          _bloqueId ?? null,
          _lcaId ?? null,
          areaId,
          prioridadId,
          descripcion,
          asignadoId,
          estadoId,
          usuarioAct,
          ticketId,
        ]
      );

      // notificaciones/correos tras actualización
      const resumen = await construirResumenCorreo(ticketId, conn);
      for (let uid of usuariosNotificar) {
        if (!uid) continue;
        const [[usuario]] = await conn.query(
          `SELECT usu_correo, CONCAT(usu_nombre, ' ', IFNULL(usu_apellido, '')) AS nombre
           FROM tbl_usuarios WHERE usu_id = ?`,
          [uid]
        );

        await insertNotification({
          userId: uid,
          prioridad: prioridadId,
          titulo: `Actualización en ticket #${ticketId
            .toString()
            .padStart(4, "0")}`,
          mensaje: `El ticket ha sido actualizado.`,
          tipo: "ticket",
          modulo: "tickets",
          accion: "actualizacion",
          data: { ticketId },
          connection: conn,
        });

        if (usuario?.usu_correo) {
          await sendEmail({
            to: usuario.usu_correo,
            subject: `Actualización de Ticket #${ticketId
              .toString()
              .padStart(4, "0")}`,
            html: ticketUpdatedNotification({
              resumen,
              cambios: "El ticket ha sido actualizado.",
              linkSite: `${urlBase}/tickets/${ticketId}`,
              destinatario: usuario?.nombre || "Usuario",
            }),
          });
        }
      }
    }

    await conn.commit();

    for (const job of jobsToEnqueue) {
      sharepointQueue.add(job.name, job.payload, {
        attempts: 3,
        backoff: { type: "exponential", delay: 5000 },
        removeOnComplete: true,
        removeOnFail: 20,
      });
    }

    for (const task of postCommitTasks) {
      Promise.resolve()
        .then(task)
        .catch((err) => {
          console.error("Error en tarea post-commit de ticket:", err);
        });
    }

    //  AVISAR POR SOCKET
    io.emit("upsertTickets", {
      tktId: ticketId,
      action: isNew ? "create" : "update",
    });

    return { message: "Ticket guardado correctamente", tktId: ticketId };
  } catch (err) {
    console.error("Error en saveTicket:", err);
    if (conn) await conn.rollback();
    throw err;
  } finally {
    if (release) releaseConnection(conn);
  }
};

// Actualizar estado
export const updateTicketEstado = async (
  tktId,
  nuevoEstado,
  usuarioId,
  comentario = "",
  connection = null
) => {
  let conn = connection;
  let release = false;

  const io = tryGetIO();

  try {
    if (!conn) {
      conn = await getConnection();
      release = true;
    }

    const [[{ estadoAnterior }]] = await conn.query(
      `SELECT est_id AS estadoAnterior FROM tbl_tickets WHERE tkt_id = ?`,
      [tktId]
    );

    // 👇 OBTENEMOS NOMBRE DEL USUARIO
    const [[user]] = await conn.query(
      `SELECT CONCAT(usu_nombre, ' ', IFNULL(usu_apellido, '')) AS nombre
       FROM tbl_usuarios
       WHERE usu_id = ?`,
      [usuarioId]
    );

    const usuarioNombre = user?.nombre || String(usuarioId);

    // 1. Actualizar el estado del ticket
    await conn.query(
      `UPDATE tbl_tickets 
       SET est_id = ?, tkt_usu_act = ?, tkt_fec_act = NOW() 
       WHERE tkt_id = ?`,
      [nuevoEstado, usuarioNombre, tktId]
    );

    // 2. Insertar en historial
    await conn.query(
      `INSERT INTO tbl_tickets_historial (
        tkt_id, usu_id, tht_accion, tht_estado_anterior, tht_estado_nuevo, tht_comentario, tht_fecha
      ) VALUES (?, ?, ?, ?, ?, ?, NOW())`,
      [
        tktId,
        usuarioId,
        2, // ID de acción para CAMBIO DE ESTADO
        estadoAnterior,
        nuevoEstado,
        comentario || "Sin comentario",
      ]
    );

    // 3. Obtener resumen del ticket actualizado
    const resumen = await construirResumenCorreo(tktId, conn);

    // 4. Usuarios a notificar
    const [[ticket]] = await conn.query(
      `SELECT tkt_asignado_a, usu_id FROM tbl_tickets WHERE tkt_id = ?`,
      [tktId]
    );
    const notificarGlobales = await getUsuariosConPermiso(41, conn);
    const usuarios = new Set([
      ticket.tkt_asignado_a,
      ticket.usu_id,
      ...notificarGlobales,
    ]);

    // 5. Enviar notificaciones + correos
    for (let uid of usuarios) {
      if (!uid) continue;

      const [[usuario]] = await conn.query(
        `SELECT usu_correo, CONCAT(usu_nombre, ' ', IFNULL(usu_apellido, '')) AS nombre FROM tbl_usuarios WHERE usu_id = ?`,
        [uid]
      );

      await insertNotification({
        userId: uid,
        prioridad: resumen.prioridad?.pri_nombre || "Media",
        titulo: `Cambio de estado en ticket #${String(tktId).padStart(4, "0")}`,
        mensaje: `El ticket ha cambiado de estado a: ${resumen.estado.tkt_est_nombre}`,
        tipo: "ticket",
        modulo: "tickets",
        accion: "estado",
        data: { tktId, nuevoEstado },
        connection: conn,
      });

      if (usuario?.usu_correo) {
        sendEmail({
          to: usuario.usu_correo,
          subject: `Ticket #${String(tktId).padStart(
            4,
            "0"
          )} - Estado actualizado`,
          html: ticketStateChangedNotification({
            resumen,
            comentario,
            linkSite: `${urlBase}/tickets/${tktId}`,
            destinatario: usuario?.nombre || "Usuario",
          }),
        });
      }
    }

    try {
      io.emit("upsertTickets", {
        tktId,
        action: "updateEstado",
        nuevoEstado,
      });
    } catch (e) {
      console.error(
        "No se pudo emitir upsertTickets en updateTicketEstado:",
        e.message
      );
    }

    return { message: "Estado actualizado y notificado" };
  } catch (err) {
    console.log("Error en updateTicketEstado:", err);
    if (conn) await conn.rollback();
    throw err;
  } finally {
    if (release) releaseConnection(conn);
  }
};

// Actualizar resultado
export const updateTicketResultado = async (
  tktId,
  resultadoId,
  usuarioId,
  connection = null
) => {
  let conn = connection;
  let release = false;

  const io = tryGetIO();

  try {
    if (!conn) {
      conn = await getConnection();
      release = true;
    }

    await conn.query(
      `UPDATE tbl_tickets 
       SET tkt_resultado = ?, tkt_usu_act = ?, tkt_fec_act = NOW() 
       WHERE tkt_id = ?`,
      [resultadoId, usuarioId, tktId]
    );

    await conn.query(
      `INSERT INTO tbl_tickets_historial (
        tkt_id, usu_id, tht_accion, tkt_resultado, tht_comentario, tht_fecha
      ) VALUES (?, ?, ?, ?, 'Resultado asignado', NOW())`,
      [tktId, usuarioId, 3, resultadoId]
    );

    // 🔔 AVISAR A LISTADOS
    try {
      io.emit("upsertTickets", {
        tktId,
        action: "updateResultado",
        resultadoId,
      });
    } catch (e) {
      console.error(
        "No se pudo emitir upsertTickets en updateTicketResultado:",
        e.message
      );
    }

    return { message: "Resultado actualizado" };
  } catch (err) {
    throw err;
  } finally {
    if (release) releaseConnection(conn);
  }
};

// Eliminar (lógico)
export const deleteTickets = async (
  ticketIds,
  usuarioId,
  connection = null
) => {
  let conn = connection;
  let release = false;
  const ids = Array.isArray(ticketIds) ? ticketIds : [ticketIds];

  const io = tryGetIO();

  try {
    if (!conn) {
      conn = await getConnection();
      release = true;
    }

    await conn.beginTransaction();

    await conn.query(
      `UPDATE tbl_tickets 
       SET tkt_eliminado = 1, tkt_usu_act = ?, tkt_fec_act = NOW() 
       WHERE tkt_id IN (${ids.map(() => "?").join(",")})`,
      [usuarioId, ...ids]
    );

    for (const tktId of ids) {
      await conn.query(
        `INSERT INTO tbl_tickets_historial (
          tkt_id, usu_id, tht_accion, tht_comentario, tht_fecha
        ) VALUES (?, ?, ?, 'Eliminación lógica del ticket', NOW())`,
        [tktId, usuarioId, 4]
      );
    }

    try {
      io.emit("upsertTickets", {
        action: "delete",
        ids,
      });
    } catch (e) {
      console.error("No se pudo emitir deleteTickets:", e.message);
    }

    await conn.commit();
    return { message: "Tickets eliminados correctamente" };
  } catch (err) {
    if (conn) await conn.rollback();
    throw err;
  } finally {
    if (release) releaseConnection(conn);
  }
};

// Restaurar ticket eliminado
export const restoreTicket = async (tktId, usuarioId, connection = null) => {
  let conn = connection;
  let release = false;

  try {
    if (!conn) {
      conn = await getConnection();
      release = true;
    }

    await conn.query(
      `UPDATE tbl_tickets 
       SET tkt_eliminado = 0, tkt_usu_act = ?, tkt_fec_act = NOW() 
       WHERE tkt_id = ?`,
      [usuarioId, tktId]
    );

    await conn.query(
      `INSERT INTO tbl_tickets_historial (
        tkt_id, usu_id, tht_accion, tht_comentario, tht_fecha
      ) VALUES (?, ?, ?, 'Restauración del ticket', NOW())`,
      [tktId, usuarioId, 5]
    );

    return { message: "Ticket restaurado correctamente" };
  } catch (err) {
    throw err;
  } finally {
    if (release) releaseConnection(conn);
  }
};

// Contar tickets agrupados por estado (alineado con paginationTickets)
// export const countTicketsByEstado = async (params, connection = null) => {
//   let conn = connection;
//   let release = false;

//   try {
//     if (!conn) {
//       conn = await getConnection();
//       release = true;
//     }

//     const {
//       // visibilidad
//       usuarioId,
//       permisos = [],

//       // (opcional) mismos filtros que la grilla
//       search = "",
//       estado = null,
//       clienteId = null,
//       bloqueId = null,
//       localId = null,
//       prioridadId = null,
//       resultadoId = null,
//     } = params || {};

//     const puedeVerTodos = permisos.includes("37");

//     // ========= filtros (idénticos a paginationTickets) =========
//     const filters = ["t.tkt_eliminado = 0"];
//     const values = [];

//     if (search) {
//       filters.push(`(
//         t.tkt_descripcion LIKE ? OR
//         u.usu_nombre LIKE ? OR
//         pro.blo_nombre LIKE ? OR
//         loc.loc_nombre LIKE ? OR
//         a.are_nombre LIKE ?
//       )`);
//       values.push(
//         `%${search}%`,
//         `%${search}%`,
//         `%${search}%`,
//         `%${search}%`,
//         `%${search}%`
//       );
//     }
//     if (estado) {
//       filters.push("t.est_id = ?");
//       values.push(estado);
//     }
//     if (clienteId) {
//       filters.push("t.usu_id = ?");
//       values.push(clienteId);
//     }
//     if (bloqueId) {
//       filters.push("t.blo_id = ?");
//       values.push(bloqueId);
//     }
//     if (localId) {
//       filters.push("t.loc_id = ?");
//       values.push(localId);
//     }
//     if (prioridadId) {
//       filters.push("t.pri_id = ?");
//       values.push(prioridadId);
//     }
//     if (resultadoId) {
//       filters.push("t.tkt_resultado = ?");
//       values.push(resultadoId);
//     }

//     // visibilidad (igual que paginationTickets)
//     if (!puedeVerTodos) {
//       const [areasUsuario] = await conn.query(
//         `SELECT are_id FROM tbl_areas_usuarios WHERE usu_id = ?`,
//         [usuarioId]
//       );
//       const areaIds = areasUsuario.map((a) => a.are_id);

//       //TODO OR - or
//       if (areaIds.length === 0) {
//         filters.push("(t.tkt_asignado_a = ? or t.tkt_usu_reg = ?)");
//         values.push(usuarioId, usuarioId);
//       } else {
//         filters.push(`(
//           t.tkt_asignado_a = ? OR or
//           t.tkt_usu_reg = ?
//           (t.tkt_asignado_a IS NULL AND t.are_id IN (${areaIds
//             .map(() => "?")
//             .join(",")}))

//         )`);
//         values.push(usuarioId, usuarioId, ...areaIds);
//       }
//     }

//     const whereClause = filters.length ? "WHERE " + filters.join(" AND ") : "";

//     // ========= base idéntica a paginationTickets (INNER JOIN) =========
//     // Nota: mantenemos JOIN a estados con NOT IN (3,5) tal cual hace la grilla.
//     const baseSubquery = `
//       SELECT t.tkt_id, e.est_id
//       FROM tbl_tickets t
//       JOIN tbl_usuarios u   ON u.usu_id = t.usu_id
//       LEFT JOIN tbl_usuarios ua ON ua.usu_id = t.tkt_asignado_a
//       JOIN tbl_locales  loc ON loc.loc_id = t.loc_id
//       JOIN tbl_bloques  pro ON pro.blo_id = t.blo_id
//       JOIN tbl_areas    a   ON a.are_id = t.are_id
//       JOIN tbl_tickets_prioridades p ON p.pri_id = t.pri_id
//       JOIN tbl_tickets_estados    e ON e.est_id = t.est_id AND e.est_id NOT IN (3,5)
//       ${whereClause}
//     `;

//     // ========= conteo por estado usando la base =========
//     const [rows] = await conn.query(
//       `
//       SELECT
//         e.est_id     AS estadoId,
//         e.tkt_est_codigo AS estadoCodigo,
//         e.tkt_est_nombre AS estadoNombre,
//         e.tkt_est_color  AS estadoColor,
//         COUNT(b.tkt_id) AS total
//       FROM tbl_tickets_estados e
//       LEFT JOIN (${baseSubquery}) b ON b.est_id = e.est_id
//       WHERE e.est_id NOT IN (3,5)
//       GROUP BY e.est_id, e.tkt_est_codigo, e.tkt_est_nombre, e.tkt_est_color
//       ORDER BY e.tkt_est_orden ASC
//       `,
//       values
//     );

//     return rows;
//   } catch (err) {
//     throw err;
//   } finally {
//     if (release) releaseConnection(conn);
//   }
// };

export const countTicketsByEstado = async (params, connection = null) => {
  let conn = connection;
  let release = false;

  try {
    if (!conn) {
      conn = await getConnection();
      release = true;
    }

    const {
      usuarioId,
      permisos = [],

      // mismos filtros que la grilla
      search = "",
      estado = null,
      clienteId = null,
      bloqueId = null,
      localId = null,
      prioridadId = null,
      resultadoId = null,
    } = params || {};

    const puedeVerTodos = permisos.includes("37");

    // ========= filtros (ALINEADOS con paginationTickets) =========
    const filters = ["t.tkt_eliminado = 0"];
    const values = [];

    // misma lógica de búsqueda que en paginationTickets
    if (search && String(search).trim() !== "") {
      const q = String(search).trim();
      const qLike = `%${q}%`;

      const qNumeric = q.startsWith("#") ? q.slice(1) : q;
      const isNumeric = /^\d+$/.test(qNumeric);

      if (isNumeric) {
        // búsqueda por ID exacto + LIKE
        filters.push(`(t.tkt_id = ? OR CAST(t.tkt_id AS CHAR) LIKE ?)`);
        values.push(Number(qNumeric), qLike);
      } else {
        // misma búsqueda multi-campo
        filters.push(`(
          t.tkt_descripcion LIKE ? OR
          CAST(t.tkt_id AS CHAR) LIKE ? OR
          u.usu_nombre LIKE ? OR
          pro.blo_nombre LIKE ? OR
          loc.loc_nombre LIKE ? OR
          lca.lca_nombre LIKE ? OR
          a.are_nombre LIKE ? OR
          ua.usu_nombre LIKE ?
        )`);
        values.push(
          qLike, // descripcion
          qLike, // id como texto
          qLike, // cliente
          qLike, // bloque
          qLike, // local
          qLike, // localización
          qLike, // area
          qLike // asignado
        );
      }
    }

    if (estado) {
      filters.push("t.est_id = ?");
      values.push(estado);
    }
    if (clienteId) {
      filters.push("t.usu_id = ?");
      values.push(clienteId);
    }
    if (bloqueId) {
      filters.push("t.blo_id = ?");
      values.push(bloqueId);
    }
    if (localId) {
      filters.push("t.loc_id = ?");
      values.push(localId);
    }
    if (prioridadId) {
      filters.push("t.pri_id = ?");
      values.push(prioridadId);
    }
    if (resultadoId) {
      filters.push("t.tkt_resultado = ?");
      values.push(resultadoId);
    }

    // ========= visibilidad (mismo criterio que la grilla, corrigiendo el OR) =========
    if (!puedeVerTodos) {
      const [areasUsuario] = await conn.query(
        `SELECT are_id FROM tbl_areas_usuarios WHERE usu_id = ?`,
        [usuarioId]
      );
      const areaIds = areasUsuario.map((a) => a.are_id);

      if (areaIds.length === 0) {
        filters.push("(t.tkt_asignado_a = ? OR t.tkt_usu_reg = ?)");
        values.push(usuarioId, usuarioId);
      } else {
        filters.push(`(
          t.tkt_asignado_a = ? OR
          t.tkt_usu_reg = ? OR
          (t.tkt_asignado_a IS NULL AND t.are_id IN (${areaIds
            .map(() => "?")
            .join(",")}))
        )`);
        values.push(usuarioId, usuarioId, ...areaIds);
      }
    }

    const whereClause = filters.length ? "WHERE " + filters.join(" AND ") : "";

    // ========= FROM alineado 1:1 con paginationTickets =========
    const baseSubquery = `
      SELECT t.tkt_id, e.est_id
      FROM tbl_tickets t
      LEFT JOIN tbl_usuarios u ON u.usu_id = t.usu_id
      LEFT JOIN tbl_usuarios ua ON ua.usu_id = t.tkt_asignado_a
      LEFT JOIN tbl_locales  loc ON loc.loc_id = t.loc_id
      LEFT JOIN tbl_bloques pro ON pro.blo_id = t.blo_id
      LEFT JOIN tbl_localizacion lca ON lca.lca_id = t.lca_id
      JOIN tbl_areas a ON a.are_id = t.are_id
      JOIN tbl_tickets_prioridades p ON p.pri_id = t.pri_id
      JOIN tbl_tickets_estados e ON e.est_id = t.est_id AND e.est_id NOT IN (3,5)
      ${whereClause}
    `;

    // ========= conteo por estado =========
    const [rows] = await conn.query(
      `
      SELECT 
        e.est_id          AS estadoId,
        e.tkt_est_codigo  AS estadoCodigo,
        e.tkt_est_nombre  AS estadoNombre,
        e.tkt_est_color   AS estadoColor,
        COUNT(b.tkt_id)   AS total
      FROM tbl_tickets_estados e
      LEFT JOIN (${baseSubquery}) b ON b.est_id = e.est_id
      WHERE e.est_id NOT IN (3,5)
      GROUP BY e.est_id, e.tkt_est_codigo, e.tkt_est_nombre, e.tkt_est_color
      ORDER BY e.tkt_est_orden ASC
      `,
      values
    );

    return rows;
  } catch (err) {
    throw err;
  } finally {
    if (release) releaseConnection(conn);
  }
};

// Agregar una entrada al historial del ticket
export const addTicketHistorial = async (data, connection = null) => {
  let conn = connection;
  let release = false;

  const {
    tktId,
    usuarioId,
    accionId,
    estadoAnteriorId = null,
    estadoNuevoId = null,
    motivoId = null,
    comentario = null,
    resultadoId = null,
  } = data;

  try {
    if (!conn) {
      conn = await getConnection();
      release = true;
    }

    await conn.query(
      `
      INSERT INTO tbl_tickets_historial (
        tkt_id, usu_id, tht_accion, tht_estado_anterior, tht_estado_nuevo,
        mot_id, tht_comentario, tkt_resultado, tht_fecha
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())
      `,
      [
        tktId,
        usuarioId,
        accionId,
        estadoAnteriorId,
        estadoNuevoId,
        motivoId,
        comentario,
        resultadoId,
      ]
    );

    return { message: "Historial registrado" };
  } catch (err) {
    throw err;
  } finally {
    if (release) releaseConnection(conn);
  }
};

// Obtener historial por ticket
export const getHistorialByTicket = async (tktId, connection = null) => {
  let conn = connection;
  let release = false;

  try {
    if (!conn) {
      conn = await getConnection();
      release = true;
    }

    const [rows] = await conn.query(
      `
      SELECT 
        h.tht_id AS historialId,
        h.tkt_id AS ticketId,
        h.usu_id AS usuarioId,
        u.usu_nombre AS usuarioNombre,
        h.tht_accion AS accionId,
        CASE h.tht_accion
          WHEN 1 THEN 'Registro'
          WHEN 2 THEN 'Cambio de Estado'
          WHEN 3 THEN 'Resultado'
          WHEN 4 THEN 'Eliminacíon'
          WHEN 5 THEN 'Restauración'
          WHEN 6 THEN 'Comentario'
          WHEN 7 THEN 'Cambio de asignación'
          WHEN 8 THEN 'Actualización'
          WHEN 9 THEN 'Cambio de area'
          WHEN 10 THEN 'Cambio de prioridad'
          WHEN 11 THEN 'Recordatorio'
          WHEN 12 THEN 'Vencimiento'
          ELSE 'Otra acción'
        END AS accionNombre,
        h.tht_estado_anterior AS estadoAnteriorId,
        e1.tkt_est_nombre AS estadoAnteriorNombre,
        h.tht_estado_nuevo AS estadoNuevoId,
        e2.tkt_est_nombre AS estadoNuevoNombre,
        h.tht_comentario AS comentario,
        h.tht_fecha AS fecha
      FROM tbl_tickets_historial h
      LEFT JOIN tbl_usuarios u ON u.usu_id = h.usu_id
      LEFT JOIN tbl_tickets_estados e1 ON e1.est_id = h.tht_estado_anterior
      LEFT JOIN tbl_tickets_estados e2 ON e2.est_id = h.tht_estado_nuevo
      WHERE h.tkt_id = ?
      ORDER BY h.tht_fecha ASC
      `,
      [tktId]
    );

    return rows;
  } catch (err) {
    throw err;
  } finally {
    if (release) releaseConnection(conn);
  }
};

// Obtener todos los estados de tickets
export const getAllEstados = async (connection = null) => {
  let conn = connection;
  let release = false;
  try {
    if (!conn) {
      conn = await getConnection();
      release = true;
    }
    const [rows] = await conn.query(
      `SELECT est_id AS id, tkt_est_nombre AS nombre, tkt_est_color AS color, tkt_est_orden AS orden FROM tbl_tickets_estados WHERE est_id NOT IN(3,5) ORDER BY tkt_est_orden ASC`
    );
    return rows;
  } catch (err) {
    throw err;
  } finally {
    if (release) releaseConnection(conn);
  }
};

// Obtener todas las acciones disponibles
export const getAllAcciones = async (connection = null) => {
  let conn = connection;
  let release = false;
  try {
    if (!conn) {
      conn = await getConnection();
      release = true;
    }
    const [rows] = await conn.query(
      `SELECT acc_id AS id, acc_nombre AS nombre, acc_tipo AS tipo FROM tbl_tickets_acciones ORDER BY acc_id ASC`
    );
    return rows;
  } catch (err) {
    throw err;
  } finally {
    if (release) releaseConnection(conn);
  }
};

// Obtener todos los resultados posibles
export const getAllResultados = async (connection = null) => {
  let conn = connection;
  let release = false;
  try {
    if (!conn) {
      conn = await getConnection();
      release = true;
    }
    const [rows] = await conn.query(
      `SELECT res_id AS id, res_nombre AS nombre, res_descripcion AS descripcion FROM tbl_tickets_resultados ORDER BY res_id ASC`
    );
    return rows;
  } catch (err) {
    throw err;
  } finally {
    if (release) releaseConnection(conn);
  }
};

// Obtener todas las prioridades disponibles
export const getAllPrioridades = async (connection = null) => {
  let conn = connection;
  let release = false;
  try {
    if (!conn) {
      conn = await getConnection();
      release = true;
    }
    const [rows] = await conn.query(
      `SELECT pri_id AS id, pri_nombre AS nombre, pri_nivel AS nivel, pri_color AS color FROM tbl_tickets_prioridades ORDER BY pri_nivel ASC`
    );
    return rows;
  } catch (err) {
    throw err;
  } finally {
    if (release) releaseConnection(conn);
  }
};

// Asignar usuarios a un ticket
export const asignarUsuariosATicket = async (
  tktId,
  usuarios = [],
  connection = null
) => {
  let conn = connection;
  let release = false;

  if (!Array.isArray(usuarios) || usuarios.length === 0) {
    throw new Error("Debe proporcionar al menos un usuario para asignar.");
  }

  try {
    if (!conn) {
      conn = await getConnection();
      release = true;
    }

    await conn.beginTransaction();

    // Marcar asignaciones anteriores como históricas
    await conn.query(
      `UPDATE tbl_tickets_asignados SET tka_es_actual = 0 WHERE tkt_id = ?`,
      [tktId]
    );

    // Insertar nuevas asignaciones
    const insertQuery = `
      INSERT INTO tbl_tickets_asignados (tkt_id, usu_id, tka_es_actual)
      VALUES (?, ?, 1)
    `;

    for (const usuId of usuarios) {
      await conn.query(insertQuery, [tktId, usuId]);
    }

    await conn.commit();

    return { message: "Usuarios asignados correctamente" };
  } catch (err) {
    if (conn) await conn.rollback();
    throw err;
  } finally {
    if (release) releaseConnection(conn);
  }
};

// Obtener asignados actuales e históricos de un ticket
export const getAsignadosByTicket = async (
  tktId,
  onlyActual = false,
  connection = null
) => {
  let conn = connection;
  let release = false;

  try {
    if (!conn) {
      conn = await getConnection();
      release = true;
    }

    let query = `
      SELECT 
        tka_id AS asignacionId,
        tkt_id AS ticketId,
        usu_id AS usuarioId,
        tka_es_actual AS esActual
      FROM tbl_tickets_asignados
      WHERE tkt_id = ?
    `;

    if (onlyActual) {
      query += " AND tka_es_actual = 1";
    }

    const [rows] = await conn.query(query, [tktId]);

    return rows;
  } catch (err) {
    throw err;
  } finally {
    if (release) releaseConnection(conn);
  }
};

// Reasignar un ticket a un solo usuario (y dejar los demás como históricos)
export const reasignarTicket = async (
  tktId,
  nuevoUsuarioId,
  connection = null
) => {
  return asignarUsuariosATicket(tktId, [nuevoUsuarioId], connection);
};

// services/ticketsPdf.service.js

// import { generateHTMLInformeTicket } from "./htmlGenerators/ticketHtml.generator.js"; // crea este archivo (ver notas abajo)

/**
 * Obtiene todos los datos del ticket necesarios para generar el informe PDF.
 * Devuelve un objeto con ticket, solicitante, ubicacion (bloque/local), asignado,
 * prioridad, estado, historial y evidencias.
 */
// export const getTicketDataPDF = async (tktId, connection = null) => {
//   let conn = connection;
//   let release = false;

//   try {
//     if (!tktId) throw new Error("tktId requerido");

//     if (!conn) {
//       conn = await getConnection();
//       release = true;
//     }

//     // 1) Datos principales del ticket (ya con alias similar a getTicketById)
//     const [[ticketRow]] = await conn.query(
//       `
//       SELECT
//         t.tkt_id           AS tktId,
//         t.usu_id           AS clienteId,
//         t.tkt_descripcion  AS descripcion,
//         t.loc_id           AS localId,
//         t.blo_id           AS bloqueId,
//         t.are_id           AS areaId,
//         t.tkt_asignado_a   AS asignadoId,
//         t.pri_id           AS prioridadId,
//         t.est_id           AS estadoId,
//         t.tkt_fec_reg      AS fechaRegistro,
//         t.tkt_fec_act      AS fechaActualizacion,
//         t.tkt_fec_limite   AS fechaLimite,
//         t.tkt_resultado    AS resultadoId
//       FROM tbl_tickets t
//       WHERE t.tkt_id = ? AND t.tkt_eliminado = 0
//       LIMIT 1
//       `,
//       [tktId]
//     );

//     if (!ticketRow) return null;

//     const ticket = ticketRow;

//     // 2) Datos del solicitante (cliente)
//     const [[cliente]] = await conn.query(
//       `
//       SELECT
//         u.usu_id        AS usuId,
//         u.usu_nombre    AS nombre,
//         u.usu_apellido  AS apellido,
//         u.usu_documento AS documento,
//         u.usu_correo    AS correo,
//         u.usu_telefono  AS telefono,
//         CONCAT(u.usu_nombre, ' ', IFNULL(u.usu_apellido, '')) AS nombreCompleto
//       FROM tbl_usuarios u
//       WHERE u.usu_id = ?
//       LIMIT 1
//       `,
//       [ticket.clienteId]
//     );

//     // 3) Labels: bloque, local, area, prioridad, estado, encargado
//     const [[bloque]] = await conn.query(
//       `SELECT pro_id AS id, pro_nombre AS nombre FROM tbl_proyectos WHERE pro_id = ? LIMIT 1`,
//       [ticket.bloqueId]
//     ).catch(()=>[{}]); // opcional: manejar si no existe tabla con ese nombre en tu BD

//     const [[local]] = await conn.query(
//       `SELECT eta_id AS id, eta_nombre AS nombre, codigo AS codigo FROM tbl_locales WHERE eta_id = ? LIMIT 1`,
//       [ticket.localId]
//     ).catch(()=>[{}]);

//     const [[area]] = await conn.query(
//       `SELECT are_id AS id, are_nombre AS nombre FROM tbl_areas WHERE are_id = ? LIMIT 1`,
//       [ticket.areaId]
//     ).catch(()=>[{}]);

//     const [[prioridad]] = await conn.query(
//       `SELECT pri_id AS id, pri_nombre AS nombre, pri_color AS color FROM tbl_prioridades WHERE pri_id = ? LIMIT 1`,
//       [ticket.prioridadId]
//     ).catch(()=>[{}]);

//     const [[estado]] = await conn.query(
//       `SELECT est_id AS id, tkt_est_nombre AS nombre FROM tbl_tkt_estados WHERE est_id = ? LIMIT 1`,
//       [ticket.estadoId]
//     ).catch(()=>[{}]);

//     const [[asignado]] = await conn.query(
//       `SELECT usu_id AS id, CONCAT(usu_nombre,' ',IFNULL(usu_apellido,'')) AS nombre, usu_correo AS correo FROM tbl_usuarios WHERE usu_id = ? LIMIT 1`,
//       [ticket.asignadoId]
//     ).catch(()=>[{}]);

//     // 4) Historial completo del ticket (como ya tienes)
//     const [historial] = await conn.query(
//       `
//       SELECT
//         tht_id              AS historialId,
//         usu_id              AS usuarioId,
//         tht_accion          AS accionId,
//         tht_estado_anterior AS estadoAnteriorId,
//         tht_estado_nuevo    AS estadoNuevoId,
//         mot_id              AS motivoId,
//         tht_comentario      AS comentario,
//         tkt_resultado       AS resultadoId,
//         tht_fecha           AS fecha
//       FROM tbl_tickets_historial
//       WHERE tkt_id = ?
//       ORDER BY tht_fecha ASC
//       `,
//       [tktId]
//     );

//     // 5) Evidencias (ya lo tienes en getTicketById)
//     const [evidencias] = await conn.query(
//       `
//       SELECT
//         tke_id         AS evidenciaId,
//         tkt_id         AS ticketId,
//         tke_nombre     AS nombre,
//         tke_url_local  AS urllocal,
//         tke_url_publica AS urlpublica,
//         tke_file_id    AS fileId,
//         tke_ext        AS extension,
//         tke_mimetype   AS mimetype,
//         tke_size       AS size,
//         tke_tipo       AS tipo,
//         tke_fec_reg    AS fechaRegistro
//       FROM tbl_tickets_evidencias
//       WHERE tkt_id = ?
//       ORDER BY tke_fec_reg ASC
//       `,
//       [tktId]
//     );

//     // 6) Información adicional: (opcional) datos del local/bloque/enlaces a otros recursos
//     // Puedes enriquecer aquí con más joins si tu DB tiene tablas con nombres distintos.

//     return {
//       ticket,
//       cliente: cliente || null,
//       bloque: bloque || null,
//       local: local || null,
//       area: area || null,
//       prioridad: prioridad || null,
//       estado: estado || null,
//       asignado: asignado || null,
//       historial: historial || [],
//       evidencias: evidencias || [],
//     };
//   } catch (err) {
//     throw err;
//   } finally {
//     if (release) releaseConnection(conn);
//   }
// };

export const getTicketDataPDF = async (tktId, connection = null) => {
  let conn = connection;
  let release = false;

  try {
    if (!tktId) throw new Error("tktId requerido");

    if (!conn) {
      conn = await getConnection();
      release = true;
    }

    // 1) Datos principales del ticket
    const [ticketRows] = await conn.query(
      `
      SELECT 
        t.tkt_id           AS tktId,
        t.usu_id           AS clienteId,
        t.tkt_descripcion  AS descripcion,
        t.loc_id           AS localId,
        t.blo_id           AS bloqueId,
        t.lca_id           AS localizacionId,
        t.are_id           AS areaId,
        t.tkt_asignado_a   AS asignadoId,
        t.pri_id           AS prioridadId,
        t.est_id           AS estadoId,
        t.tkt_fec_reg      AS fechaRegistro,
        t.tkt_fec_act      AS fechaActualizacion,
        t.tkt_fec_limite   AS fechaLimite,
        t.tkt_resultado    AS resultadoId
      FROM tbl_tickets t
      WHERE t.tkt_id = ? AND t.tkt_eliminado = 0
      LIMIT 1
      `,
      [tktId]
    );

    if (ticketRows.length === 0) return null;
    const ticket = ticketRows[0];

    // 2) Datos del solicitante (cliente)
    const [clienteRows] = await conn.query(
      `
      SELECT
        u.usu_id        AS usuId,
        u.usu_nombre    AS nombre,
        u.usu_apellido  AS apellido,
        u.usu_documento AS documento,
        u.usu_correo    AS correo,
        u.usu_telefono  AS telefono,
        CONCAT(u.usu_nombre, ' ', IFNULL(u.usu_apellido, '')) AS nombreCompleto
      FROM tbl_usuarios u
      WHERE u.usu_id = ?
      LIMIT 1
      `,
      [ticket.clienteId]
    );
    const cliente = clienteRows[0] || null;

    // 3) Labels: bloque, local, área, prioridad, estado, asignado
    const [bloqueRows] = await conn.query(
      `SELECT blo_id AS id, blo_nombre AS nombre FROM tbl_bloques WHERE blo_id = ? LIMIT 1`,
      [ticket.bloqueId]
    );
    const bloque = bloqueRows[0] || null;

    const [localRows] = await conn.query(
      `SELECT loc_id AS id, loc_nombre AS nombre, loc_codigo AS codigo FROM tbl_locales WHERE loc_id = ? LIMIT 1`,
      [ticket.localId]
    );
    const local = localRows[0] || null;

    // 👇 NUEVO: datos de la localización (ascensores, porterías, etc.)
    const [localizacionRows] = await conn.query(
      `SELECT lca_id AS id, lca_nombre AS nombre FROM tbl_localizacion WHERE lca_id = ? LIMIT 1`,
      [ticket.localizacionId]
    );
    const localizacion = localizacionRows[0] || null;

    const [areaRows] = await conn.query(
      `SELECT are_id AS id, are_nombre AS nombre FROM tbl_areas WHERE are_id = ? LIMIT 1`,
      [ticket.areaId]
    );
    const area = areaRows[0] || null;

    const [prioridadRows] = await conn.query(
      `SELECT pri_id AS id, pri_nombre AS nombre FROM tbl_prioridad WHERE pri_id = ? LIMIT 1`,
      [ticket.prioridadId]
    );
    const prioridad = prioridadRows[0] || null;

    const [estadoRows] = await conn.query(
      `SELECT est_id AS id, tkt_est_nombre AS nombre FROM tbl_tickets_estados WHERE est_id = ? LIMIT 1`,
      [ticket.estadoId]
    );
    const estado = estadoRows[0] || null;

    const [asignadoRows] = await conn.query(
      `SELECT usu_id AS id, CONCAT(usu_nombre,' ',IFNULL(usu_apellido,'')) AS nombre, usu_correo AS correo FROM tbl_usuarios WHERE usu_id = ? LIMIT 1`,
      [ticket.asignadoId]
    );
    const asignado = asignadoRows[0] || null;

    // 4) Historial del ticket
    const [historialRows] = await conn.query(
      `
      SELECT 
        tht_id              AS historialId,
        usu_id              AS usuarioId,
        tht_accion          AS accionId,
        tht_estado_anterior AS estadoAnteriorId,
        tht_estado_nuevo    AS estadoNuevoId,
        mot_id              AS motivoId,
        tht_comentario      AS comentario,
        tkt_resultado       AS resultadoId,
        tht_fecha           AS fecha
      FROM tbl_tickets_historial
      WHERE tkt_id = ?
      ORDER BY tht_fecha ASC
      `,
      [tktId]
    );

    // 5) Evidencias del ticket
    const [evidenciasRows] = await conn.query(
      `
      SELECT 
        tke_id          AS evidenciaId,
        tkt_id          AS ticketId,
        tke_nombre      AS nombre,
        tke_url_local   AS urllocal,
        tke_url_publica AS urlpublica,
        tke_file_id     AS fileId,
        tke_ext         AS extension,
        tke_mimetype    AS mimetype,
        tke_size        AS size,
        tke_tipo        AS tipo,
        tke_fec_reg     AS fechaRegistro
      FROM tbl_tickets_evidencias
      WHERE tkt_id = ?
      ORDER BY tke_fec_reg ASC
      `,
      [tktId]
    );

    // 6) Retorno final
    return {
      ...ticket,
      cliente,
      bloque,
      local,
      localizacion,
      area,
      prioridad,
      estado,
      asignado,
      historial: historialRows,
      evidencias: evidenciasRows,
    };
  } catch (err) {
    throw err;
  } finally {
    if (release) releaseConnection(conn);
  }
};

export const getTicketReportePDF = async (tktId) => {
  try {
    if (!tktId) throw new Error("tktId requerido");

    const { buffer, filename, extension } = await generateTicketPdfWithMerge({ tktId });

    return {
      success: true,
      buffer,
      filename,
      extension,
    };
  } catch (error) {
    console.error("Error en getTicketReportePDF:", error);
    return {
      success: false,
      error: error.message || "Error generando PDF",
    };
  }
};

// export const getTicketReporteHTML = async (tktId, connection = null) => {
//   let conn = connection;
//   let release = false;

//   try {
//     if (!conn) {
//       conn = await getConnection();
//       release = true;
//     }

//     const ticketData = await getTicketDataPDF(tktId, conn);
//     if (!ticketData) throw new Error("Ticket no encontrado");

//     // ✅ Pasa todos los datos del ticket, no solo el ID
//     const { success, html } = await generateHTMLInformeTicket(ticketData, conn);
//     if (!success) throw new Error("Error generando HTML del informe");

//     return { html, success: true };
//   } catch (error) {
//     console.error("Error en getTicketReporteHTML:", error);
//     return { success: false, error: error.message || "Error al generar HTML" };
//   } finally {
//     if (release) releaseConnection(conn);
//   }
// };


/**
 * Genera el HTML del informe del ticket (lista para convertir a PDF).
 * Internamente delega la construcción del HTML a generateHTMLInformeTicket()
 * (similar a generateHTMLFormulario en el otro proyecto).
 */
// export const getTicketReporteHTML = async (tktId, connection = null) => {
//   let conn = connection;
//   let release = false;

//   try {
//     if (!conn) {
//       conn = await getConnection();
//       release = true;
//     }

//     const ticketData = await getTicketDataPDF(tktId, conn);
//     if (!ticketData) throw new Error("Ticket no encontrado");

//     // generateHTMLInformeTicket debe devolver { success: true, html: '<html>...</html>' }
//     // const { success, html } = await generateHTMLInformeTicket({ ticket: ticketData }, conn);
//     // const { success, html } = await generateHTMLInformeTicket({ tktId }, conn);
//     const { success, html } = await generateHTMLInformeTicket({ tktId: ticketData.tktId }, conn);
//     if (!success) throw new Error("Error generando HTML del informe");

//     return { html, success: true };
//   } catch (error) {
//     console.error("Error en getTicketReporteHTML:", error);
//     return { success: false, error: error.message || "Error al generar HTML" };
//   } finally {
//     if (release) releaseConnection(conn);
//   }
// };
