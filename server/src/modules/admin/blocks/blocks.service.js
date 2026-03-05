import {
  getConnection,
  releaseConnection,
} from "../../../common/configs/db.config.js";


import ExcelJS from "exceljs";


/* ===================== Excel reader ===================== */
async function excelToRows(fileObj) {
  const wb = new ExcelJS.Workbook();
  if (fileObj?.data && fileObj.data.length) {
    await wb.xlsx.load(fileObj.data);
  } else if (fileObj?.tempFilePath) {
    await wb.xlsx.readFile(fileObj.tempFilePath);
  } else {
    throw new Error("No se pudo leer el archivo subido.");
  }
  const ws = wb.worksheets[0];
  if (!ws) return [];

  const headerRow = ws.getRow(1);
  const colCount =
    ws.actualColumnCount || ws.columnCount || headerRow.cellCount || 0;
  const headers = [];
  for (let c = 1; c <= colCount; c++)
    headers.push((headerRow.getCell(c).text || "").trim());

  const rows = [];
  const lastRow = ws.actualRowCount || ws.rowCount || 1;
  for (let r = 2; r <= lastRow; r++) {
    const row = ws.getRow(r);
    if (!row || row.cellCount === 0) continue;
    const obj = {};
    for (let c = 1; c <= colCount; c++) {
      const h = headers[c - 1] || `COL_${c}`;
      const cell = row.getCell(c);
      let val = cell.text;
      if (val === undefined || val === null || val === "") {
        if (typeof cell.value === "number") val = cell.value;
        else val = null;
      }
      obj[h] = val;
    }
    if (Object.values(obj).some((v) => v !== null && v !== "")) rows.push(obj);
  }
  return rows;
}

/** Normalizador extendido: bloque, local y hasta 5 propietarios */
function normalizeAllRow(row) {
  const bloCodigo = pick(row, 'Codigo bloque','CÓDIGO BLOQUE','CODIGO BLOQUE','Bloque Cod','blo_codigo','BLO_CODIGO');
  const locCodigo = pick(row, 'Codigo Local','CÓDIGO LOCAL','CODIGO LOCAL','Local Cod','loc_codigo','LOC_CODIGO');
  const bloNombre = pick(row, 'Bloque','BLOQUE','Nombre Bloque','blo_nombre','BLO_NOMBRE');
  const locNombre = pick(row, 'Local','LOCAL','Nombre Local','loc_nombre','LOC_NOMBRE');
  const descripcion = pick(row, 'DIRECCION','Dirección','Descripcion','Descripción','descripcion');

  // 👇 agrega el teléfono genérico (sin “propietario n”)
  const telefonoGeneral = pick(row, 'telefono','Telefono','Teléfono','TEL','Tel','tel');

  const owners = [];
  for (let i = 1; i <= 5; i++) {
    const nombre = pick(row, `PROPIETARIO${i}`, `Propietario ${i}`, `PROPIETARIO ${i}`, `Owner ${i}`);
    const documento = pick(row, `Documento propietario ${i}`, `Documento Propietario ${i}`, `DOC ${i}`, `NIT ${i}`, `NIT${i}`);
    const correo = pick(row, `Correo propietario ${i}`, `Correo Propietario ${i}`, `EMAIL ${i}`, `Email ${i}`);
    const telefono = pick(
      row,
      `Telefono propietario ${i}`, `Teléfono propietario ${i}`, `TEL ${i}`, `Telefono ${i}`
    );
    const direccion = pick(row, `Direccion propietario ${i}`, `Dirección propietario ${i}`, `DIRECCION ${i}`, `DIR ${i}`, `Direccion ${i}`);

    let tel = toNullIfEmpty(telefono);
    // 👇 si es el primero y no vino “teléfono propietario 1”, usa la columna genérica “telefono”
    if (i === 1 && !tel) tel = toNullIfEmpty(telefonoGeneral);

    const cleaned = {
      nombre: toNullIfEmpty(nombre),
      documento: toNullIfEmpty(documento),
      correo: toNullIfEmpty(correo),
      telefono: tel,
      direccion: toNullIfEmpty(direccion),
    };
    const hasAny = Object.values(cleaned).some(v => v);
    if (hasAny) owners.push(cleaned);
  }

  return {
    bloCodigo: toNullIfEmpty(bloCodigo),
    locCodigo: toNullIfEmpty(locCodigo),
    bloNombre: (bloNombre ?? '').toString().trim(),
    locNombre: (locNombre ?? '').toString().trim(),
    descripcion: toNullIfEmpty(descripcion),
    owners,
  };
}


const normalizePersonName = (s) => {
  if (!s) return null;
  // trim, quita tildes, colapsa espacios y elimina puntuación suelta
  const sinTildes = s.normalize('NFD').replace(/\p{Diacritic}/gu, '');
  return sinTildes
    .replace(/[.,;:]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();
};

const pick = (row, ...keys) => {
  for (const k of keys) if (row[k] !== undefined && row[k] !== null) return row[k];
  return null;
};

const toNullIfEmpty = (v) => {
  if (v === undefined || v === null) return null;
  const t = String(v).trim();
  return t.length ? t : null;
};


/* ============================
   BLOQUES
   ============================ */

// Listado simple (activos, no eliminados)
export const getAllBlocks = async (connection = null) => {
  let conn = connection,
    release = false;
  try {
    if (!conn) {
      conn = await getConnection();
      release = true;
    }
    const [rows] = await conn.query(`
      SELECT 
        b.blo_id      AS proId,
        b.blo_codigo  AS codigo,
        b.blo_nombre  AS nombre,
        b.blo_color   AS color,
        b.blo_estado  AS estado
      FROM tbl_bloques b
      WHERE b.blo_estado='activo' AND b.blo_eliminado=0
      ORDER BY b.blo_nombre ASC
    `);
    return rows;
  } finally {
    if (release) releaseConnection(conn);
  }
};

// Detalle por ID
export const getBlockById = async (proId, connection = null) => {
  let conn = connection,
    release = false;
  try {
    if (!conn) {
      conn = await getConnection();
      release = true;
    }
    const [[row]] = await conn.query(
      `
      SELECT 
        b.blo_id      AS proId,
        b.blo_codigo  AS codigo,
        b.blo_nombre  AS nombre,
        b.blo_descripcion AS descripcion,
        b.blo_color   AS color,
        b.blo_estado  AS estado,
        b.blo_eliminado AS eliminado,
        b.blo_usu_reg AS usuarioRegistro,
        b.blo_fec_reg AS fechaRegistro,
        b.blo_usu_act AS usuarioActualiza,
        b.blo_fec_act AS fechaActualizacion
      FROM tbl_bloques b
      WHERE b.blo_id=? AND b.blo_eliminado=0
      LIMIT 1
    `,
      [proId]
    );
    return row || null;
  } finally {
    if (release) releaseConnection(conn);
  }
};


// Paginación/filtrado
export const paginateBlocks = async (params, connection = null) => {
  let conn = connection, release = false;
  try {
    if (!conn) { conn = await getConnection(); release = true; }

    const {
      // compat legacy
      search = "",
      estado = null,

      // paginación / orden
      rows = 10,
      first = 0,
      sortField = "nombre",
      sortOrder = 1,

      // puede venir o no
      filtros = {}
    } = params || {};

    // <- ACEPTA AMBOS: plano y anidado
    const getFilter = (k) => {
      const v1 = (filtros ?? {})[k];
      const v2 = params?.[k];               // plano
      const v = v1 ?? v2 ?? null;
      if (v === undefined || v === null) return null;
      const s = String(v).trim();
      return s.length ? s : null;
    };

    const nombre      = getFilter("nombre");
    const bloCodigo   = getFilter("bloCodigo");
    const locCodigo   = getFilter("locCodigo");
    const locNombre   = getFilter("locNombre");
    const propietario = getFilter("propietario");
    const estadoFiltro= getFilter("estado");

    const finalEstado = estado ?? estadoFiltro ?? null;
    const order = sortOrder === 1 ? "ASC" : "DESC";
    const sortMap = {
      proId: "b.blo_id",
      nombre: "b.blo_nombre",
      codigo: "b.blo_codigo",
      descripcion: "b.blo_descripcion",
      estado: "b.blo_estado",
      fechaRegistro: "b.blo_fec_reg",
      fechaActualizacion: "b.blo_fec_act",
    };
    const sortColumn = sortMap[sortField] || "b.blo_nombre";

    const where = ["b.blo_eliminado = 0"];
    const vals = [];

    // nombre de bloque (compat: search o nombre)
    if (search) {
      where.push("UPPER(b.blo_nombre) LIKE UPPER(CONCAT('%', ?, '%'))");
      vals.push(search);
    } else if (nombre) {
      where.push("UPPER(b.blo_nombre) LIKE UPPER(CONCAT('%', ?, '%'))");
      vals.push(nombre);
    }

    if (finalEstado) {
      where.push("b.blo_estado = ?");
      vals.push(finalEstado);
    }

    // ⚠️ CAST por si blo_codigo es numérico y llega '07'
    if (bloCodigo) {
      where.push("CAST(b.blo_codigo AS CHAR) LIKE CONCAT('%', ?, '%')");
      vals.push(bloCodigo);
    }

    if (locCodigo) {
      where.push("CAST(l.loc_codigo AS CHAR) LIKE CONCAT('%', ?, '%')");
      vals.push(locCodigo);
    }

    if (locNombre) {
      where.push("UPPER(l.loc_nombre) LIKE UPPER(CONCAT('%', ?, '%'))");
      vals.push(locNombre);
    }

    if (propietario) {
      where.push(`(
         u.usu_documento = ?
      OR u.usu_correo    = ?
      OR UPPER(CONCAT_WS(' ', COALESCE(u.usu_nombre,''), COALESCE(u.usu_apellido,'')))
         LIKE UPPER(CONCAT('%', ?, '%'))
      )`);
      vals.push(propietario, propietario, propietario);
    }

    const whereSql = `WHERE ${where.join(" AND ")}`;

    const sqlData = `
      SELECT DISTINCT
        b.blo_id            AS proId,
        b.blo_nombre        AS nombre,
        b.blo_codigo        AS codigo,
        b.blo_descripcion   AS descripcion,
        b.blo_estado        AS estado,
        b.blo_color         AS color,
        b.blo_fec_reg       AS fechaRegistro,
        b.blo_fec_act       AS fechaActualizacion
      FROM tbl_bloques b
      LEFT JOIN tbl_locales l
             ON l.blo_id = b.blo_id
            AND l.eta_eliminado = 0
      LEFT JOIN tbl_local_cliente lc
             ON lc.loc_id = l.loc_id
            AND lc.lcl_estado <> 'inactivo'
      LEFT JOIN tbl_usuarios u
             ON u.usu_id = lc.usu_id
      ${whereSql}
      ORDER BY ${sortColumn} ${order}
      LIMIT ${Number(rows)} OFFSET ${Number(first)}
    `;

    const [rowsData] = await conn.query(sqlData, vals);

    const sqlCount = `
      SELECT COUNT(DISTINCT b.blo_id) AS total
      FROM tbl_bloques b
      LEFT JOIN tbl_locales l
             ON l.blo_id = b.blo_id
            AND l.eta_eliminado = 0
      LEFT JOIN tbl_local_cliente lc
             ON lc.loc_id = l.loc_id
            AND lc.lcl_estado <> 'inactivo'
      LEFT JOIN tbl_usuarios u
             ON u.usu_id = lc.usu_id
      ${whereSql}
    `;
    const [[count]] = await conn.query(sqlCount, vals);

    return { results: rowsData, total: count?.total || 0 };
  } finally {
    if (release) releaseConnection(conn);
  }
};


// Crear / actualizar
export const saveBlock = async (data, connection = null) => {
  let conn = connection,
    release = false;
  const {
    proId = 0,
    nombre,
    codigo = null,
    descripcion = null,
    estado = "activo",
    usuario,
    color = null,
  } = data;

  try {
    if (!conn) {
      conn = await getConnection();
      release = true;
    }
    await conn.beginTransaction();

    const nombreUpper = nombre?.trim().toUpperCase();

    // nombre único (no eliminado)
    let q = `SELECT blo_id FROM tbl_bloques WHERE UPPER(TRIM(blo_nombre))=? AND blo_eliminado=0`;
    const params = [nombreUpper];
    if (proId > 0) {
      q += ` AND blo_id <> ?`;
      params.push(proId);
    }
    const [dup] = await conn.query(q, params);
    if (dup.length) throw new Error("Ya existe un bloque con ese nombre");

    const payload = {
      blo_nombre: nombreUpper,
      blo_estado: estado,
      blo_codigo: codigo,
      blo_descripcion: descripcion,
      blo_color: color,
    };

    let newId = proId;
    if (proId > 0) {
      await conn.query(
        `UPDATE tbl_bloques SET ?, blo_usu_act=?, blo_fec_act=CURRENT_TIMESTAMP WHERE blo_id=?`,
        [payload, usuario, proId]
      );
    } else {
      payload.blo_usu_reg = usuario;
      const [ins] = await conn.query(`INSERT INTO tbl_bloques SET ?`, payload);
      newId = ins.insertId;
    }

    await conn.commit();
    return { message: "Bloque guardado correctamente", proId: newId };
  } catch (err) {
    if (conn) await conn.rollback();
    throw err;
  } finally {
    if (release) releaseConnection(conn);
  }
};

// Eliminado lógico (1 o varios)
export const deleteBlocks = async (ids, usuario, connection = null) => {
  let conn = connection,
    release = false;
  try {
    if (!conn) {
      conn = await getConnection();
      release = true;
    }
    const arr = Array.isArray(ids) ? ids : [ids];
    const placeholders = arr.map(() => "?").join(", ");
    await conn.query(
      `
      UPDATE tbl_bloques
      SET blo_eliminado=1, blo_estado='inactivo', blo_usu_act=?, blo_fec_act=CURRENT_TIMESTAMP
      WHERE blo_id IN (${placeholders})
      `,
      [usuario, ...arr]
    );
    return { message: "Bloques eliminados" };
  } finally {
    if (release) releaseConnection(conn);
  }
};

/* ============================
   LOCALES (antes “etapas”)
   ============================ */


// Devuelve etaId para que tu UI actual no rompa
export const getLocalesByBlockId = async (proId, connection = null) => {
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
        l.loc_id          AS etaId,          -- compat UI
        l.loc_codigo      AS codigo,
        l.loc_nombre      AS nombre,
        l.loc_descripcion AS descripcion,
        l.eta_estado      AS estado,
        l.blo_id          AS proId,
        l.eta_fec_reg     AS fechaRegistro,
        l.eta_usu_act     AS usuarioActualiza,
        l.eta_fec_act     AS fechaActualizacion,

        -- (A) todos los propietarios activos del local (ids) en CSV, ordenados por lcl_orden asc y nombre como desempate
        GROUP_CONCAT(
          CASE WHEN lc.lcl_estado = 'activo' THEN lc.usu_id END
          ORDER BY COALESCE(lc.lcl_orden, 999999) ASC
          SEPARATOR ','
        ) AS propietariosCsv,

        -- (B) principal si existe (solo activos)
        MAX(
          CASE WHEN lc.lcl_estado = 'activo' AND lc.lcl_principal = 1
               THEN lc.usu_id ELSE NULL END
        ) AS principalUsuId

      FROM tbl_locales l
      LEFT JOIN tbl_local_cliente lc
        ON lc.loc_id = l.loc_id
       AND lc.lcl_estado IN ('activo','inactivo')  -- incluimos inactivos para poder hacer MAX pero filtramos en CASE
      WHERE l.blo_id = ? AND l.eta_eliminado = 0
      GROUP BY
        l.loc_id, l.loc_codigo, l.loc_nombre, l.loc_descripcion, l.eta_estado,
        l.blo_id, l.eta_fec_reg, l.eta_usu_act, l.eta_fec_act
      ORDER BY l.eta_fec_reg ASC
      `,
      [proId]
    );
    // Normaliza a la estructura que quiere el front:
    // propietariosIds: number[] | []
    // principalUsuId: number | null
    const normalized = rows.map(r => {
      const ids = (r.propietariosCsv || '')
        .split(',')
        .map(s => Number(s))
        .filter(Boolean);
      return {
        ...r,
        propietariosIds: ids,
        principalUsuId: r.principalUsuId ? Number(r.principalUsuId) : null,
      };
    });

    return normalized;
  } finally {
    if (release) releaseConnection(conn);
  }
};

// Crear local (front envía proId)
export const saveLocal = async (data, connection = null) => {
  let conn = connection,
    release = false;
  const {
    codigo = null,
    nombre,
    descripcion = null,
    estado = "activo",
    proId,
    usuarioRegistro,
  } = data;

  try {
    if (!conn) {
      conn = await getConnection();
      release = true;
    }
    await conn.beginTransaction();

    // nombre único dentro del bloque (activo, no eliminado)
    const [existing] = await conn.query(
      `SELECT loc_id 
         FROM tbl_locales 
        WHERE blo_id=? AND loc_nombre=? AND eta_eliminado=0`,
      [proId, nombre.trim()]
    );
    if (existing.length > 0)
      throw new Error("Ya existe un local con ese nombre en este bloque");

    const [result] = await conn.query(
      `INSERT INTO tbl_locales
         (loc_codigo, loc_nombre, loc_descripcion, blo_id, eta_estado, eta_eliminado, loc_usu_reg, eta_fec_reg, eta_fec_act)
       VALUES (?, ?, ?, ?, ?, 0, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      [codigo, nombre.trim(), descripcion, proId, estado, usuarioRegistro]
    );

    await conn.commit();
    return { message: "Local creado correctamente", locId: result.insertId };
  } catch (err) {
    if (conn) await conn.rollback();
    throw err;
  } finally {
    if (release) releaseConnection(conn);
  }
};

// Actualizar local por ID
export const updateLocal = async (locId, data, connection = null) => {
  let conn = connection,
    release = false;
  const {
    codigo= undefined,
    nombre = null,
    descripcion = null,
    estado = null,
    ownerUsuId = undefined, // puede venir undefined para “no tocar”
    usuarioActualiza,
  } = data;

  try {
    if (!conn) {
      conn = await getConnection();
      release = true;
    }
    await conn.beginTransaction();

    // si viene nombre, validamos unicidad dentro del mismo bloque
    if (nombre != null) {
      const [[row]] = await conn.query(
        `SELECT blo_id FROM tbl_locales WHERE loc_id=?`,
        [locId]
      );
      if (!row) throw new Error("Local no existe");
      const proId = row.blo_id;

      const nombreTrim = nombre.toString().trim();
      const [existing] = await conn.query(
        `SELECT loc_id FROM tbl_locales
         WHERE blo_id=? AND loc_nombre=? AND loc_id<>? AND eta_eliminado=0`,
        [proId, nombreTrim, locId]
      );
      if (existing.length > 0)
        throw new Error("Ya existe un local con ese nombre en este bloque");
    }

    // construye SET dinámico
    const set = [];
    const vals = [];
    if (codigo != null) {
      set.push("loc_codigo=?");
      vals.push(codigo);
    }
    if (nombre != null) {
      set.push("loc_nombre=?");
      vals.push(nombre.toString().trim());
    }
    if (descripcion !== null) {
      set.push("loc_descripcion=?");
      vals.push(descripcion);
    }
    if (estado !== null) {
      set.push("eta_estado=?");
      vals.push(estado);
    }

    // auditoría siempre
    set.push("eta_usu_act=?");
    vals.push(usuarioActualiza);
    set.push("eta_fec_act=CURRENT_TIMESTAMP");

    if (set.length) {
      await conn.query(
        `UPDATE tbl_locales SET ${set.join(", ")} WHERE loc_id=?`,
        [...vals, locId]
      );
    }

    // manejar propietario si viene definido (permite null para limpiar)
    if (ownerUsuId !== undefined) {
      if (ownerUsuId === null) {
        // Quitar principal (NO desactivar propietarios)
        await conn.query(
          `UPDATE tbl_local_cliente
         SET lcl_principal=0, lcl_usu_act=?, lcl_fec_act=CURRENT_TIMESTAMP
       WHERE loc_id=? AND lcl_principal=1`,
          [usuarioActualiza, locId]
        );
      } else {
        // Upsert del propietario y marcarlo como principal
        await conn.query(
          `INSERT INTO tbl_local_cliente (loc_id, usu_id, lcl_usu_reg, lcl_estado, lcl_principal)
       VALUES (?, ?, ?, 'activo', 1)
       ON DUPLICATE KEY UPDATE
         lcl_estado='activo',
         lcl_principal=1,
         lcl_usu_act=VALUES(lcl_usu_reg),
         lcl_fec_act=CURRENT_TIMESTAMP`,
          [locId, ownerUsuId, usuarioActualiza]
        );
        await conn.query(
          `UPDATE tbl_local_cliente
         SET lcl_principal=0, lcl_usu_act=?, lcl_fec_act=CURRENT_TIMESTAMP
       WHERE loc_id=? AND usu_id<>? AND lcl_principal=1`,
          [usuarioActualiza, locId, ownerUsuId]
        );
      }
    }

    await conn.commit();
    return { message: "Local actualizado correctamente" };
  } catch (err) {
    if (conn) await conn.rollback();
    throw err;
  } finally {
    if (release) releaseConnection(conn);
  }
};

// Eliminar lógico local
export const deleteLocal = async (
  locId,
  usuarioActualiza,
  connection = null
) => {
  let conn = connection,
    release = false;
  try {
    if (!conn) {
      conn = await getConnection();
      release = true;
    }
    await conn.beginTransaction();

    await conn.query(
      `UPDATE tbl_locales
          SET eta_eliminado=1, eta_estado='inactivo', eta_usu_act=?, eta_fec_act=CURRENT_TIMESTAMP
        WHERE loc_id=?`,
      [usuarioActualiza, locId]
    );

    await conn.commit();
    return { message: "Local eliminado correctamente" };
  } catch (err) {
    if (conn) await conn.rollback();
    throw err;
  } finally {
    if (release) releaseConnection(conn);
  }
};

export const listLocales = async (connection = null) => {
  let conn = connection, release = false;
  try {
    if (!conn) { conn = await getConnection(); release = true; }

    const [rows] = await conn.query(`
     SELECT 
        l.loc_id          AS etaId,             -- compat UI (etaId)
        l.loc_codigo      AS codigo,
        l.loc_nombre      AS nombre,
        l.loc_descripcion AS descripcion,
        l.eta_estado      AS estado,
        l.blo_id          AS bloId,            
        b.blo_nombre      AS bloqueNombre,      -- << ajusta si tu columna difiere
        l.eta_fec_reg     AS fechaRegistro,
        l.eta_usu_act     AS usuarioActualiza,
        l.eta_fec_act     AS fechaActualizacion,
        lc.usu_id         AS ownerUsuId,        -- propietario principal (si existe)
        u.usu_nombre      AS propietarioNombre  -- opcional (para UI/log)
      FROM tbl_locales l
      LEFT JOIN tbl_bloques b
             ON b.blo_id = l.blo_id
      LEFT JOIN tbl_local_cliente lc
             ON lc.loc_id = l.loc_id
            AND lc.lcl_principal = 1
            AND lc.lcl_estado = 'activo'
      LEFT JOIN tbl_usuarios u
             ON u.usu_id = lc.usu_id
      WHERE l.eta_eliminado = 0
      ORDER BY l.eta_fec_reg ASC
    `);

    return rows;
  } finally {
    if (release) releaseConnection(conn);
  }
};



/* ============================
   PROPIETARIOS / ENCARGADOS del LOCAL
   (clientes ligados a tbl_locales)
   ============================ */

export const getPropietariosByLocal = async (locId, connection = null) => {
  let conn = connection, release = false;
  try {
    if (!conn) { conn = await getConnection(); release = true; }
    const [rows] = await conn.query(
      `
      SELECT 
        u.usu_id                 AS id,
        u.usu_nombre             AS nombre,
        u.usu_correo             AS correo,
        COALESCE(lc.lcl_principal, 0) AS principal,
        lc.lcl_orden             AS orden
      FROM tbl_local_cliente lc
      INNER JOIN tbl_usuarios u ON u.usu_id = lc.usu_id
      WHERE lc.loc_id = ? AND lc.lcl_estado='activo'
      ORDER BY 
        COALESCE(lc.lcl_orden, 999999) ASC,
        u.usu_nombre ASC
      `,
      [locId]
    );
     // 👇 Normalización en RESPUESTA: si hay propietarios pero nadie es principal, marca el primero
    if (rows.length && !rows.some(r => Number(r.principal) === 1)) {
      rows[0].principal = 1;
    }

    return rows;
  } finally { if (release) releaseConnection(conn); }
};


export const setPropietariosByLocal = async (
  locId,
  propietariosIds = [],
  usuario,
  connection = null,
  principalUsuId = null
) => {
  let conn = connection, release = false;
  try {
    if (!conn) { conn = await getConnection(); release = true; }
    await conn.beginTransaction();

    const ids = (Array.isArray(propietariosIds) ? propietariosIds : [])
      .map(Number)
      .filter(Boolean);

    if (ids.length) {
      // Inserta/activa enviados con su ORDEN (idx+1)
      const values = ids.map((id, idx) => [locId, id, usuario, 'activo', idx + 1]);
      await conn.query(
        `INSERT INTO tbl_local_cliente (loc_id, usu_id, lcl_usu_reg, lcl_estado, lcl_orden)
         VALUES ?
         ON DUPLICATE KEY UPDATE
           lcl_estado='activo',
           lcl_orden=VALUES(lcl_orden),
           lcl_usu_act=VALUES(lcl_usu_reg),
           lcl_fec_act=CURRENT_TIMESTAMP`,
        [values]
      );

      // Desactiva los que NO están en la lista + limpia principal y orden
      await conn.query(
        `UPDATE tbl_local_cliente
           SET lcl_estado='inactivo', lcl_principal=0, lcl_orden=NULL, lcl_usu_act=?, lcl_fec_act=CURRENT_TIMESTAMP
         WHERE loc_id=? AND lcl_estado<>'inactivo' AND usu_id NOT IN (${ids.map(() => '?').join(',')})`,
        [usuario, locId, ...ids]
      );

      // Aplica principal (uno o ninguno)
      // ===== Principal garantizado =====
if (principalUsuId == null) {
  // 1) ¿ya hay principal activo?
  const [[hasPrincipal]] = await conn.query(
    `SELECT 1
       FROM tbl_local_cliente
      WHERE loc_id=? AND lcl_estado='activo' AND lcl_principal=1
      LIMIT 1`,
    [locId]
  );

  if (!hasPrincipal) {
    // 2) Elegir automáticamente el "primero":
    //    - Menor lcl_orden (NULLs al final)
    //    - Empate: menor usu_id
    const [[winner]] = await conn.query(
      `SELECT usu_id
         FROM tbl_local_cliente
        WHERE loc_id=? AND lcl_estado='activo'
        ORDER BY COALESCE(lcl_orden, 999999), usu_id
        LIMIT 1`,
      [locId]
    );

    if (winner?.usu_id) {
      // limpiar y marcar ganador
      await conn.query(
        `UPDATE tbl_local_cliente
           SET lcl_principal=0, lcl_usu_act=?, lcl_fec_act=CURRENT_TIMESTAMP
         WHERE loc_id=? AND lcl_principal=1`,
        [usuario, locId]
      );
      await conn.query(
        `UPDATE tbl_local_cliente
           SET lcl_principal=1, lcl_usu_act=?, lcl_fec_act=CURRENT_TIMESTAMP
         WHERE loc_id=? AND usu_id=?`,
        [usuario, locId, winner.usu_id]
      );
    }
  }
} else if (ids.includes(Number(principalUsuId))) {
  // Marcar el que vino explícito
  await conn.query(
    `UPDATE tbl_local_cliente
       SET lcl_principal=0, lcl_usu_act=?, lcl_fec_act=CURRENT_TIMESTAMP
     WHERE loc_id=? AND lcl_principal=1`,
    [usuario, locId]
  );
  await conn.query(
    `UPDATE tbl_local_cliente
       SET lcl_principal=1, lcl_usu_act=?, lcl_fec_act=CURRENT_TIMESTAMP
     WHERE loc_id=? AND usu_id=?`,
    [usuario, locId, principalUsuId]
  );
}
    } else {
      // Lista vacía → desactivar todos, limpiar principal y orden
      await conn.query(
        `UPDATE tbl_local_cliente
            SET lcl_estado='inactivo', lcl_principal=0, lcl_orden=NULL, lcl_usu_act=?, lcl_fec_act=CURRENT_TIMESTAMP
          WHERE loc_id=? AND lcl_estado<>'inactivo'`,
        [usuario, locId]
      );
    }

    await conn.commit();
    return { message: "Propietarios actualizados" };
  } catch (err) {
    if (conn) await conn.rollback();
    throw err;
  } finally { if (release) releaseConnection(conn); }
};

/* ============================
   CONSULTAS por CLIENTE
   ============================ */

// 
export const getBlocksByClientId = async (usuId, connection = null) => {
  let conn = connection,
    release = false;
  try {
    if (!conn) {
      conn = await getConnection();
      release = true;
    }
    const [rows] = await conn.query(
      `
      SELECT DISTINCT 
        b.blo_id     AS proId,
        b.blo_nombre AS nombre
      FROM tbl_bloques b
      JOIN tbl_locales l  ON l.blo_id = b.blo_id AND l.eta_eliminado=0 AND l.eta_estado='activo'
      JOIN tbl_local_cliente lc ON lc.loc_id = l.loc_id AND lc.lcl_estado='activo'
      WHERE b.blo_eliminado=0 AND b.blo_estado='activo'
        AND lc.usu_id = ?
      ORDER BY b.blo_nombre ASC
      `,
      [usuId]
    );
    return rows;
  } finally {
    if (release) releaseConnection(conn);
  }
};

// Locales de un bloque, filtrados por cliente 
export const getLocalesByBlockAndClient = async (
  { bloId, clientId = null },
  connection = null
) => {
  let conn = connection,
    release = false;
  try {
    if (!conn) {
      conn = await getConnection();
      release = true;
    }

    const values = [bloId];
    let extraJoin = "";
    let extraWhere = "";
    if (clientId) {
      extraJoin =
        " JOIN tbl_local_cliente lc ON lc.loc_id = l.loc_id AND lc.lcl_estado='activo' ";
      extraWhere = " AND lc.usu_id = ? ";
      values.push(clientId);
    }

    const [rows] = await conn.query(
      `
      SELECT DISTINCT
        l.loc_id        AS etaId,        -- compat UI
        l.loc_codigo    AS codigo,
        l.loc_nombre    AS nombre,
        l.loc_descripcion AS descripcion
      FROM tbl_locales l
      ${extraJoin}
      WHERE l.blo_id = ? AND l.eta_eliminado = 0 AND l.eta_estado='activo'
      ${extraWhere}
      ORDER BY l.loc_nombre ASC
      `,
      values
    );
    return rows;
  } finally {
    if (release) releaseConnection(conn);
  }
};

/* ============================
   UPSERT Bloque y Local (solo Bloques/Locales)
   ============================ */

/**
 * Crea/actualiza un BLOQUE buscando por:
 *  - Primero: blo_codigo (si viene)
 *  - Si no hay código o no existe: por UPPER(TRIM(blo_nombre))
 *
 * Retorna: { action: 'insert'|'update'|'none', bloId }
 */
export const upsertBloqueBasic = async (
  {
    codigo = null,
    nombre,            // requerido
    descripcion = null,
    color = null,
    estado = 'activo',
    usuario,           // para auditoría
  },
  connection = null
) => {
  let conn = connection, release = false;
  try {
    if (!conn) { conn = await getConnection(); release = true; }
    await conn.beginTransaction();

    const nombreUpper = (nombre || '').trim().toUpperCase();
    const nowUser = usuario ?? null;

    // 1) Buscar por código si viene
    let bloId = null;
    if (codigo) {
      const [[byCode]] = await conn.query(
        `SELECT blo_id FROM tbl_bloques WHERE blo_codigo=? AND blo_eliminado=0 LIMIT 1`,
        [codigo]
      );
      if (byCode) bloId = byCode.blo_id;
    }

    // 2) Si no existe por código, buscar por nombre (UPPER/TRIM)
    if (!bloId) {
      const [[byName]] = await conn.query(
        `SELECT blo_id 
           FROM tbl_bloques 
          WHERE UPPER(TRIM(blo_nombre))=? AND blo_eliminado=0
          LIMIT 1`,
        [nombreUpper]
      );
      if (byName) bloId = byName.blo_id;
    }

    const payload = {
      blo_codigo: codigo || null,
      blo_nombre: nombreUpper,
      blo_descripcion: descripcion,
      blo_color: color,
      blo_estado: estado || 'activo',
    };

    let action = 'none';

    if (bloId) {
      await conn.query(
        `UPDATE tbl_bloques
            SET ?, blo_usu_act=?, blo_fec_act=CURRENT_TIMESTAMP
          WHERE blo_id=?`,
        [payload, nowUser, bloId]
      );
      action = 'update';
    } else {
      payload.blo_usu_reg = nowUser;
      payload.blo_fec_reg = new Date();
      payload.blo_fec_act = new Date(); 
      const [ins] = await conn.query(`INSERT INTO tbl_bloques SET ?`, payload);
      bloId = ins.insertId;
      action = 'insert';
    }

    await conn.commit();
    return { action, bloId };
  } catch (err) {
    if (conn) await conn.rollback();
    throw err;
  } finally {
    if (release) releaseConnection(conn);
  }
};

/**
 * Crea/actualiza un LOCAL dentro de un bloque (pro_id) buscando por:
 *  - Primero: (pro_id, loc_codigo) si viene
 *  - Si no hay código o no existe: (pro_id, UPPER(TRIM(loc_nombre)))
 *
 * Retorna: { action: 'insert'|'update'|'none', locId }
 */
export const upsertLocalBasic = async (
  {
    proId,               // requerido (bloque destino)
    codigo = null,       // loc_codigo
    nombre,              // requerido
    descripcion = null,
    estado = 'activo',
    usuario,             // auditoría
  },
  connection = null
) => {
  let conn = connection, release = false;
  try {
    if (!conn) { conn = await getConnection(); release = true; }
    await conn.beginTransaction();

    if (!proId) throw new Error('proId (bloque) es requerido para crear/actualizar un local');
    const nombreTrim = (nombre || '').toString().trim();
    const nombreUpper = nombreTrim.toUpperCase();

    // 1) Buscar por (pro_id, loc_codigo) si viene
    let locId = null;
    if (codigo) {
      const [[byCode]] = await conn.query(
        `SELECT loc_id ssds
           FROM tbl_locales 
          WHERE blo_id=? AND loc_codigo=? AND eta_eliminado=0
          LIMIT 1`,
        [proId, codigo]
      );
      if (byCode) locId = byCode.loc_id;
    }

    // 2) Si no existe por código, buscar por (pro_id, UPPER(TRIM(loc_nombre)))
    if (!locId) {
      const [[byName]] = await conn.query(
        `SELECT loc_id 
           FROM tbl_locales 
          WHERE blo_id=? AND UPPER(TRIM(loc_nombre))=? AND eta_eliminado=0
          LIMIT 1`,
        [proId, nombreUpper]
      );
      if (byName) locId = byName.loc_id;
    }

    const payload = {
      blo_id: proId,
      loc_codigo: codigo || null,
      loc_nombre: nombreTrim,
      loc_descripcion: descripcion,
      eta_estado: estado || 'activo',
      eta_eliminado: 0,
    };

    let action = 'none';

    if (locId) {
      await conn.query(
        `UPDATE tbl_locales
            SET ?, eta_usu_act=?, eta_fec_act=CURRENT_TIMESTAMP
          WHERE loc_id=?`,
        [payload, usuario ?? null, locId]
      );
      action = 'update';
    } else {
      const [ins] = await conn.query(
        `INSERT INTO tbl_locales
           (blo_id, loc_codigo, loc_nombre, loc_descripcion, eta_estado, eta_eliminado, loc_usu_reg, eta_fec_reg, eta_fec_act)
         VALUES (?, ?, ?, ?, ?, 0, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        [proId, codigo || null, nombreTrim, descripcion, estado || 'activo', usuario ?? null]
      );
      locId = ins.insertId;
      action = 'insert';
    }

    await conn.commit();
    return { action, locId };
  } catch (err) {
    if (conn) await conn.rollback();
    throw err;
  } finally {
    if (release) releaseConnection(conn);
  }
};

/* ============================
   IMPORTACIÓN UNIFICADA Bloque + Local + Propietarios (Clientes)
   ============================ */

/* ========== Upserts de CLIENTE y relación LOCAL–CLIENTE ========== */

/** Crea/actualiza CLIENTE (tbl_usuarios, prf_id=3) por documento o correo */
async function upsertClienteBasic(conn, {
  nombre = null,
  documento = null,
  correo = null,
  telefono = null,
  direccion = null,
  usuarioId = null,
  usuarioNombre = null,
}) {
  let row = null;

  //Validacion por documento
  if (documento) {
    const [[r1]] = await conn.query(
      `SELECT usu_id FROM tbl_usuarios WHERE usu_documento = ? AND est_id != 3 LIMIT 1`,
      [documento.trim()]
    );
    if (r1) row = r1;
  }

  //Validacion por correo 
  if (!row && correo) {
    const [[r2]] = await conn.query(
      `SELECT usu_id FROM tbl_usuarios WHERE usu_correo = ? AND est_id != 3 LIMIT 1`,
      [correo.trim()]
    );
    if (r2) row = r2;
  }

   // 3) nombre completo normalizado (solo si aún no hay match)
  if (!row && nombre) {
    const nombreNorm = normalizePersonName(nombre);

    // Igualamos contra nombre+apellido (por si algunos registros viejos los separan)
    // Nota: utf8mb4_general_ci ya es case/acentos-insensitive, pero normalizamos por si acaso
    const [[r3]] = await conn.query(
      `
      SELECT u.usu_id
      FROM tbl_usuarios u
      WHERE u.est_id <> 3
        AND REPLACE(
              REPLACE(
                UPPER(TRIM(CONCAT_WS(' ', u.usu_nombre, u.usu_apellido))),
              '.', ''), ',', ''
            ) = ?
      LIMIT 1
      `,
      [nombreNorm]  // ya viene UPPER y sin tildes/.,,
    );
    if (r3) row = r3;
  }

  const payload = {
    usu_nombre: nombre || null,
    usu_documento: toNullIfEmpty(documento),
    usu_correo: toNullIfEmpty(correo),
    usu_telefono: toNullIfEmpty(telefono),
    usu_direccion: toNullIfEmpty(direccion),
    prf_id: 3,      // cliente
    est_id: 1,      // activo
    usu_acceso: 0,  // sin acceso por defecto
  };

  if (row) {
    await conn.query(
      `UPDATE tbl_usuarios 
         SET ?, usu_usu_act=?, usu_fec_act=CURRENT_TIMESTAMP
       WHERE usu_id=?`,
      [payload, usuarioAuditoria ?? null, row.usu_id]
    );
    return { action: 'update', usuId: row.usu_id };
  } else {
   payload.usu_reg    = usuarioId ?? null;        // ← FK creador (INT)
    payload.usu_fec_reg = new Date();
    payload.usu_usu_act = usuarioNombre ?? null;   // ← nombre actor (VARCHAR)
   payload.usu_fec_act = new Date();    
    const [ins] = await conn.query(`INSERT INTO tbl_usuarios SET ?`, payload);
    return { action: 'insert', usuId: ins.insertId };
  }
}

/** Inserta/activa relación local–cliente (requiere UNIQUE (loc_id, usu_id)) */
async function upsertLocalCliente(conn, { locId, usuId, principal = 0, usuarioAuditoria = null, orden = null }) {
  await conn.query(
    `INSERT INTO tbl_local_cliente (loc_id, usu_id, lcl_estado, lcl_principal, lcl_usu_reg, lcl_orden)
     VALUES (?, ?, 'activo', ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       lcl_estado='activo',
       lcl_orden=VALUES(lcl_orden),
       lcl_usu_act=VALUES(lcl_usu_reg),
       lcl_fec_act=CURRENT_TIMESTAMP`,
    [locId, usuId, principal ? 1 : 0, usuarioAuditoria ?? null, orden]
  );
}

async function clearPrincipalForLocal(conn, { locId, usuarioAuditoria = null }) {
  await conn.query(
    `UPDATE tbl_local_cliente
       SET lcl_principal=0, lcl_usu_act=?, lcl_fec_act=CURRENT_TIMESTAMP
     WHERE loc_id=? AND lcl_principal=1`,
    [usuarioAuditoria ?? null, locId]
  );
}

async function setPrincipalForLocal(conn, { locId, usuId, usuarioAuditoria = null }) {
  await conn.query(
    `UPDATE tbl_local_cliente
       SET lcl_principal=1, lcl_usu_act=?, lcl_fec_act=CURRENT_TIMESTAMP
     WHERE loc_id=? AND usu_id=?`,
    [usuarioAuditoria ?? null, locId, usuId]
  );
}

/** Desactiva propietarios que NO llegaron en esta importación */
async function deactivateMissingLocalOwners(conn, { locId, keepUserIds = [], usuarioAuditoria = null }) {
  const list = (keepUserIds || []).map(Number).filter(Boolean);
  if (list.length) {
    await conn.query(
      `UPDATE tbl_local_cliente
         SET lcl_estado='inactivo', lcl_principal=0, lcl_orden=NULL, lcl_usu_act=?, lcl_fec_act=CURRENT_TIMESTAMP
       WHERE loc_id=? AND lcl_estado<>'inactivo' AND usu_id NOT IN (${list.map(() => '?').join(',')})`,
      [usuarioAuditoria ?? null, locId, ...list]
    );
  } else {
    await conn.query(
      `UPDATE tbl_local_cliente
         SET lcl_estado='inactivo', lcl_principal=0, lcl_orden=NULL, lcl_usu_act=?, lcl_fec_act=CURRENT_TIMESTAMP
       WHERE loc_id=? AND lcl_estado<>'inactivo'`,
      [usuarioAuditoria ?? null, locId]
    );
  }
}

/* ========== Flujo principal unificado ========== */
/**
 * rows: [{ bloCodigo?, bloNombre*, locCodigo?, locNombre*, descripcion?, owners?: [{nombre, documento?, correo?, telefono?, direccion?}, ...] }]
 */
export const importAllPropertiesAndOwners = async ({ rows = [], usuario = null }, connection = null) => {
  if (!Array.isArray(rows) || rows.length === 0) {
    throw new Error("El payload no contiene filas para importar.");
  }

  let conn = connection, release = false;
  const summary = {
    procesados: 0,
    bloques_creados: 0,
    bloques_actualizados: 0,
    locales_creados: 0,
    locales_actualizados: 0,
    owners_upsert: 0,
    owners_inactivos: 0,
    errores: [],
    saltados: 0,
  };

  try {
    if (!conn) { conn = await getConnection(); release = true; }

    for (let i = 0; i < rows.length; i++) {
      summary.procesados++;
      const iFila = i + 2;

      const raw = rows[i] || {};
      // Si ya viene normalizado, úsalo; si no, normaliza aquí
      const src = (raw.bloNombre && raw.locNombre) ? raw : normalizeAllRow(raw);

      const bloNombre = (src.bloNombre || '').trim();
      const locNombre = (src.locNombre || '').trim();
      if (!bloNombre || !locNombre) {
        summary.saltados++;
        summary.errores.push({ fila: iFila, error: "Faltan campos obligatorios (Bloque/Local)." });
        continue;
      }

      try {
        await conn.beginTransaction();

        // 1) Bloque
        const rBlo = await upsertBloqueBasic({
          codigo: src.bloCodigo || null,
          nombre: bloNombre,
          descripcion: src.descripcion || null,
          estado: 'activo',
          usuario,
        }, conn);
        const bloId = rBlo?.bloId;
        if (!bloId) throw new Error("No se pudo crear/actualizar el bloque");
        if (rBlo.action === 'insert') summary.bloques_creados++;
        if (rBlo.action === 'update') summary.bloques_actualizados++;

        // 2) Local
        const rLoc = await upsertLocalBasic({
          proId: bloId,
          codigo: src.locCodigo || null,
          nombre: locNombre,
          descripcion: src.descripcion || null,
          estado: 'activo',
          usuario,
        }, conn);
        const locId = rLoc?.locId;
        if (!locId) throw new Error("No se pudo crear/actualizar el local");
        if (rLoc.action === 'insert') summary.locales_creados++;
        if (rLoc.action === 'update') summary.locales_actualizados++;

        // 3) Propietarios
        const owners = Array.isArray(src.owners) ? src.owners : [];
        const keepIds = [];
        let principalAsignado = false;

        for (let idx = 0; idx < owners.length; idx++) {
          const ow = owners[idx] || {};
          const nombre = ow.nombre || null;
          const documento = ow.documento || null;
          const correo = ow.correo || null;
          const telefono = ow.telefono || null;
         const direccion = toNullIfEmpty(ow.direccion ?? src.descripcion);
          

          // Si no hay nombre y tampoco doc/correo → saltar
          if (!nombre && !documento && !correo) continue;

          const up = await upsertClienteBasic(conn, {
            nombre,
            documento,
            correo,
            telefono,
            direccion,
            usuarioAuditoria: usuario,
          });

          const usuId = up.usuId;
          keepIds.push(usuId);

          await upsertLocalCliente(conn, {
            locId,
            usuId,
            principal: 0,
            usuarioAuditoria: usuario,
            orden: idx + 1,
          });
          summary.owners_upsert++;

          // El primero en la lista queda como principal
          if (!principalAsignado) {
            await clearPrincipalForLocal(conn, { locId, usuarioAuditoria: usuario });
            await setPrincipalForLocal(conn, { locId, usuId, usuarioAuditoria: usuario });
            principalAsignado = true;
          }
        }

        // Desactivar propietarios que no vinieron en esta fila
        await deactivateMissingLocalOwners(conn, { locId, keepUserIds: keepIds, usuarioAuditoria: usuario });
        if (owners.length === 0) summary.owners_inactivos++;

        await conn.commit();
      } catch (eRow) {
        await conn.rollback();
        summary.errores.push({ fila: iFila, error: eRow?.message || String(eRow) });
      }
    }

    return { message: "Importación unificada finalizada", summary };
  } finally {
    if (release) releaseConnection(conn);
  }
};

/* ========== Wrapper Excel para la unificada ========== */
export const importAllPropertiesAndOwnersExcel = async ({ fileObj, usuario = null }) => {
  if (!fileObj) throw new Error("Adjunta el archivo Excel en el campo 'file'.");
  const rawRows = await excelToRows(fileObj);
  // Si vienen crudas, normalizeAllRow se aplicará dentro de importAllPropertiesAndOwners
  return await importAllPropertiesAndOwners({ rows: rawRows, usuario });
};

