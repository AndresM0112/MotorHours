import {
  getConnection,
  releaseConnection,
} from "../../../common/configs/db.config.js";

export const saveLocalizacion = async (data, connection = null) => {
  let conn = connection,
    release = false;

  const {
    lcaId = 0,             // id de la localización (0 = nueva)
    nombre,                // lca_nombre
    bloqueId = null,       // lca_bloque (FK a tbl_bloques.blo_id)
    localId = null,        // lca_local  (FK a tbl_locales.loc_id)
    estId = 1,             // est_id (catálogo de estados)
    usuario,               // id del usuario que registra/actualiza
  } = data;

  try {
    if (!conn) {
      conn = await getConnection();
      release = true;
    }

    await conn.beginTransaction();

    const nombreUpper = nombre?.trim().toUpperCase();

    // Validación: nombre único (ignorar mayúsculas/minúsculas, espacios)
    let q = `
      SELECT lca_id 
      FROM tbl_localizacion 
      WHERE UPPER(TRIM(lca_nombre)) = ?
    `;
    const params = [nombreUpper];

    if (lcaId > 0) {
      q += ` AND lca_id <> ?`;
      params.push(lcaId);
    }

    const [dup] = await conn.query(q, params);
    if (dup.length) {
      throw new Error("Ya existe una localización con ese nombre");
    }

    // Payload para INSERT/UPDATE
    const payload = {
      lca_nombre: nombreUpper,
      lca_bloque: bloqueId || null,
      lca_local: localId || null,
      est_id: estId,
    };

    let newId = lcaId;

    if (lcaId > 0) {
      // UPDATE
      await conn.query(
        `
        UPDATE tbl_localizacion 
        SET ?, lca_usu_act = ?, lca_fec_act = CURRENT_TIMESTAMP
        WHERE lca_id = ?
        `,
        [payload, usuario, lcaId]
      );
    } else {
      // INSERT
      payload.lca_usu_reg = usuario;
      const [ins] = await conn.query(
        `INSERT INTO tbl_localizacion SET ?`,
        payload
      );
      newId = ins.insertId;
    }

    await conn.commit();

    return {
      message: "Localización guardada correctamente",
      lcaId: newId,
    };
  } catch (err) {
    if (conn) await conn.rollback();
    throw err;
  } finally {
    if (release) releaseConnection(conn);
  }
};

// seria hacer un union all o mirar que recomienda chatgpt la idea es que vas a traer en un mismo query las dos listas que tienes de getLocalizaciones y getLocales en un solo query, y segun qeu maestra simplemente agregas otro item donde digas si es localizacion o local
export const getLocalizaciones = async (filters = {}, connection = null) => {
  let conn = connection,
    release = false;

  const { estId = null } = filters;

  try {
    if (!conn) {
      conn = await getConnection();
      release = true;
    }

    let sql = `
      SELECT 
        lca_id,
        lca_nombre,
        lca_bloque,
        lca_local,
        lca_usu_reg,
        lca_fec_reg,
        lca_usu_act,
        lca_fec_act,
        est_id
      FROM tbl_localizacion
      WHERE 1=1
    `;
    const params = [];

    if (estId != null) {
      sql += ` AND est_id = ?`;
      params.push(estId);
    }

    sql += ` ORDER BY lca_nombre ASC`;

    const [rows] = await conn.query(sql, params);
    return rows;
  } finally {
    if (release) releaseConnection(conn);
  }
};

export const getLocalizacionById = async (lcaId, connection = null) => {
  let conn = connection,
    release = false;

  try {
    if (!conn) {
      conn = await getConnection();
      release = true;
    }

    const [rows] = await conn.query(
      `
      SELECT 
        lca_id,
        lca_nombre,
        lca_bloque,
        lca_local,
        lca_usu_reg,
        lca_fec_reg,
        lca_usu_act,
        lca_fec_act,
        est_id
      FROM tbl_localizacion
      WHERE lca_id = ?
      `,
      [lcaId]
    );

    return rows[0] || null;
  } finally {
    if (release) releaseConnection(conn);
  }
};

export const deleteLocalizacion = async (lcaId, connection = null) => {
  let conn = connection,
    release = false;

  try {
    if (!conn) {
      conn = await getConnection();
      release = true;
    }

    await conn.beginTransaction();

    // Aquí puedes validar si está en uso en tickets antes de borrar
    // (ejemplo: SELECT COUNT(*) FROM tkt_tickets WHERE locz_id = ?)

    await conn.query(
      `DELETE FROM tbl_localizacion WHERE lca_id = ?`,
      [lcaId]
    );

    await conn.commit();

    return { message: "Localización eliminada correctamente" };
  } catch (err) {
    if (conn) await conn.rollback();
    throw err;
  } finally {
    if (release) releaseConnection(conn);
  }
};


export const paginateLocalizaciones = async (params, connection = null) => {
  let conn = connection,
    release = false;

  try {
    if (!conn) {
      conn = await getConnection();
      release = true;
    }

    const {
      // compat
      search = "",
      estado = null,

      // paginación
      rows = 10,
      first = 0,
      sortField = "nombre",
      sortOrder = 1,

      // filtros anidados opcionales
      filtros = {},
    } = params || {};

    // ACEPTA AMBOS: plano y anidado 
    const getFilter = (k) => {
      const v1 = (filtros ?? {})[k];
      const v2 = params?.[k]; // plano
      const v = v1 ?? v2 ?? null;
      if (v === undefined || v === null) return null;
      const s = String(v).trim();
      return s.length ? s : null;
    };

    const nombre        = getFilter("nombre");        // lca_nombre
    const bloqueNombre  = getFilter("bloqueNombre");  // b.blo_nombre
    const bloqueCodigo  = getFilter("bloqueCodigo");  // b.blo_codigo
    const localNombre   = getFilter("localNombre");   // l.loc_nombre
    const localCodigo   = getFilter("localCodigo");   // l.loc_codigo
    const estadoFiltro  = getFilter("estado");        // est_id

    const finalEstado = estado ?? estadoFiltro ?? null;

    const order = sortOrder === 1 ? "ASC" : "DESC";
    const sortMap = {
      lcaId: "lz.lca_id",
      nombre: "lz.lca_nombre",
      bloqueNombre: "b.blo_nombre",
      bloqueCodigo: "b.blo_codigo",
      localNombre: "l.loc_nombre",
      localCodigo: "l.loc_codigo",
      estado: "lz.est_id",
      fechaRegistro: "lz.lca_fec_reg",
      fechaActualizacion: "lz.lca_fec_act",
    };
    const sortColumn = sortMap[sortField] || "lz.lca_nombre";

    const where = ["1=1"];
    const vals = [];

    // Búsqueda general (search)
    if (search) {
      where.push(`
        (
          UPPER(lz.lca_nombre) LIKE UPPER(CONCAT('%', ?, '%'))
          OR UPPER(b.blo_nombre) LIKE UPPER(CONCAT('%', ?, '%'))
          OR UPPER(l.loc_nombre) LIKE UPPER(CONCAT('%', ?, '%'))
        )
      `);
      vals.push(search, search, search);
    }

    // Filtro por nombre de localización
    if (!search && nombre) {
      where.push("UPPER(lz.lca_nombre) LIKE UPPER(CONCAT('%', ?, '%'))");
      vals.push(nombre);
    }

    // Filtro por bloque
    if (bloqueNombre) {
      where.push("UPPER(b.blo_nombre) LIKE UPPER(CONCAT('%', ?, '%'))");
      vals.push(bloqueNombre);
    }

    if (bloqueCodigo) {
      where.push("CAST(b.blo_codigo AS CHAR) LIKE CONCAT('%', ?, '%')");
      vals.push(bloqueCodigo);
    }

    // Filtro por local asociado
    if (localNombre) {
      where.push("UPPER(l.loc_nombre) LIKE UPPER(CONCAT('%', ?, '%'))");
      vals.push(localNombre);
    }

    if (localCodigo) {
      where.push("CAST(l.loc_codigo AS CHAR) LIKE CONCAT('%', ?, '%')");
      vals.push(localCodigo);
    }

    // Filtro por estado (est_id)
    if (finalEstado) {
      where.push("lz.est_id = ?");
      vals.push(finalEstado);
    }

    const whereSql = `WHERE ${where.join(" AND ")}`;

    const sqlData = `
      SELECT
        lz.lca_id        AS lcaId,
        lz.lca_nombre    AS nombre,
        lz.lca_bloque    AS bloqueId,
        lz.lca_local     AS localId,
        lz.lca_usu_reg   AS usuarioRegistro,
        lz.lca_fec_reg   AS fechaRegistro,
        lz.lca_usu_act   AS usuarioActualiza,
        lz.lca_fec_act   AS fechaActualizacion,
        lz.est_id        AS estId,

        b.blo_nombre     AS bloqueNombre,
        b.blo_codigo     AS bloqueCodigo,

        l.loc_nombre     AS localNombre,
        l.loc_codigo     AS localCodigo

      FROM tbl_localizacion lz
      LEFT JOIN tbl_bloques b
             ON b.blo_id = lz.lca_bloque
      LEFT JOIN tbl_locales l
             ON l.loc_id = lz.lca_local
      ${whereSql}
      ORDER BY ${sortColumn} ${order}
      LIMIT ${Number(rows)} OFFSET ${Number(first)}
    `;

    const [rowsData] = await conn.query(sqlData, vals);

    const sqlCount = `
      SELECT COUNT(*) AS total
      FROM tbl_localizacion lz
      LEFT JOIN tbl_bloques b
             ON b.blo_id = lz.lca_bloque
      LEFT JOIN tbl_locales l
             ON l.loc_id = lz.lca_local
      ${whereSql}
    `;

    const [[count]] = await conn.query(sqlCount, vals);

    return {
      results: rowsData,
      total: count?.total || 0,
    };
  } finally {
    if (release) releaseConnection(conn);
  }
};

// export const getUbicacionesDropdown = async (connection = null) => {
//   let conn = connection, release = false;

//   try {
//     if (!conn) {
//       conn = await getConnection();
//       release = true;
//     }

//     const [rows] = await conn.query(`
//       SELECT 
//         CONCAT('LCA-', lz.lca_id) AS uid,
//         lz.lca_id                 AS id,
//         'LOCALIZACION'            AS tipo,
//         lz.lca_nombre             AS nombre,
//         NULL                      AS codigo,
//         NULL                      AS descripcion,
//         lz.lca_bloqueId           AS bloId,
//         b.blo_nombre              AS bloqueNombre,
//         lz.lca_bloque             AS aplicaBloque,
//         lz.lca_local              AS aplicaLocal,
//         CASE 
//           WHEN lz.lca_local = 1 THEN 1 
//           ELSE 0
//         END                       AS aplicaPropietario,
//         lz.lca_areaId    AS lcaAreaId,
//         CASE WHEN lz.lca_bloqueId IS NOT NULL THEN 1 ELSE 0 END AS tieneBloquePorDefecto
//       FROM tbl_localizacion lz
//       LEFT JOIN tbl_bloques b
//                ON b.blo_id = lz.lca_bloqueId
//               AND (b.blo_eliminado = 0 OR b.blo_eliminado IS NULL)
//               AND (b.blo_estado = 'activo' OR b.blo_estado IS NULL)
//       WHERE lz.est_id = 1

//       UNION ALL

//       SELECT
//         CONCAT('LOC-', l.loc_id)  AS uid,
//         l.loc_id                  AS id,
//         'LOCAL'                   AS tipo,
//         l.loc_nombre              AS nombre,
//         l.loc_codigo              AS codigo,
//         l.loc_descripcion         AS descripcion,
//         l.blo_id                  AS bloId,
//         b.blo_nombre              AS bloqueNombre,
//         1                         AS aplicaBloque,
//         1                         AS aplicaLocal,
//         1                         AS aplicaPropietario,
//         NULL                      AS lcaAreaId
//       FROM tbl_locales l
//       LEFT JOIN tbl_bloques b
//                ON b.blo_id = l.blo_id
//               AND (b.blo_eliminado = 0 OR b.blo_eliminado IS NULL)
//               AND (b.blo_estado = 'activo' OR b.blo_estado IS NULL)
//       WHERE l.eta_eliminado = 0

//       ORDER BY nombre ASC
//     `);

//     return rows;
//   } finally {
//     if (release) releaseConnection(conn);
//   }
// };


export const getUbicacionesDropdown = async (connection = null) => {
  let conn = connection, release = false;

  try {
    if (!conn) {
      conn = await getConnection();
      release = true;
    }

    const [rows] = await conn.query(`
      SELECT * FROM (
        /* ===== LOCALIZACIONES ===== */
        SELECT 
          CONCAT('LCA-', lz.lca_id)                    AS uid,
          lz.lca_id                                    AS id,
          'LOCALIZACION'                               AS tipo,
          lz.lca_nombre                                AS nombre,
          NULL                                         AS codigo,
          NULL                                         AS descripcion,
          lz.lca_bloqueId                              AS bloId,
          b.blo_nombre                                 AS bloqueNombre,
          lz.lca_bloque                                AS aplicaBloque,
          lz.lca_local                                 AS aplicaLocal,
          CASE WHEN lz.lca_local = 1 THEN 1 ELSE 0 END AS aplicaPropietario,
          lz.lca_areaId                                AS lcaAreaId,
          CASE WHEN lz.lca_bloqueId IS NOT NULL THEN 1 ELSE 0 END AS tieneBloquePorDefecto
        FROM tbl_localizacion lz
        LEFT JOIN tbl_bloques b
               ON b.blo_id = lz.lca_bloqueId
              AND (b.blo_eliminado = 0 OR b.blo_eliminado IS NULL)
              AND (b.blo_estado = 'activo' OR b.blo_estado IS NULL)
        WHERE lz.est_id = 1

        UNION ALL

        /* ===== LOCALES ===== */
        SELECT
          CONCAT('LOC-', l.loc_id)                     AS uid,
          l.loc_id                                     AS id,
          'LOCAL'                                      AS tipo,
          l.loc_nombre                                 AS nombre,
          l.loc_codigo                                 AS codigo,
          l.loc_descripcion                            AS descripcion,
          l.blo_id                                     AS bloId,
          b.blo_nombre                                 AS bloqueNombre,
          1                                            AS aplicaBloque,
          1                                            AS aplicaLocal,
          1                                            AS aplicaPropietario,
          NULL                                         AS lcaAreaId,
          0                                            AS tieneBloquePorDefecto
        FROM tbl_locales l
        LEFT JOIN tbl_bloques b
               ON b.blo_id = l.blo_id
              AND (b.blo_eliminado = 0 OR b.blo_eliminado IS NULL)
              AND (b.blo_estado = 'activo' OR b.blo_estado IS NULL)
        WHERE l.eta_eliminado = 0
      ) AS T
      ORDER BY T.nombre ASC
    `);

    return rows;
  } finally {
    if (release) releaseConnection(conn);
  }
};
