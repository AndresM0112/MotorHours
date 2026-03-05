import {
  getConnection,
  releaseConnection,
  executeQuery,
} from "../../../common/configs/db.config.js";
import ExcelJS from "exceljs";

// ======== CRUD BASICO ==========
export const getAll = async ({ connection = null }) => {
  let conn = connection;
  let release = false;

  try {
    if (!conn) {
      conn = await getConnection();
      release = true;
    }

    const [data] = await conn.query(
      `
      SELECT 
        n.nom_id              AS nomId,
        n.nom_codigo          AS codigo,
        n.nom_nombre          AS nomNombre,
        n.nom_anio            AS anio,
        n.nom_mes             AS mes,
        n.nom_fec_reg         AS fechaRegistro,
        n.nom_fec_act         AS fechaActualizacion,
        COALESCE(SUM(nd.nod_valor_debito),0)                         AS totalDebito,
        COALESCE(SUM(nd.nod_valor_credito),0)                        AS totalCredito,
        COALESCE(SUM(nd.nod_valor_debito - nd.nod_valor_credito),0)  AS totalNeto,
        COUNT(nd.nod_id)                                             AS items
      FROM tbl_nomina n
      LEFT JOIN tbl_nomina_detalle nd 
        ON nd.nom_id = n.nom_id
       AND nd.nod_eliminado = 0
      WHERE n.nom_eliminado = 0
      GROUP BY 
        n.nom_id, n.nom_codigo, n.nom_nombre, n.nom_anio, n.nom_mes, 
        n.nom_fec_reg, n.nom_fec_act
      ORDER BY n.nom_anio DESC, n.nom_mes DESC, n.nom_id DESC
      `,
      []
    );

    return data || [];
  } catch (error) {
    throw error;
  } finally {
    if (release && conn) releaseConnection(conn);
  }
};

export const getById = async ({ connection = null, nomId }) => {
  let conn = connection;
  let release = false;

  try {
    if (!conn) {
      conn = await getConnection();
      release = true;
    }

    const [[row]] = await conn.query(
      `
      SELECT 
        n.nom_id      AS nomId,
        n.nom_codigo  AS codigo,
        n.nom_nombre  AS nomNombre,
        n.nom_anio    AS anio,
        n.nom_mes     AS mes,
        n.nom_usu_reg AS usuarioRegistro,
        n.nom_fec_reg AS fechaRegistro,
        n.nom_usu_act AS usuarioActualiza,
        n.nom_fec_act AS fechaActualizacion,

        -- Totales calculados solo con detalles NO eliminados
        (SELECT COALESCE(SUM(nd2.nod_valor_debito),0)
           FROM tbl_nomina_detalle nd2
          WHERE nd2.nom_id = n.nom_id AND nd2.nod_eliminado = 0) AS totalDebito,
        (SELECT COALESCE(SUM(nd3.nod_valor_credito),0)
           FROM tbl_nomina_detalle nd3
          WHERE nd3.nom_id = n.nom_id AND nd3.nod_eliminado = 0) AS totalCredito,
        (SELECT COALESCE(SUM(nd4.nod_valor_debito - nd4.nod_valor_credito),0)
           FROM tbl_nomina_detalle nd4
          WHERE nd4.nom_id = n.nom_id AND nd4.nod_eliminado = 0) AS totalNeto,
        (SELECT COUNT(*)
           FROM tbl_nomina_detalle nd5
          WHERE nd5.nom_id = n.nom_id AND nd5.nod_eliminado = 0) AS items,

        -- Detalles como JSON
        (
          SELECT JSON_ARRAYAGG(
                   JSON_OBJECT(
                     'nodId', nd.nod_id,
                     'prdId', nd.prd_id,
                     'fecInicio', p.prd_fec_inicio,
                     'fecFin', p.prd_fec_fin,
                     'tipoPeriodo', tp.tpp_nombre,
                     'tdnId', nd.tdn_id,
                     'tipoDocumento', tdn.tdn_nombre,
                     'conId', nd.con_id,
                     'concepto', cn.con_nombre,
                     'pccId', nd.pcc_id,
                     'planCuenta', pcc.pcc_nombre,
                     'ccoId', nd.cco_id,
                     'centroCosto', cco.cco_nombre,
                     'usuId', nd.usu_id,
                     'puc', nd.nod_puc,
                     'cuentaContable', nd.nod_cuenta_contable,
                     'tipoTercero', nd.nod_tipo_tercero,
                     'tercero', nd.nod_tercero,
                     'valorDebito', nd.nod_valor_debito,
                     'valorCredito', nd.nod_valor_credito,
                     'baseImpuesto', nd.nod_base_impuesto
                   )
                   ORDER BY nd.nod_id
                 )
          FROM tbl_nomina_detalle nd
          LEFT JOIN tbl_periodo p            ON p.prd_id  = nd.prd_id
          LEFT JOIN tbl_tipo_periodo tp      ON tp.tpp_id = p.tpp_id
          LEFT JOIN tbl_tipo_documento_nomina tdn ON tdn.tdn_id = nd.tdn_id
          LEFT JOIN tbl_concepto_nomina cn   ON cn.con_id  = nd.con_id
          LEFT JOIN tbl_plan_cuenta_contable pcc ON pcc.pcc_id = nd.pcc_id
          LEFT JOIN tbl_centro_costos cco    ON cco.cco_id = nd.cco_id
          WHERE nd.nom_id = n.nom_id AND nd.nod_eliminado = 0
        ) AS detallesJson,

        -- Históricos como JSON
        (
          SELECT JSON_ARRAYAGG(
                   JSON_OBJECT(
                     'nohId', noh.noh_id,
                     'accion', noh.noh_accion,
                     'estadoAnterior', noh.noh_estado_anterior,
                     'estadoNuevo', noh.noh_estado_nuevo,
                     'motivoId', noh.mot_id,
                     'comentario', noh.noh_comentario,
                     'fecha', noh.noh_fecha,
                     'usuarioId', noh.usu_id,
                     'usuario', CONCAT(COALESCE(u.usu_nombre,''),' ',COALESCE(u.usu_apellido,''))
                   )
                   ORDER BY noh.noh_fecha DESC
                 )
          FROM tbl_nomina_historico noh
          LEFT JOIN tbl_usuarios u ON u.usu_id = noh.usu_id
          WHERE noh.nom_id = n.nom_id
        ) AS historicosJson

      FROM tbl_nomina n
      WHERE n.nom_id = ? AND n.nom_eliminado = 0
      LIMIT 1
      `,
      [nomId]
    );

    if (!row) return null;

    // Parsear JSONs (mysql2 devuelve strings)
    const detalles = row.detallesJson ? JSON.parse(row.detallesJson) : [];
    const historicos = row.historicosJson ? JSON.parse(row.historicosJson) : [];

    delete row.detallesJson;
    delete row.historicosJson;

    return {
      ...row,
      detalles,
      historicos,
    };
  } catch (error) {
    throw error;
  } finally {
    if (release && conn) releaseConnection(conn);
  }
};

export const paginated = async ({ connection = null, params = {} }) => {
  let conn = connection;
  let release = false;

  try {
    if (!conn) {
      conn = await getConnection();
      release = true;
    }

    const {
      search = "",
      anio = null,
      mes = null,
      rows = 10,
      first = 0,
      sortField = "nomNombre",
      sortOrder = 1,
    } = params;

    const order = sortOrder === 1 ? "ASC" : "DESC";

    const sortMap = {
      nomId: "n.nom_id",
      codigo: "n.nom_codigo",
      nomNombre: "n.nom_nombre",
      anio: "n.nom_anio",
      mes: "n.nom_mes",
      fechaRegistro: "n.nom_fec_reg",
      fechaActualizacion: "n.nom_fec_act",
      totalDebito: "totalDebito",
      totalCredito: "totalCredito",
      totalNeto: "totalNeto",
      items: "items",
    };

    const sortColumn = sortMap[sortField] || "n.nom_fec_reg";

    const filters = [`n.nom_eliminado = 0`];
    const values = [];

    if (search) {
      filters.push(`(n.nom_codigo LIKE ? OR n.nom_nombre LIKE ?)`);
      values.push(`%${search}%`, `%${search}%`);
    }
    if (anio) {
      filters.push(`n.nom_anio = ?`);
      values.push(anio);
    }
    if (mes) {
      filters.push(`n.nom_mes = ?`);
      values.push(mes);
    }

    const where = filters.length ? `WHERE ${filters.join(" AND ")}` : "";

    const [data] = await conn.query(
      `
      SELECT 
        n.nom_id      AS nomId,
        n.nom_codigo  AS codigo,
        n.nom_nombre  AS nomNombre,
        n.nom_anio    AS anio,
        n.nom_mes     AS mes,
        n.nom_fec_reg AS fechaRegistro,
        n.nom_fec_act AS fechaActualizacion,
        COALESCE(SUM(nd.nod_valor_debito),0)                         AS totalDebito,
        COALESCE(SUM(nd.nod_valor_credito),0)                        AS totalCredito,
        COALESCE(SUM(nd.nod_valor_debito - nd.nod_valor_credito),0)  AS totalNeto,
        COUNT(nd.nod_id)                                             AS items
      FROM tbl_nomina n
      LEFT JOIN tbl_nomina_detalle nd 
        ON nd.nom_id = n.nom_id
       AND nd.nod_eliminado = 0
      ${where}
      GROUP BY 
        n.nom_id, n.nom_codigo, n.nom_nombre, n.nom_anio, n.nom_mes, 
        n.nom_fec_reg, n.nom_fec_act
      ORDER BY ${sortColumn} ${order}
      LIMIT ${Number(rows)} OFFSET ${Number(first)}
      `,
      [...values]
    );

    const [[count]] = await conn.query(
      `
      SELECT COUNT(*) AS total
      FROM tbl_nomina n
      ${where}
      `,
      [...values]
    );

    return {
      results: data,
      total: count?.total || 0,
    };
  } catch (error) {
    throw error;
  } finally {
    if (release && conn) releaseConnection(conn);
  }
};

export const save = async ({ connection = null, data }) => {
  let conn = connection;
  let release = false;

  const { nomId = 0, codigo = null, nomNombre, anio, mes, usuario } = data;

  try {
    if (!conn) {
      conn = await getConnection();
      release = true;
    }

    await conn.beginTransaction();

    // Validar unicidad de nom_codigo si viene definido (ignorando eliminadas)
    if (codigo) {
      const [exists] = await conn.query(
        `
        SELECT nom_id 
        FROM tbl_nomina 
        WHERE nom_codigo = ? 
          AND nom_eliminado = 0
          ${nomId > 0 ? "AND nom_id <> ?" : ""} 
        LIMIT 1
        `,
        nomId > 0 ? [codigo, nomId] : [codigo]
      );
      if (exists.length > 0) {
        throw new Error("El código de nómina ya existe.");
      }
    }

    if (nomId > 0) {
      await conn.query(
        `
        UPDATE tbl_nomina
        SET 
          nom_codigo  = ?,
          nom_nombre  = ?,
          nom_anio    = ?,
          nom_mes     = ?,
          nom_usu_act = ?
        WHERE nom_id = ? AND nom_eliminado = 0
        `,
        [codigo || null, nomNombre, anio, mes, usuario, nomId]
      );

      await conn.commit();
      return { message: "Nómina actualizada correctamente", nomId };
    } else {
      const [ins] = await conn.query(
        `
        INSERT INTO tbl_nomina
          (nom_codigo, nom_nombre, nom_anio, nom_mes, nom_usu_reg, nom_eliminado)
        VALUES (?,?,?,?,?, 0)
        `,
        [codigo || null, nomNombre, anio, mes, usuario]
      );

      await conn.commit();
      return { message: "Nómina creada correctamente", nomId: ins.insertId };
    }
  } catch (error) {
    if (conn) await conn.rollback();
    throw error;
  } finally {
    if (release && conn) releaseConnection(conn);
  }
};

export const remove = async ({ connection = null, nomIds, usuario }) => {
  let conn = connection;
  let release = false;

  try {
    if (!conn) {
      conn = await getConnection();
      release = true;
    }

    const ids = Array.isArray(nomIds) ? nomIds : [nomIds];
    if (!ids.length) return;

    const placeholders = ids.map(() => "?").join(",");

    await conn.beginTransaction();

    // Histórico (acción '5' = eliminar)
    const histValues = [];
    ids.forEach((id) => histValues.push(id, usuario));
    await conn.query(
      `
      ${ids
        .map(
          () => `INSERT INTO tbl_nomina_historico
                  (nom_id, usu_id, noh_accion, noh_estado_anterior, noh_estado_nuevo, noh_comentario)
                 VALUES (?, ?, '5', 'vigente', 'eliminada', 'Soft delete de nómina');`
        )
        .join("\n")}
      `,
      histValues
    );

    // Marcar detalles como eliminados
    await conn.query(
      `
      UPDATE tbl_nomina_detalle
      SET nod_eliminado = 1,
          nod_usu_act   = ?,
          nod_fec_act   = CURRENT_TIMESTAMP
      WHERE nom_id IN (${placeholders}) AND nod_eliminado = 0
      `,
      [usuario, ...ids]
    );

    // Marcar header como eliminado
    await conn.query(
      `
      UPDATE tbl_nomina
      SET nom_eliminado = 1,
          nom_usu_act   = ?,
          nom_fec_act   = CURRENT_TIMESTAMP
      WHERE nom_id IN (${placeholders}) AND nom_eliminado = 0
      `,
      [usuario, ...ids]
    );

    await conn.commit();
  } catch (error) {
    if (conn) await conn.rollback();
    throw error;
  } finally {
    if (release && conn) releaseConnection(conn);
  }
};

// ======== PROCESOS ==========

//
// ==== HELPERS DE DIMENSIONES / MAESTROS ===
//
/* ===================== Helpers base ===================== */
const clean = (s) =>
  (s ?? "")
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();

const pick = (row, ...keys) => {
  for (const k of keys)
    if (row[k] !== undefined && row[k] !== null) return row[k];
  return null;
};

function splitNombreCompleto(full) {
  const p = (full || "").trim().split(/\s+/);
  if (p.length === 0) return { nombres: null, apellidos: null };
  if (p.length === 1) return { nombres: p[0], apellidos: null };
  const apellidos = p.slice(-2).join(" ");
  const nombres = p.slice(0, -2).join(" ");
  return { nombres, apellidos };
}

function parseExcelDate(d) {
  if (!d && d !== 0) return null;
  if (typeof d === "number") {
    const ms = Math.round((d - 25569) * 86400 * 1000);
    const dt = new Date(ms);
    const yyyy = dt.getUTCFullYear();
    const mm = String(dt.getUTCMonth() + 1).padStart(2, "0");
    const dd = String(dt.getUTCDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return null;
  const yyyy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const dd = String(dt.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function toNumber(n) {
  if (n === null || n === undefined || n === "") return 0;
  const x = Number(String(n).replace(/[, ]+/g, ""));
  return isNaN(x) ? 0 : x;
}

function samePersonByNitOrName({
  empleadoNombre,
  empleadoDoc,
  terceroNombre,
  terceroNit,
}) {
  if (!terceroNombre && !terceroNit) return true;
  const c = (s) => (s || "").toString().trim().toUpperCase();
  if (
    terceroNit &&
    empleadoDoc &&
    String(terceroNit).trim() === String(empleadoDoc).trim()
  )
    return true;
  if (
    c(terceroNombre) &&
    c(empleadoNombre) &&
    c(terceroNombre) === c(empleadoNombre)
  )
    return true;
  return false;
}

/* ===================== Cache/touched ===================== */
const caches = () => ({
  // de empleados:
  gerencias: new Map(),
  cargos: new Map(),
  centros: new Map(),
  // de nómina:
  sedes: new Map(),
  tipoPeriodos: new Map(),
  periodos: new Map(),
  tipoDocNomina: new Map(),
  planCuentas: new Map(),
  conceptos: new Map(),
  nominas: new Map(),
  // reuso
  proyectos: new Map(),
  aseguradoras: new Map(),
  tipoAseguradoras: new Map(),
});

const touchedSet = () => ({
  gerencias: new Set(),
  cargos: new Set(),
  centros: new Set(),
  sedes: new Set(),
  tipoPeriodos: new Set(),
  periodos: new Set(),
  tipoDocNomina: new Set(),
  planCuentas: new Set(),
  conceptos: new Set(),
  nominas: new Set(),
  proyectos: new Set(),
  aseguradoras: new Set(),
  tipoAseguradoras: new Set(),
});

function dropTouched(cache, touched) {
  for (const k of touched.gerencias) cache.gerencias.delete(k);
  for (const k of touched.cargos) cache.cargos.delete(k);
  for (const k of touched.centros) cache.centros.delete(k);
  for (const k of touched.sedes) cache.sedes.delete(k);
  for (const k of touched.tipoPeriodos) cache.tipoPeriodos.delete(k);
  for (const k of touched.periodos) cache.periodos.delete(k);
  for (const k of touched.tipoDocNomina) cache.tipoDocNomina.delete(k);
  for (const k of touched.planCuentas) cache.planCuentas.delete(k);
  for (const k of touched.conceptos) cache.conceptos.delete(k);
  for (const k of touched.nominas) cache.nominas.delete(k);
  for (const k of touched.proyectos) cache.proyectos.delete(k);
  for (const k of touched.aseguradoras) cache.aseguradoras.delete(k);
  for (const k of touched.tipoAseguradoras) cache.tipoAseguradoras.delete(k);
}

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

/* ===================== getOrCreate / upserts ===================== */
function guessTipoAseguradora(nombre) {
  const s = clean(nombre || "");
  if (!s) return "OTRA";
  if (/\bEPS\b|SALUD|E\.P\.S/.test(s)) return "EPS";
  if (/\bARL\b|RIESGOS/.test(s) || /ARL SURA|RIESGOS LABORALES/.test(s))
    return "ARL";
  if (
    /PENSION|AFP|COLPENSIONES|PROTECCION|PORVENIR|COLFONDOS|OLD\s*MUTUAL/.test(
      s
    )
  )
    return "AFP";
  if (/CAJA|COMPENSACION|COMFAMA|COMFENALCO|CAFAM|COLSUBSIDIO/.test(s))
    return "CAJA";
  if (/CESANT/i.test(s) || /\bFNA\b/.test(s)) return "CESANTIAS";
  return "OTRA";
}

async function getOrCreateTipoAseguradora(
  connection,
  tipoNombre,
  cache,
  touched,
  usu_reg
) {
  const key = clean(tipoNombre || "OTRA");
  if (!key) return null;

  const c = cache.tipoAseguradoras.get(key);
  if (c) return c.id;

  let [row] = await executeQuery(
    "SELECT tia_id AS id, tia_nombre AS nombre FROM tbl_tipo_aseguradora WHERE UPPER(TRIM(tia_nombre))=? LIMIT 1",
    [key],
    connection
  );
  if (!row) {
    const ins = await executeQuery(
      "INSERT INTO tbl_tipo_aseguradora (tia_nombre, est_id, tia_usu_reg) VALUES (?, 1, ?)",
      [tipoNombre || "OTRA", usu_reg],
      connection
    );
    row = { id: ins.insertId, nombre: tipoNombre || "OTRA" };
    touched?.tipoAseguradoras.add(key);
  }
  cache.tipoAseguradoras.set(key, row);
  return row.id;
}

async function getOrCreateAseguradora(
  connection,
  { nombre, nit, usu_reg },
  cache,
  touched
) {
  const nitKey = (nit || "").toString().trim();

  const nameKey = clean(nombre);
  if (!nitKey && !nameKey) return null;

  // cache por nit (preferente) o por nombre
  const cacheKey = nitKey || nameKey;
  const c = cache.aseguradoras.get(cacheKey);
  if (c) return c.id;

  // 1) busca por NIT
  let [row] = nitKey
    ? await executeQuery(
        "SELECT ase_id AS id, ase_nombre AS nombre, ase_nit AS nit, tia_id FROM tbl_aseguradora WHERE ase_nit=? LIMIT 1",
        [nitKey],
        connection
      )
    : [null];

  // 2) si no está por NIT, intenta por nombre
  if (!row && nameKey) {
    [row] = await executeQuery(
      "SELECT ase_id AS id, ase_nombre AS nombre, ase_nit AS nit, tia_id FROM tbl_aseguradora WHERE UPPER(TRIM(ase_nombre))=? LIMIT 1",
      [nameKey],
      connection
    );
  }

  // 3) si existe, quizá completar tipo si viene vacío
  if (row) {
    if (!row.tia_id) {
      const tipo = guessTipoAseguradora(row.nombre);
      const tia_id = await getOrCreateTipoAseguradora(
        connection,
        tipo,
        cache,
        touched,
        usu_reg
      );
      await executeQuery(
        "UPDATE tbl_aseguradora SET tia_id=? WHERE ase_id=?",
        [tia_id, row.id],
        connection
      );
      row.tia_id = tia_id;
    }
    cache.aseguradoras.set(cacheKey, row);
    return row.id;
  }

  // 4) crear: inferir tipo por nombre
  const tipo = guessTipoAseguradora(nombre || "");
  const tia_id = await getOrCreateTipoAseguradora(
    connection,
    tipo,
    cache,
    touched,
    usu_reg
  );

  const ins = await executeQuery(
    "INSERT INTO tbl_aseguradora (ase_nombre, ase_nit, tia_id, est_id, ase_usu_reg) VALUES (?,?,?,?,?)",
    [
      nombre || nitKey || "ASEGURADORA SIN NOMBRE",
      nitKey || null,
      tia_id || null,
      1,
      usu_reg,
    ],
    connection
  );
  const id = ins.insertId;
  cache.aseguradoras.set(cacheKey, { id, nombre, nit: nitKey || null, tia_id });
  touched?.aseguradoras.add(cacheKey);
  return id;
}

async function getOrCreateGerencia(connection, nombre, cache, touched) {
  const key = clean(nombre);
  if (!key) return null;
  const c = cache.gerencias.get(key);
  if (c) return c.id;
  const [row] = await executeQuery(
    "SELECT ger_id AS id, ger_nombre AS nombre FROM tbl_gerencia WHERE UPPER(TRIM(ger_nombre)) = ? LIMIT 1",
    [key],
    connection
  );
  if (row) {
    cache.gerencias.set(key, row);
    return row.id;
  }
  const ins = await executeQuery(
    "INSERT INTO tbl_gerencia (ger_nombre, est_id) VALUES (?, 1)",
    [nombre.trim()],
    connection
  );
  const id = ins.insertId;
  cache.gerencias.set(key, { id, nombre });
  touched?.gerencias.add(key);
  return id;
}

async function getOrCreateCargo(connection, nombre, ger_id, cache, touched) {
  const key = clean(nombre);
  if (!key) return null;
  const cached = cache.cargos.get(key);
  if (cached) {
    if (ger_id && cached.ger_id !== ger_id) {
      await executeQuery(
        "UPDATE tbl_cargos SET ger_id=? WHERE car_id=?",
        [ger_id, cached.id],
        connection
      );
      cached.ger_id = ger_id;
    }
    return cached.id;
  }
  const [row] = await executeQuery(
    "SELECT car_id AS id, car_nombre AS nombre, ger_id FROM tbl_cargos WHERE UPPER(TRIM(car_nombre)) = ? LIMIT 1",
    [key],
    connection
  );
  if (row) {
    if (ger_id && row.ger_id !== ger_id) {
      await executeQuery(
        "UPDATE tbl_cargos SET ger_id=? WHERE car_id=?",
        [ger_id, row.id],
        connection
      );
      row.ger_id = ger_id;
    }
    cache.cargos.set(key, row);
    return row.id;
  }
  const ins = await executeQuery(
    "INSERT INTO tbl_cargos (car_nombre, ger_id, est_id) VALUES (?, ?, 1)",
    [nombre.trim(), ger_id || null],
    connection
  );
  const id = ins.insertId;
  cache.cargos.set(key, { id, nombre, ger_id });
  touched?.cargos.add(key);
  return id;
}

async function getOrCreateCentroCosto(
  connection,
  codigo,
  nombre,
  ger_id,
  cache,
  touched
) {
  const codeKey = clean(codigo) || null;
  if (!codeKey && !nombre) return null;

  if (codeKey) {
    const c = cache.centros.get(codeKey);
    if (c) {
      if (nombre && clean(c.nombre) !== clean(nombre)) {
        await executeQuery(
          "UPDATE tbl_centro_costos SET cco_nombre=? WHERE cco_id=?",
          [nombre.trim(), c.id],
          connection
        );
        c.nombre = nombre;
      }
      if (ger_id && c.ger_id !== ger_id) {
        await executeQuery(
          "UPDATE tbl_centro_costos SET ger_id=? WHERE cco_id=?",
          [ger_id, c.id],
          connection
        );
        c.ger_id = ger_id;
      }
      return c.id;
    }
  }

  let row = null;
  if (codeKey) {
    [row] = await executeQuery(
      "SELECT cco_id AS id, cco_codigo AS codigo, cco_nombre AS nombre, ger_id FROM tbl_centro_costos WHERE UPPER(TRIM(cco_codigo)) = ? LIMIT 1",
      [codeKey],
      connection
    );
  }
  if (!row && nombre) {
    [row] = await executeQuery(
      "SELECT cco_id AS id, cco_codigo AS codigo, cco_nombre AS nombre, ger_id FROM tbl_centro_costos WHERE UPPER(TRIM(cco_nombre)) = ? LIMIT 1",
      [clean(nombre)],
      connection
    );
  }

  if (row) {
    if (nombre && clean(row.nombre) !== clean(nombre)) {
      await executeQuery(
        "UPDATE tbl_centro_costos SET cco_nombre=? WHERE cco_id=?",
        [nombre.trim(), row.id],
        connection
      );
      row.nombre = nombre;
    }
    if (ger_id && row.ger_id !== ger_id) {
      await executeQuery(
        "UPDATE tbl_centro_costos SET ger_id=? WHERE cco_id=?",
        [ger_id, row.id],
        connection
      );
      row.ger_id = ger_id;
    }
    if (codeKey) cache.centros.set(codeKey, row);
    return row.id;
  }

  const ins = await executeQuery(
    "INSERT INTO tbl_centro_costos (cco_codigo, cco_nombre, ger_id, est_id) VALUES (?, ?, ?, 1)",
    [codigo || null, nombre || null, ger_id || null],
    connection
  );
  const id = ins.insertId;
  const obj = { id, codigo, nombre, ger_id };
  if (codeKey) cache.centros.set(codeKey, obj);
  touched?.centros.add(codeKey || clean(nombre));
  return id;
}

// Nómina:
async function getOrCreateSede(connection, nombre, cache, touched) {
  const key = clean(nombre);
  if (!key) return null;
  const c = cache.sedes.get(key);
  if (c) return c.id;

  const [row] = await executeQuery(
    "SELECT sed_id AS id, sed_nombre AS nombre FROM tbl_sede WHERE UPPER(TRIM(sed_nombre)) = ? LIMIT 1",
    [key],
    connection
  );
  if (row) {
    cache.sedes.set(key, row);
    return row.id;
  }
  const ins = await executeQuery(
    "INSERT INTO tbl_sede (sed_nombre) VALUES (?)",
    [nombre.trim()],
    connection
  );
  const id = ins.insertId;
  cache.sedes.set(key, { id, nombre });
  touched?.sedes.add(key);
  return id;
}

async function getOrCreateTipoPeriodo(connection, nombre, cache, touched) {
  const key = clean(nombre);
  if (!key) return null;
  const c = cache.tipoPeriodos.get(key);
  if (c) return c.id;

  const [row] = await executeQuery(
    "SELECT tpp_id AS id, tpp_nombre AS nombre FROM tbl_tipo_periodo WHERE UPPER(TRIM(tpp_nombre)) = ? LIMIT 1",
    [key],
    connection
  );
  if (row) {
    cache.tipoPeriodos.set(key, row);
    return row.id;
  }
  const ins = await executeQuery(
    "INSERT INTO tbl_tipo_periodo (tpp_nombre) VALUES (?)",
    [nombre.trim()],
    connection
  );
  const id = ins.insertId;
  cache.tipoPeriodos.set(key, { id, nombre });
  touched?.tipoPeriodos.add(key);
  return id;
}

async function getOrCreatePeriodo(
  connection,
  { tpp_id, fec_ini, fec_fin },
  cache,
  touched
) {
  if (!tpp_id || !fec_ini || !fec_fin) return null;
  const key = `${tpp_id}|${fec_ini}|${fec_fin}`;
  const c = cache.periodos.get(key);
  if (c) return c.id;

  const [row] = await executeQuery(
    "SELECT prd_id AS id FROM tbl_periodo WHERE tpp_id=? AND prd_fec_inicio=? AND prd_fec_fin=? LIMIT 1",
    [tpp_id, fec_ini, fec_fin],
    connection
  );
  if (row) {
    cache.periodos.set(key, row);
    return row.id;
  }
  const ins = await executeQuery(
    "INSERT INTO tbl_periodo (tpp_id, prd_fec_inicio, prd_fec_fin) VALUES (?,?,?)",
    [tpp_id, fec_ini, fec_fin],
    connection
  );
  const id = ins.insertId;
  cache.periodos.set(key, { id });
  touched?.periodos.add(key);
  return id;
}

async function getOrCreateTipoDocumentoNomina(
  connection,
  nombre,
  cache,
  touched
) {
  const key = clean(nombre);
  if (!key) return null;
  const c = cache.tipoDocNomina.get(key);
  if (c) return c.id;

  const [row] = await executeQuery(
    "SELECT tdn_id AS id FROM tbl_tipo_documento_nomina WHERE UPPER(TRIM(tdn_nombre))=? LIMIT 1",
    [key],
    connection
  );
  if (row) {
    cache.tipoDocNomina.set(key, row);
    return row.id;
  }
  const ins = await executeQuery(
    "INSERT INTO tbl_tipo_documento_nomina (tdn_nombre) VALUES (?)",
    [nombre.trim()],
    connection
  );
  const id = ins.insertId;
  cache.tipoDocNomina.set(key, { id });
  touched?.tipoDocNomina.add(key);
  return id;
}

async function getOrCreatePlanCuentaContable(
  connection,
  nombre,
  cache,
  touched
) {
  const key = clean(nombre);
  if (!key) return null;
  const c = cache.planCuentas.get(key);
  if (c) return c.id;

  const [row] = await executeQuery(
    "SELECT pcc_id AS id FROM tbl_plan_cuenta_contable WHERE UPPER(TRIM(pcc_nombre))=? LIMIT 1",
    [key],
    connection
  );
  if (row) {
    cache.planCuentas.set(key, row);
    return row.id;
  }
  const ins = await executeQuery(
    "INSERT INTO tbl_plan_cuenta_contable (pcc_nombre) VALUES (?)",
    [nombre.trim()],
    connection
  );
  const id = ins.insertId;
  cache.planCuentas.set(key, { id });
  touched?.planCuentas.add(key);
  return id;
}

async function getOrCreateConceptoNomina(connection, nombre, cache, touched) {
  const key = clean(nombre);
  if (!key) return null;
  const c = cache.conceptos.get(key);
  if (c) return c.id;

  const [row] = await executeQuery(
    "SELECT con_id AS id FROM tbl_concepto_nomina WHERE UPPER(TRIM(con_nombre))=? LIMIT 1",
    [key],
    connection
  );
  if (row) {
    cache.conceptos.set(key, row);
    return row.id;
  }
  const ins = await executeQuery(
    "INSERT INTO tbl_concepto_nomina (con_nombre) VALUES (?)",
    [nombre.trim()],
    connection
  );
  const id = ins.insertId;
  cache.conceptos.set(key, { id });
  touched?.conceptos.add(key);
  return id;
}

async function getOrCreateNomina(
  connection,
  { codigo, nombre, anio, mes, usu_reg },
  cache,
  touched
) {
  const codeKey = clean(codigo);
  if (codeKey) {
    const c = cache.nominas.get(codeKey);
    if (c) return c.id;

    const [row] = await executeQuery(
      "SELECT nom_id AS id FROM tbl_nomina WHERE nom_codigo=? LIMIT 1",
      [codigo],
      connection
    );
    if (row) {
      cache.nominas.set(codeKey, row);
      return row.id;
    }
    const ins = await executeQuery(
      "INSERT INTO tbl_nomina (nom_codigo, nom_nombre, nom_anio, nom_mes, nom_usu_reg) VALUES (?,?,?,?,?)",
      [codigo, nombre, anio, mes, usu_reg],
      connection
    );
    const id = ins.insertId;
    cache.nominas.set(codeKey, { id });
    touched?.nominas.add(codeKey);
    return id;
  }

  const [row2] = await executeQuery(
    "SELECT nom_id AS id FROM tbl_nomina WHERE UPPER(TRIM(nom_nombre))=? AND nom_anio=? AND nom_mes=? LIMIT 1",
    [clean(nombre), anio, mes],
    connection
  );
  if (row2) return row2.id;

  const ins2 = await executeQuery(
    "INSERT INTO tbl_nomina (nom_nombre, nom_anio, nom_mes, nom_usu_reg) VALUES (?,?,?,?)",
    [nombre, anio, mes, usu_reg],
    connection
  );
  return ins2.insertId;
}

// Reuso: alta/actualización de usuario
async function upsertUsuario(
  connection,
  { documento, nombres, apellidos, car_id, cco_id, emp_id }
) {
  if (!documento)
    return { action: "skip", usuId: null, reason: "sin_documento" };

  const [u] = await executeQuery(
    "SELECT usu_id FROM tbl_usuarios WHERE usu_documento = ? AND est_id != 3 LIMIT 1",
    [String(documento).trim()],
    connection
  );
  if (u) {
    const sets = ["usu_nombre = ?", "usu_apellido = ?", "prf_id = 14"];
    const params = [nombres || null, apellidos || null];
    if (car_id !== undefined && car_id !== null) {
      sets.push("car_id = ?");
      params.push(car_id);
    }
    if (cco_id !== undefined && cco_id !== null) {
      sets.push("cco_id = ?");
      params.push(cco_id);
    }

    if (emp_id !== undefined && emp_id !== null) {
      sets.push("emp_id = ?");
      params.push(emp_id);
    }

    params.push(u.usu_id);
    await executeQuery(
      `UPDATE tbl_usuarios SET ${sets.join(", ")} WHERE usu_id = ?`,
      params,
      connection
    );
    return { action: "update", usuId: u.usu_id };
  }

  const ins = await executeQuery(
    `INSERT INTO tbl_usuarios
       (tpd_id, usu_documento, usu_nombre, usu_apellido, usu_usuario, prf_id, est_id, usu_acceso, car_id, cco_id, emp_id)
     VALUES (1, ?, ?, ?, ?, 14, 1, 0, ?, ?, ?)`,
    [
      String(documento).trim(),
      nombres || null,
      apellidos || null,
      String(documento).trim(),
      car_id ?? null,
      cco_id ?? null,
      emp_id ?? null,
    ],
    connection
  );
  return { action: "create", usuId: ins.insertId };
}

/* ===================== CONTROLADORES ===================== */
// --- Utilidades internas para logging/errores ---
function isError(e) {
  return e instanceof Error;
}
function rethrow(e, contextMsg) {
  if (isError(e)) {
    // añadimos contexto sin perder stack original
    e.message = contextMsg ? `${contextMsg}: ${e.message}` : e.message;
    throw e;
  }
  throw new Error(contextMsg ? `${contextMsg}: ${String(e)}` : String(e));
}

// -------- helpers presupuesto --------
function normalizeBudgets(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((b, i) => ({
      blo_id: Number(b.projectId) || Number(b.blo_id) || null,
      pre_valor: Number(b.presupuesto) || Number(b.pre_valor) || 0,
      // DECIMAL(5,2) en BD -> redondeamos a 2
      pre_porcentaje:
        Math.round(((Number(b.porcentaje) || 0) + Number.EPSILON) * 100) / 100,
      _idx: i + 1,
    }))
    .filter((b) => Number.isInteger(b.blo_id));
}

async function upsertPresupuesto(
  conn,
  { nom_id, blo_id, pre_valor, pre_porcentaje, usu_reg }
) {
  const rows = await executeQuery(
    `SELECT pre_id FROM tbl_presupuesto WHERE nom_id=? AND blo_id=? LIMIT 1`,
    [nom_id, blo_id],
    conn
  );
  if (rows.length) {
    await executeQuery(
      `UPDATE tbl_presupuesto
         SET pre_valor=?, pre_porcentaje=?, pre_usu_act=?, pre_fec_act=NOW()
       WHERE pre_id=?`,
      [pre_valor, pre_porcentaje, usu_reg, rows[0].pre_id],
      conn
    );
    return { action: "update", pre_id: rows[0].pre_id };
  } else {
    const res = await executeQuery(
      `INSERT INTO tbl_presupuesto
         (nom_id, blo_id, pre_valor, pre_porcentaje, pre_usu_reg, pre_fec_reg)
       VALUES (?,?,?,?,?,NOW())`,
      [nom_id, blo_id, pre_valor, pre_porcentaje, usu_reg],
      conn
    );
    return { action: "create", pre_id: res.insertId };
  }
}

// -------- llave natural para detalle --------
// Nomina + (empleado/periodo/concepto/costos/cuentas) -> compón una llave estable
function buildDetalleKey({
  nom_id,
  usu_id,
  prd_id,
  tdn_id,
  con_id,
  cco_id,
  nod_puc,
  nod_cuenta_contable,
}) {
  return [
    nom_id || 0,
    usu_id || 0,
    prd_id || 0,
    tdn_id || 0,
    con_id || 0,
    cco_id || 0,
    Number(nod_puc) || 0,
    Number(nod_cuenta_contable) || 0,
  ].join("|");
}

/**
 * Importa en BD la información de nómina recibida por filas (`rows`).
 * No persiste archivo, solo datos normalizados.
 *
 * Detección de duplicados sin tabla auxiliar:
 *  - Para cada nómina (nom_id) se calcula una "firma" (hash determinístico) del payload
 *    tanto de DETALLE como de PRESUPUESTO (lista ordenada + JSON.stringify).
 *  - Si la firma del payload === firma en BD ⇒ se considera "idéntica".
 *  - Si difiere ⇒ se aplica la estrategia definida en `onExisting` ("diff" | "replace").
 *
 * Importante:
 *  - Siempre se heredan las relaciones N:N desde el usuario (TIR y Proyectos) para
 *    la nómina tocada, incluso cuando se omite por ser idéntica (ver `autoSkipIfSame`).
 *  - Cada nómina se procesa en su propia transacción.
 *
 * @param {Object} params
 * @param {string|null} params.sheetName
 *        Nombre de la hoja/archivo de origen (solo informativo para bitácora).
 *
 * @param {string} params.scope
 *        Ámbito lógico de la importación (por ejemplo: "filtered", "all", etc.).
 *        No altera la lógica de escritura; se usa para trazabilidad.
 *
 * @param {Array} params.rows
 *        Filas crudas de nómina a importar. Deben contener los campos necesarios
 *        para normalizar maestras, cabeceras y detalle.
 *
 * @param {Array} params.budgets
 *        Lista de presupuesto **normalizada** que se aplicará a **cada nómina tocada**.
 *        Estructura esperada: [{ blo_id:number, pre_valor:number, pre_porcentaje:number }, ...]
 *        - En modo "diff": se hace upsert por blo_id y se eliminan los que ya no vengan.
 *        - En modo "replace": se borra todo el presupuesto de la nómina y se inserta el payload.
 *
 * @param {number} params.usuario
 *        ID del usuario que ejecuta la importación (para auditoría: usu_reg/usu_act).
 *
 * @param {"diff"|"replace"} params.onExisting
 *        Estrategia cuando **existe** data diferente en BD para una nómina:
 *
 *        - "diff" (incremental/inteligente):
 *           • Compara payload vs BD usando una clave de negocio (buildDetalleKey).
 *           • Inserta filas nuevas, actualiza solo las que cambiaron campos relevantes
 *             (débitos/créditos/base/cuenta/sede/tercero), y elimina las ausentes.
 *           • Presupuesto: upsert por blo_id y elimina proyectos que ya no vengan.
 *           • Ventajas: menos I/O si los cambios son parciales; conserva nod_id de filas no tocadas.
 *
 *        - "replace" (reemplazo total por nómina):
 *           • DELETE de todo el detalle y presupuesto de la nómina.
 *           • Inserta nuevamente todo el contenido del payload.
 *           • Ventajas: estado final = payload (idempotente, simple).
 *           • Consideraciones: pierde continuidad de nod_id; más escrituras si cambian pocas filas.
 *
 *        Nota: si payload y BD son idénticos, la aplicación de esta estrategia depende de `autoSkipIfSame`.
 *
 * @param {boolean} params.autoSkipIfSame
 *        Controla el comportamiento cuando **payload y BD son idénticos** (misma firma):
 *
 *        - true  → **Omitir** la actualización de detalle/presupuesto para esa nómina
 *                  (no se ejecuta "diff" ni "replace"), pero **sí** se heredan N:N
 *                  desde el usuario por si faltaban asociaciones. Incrementa el contador
 *                  `nominasOmitidasIguales`.
 *
 *        - false → Se continúa con `onExisting` aun siendo idéntico:
 *                  • "diff": no hará cambios (pero evalúa y consume tiempo en comparar).
 *                  • "replace": reescribe con el mismo contenido (útil si quieres forzar triggers).
 *
 * @returns {Promise<{ summary: {
 *   sheetName: string|null,
 *   scope: string,
 *   procesados: number,
 *   creadosDetalle: number,
 *   actualizadosUsuarios: number,
 *   creadosUsuarios: number,
 *   nominasCreadas: number,
 *   presupuestosCreados: number,
 *   presupuestosActualizados: number,
 *   detallesInsertados: number,
 *   detallesActualizados: number,
 *   detallesEliminados: number,
 *   presupuestosEliminados: number,
 *   nominasOmitidasIguales: number,
 *   errores: Array<{ fila:number|null, documento:string|null, error:string }>
 * } }>}
 *        Resumen de operaciones y errores por fila.
 */

export async function importNomina({
  sheetName = null,
  scope = "filtered",
  rows,
  budgets = [],
  usuario = 1,
  onExisting = "replace", // "diff" (por defecto) | "replace"
  autoSkipIfSame = false, // omitir si payload == BD (por nómina)
}) {
  const startedAt = Date.now();
  console.log(
    `[importNominaService] INIT sheet=${
      sheetName ?? "null"
    } scope=${scope} usuario=${usuario} onExisting=${onExisting} autoSkipIfSame=${autoSkipIfSame}`
  );

  if (!Array.isArray(rows) || rows.length === 0) {
    console.warn("[importNominaService] rows vacío o no es un array.");
    throw new Error("El payload no contiene filas para importar.");
  }

  const summary = {
    sheetName,
    scope,
    procesados: 0,
    creadosDetalle: 0,
    actualizadosUsuarios: 0,
    creadosUsuarios: 0,
    nominasCreadas: 0,
    // presupuesto
    presupuestosCreados: 0,
    presupuestosActualizados: 0,
    // diffs
    detallesInsertados: 0,
    detallesActualizados: 0,
    detallesEliminados: 0,
    presupuestosEliminados: 0,
    // control
    nominasOmitidasIguales: 0,
    errores: [], // { fila, documento, error }
  };

  const cache = caches();
  const usu_reg = usuario ?? 1;
  const budgetsNorm = normalizeBudgets(budgets);

  // Por nómina tocaremos conjuntos y detectaremos actualizaciones
  const nominasTocadas = new Map(); // nom_id -> { created: bool }

  // Helpers para “firmas” (sin guardar nada en BD)
  const detalleSigFromList = (list) => {
    const arr = list.map((n) => [
      buildDetalleKey(n),
      Number(n.sed_id) || 0,
      Number(n.nod_valor_debito) || 0,
      Number(n.nod_valor_credito) || 0,
      Number(n.nod_base_impuesto) || 0,
      String(n.nod_datos_cuenta || ""),
      Number(n.nod_cuenta_contable) || 0,
      Number(n.nod_puc) || 0,
      Number(n.nod_tipo_tercero) || 0,
      String(n.nod_tercero || ""),
    ]);
    arr.sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
    return JSON.stringify(arr);
  };

  const presupuestoSigFromList = (list) => {
    // Firma simple por blo_id + valores (ordenada)
    const arr = list.map((b) => [
      Number(b.blo_id) || 0,
      Number(b.pre_valor) || 0,
      Number(b.pre_porcentaje) || 0,
    ]);
    arr.sort((a, b) => a[0] - b[0]);
    return JSON.stringify(arr);
  };

  // ======== HELPERS PARA NOMINA_EMPLEADO (hereda desde tablas del USUARIO) ========

  // tir_id que YA tiene el usuario
  async function findUserTirIds(connection, usu_id) {
    const rows = await executeQuery(
      `SELECT tir_id FROM tbl_usuario_tipo_reembolso WHERE usu_id=?`,
      [usu_id],
      connection
    );
    return rows.map((r) => Number(r.tir_id)).filter(Number.isFinite);
  }

  // blo_id que YA tiene el usuario
  async function findUserProjectIds(connection, usu_id) {
    const rows = await executeQuery(
      `SELECT blo_id FROM tbl_usuario_proyecto WHERE usu_id=?`,
      [usu_id],
      connection
    );
    return rows.map((r) => Number(r.blo_id)).filter(Number.isFinite);
  }

  // N:N tir: inserta todos los tirIds (ignora duplicados)
  async function addNominaEmpleadoTirs(
    connection,
    { nom_id, usu_id, tirIds, usu_reg }
  ) {
    if (!Array.isArray(tirIds) || tirIds.length === 0) return;
    const rows = tirIds.map((tir_id) => [
      nom_id,
      usu_id,
      tir_id,
      usu_reg,
      usu_reg,
    ]);
    const ph = rows.map(() => "(?,?,?,?,?)").join(",");
    await executeQuery(
      `INSERT INTO tbl_nomina_empleado_tir
         (nom_id, usu_id, tir_id, netr_usu_reg, netr_usu_act)
       VALUES ${ph}
       ON DUPLICATE KEY UPDATE
         netr_usu_act = VALUES(netr_usu_act),
         netr_fec_act = CURRENT_TIMESTAMP`,
      rows.flat(),
      connection
    );
  }

  // N:N proyecto: inserta todos los proIds (ignora duplicados)
  async function addNominaEmpleadoProyectos(
    connection,
    { nom_id, usu_id, proIds, usu_reg }
  ) {
    if (!Array.isArray(proIds) || proIds.length === 0) return;
    const rows = proIds.map((blo_id) => [
      nom_id,
      usu_id,
      blo_id,
      usu_reg,
      usu_reg,
    ]);
    const ph = rows.map(() => "(?,?,?,?,?)").join(",");
    await executeQuery(
      `INSERT INTO tbl_nomina_empleado_proyecto
         (nom_id, usu_id, blo_id, nepp_usu_reg, nepp_usu_act)
       VALUES ${ph}
       ON DUPLICATE KEY UPDATE
         nepp_usu_act = VALUES(nepp_usu_act),
         nepp_fec_act = CURRENT_TIMESTAMP`,
      rows.flat(),
      connection
    );
  }
  // ===================================================================

  let connection = null;
  try {
    connection = await getConnection();
    console.log("[importNominaService] Conexión abierta.");

    // ============ PRIMER PASO: resolver filas y generar estructura por nómina ============
    const detallesPorNomina = new Map(); // nom_id -> array de detalles normalizados

    for (let i = 0; i < rows.length; i++) {
      const src = rows[i];
      summary.procesados++;
      const filaExcel = i + 2;
      const touched = touchedSet();

      const idNomina = src.IdNomina ?? null;
      const IdEmpleado = src.IdEmpleado ?? null;
      const nominaNombre = src.NominaNombre ?? src.Nómina ?? src.Nomina ?? null;
      const nombreSede = src.NombreSede ?? src.Sede ?? null;

      const tipoPeriodoNombre = src.TipoPeriodo ?? "Nómina";
      const fecIni = parseExcelDate(src.FechaInicialPeriodo);
      const fecFin = parseExcelDate(src.FechaFinalPeriodo);

      const tipoDocNominaNombre = src.TipoDocumento ?? "Nómina";
      const planCuentaNombre = src.PlanCuentaContable ?? "ADMINISTRATIVA";

      const ccCodigo = src.IdCentroDeCostos ?? null;
      const ccNombre = src.CentroDeCostos ?? null;

      const gerenciaNombre =
        pick(src, "Gerencia", "NombreGerencia", "GerenciaNombre") ?? null;
      const cargoNombre =
        pick(src, "Cargo", "NombreCargo", "CargoNombre") ?? null;

      const itemNombre = src.ItemDescripcion || src.Item || "SIN CONCEPTO";
      const puc = toNumber(src.PUC);
      const idCuentaContable = toNumber(src.IdCuentaContable);
      const datosCuenta = (src.DatosCuenta ?? "").toString().trim() || null;

      const valorDebito = toNumber(src.ValorDebito);
      const valorCredito = toNumber(src.ValorCredito);
      const baseImpuesto = toNumber(src.BaseImpuesto);

      const documento = (src.Identificacion ?? "").toString().trim();
      const empleadoNombre = src.NombreCompleto ?? src.Empleado ?? null;

      const terceroNombre = src.Tercero ?? null;
      const terceroNit = (src.NIT ?? "").toString().trim();

      // Validación mínima
      if (!documento || !empleadoNombre) {
        const msg =
          "Faltan campos obligatorios (documento y/o nombre empleado).";
        console.warn(
          `[importNominaService] Fila ${filaExcel} inválida: ${msg}`
        );
        summary.errores.push({ fila: filaExcel, documento, error: msg });
        continue;
      }
      if (!fecIni || !fecFin) {
        const msg = "Fechas de período inválidas.";
        console.warn(
          `[importNominaService] Fila ${filaExcel} inválida: ${msg}`
        );
        summary.errores.push({ fila: filaExcel, documento, error: msg });
        continue;
      }

      const dt = new Date(fecFin || fecIni);
      const anio = dt.getFullYear();
      const mes = dt.getMonth() + 1;

      await connection.beginTransaction();
      try {
        // 1) Maestras
        const sed_id = await getOrCreateSede(
          connection,
          nombreSede,
          cache,
          touched
        );
        const tpp_id = await getOrCreateTipoPeriodo(
          connection,
          tipoPeriodoNombre,
          cache,
          touched
        );
        const prd_id = await getOrCreatePeriodo(
          connection,
          { tpp_id, fec_ini: fecIni, fec_fin: fecFin },
          cache,
          touched
        );
        const tdn_id = await getOrCreateTipoDocumentoNomina(
          connection,
          tipoDocNominaNombre,
          cache,
          touched
        );
        const pcc_id = await getOrCreatePlanCuentaContable(
          connection,
          planCuentaNombre,
          cache,
          touched
        );

        let ger_id = null;
        if (gerenciaNombre)
          ger_id = await getOrCreateGerencia(
            connection,
            gerenciaNombre,
            cache,
            touched
          );
        let car_id = null;
        if (cargoNombre)
          car_id = await getOrCreateCargo(
            connection,
            cargoNombre,
            ger_id,
            cache,
            touched
          );

        const cco_id = await getOrCreateCentroCosto(
          connection,
          ccCodigo,
          ccNombre,
          ger_id || null,
          cache,
          touched
        );
        const con_id = await getOrCreateConceptoNomina(
          connection,
          itemNombre,
          cache,
          touched
        );

        // 2) Usuario
        const { nombres, apellidos } = splitNombreCompleto(
          empleadoNombre || ""
        );
        const rUser = await upsertUsuario(connection, {
          documento,
          nombres,
          apellidos,
          car_id: car_id ?? null,
          cco_id: cco_id ?? null,
          emp_id: IdEmpleado ?? null,
        });
        if (rUser.action === "create") summary.creadosUsuarios++;
        if (rUser.action === "update") summary.actualizadosUsuarios++;
        const usu_id = rUser.usuId;

        // 3) Nómina (cabecera)
        const nom_id = await getOrCreateNomina(
          connection,
          {
            codigo: idNomina ? String(idNomina).trim() : null,
            nombre:
              nominaNombre || `Nómina ${anio}-${String(mes).padStart(2, "0")}`,
            anio,
            mes,
            usu_reg,
          },
          cache,
          touched
        );

        // marca si se creó esta nómina (para histórico)
        const recNom = nominasTocadas.get(nom_id) || { created: false };
        if (touched?.nominas?.size) {
          summary.nominasCreadas += 1;
          recNom.created = true;
        }
        nominasTocadas.set(nom_id, recNom);

        // 4) Tercero (empleado o aseguradora)
        const esEmpleado = samePersonByNitOrName({
          empleadoNombre,
          empleadoDoc: documento,
          terceroNombre,
          terceroNit,
        });

        let nod_tipo_tercero = 1;
        let nod_tercero = String(usu_id); // empleado -> usu_id (texto)

        if (!esEmpleado && (terceroNit || terceroNombre)) {
          const ase_id = await getOrCreateAseguradora(
            connection,
            { nombre: terceroNombre, nit: terceroNit, usu_reg },
            cache,
            touched
          );
          nod_tipo_tercero = 2;
          // Guardar la FK (ase_id) en nod_tercero:
          nod_tercero = String(ase_id || "");
        }

        const det = {
          nom_id,
          usu_id,
          prd_id,
          tdn_id,
          con_id,
          pcc_id,
          cco_id,
          sed_id,
          nod_puc: puc || 0,
          nod_cuenta_contable: idCuentaContable || 0,
          nod_tipo_tercero,
          nod_tercero: nod_tercero || null,
          nod_valor_debito: valorDebito || 0,
          nod_valor_credito: valorCredito || 0,
          nod_base_impuesto: baseImpuesto || 0,
          nod_datos_cuenta: datosCuenta,
          nod_usu_reg: usu_reg,
        };

        const arr = detallesPorNomina.get(nom_id) || [];
        arr.push(det);
        detallesPorNomina.set(nom_id, arr);

        await connection.commit();
      } catch (rowErr) {
        console.error(
          `[importNominaService] Fila ${filaExcel}: TX ERROR ->`,
          rowErr
        );
        try {
          await connection.rollback();
        } catch {
          /* noop */
        }
        dropTouched(cache, touched);
        summary.errores.push({
          fila: filaExcel,
          documento,
          error: isError(rowErr) ? rowErr.message : String(rowErr),
        });
      }
    }

    // ============ SEGUNDO PASO: aplicar por nómina (detección de iguales + diff/replace) ============
    for (const [nom_id, listaNueva] of detallesPorNomina.entries()) {
      // ---- Cargar actuales (detalle) ----
      const actuales = await executeQuery(
        `SELECT nod_id, nom_id, usu_id, prd_id, tdn_id, con_id, cco_id,sed_id, pcc_id,
                nod_puc, nod_cuenta_contable, nod_valor_debito, nod_valor_credito, nod_base_impuesto, nod_datos_cuenta
           FROM tbl_nomina_detalle
          WHERE nom_id=?`,
        [nom_id],
        connection
      );

      // ---- Cargar presupuesto actual (incluye valores para comparar) ----
      const actPresVal = await executeQuery(
        `SELECT blo_id, pre_valor, pre_porcentaje FROM tbl_presupuesto WHERE nom_id=?`,
        [nom_id],
        connection
      );

      // ---- Firmas (payload vs BD) ----
      const sigNewDet = detalleSigFromList(listaNueva);
      const sigCurDet = detalleSigFromList(actuales);

      const sigNewBud = presupuestoSigFromList(budgetsNorm);
      const sigCurBud = presupuestoSigFromList(actPresVal);

      const esIgual = sigNewDet === sigCurDet && sigNewBud === sigCurBud;

      if (autoSkipIfSame && esIgual) {
        summary.nominasOmitidasIguales++;
        // AUNQUE omitimos cambios, igual heredamos cabeceras/N:N por si no existían
        await connection.beginTransaction();
        try {
          const usuarios = Array.from(
            new Set(listaNueva.map((n) => Number(n.usu_id)))
          );
          for (const usu_id of usuarios) {
            const tirIds = await findUserTirIds(connection, usu_id);
            const proIds = await findUserProjectIds(connection, usu_id);
            await addNominaEmpleadoTirs(connection, {
              nom_id,
              usu_id,
              tirIds,
              usu_reg,
            });
            await addNominaEmpleadoProyectos(connection, {
              nom_id,
              usu_id,
              proIds,
              usu_reg,
            });
          }
          await connection.commit();
        } catch (eInherit) {
          try {
            await connection.rollback();
          } catch {}
          summary.errores.push({
            fila: null,
            documento: null,
            error: isError(eInherit) ? eInherit.message : String(eInherit),
          });
        }
        continue; // nada más que hacer para esta nómina
      }

      if (onExisting === "replace") {
        // ======= REEMPLAZO TOTAL POR NÓMINA =======
        await connection.beginTransaction();
        try {
          // 1) Borrar todo el detalle/presupuesto de la nómina
          await executeQuery(
            `DELETE FROM tbl_nomina_detalle WHERE nom_id=?`,
            [nom_id],
            connection
          );
          await executeQuery(
            `DELETE FROM tbl_presupuesto   WHERE nom_id=?`,
            [nom_id],
            connection
          );

          // 2) Insertar todo el detalle del payload
          for (const n of listaNueva) {
            await executeQuery(
              `INSERT INTO tbl_nomina_detalle
                 (usu_id, nom_id, prd_id, tdn_id, con_id, pcc_id, cco_id, sed_id,
                  nod_puc, nod_cuenta_contable, nod_tipo_tercero, nod_tercero,
                  nod_valor_debito, nod_valor_credito, nod_base_impuesto, nod_datos_cuenta,
                  nod_usu_reg)
               VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
              [
                n.usu_id,
                n.nom_id,
                n.prd_id,
                n.tdn_id,
                n.con_id,
                n.pcc_id,
                n.cco_id,
                n.sed_id,
                n.nod_puc,
                n.nod_cuenta_contable,
                n.nod_tipo_tercero,
                n.nod_tercero,
                n.nod_valor_debito,
                n.nod_valor_credito,
                n.nod_base_impuesto,
                n.nod_datos_cuenta,
                n.nod_usu_reg,
              ],
              connection
            );
            summary.creadosDetalle++;
            summary.detallesInsertados++;
          }

          // 3) Insertar presupuesto del payload (si viene)
          if (budgetsNorm.length) {
            for (const b of budgetsNorm) {
              const r = await upsertPresupuesto(connection, {
                nom_id,
                blo_id: b.blo_id,
                pre_valor: b.pre_valor,
                pre_porcentaje: b.pre_porcentaje,
                usu_reg,
              });
              if (r.action === "create") summary.presupuestosCreados++;
              if (r.action === "update") summary.presupuestosActualizados++;
            }
          }

          // 4) HEREDAR cabeceras y N:N desde USUARIO_* (no desde presupuesto)
          {
            const usuarios = Array.from(
              new Set(listaNueva.map((n) => Number(n.usu_id)))
            );
            for (const usu_id of usuarios) {
              const tirIds = await findUserTirIds(connection, usu_id);
              const proIds = await findUserProjectIds(connection, usu_id);
              await addNominaEmpleadoTirs(connection, {
                nom_id,
                usu_id,
                tirIds,
                usu_reg,
              });
              await addNominaEmpleadoProyectos(connection, {
                nom_id,
                usu_id,
                proIds,
                usu_reg,
              });
            }
          }

          // Histórico
          await executeQuery(
            `INSERT INTO tbl_nomina_historico
               (nom_id, usu_id, noh_accion, noh_estado_anterior, noh_estado_nuevo, noh_comentario)
             VALUES (?, ?, '2', 'actualizada', 'actualizada', 'Reemplazo total por importación')`,
            [nom_id, usu_reg],
            connection
          );

          await connection.commit();

          // Histórico de creación (si se creó la nómina en el primer paso)
          const meta = nominasTocadas.get(nom_id);
          if (meta?.created) {
            await executeQuery(
              `INSERT INTO tbl_nomina_historico
                 (nom_id, usu_id, noh_accion, noh_estado_anterior, noh_estado_nuevo, noh_comentario)
               VALUES (?, ?, '1', NULL, 'creada', 'Creación por importación (reemplazo)')`,
              [nom_id, usu_reg],
              connection
            );
          }
        } catch (errRep) {
          console.error("[importNominaService] ERROR en reemplazo ->", errRep);
          try {
            await connection.rollback();
          } catch {}
          summary.errores.push({
            fila: null,
            documento: null,
            error: isError(errRep) ? errRep.message : String(errRep),
          });
        }

        continue; // siguiente nómina
      }

      // ======= DIFF POR NÓMINA (comportamiento original) =======
      const mapAct = new Map(); // key -> row (actual)
      for (const r of actuales) {
        const key = buildDetalleKey(r);
        mapAct.set(key, r);
      }

      const mapNew = new Map(); // key -> row (nuevo)
      for (const n of listaNueva) {
        const key = buildDetalleKey(n);
        mapNew.set(key, n);
      }

      const toInsert = [];
      const toUpdate = [];
      const seenKeys = new Set();

      for (const [key, n] of mapNew.entries()) {
        const a = mapAct.get(key);
        if (!a) {
          toInsert.push(n);
        } else {
          // compara valores monetarios/base
          const diff =
            Number(a.nod_valor_debito) !== Number(n.nod_valor_debito) ||
            Number(a.nod_valor_credito) !== Number(n.nod_valor_credito) ||
            Number(a.nod_base_impuesto) !== Number(n.nod_base_impuesto) ||
            (a.nod_datos_cuenta || "") !== (n.nod_datos_cuenta || "") ||
            Number(a.nod_cuenta_contable) !== Number(n.nod_cuenta_contable) ||
            Number(a.nod_puc) !== Number(n.nod_puc) ||
            Number(a.sed_id) !== Number(n.sed_id) ||
            Number(a.nod_tipo_tercero) !== Number(n.nod_tipo_tercero) ||
            String(a.nod_tercero || "") !== String(n.nod_tercero || "");

          if (diff) {
            toUpdate.push({ a, n });
          }
        }
        seenKeys.add(key);
      }

      const toDelete = [];
      for (const [key, a] of mapAct.entries()) {
        if (!seenKeys.has(key)) toDelete.push(a);
      }

      // ---- Aplicar diff (detalle) en una transacción por nómina ----
      await connection.beginTransaction();
      try {
        // delete
        for (const a of toDelete) {
          await executeQuery(
            `DELETE FROM tbl_nomina_detalle WHERE nod_id=?`,
            [a.nod_id],
            connection
          );
          summary.detallesEliminados++;
        }
        // insert
        for (const n of toInsert) {
          await executeQuery(
            `INSERT INTO tbl_nomina_detalle
       (usu_id, nom_id, prd_id, tdn_id, con_id, pcc_id, cco_id,
        nod_puc, nod_cuenta_contable, nod_tipo_tercero, nod_tercero,
        nod_valor_debito, nod_valor_credito, nod_base_impuesto, nod_datos_cuenta,
        nod_usu_reg)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
            [
              n.usu_id,
              n.nom_id,
              n.prd_id,
              n.tdn_id,
              n.con_id,
              n.pcc_id,
              n.cco_id,
              n.nod_puc,
              n.nod_cuenta_contable,
              n.nod_tipo_tercero,
              n.nod_tercero,
              n.nod_valor_debito,
              n.nod_valor_credito,
              n.nod_base_impuesto,
              n.nod_datos_cuenta,
              n.nod_usu_reg,
            ],

            connection
          );
          summary.creadosDetalle++;
          summary.detallesInsertados++;
        }
        // update
        for (const { a, n } of toUpdate) {
          await executeQuery(
            `UPDATE tbl_nomina_detalle
      SET nod_valor_debito=?,
          nod_valor_credito=?,
          nod_base_impuesto=?,
          nod_datos_cuenta=?,
          nod_cuenta_contable=?,
          nod_puc=?,
          sed_id=?,                     
          nod_tipo_tercero=?,           
          nod_tercero=?                 
    WHERE nod_id=?`,
            [
              n.nod_valor_debito,
              n.nod_valor_credito,
              n.nod_base_impuesto,
              n.nod_datos_cuenta,
              n.nod_cuenta_contable,
              n.nod_puc,
              n.sed_id,
              n.nod_tipo_tercero,
              n.nod_tercero,
              a.nod_id,
            ],
            connection
          );

          summary.detallesActualizados++;
        }

        // ---- Presupuesto (modo reemplazo total parcial según payload) ----
        if (budgetsNorm.length) {
          // 1) Cargar actuales (ya lo teníamos en actPresVal)
          const actByPro = new Map(
            actPresVal.map((r) => [
              Number(r.blo_id),
              {
                pre_id: r.pre_id, // (no se usa, pero se conserva la estructura)
                pre_valor: r.pre_valor,
                pre_porcentaje: r.pre_porcentaje,
              },
            ])
          );
          const newByPro = new Map(
            budgetsNorm.map((b) => [Number(b.blo_id), { ...b }])
          );

          // 2) Borrar los que ya no vengan
          for (const [blo_id] of actByPro.entries()) {
            if (!newByPro.has(blo_id)) {
              await executeQuery(
                `DELETE FROM tbl_presupuesto WHERE nom_id=? AND blo_id=?`,
                [nom_id, blo_id],
                connection
              );
              summary.presupuestosEliminados++;
            }
          }

          // 3) Upsert de los que vienen
          for (const b of budgetsNorm) {
            const r = await upsertPresupuesto(connection, {
              nom_id,
              blo_id: b.blo_id,
              pre_valor: b.pre_valor,
              pre_porcentaje: b.pre_porcentaje,
              usu_reg,
            });
            if (r.action === "create") summary.presupuestosCreados++;
            if (r.action === "update") summary.presupuestosActualizados++;
          }
        }

        // ---- HEREDAR cabeceras y N:N desde USUARIO_* (no desde presupuesto) ----
        {
          const usuarios = Array.from(
            new Set(listaNueva.map((n) => Number(n.usu_id)))
          );
          for (const usu_id of usuarios) {
            const tirIds = await findUserTirIds(connection, usu_id);
            const proIds = await findUserProjectIds(connection, usu_id);
            await addNominaEmpleadoTirs(connection, {
              nom_id,
              usu_id,
              tirIds,
              usu_reg,
            });
            await addNominaEmpleadoProyectos(connection, {
              nom_id,
              usu_id,
              proIds,
              usu_reg,
            });
          }
        }

        // ---- Histórico: si hubo cambios materiales en detalle o presupuesto
        const huboCambios =
          toInsert.length + toUpdate.length + toDelete.length > 0 ||
          budgetsNorm.length > 0;
        if (huboCambios) {
          await executeQuery(
            `INSERT INTO tbl_nomina_historico
               (nom_id, usu_id, noh_accion, noh_estado_anterior, noh_estado_nuevo, noh_comentario)
             VALUES (?, ?, '2', 'actualizada', 'actualizada', 'Actualización por importación (diff)')`,
            [nom_id, usu_reg],
            connection
          );
        }

        await connection.commit();

        // Histórico de creación (si se creó la nómina en el primer paso)
        const meta = nominasTocadas.get(nom_id);
        if (meta?.created) {
          await executeQuery(
            `INSERT INTO tbl_nomina_historico
               (nom_id, usu_id, noh_accion, noh_estado_anterior, noh_estado_nuevo, noh_comentario)
             VALUES (?, ?, '1', NULL, 'creada', 'Creación por importación (JSON)')`,
            [nom_id, usu_reg],
            connection
          );
        }
      } catch (errDiff) {
        console.error(
          "[importNominaService] ERROR aplicando diffs ->",
          errDiff
        );
        try {
          await connection.rollback();
        } catch {
          /* noop */
        }
        summary.errores.push({
          fila: null,
          documento: null,
          error: isError(errDiff) ? errDiff.message : String(errDiff),
        });
      }
    }

    const elapsed = Date.now() - startedAt;
    console.log(
      `[importNominaService] END ok. procesados=${summary.procesados} omitidasIguales=${summary.nominasOmitidasIguales} errores=${summary.errores.length} t=${elapsed}ms`
    );
    return { summary };
  } catch (err) {
    console.error("[importNominaService] FATAL ERROR ->", err);
    rethrow(err, "Fallo importNominaService");
  } finally {
    try {
      await releaseConnection(connection);
      console.log("[importNominaService] Conexión liberada.");
    } catch (relErr) {
      console.error(
        "[importNominaService] ERROR liberando conexión ->",
        relErr
      );
    }
  }
}

/** (B) Importar Nómina desde Excel (archivo) */
export const importNominaExcel = async (req, res, next) => {
  try {
    let fileObj = null;
    if (req.files?.file) fileObj = req.files.file;
    else if (req.files?.archivo) fileObj = req.files.archivo;

    if (!fileObj) {
      return res
        .status(400)
        .json({ message: "Adjunta el archivo Excel en el campo 'file'." });
    }

    const rows = await excelToRows(fileObj);

    const summary = {
      procesados: 0,
      creadosDetalle: 0,
      actualizadosUsuarios: 0,
      creadosUsuarios: 0,
      nominasCreadas: 0,
      errores: [],
    };

    const usu_reg = req.user?.usu_id ?? 1;
    const cache = caches();
    let connection = null;

    try {
      connection = await getConnection();

      for (let i = 0; i < rows.length; i++) {
        const touched = touchedSet();
        const row = rows[i];
        summary.procesados++;

        // ===== mapeo por nombres de columnas comunes de tus hojas =====
        const idNomina = pick(row, "IdNomina", "ID NOMINA", "idNomina");
        const nominaNombre = pick(row, "NominaNombre", "Nómina", "Nomina");
        const nombreSede = pick(row, "NombreSede", "Sede", "Nombre Sede");

        const tipoPeriodoNombre =
          pick(row, "TipoPeriodo", "Tipo Periodo") || "Nómina";
        const fecIni = parseExcelDate(
          pick(row, "FechaInicialPeriodo", "Fecha Inicial", "FechaInicial")
        );
        const fecFin = parseExcelDate(
          pick(row, "FechaFinalPeriodo", "Fecha Final", "FechaFinal")
        );

        const tipoDocNominaNombre =
          pick(row, "TipoDocumento", "Tipo Documento") || "Nómina";
        const planCuentaNombre =
          pick(row, "PlanCuentaContable", "Plan Cuenta Contable") ||
          "ADMINISTRATIVA";

        const ccCodigo = pick(
          row,
          "IdCentroDeCostos",
          "C.COSTO COD",
          "CCOSTO COD",
          "Centro de Costo"
        );
        const ccNombre = pick(
          row,
          "CentroDeCostos",
          "Nombre Centro de Costos",
          "C.COSTO NOMBRE"
        );

        const itemNombre =
          pick(row, "ItemDescripcion", "Item", "Concepto", "Concepto Nomina") ||
          "SIN CONCEPTO";
        const puc = toNumber(pick(row, "PUC"));
        const idCuentaContable = toNumber(
          pick(row, "IdCuentaContable", "Cuenta Contable", "ID Cuenta Contable")
        );

        const valorDebito = toNumber(pick(row, "ValorDebito", "Valor Débito"));
        const valorCredito = toNumber(
          pick(row, "ValorCredito", "Valor Crédito")
        );
        const baseImpuesto = toNumber(
          pick(row, "BaseImpuesto", "Base Impuesto")
        );

        const documento = (
          pick(
            row,
            "Identificacion",
            "Identificación",
            "Identificación",
            "NIT",
            "Nit"
          ) || ""
        )
          .toString()
          .trim();
        const empleadoNombre = pick(
          row,
          "NombreCompleto",
          "Empleado",
          "NOMBRE EMPLEADO"
        );
        const terceroNombre = pick(row, "Tercero");
        const terceroNit = (pick(row, "TerceroNit", "NIT", "Nit") || "")
          .toString()
          .trim();

        if (!documento || !empleadoNombre) {
          summary.errores.push({
            fila: i + 2,
            documento,
            error:
              "Faltan campos obligatorios (documento y/o nombre empleado).",
          });
          continue;
        }
        if (!fecIni || !fecFin) {
          summary.errores.push({
            fila: i + 2,
            documento,
            error: "Fechas de período inválidas.",
          });
          continue;
        }

        const dt = new Date(fecFin || fecIni);
        const anio = dt.getFullYear();
        const mes = dt.getMonth() + 1;

        await connection.beginTransaction();
        try {
          const sed_id = await getOrCreateSede(
            connection,
            nombreSede,
            cache,
            touched
          );
          const tpp_id = await getOrCreateTipoPeriodo(
            connection,
            tipoPeriodoNombre,
            cache,
            touched
          );
          const prd_id = await getOrCreatePeriodo(
            connection,
            { tpp_id, fec_ini: fecIni, fec_fin: fecFin },
            cache,
            touched
          );
          const tdn_id = await getOrCreateTipoDocumentoNomina(
            connection,
            tipoDocNominaNombre,
            cache,
            touched
          );
          const pcc_id = await getOrCreatePlanCuentaContable(
            connection,
            planCuentaNombre,
            cache,
            touched
          );
          const cco_id = await getOrCreateCentroCosto(
            connection,
            ccCodigo,
            ccNombre,
            null,
            cache,
            touched
          );
          const con_id = await getOrCreateConceptoNomina(
            connection,
            itemNombre,
            cache,
            touched
          );

          const { nombres, apellidos } = splitNombreCompleto(
            empleadoNombre || ""
          );
          const rUser = await upsertUsuario(connection, {
            documento,
            nombres,
            apellidos,
            car_id: null,
            cco_id,
          });
          if (rUser.action === "create") summary.creadosUsuarios++;
          if (rUser.action === "update") summary.actualizadosUsuarios++;
          const usu_id = rUser.usuId;

          const nom_id = await getOrCreateNomina(
            connection,
            {
              codigo: idNomina ? String(idNomina).trim() : null,
              nombre:
                nominaNombre ||
                `Nómina ${anio}-${String(mes).padStart(2, "0")}`,
              anio,
              mes,
              usu_reg,
            },
            cache,
            touched
          );
          if (touched?.nominas?.size) summary.nominasCreadas += 1;

          const esEmpleado = samePersonByNitOrName({
            empleadoNombre,
            empleadoDoc: documento,
            terceroNombre,
            terceroNit,
          });
          const nod_tipo_tercero = esEmpleado ? 1 : 2;
          const nod_tercero = esEmpleado
            ? documento
            : (terceroNombre || terceroNit || "").toString().trim();

          await executeQuery(
            `INSERT INTO tbl_nomina_detalle
               (usu_id, nom_id, prd_id, tdn_id, con_id, pcc_id, cco_id,
                nod_puc, nod_cuenta_contable, nod_tipo_tercero, nod_tercero,
                nod_valor_debito, nod_valor_credito, nod_base_impuesto,
                nod_usu_reg)
             VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
            [
              usu_id,
              nom_id,
              prd_id,
              tdn_id,
              con_id,
              pcc_id,
              cco_id,
              puc || 0,
              idCuentaContable || 0,
              nod_tipo_tercero,
              nod_tercero || null,
              valorDebito || 0,
              valorCredito || 0,
              baseImpuesto || 0,
              usu_reg,
            ],
            connection
          );
          summary.creadosDetalle++;

          if (touched?.nominas?.size) {
            await executeQuery(
              `INSERT INTO tbl_nomina_historico
                 (nom_id, usu_id, noh_accion, noh_estado_anterior, noh_estado_nuevo, noh_comentario)
               VALUES (?, ?, '1', NULL, 'creada', 'Creación por importación (Excel)')`,
              [nom_id, usu_reg],
              connection
            );
          }

          await connection.commit();
        } catch (eRow) {
          await connection.rollback();
          dropTouched(cache, touched);
          summary.errores.push({
            fila: i + 2,
            documento,
            error: eRow.message || String(eRow),
          });
        }
      }

      return res
        .status(200)
        .json({ message: "Importación de nómina finalizada", ...summary });
    } catch (err) {
      next(err);
    } finally {
      releaseConnection(connection);
    }
  } catch (err) {
    next(err);
  }
};

/** (C) Importar Presupuesto desde Excel (opcional, mismo módulo) */
async function getOrCreateProyectoPresupuesto(
  connection,
  nombre,
  cache,
  touched
) {
  const key = clean(nombre);
  if (!key) return null;
  const c = cache.proyectos?.get(key);
  if (c) return c.id;

  const [row] = await executeQuery(
    "SELECT blo_id AS id, blo_nombre FROM tbl_bloques WHERE UPPER(TRIM(blo_nombre))=? LIMIT 1",
    [key],
    connection
  );
  if (row) {
    cache.proyectos?.set(key, row);
    return row.id;
  }
  const ins = await executeQuery(
    "INSERT INTO tbl_bloques (blo_nombre, blo_estado) VALUES (?, 'activo')",
    [nombre.trim()],
    connection
  );
  const id = ins.insertId;
  cache.proyectos?.set(key, { id, nombre });
  touched?.proyectos?.add(key);
  return id;
}

export const importPresupuestoExcel = async (req, res, next) => {
  try {
    let fileObj = null;
    if (req.files?.file) fileObj = req.files.file;
    else if (req.files?.archivo) fileObj = req.files.archivo;

    if (!fileObj) {
      return res
        .status(400)
        .json({ message: "Adjunta el archivo Excel (presupuesto) en 'file'." });
    }

    const rows = await excelToRows(fileObj);
    const cache = caches();
    let connection = null;
    const summary = { procesados: 0, creados: 0, actualizados: 0, errores: [] };
    const usu_reg = req.user?.usu_id ?? 1;

    try {
      connection = await getConnection();

      for (let i = 0; i < rows.length; i++) {
        const touched = touchedSet();
        const row = rows[i];
        summary.procesados++;

        const anio = Number(pick(row, "Año", "ANIO", "ANIO_PRES"));
        const mes = Number(pick(row, "Mes", "MES"));
        const proNombre = pick(row, "Proyecto", "PROYECTO");
        const pre_valor = toNumber(pick(row, "Valor", "PRESUPUESTO", "VALOR"));

        if (!anio || !mes || !proNombre) {
          summary.errores.push({
            fila: i + 2,
            error: "Faltan Año/Mes/Proyecto.",
          });
          continue;
        }

        await connection.beginTransaction();
        try {
          const blo_id = await getOrCreateProyectoPresupuesto(
            connection,
            proNombre,
            cache,
            touched
          );

          const [rowPre] = await executeQuery(
            "SELECT pre_id FROM tbl_presupuesto WHERE pre_anio=? AND pre_mes=? AND blo_id=? LIMIT 1",
            [anio, mes, blo_id],
            connection
          );
          if (rowPre) {
            await executeQuery(
              "UPDATE tbl_presupuesto SET pre_valor=?, pre_usu_act=?, pre_fec_act=CURRENT_TIMESTAMP WHERE pre_id=?",
              [pre_valor, usu_reg, rowPre.pre_id],
              connection
            );
            summary.actualizados++;
          } else {
            await executeQuery(
              "INSERT INTO tbl_presupuesto (pre_anio, pre_mes, blo_id, pre_valor, pre_usu_reg) VALUES (?,?,?,?,?)",
              [anio, mes, blo_id, pre_valor, usu_reg],
              connection
            );
            summary.creados++;
          }

          await connection.commit();
        } catch (eRow) {
          await connection.rollback();
          dropTouched(cache, touched);
          summary.errores.push({
            fila: i + 2,
            error: eRow.message || String(eRow),
          });
        }
      }

      return res
        .status(200)
        .json({ message: "Importación de presupuesto finalizada", ...summary });
    } catch (err) {
      next(err);
    } finally {
      releaseConnection(connection);
    }
  } catch (err) {
    next(err);
  }
};

/** (D) KPI de ejecución de presupuesto (opcional) */
export const getEjecucionPresupuesto = async (
  connection,
  { anio, mes, blo_id }
) => {
  const [pre] = await executeQuery(
    "SELECT pre_valor FROM tbl_presupuesto WHERE pre_anio=? AND pre_mes=? AND blo_id=? LIMIT 1",
    [anio, mes, blo_id],
    connection
  );
  if (!pre) return { porcentaje: 0, totalNomina: 0, pre_valor: 0 };

  const [tot] = await executeQuery(
    `SELECT COALESCE(SUM(nod_valor_debito - nod_valor_credito),0) AS totalNomina
     FROM tbl_nomina_detalle nd
     JOIN tbl_nomina n ON n.nom_id = nd.nom_id
     WHERE n.nom_anio=? AND n.nom_mes=?`,
    [anio, mes],
    connection
  );

  const totalNomina = Number(tot.totalNomina || 0);
  const pre_valor = Number(pre.pre_valor || 0);
  const porcentaje = pre_valor > 0 ? (totalNomina / pre_valor) * 100 : 0;

  return { porcentaje, totalNomina, pre_valor };
};

/* =============== HEADER =============== */
export const getHeader = async ({ connection = null, nomId }) => {
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
        n.nom_id        AS nomId,
        n.nom_codigo    AS codigo,
        n.nom_nombre    AS nomNombre,
        n.nom_anio      AS anio,
        n.nom_mes       AS mes,
        n.nom_usu_reg   AS usuarioRegistro,
        n.nom_fec_reg   AS fechaRegistro,
        n.nom_usu_act   AS usuarioActualiza,
        n.nom_fec_act   AS fechaActualizacion,

        -- agregados SOLO con detalle no eliminado
        COALESCE(SUM(nd.nod_valor_debito),0)                        AS totalDebito,
        COALESCE(SUM(nd.nod_valor_credito),0)                       AS totalCredito,
        COALESCE(SUM(nd.nod_valor_debito - nd.nod_valor_credito),0) AS totalNeto,
        COUNT(nd.nod_id)                                            AS items
      FROM tbl_nomina n
      LEFT JOIN tbl_nomina_detalle nd
        ON nd.nom_id = n.nom_id
       AND nd.nod_eliminado = 0
      WHERE n.nom_id = ? AND n.nom_eliminado = 0
      GROUP BY 
        n.nom_id, n.nom_codigo, n.nom_nombre, n.nom_anio, n.nom_mes,
        n.nom_usu_reg, n.nom_fec_reg, n.nom_usu_act, n.nom_fec_act
      LIMIT 1
      `,
      [nomId]
    );

    return row || null;
  } finally {
    if (release && conn) await releaseConnection(conn);
  }
};

export const saveHeader = async ({ connection = null, payload }) => {
  let conn = connection,
    release = false;
  try {
    if (!conn) {
      conn = await getConnection();
      release = true;
    }
    await conn.beginTransaction();

    const {
      nomId = 0,
      codigo = null,
      nomNombre,
      anio,
      mes,
      usureg = null,
      usuact = null,
    } = payload;

    // Unicidad de código (si viene)
    if (codigo) {
      const [ex] = await conn.query(
        `
        SELECT nom_id
        FROM tbl_nomina
        WHERE nom_codigo = ?
          AND nom_eliminado = 0
          ${nomId ? "AND nom_id <> ?" : ""}
        LIMIT 1
        `,
        nomId ? [codigo, nomId] : [codigo]
      );
      if (ex.length) throw new Error("El código de nómina ya existe.");
    }

    if (nomId) {
      await conn.query(
        `
        UPDATE tbl_nomina
           SET nom_codigo = ?,
               nom_nombre = ?,
               nom_anio   = ?,
               nom_mes    = ?,
               nom_usu_act= ?
         WHERE nom_id = ? AND nom_eliminado = 0
        `,
        [codigo || null, nomNombre, anio, mes, usuact, nomId]
      );
      await conn.commit();
      return {
        message: "Nómina actualizada correctamente",
        nomId,
        action: "update",
      };
    } else {
      const [ins] = await conn.query(
        `
        INSERT INTO tbl_nomina
          (nom_codigo, nom_nombre, nom_anio, nom_mes, nom_usu_reg, nom_eliminado)
        VALUES (?,?,?,?,?,0)
        `,
        [codigo || null, nomNombre, anio, mes, usureg]
      );
      await conn.commit();
      return {
        message: "Nómina creada correctamente",
        nomId: ins.insertId,
        action: "create",
      };
    }
  } catch (e) {
    if (connection === null)
      try {
        await conn?.rollback();
      } catch {}
    throw e;
  } finally {
    if (release && conn) releaseConnection(conn);
  }
};

/* =============== DETALLE =============== */
export const paginateDetail = async ({ connection = null, params = {} }) => {
  let conn = connection,
    release = false;

  try {
    if (!conn) {
      conn = await getConnection();
      release = true;
    }

    const {
      nomId,
      first = 0,
      rows = 20,
      sortField = "nodId", // ahora podrás ordenar por alias descriptivos
      sortOrder = 1,
      filters = {},
    } = params;

    if (!nomId) throw new Error("nomId es obligatorio.");

    // ---------- MAPEO DE ORDENAMIENTO A COLUMNAS REALES ----------
    // Ajusta nombres de tablas/campos si tus maestras difieren
    const sortMap = {
      nodId: "nd.nod_id",
      // Campos descriptivos (joins):
      usuario: "u.usu_nombre", // o u.usu_documento
      periodo: "pr.prd_fec_inicio", // inicio de periodo
      tipoDoc: "td.tdn_nombre",
      concepto: "co.con_nombre",
      planCuenta: "pc.pcc_nombre",
      centroCosto: "cc.cco_nombre",
      // Campos numéricos:
      PUC: "nd.nod_puc",
      cuentaContable: "nd.nod_cuenta_contable",
      tipoTercero: "nd.nod_tipo_tercero",
      tercero: "nd.nod_tercero",
      debito: "nd.nod_valor_debito",
      credito: "nd.nod_valor_credito",
      baseImpuesto: "nd.nod_base_impuesto",
      datosCuenta: "nd.nod_datos_cuenta",
    };
    const order = sortOrder === 1 ? "ASC" : "DESC";
    const sortCol = sortMap[sortField] || "nd.nod_id";

    // ---------- WHERE ----------
    const where = [`nd.nom_id = ?`, `nd.nod_eliminado = 0`];
    const values = [nomId];

    // Ejemplos de filtros por alias (opcionales)
    if (filters?.tercero?.value) {
      where.push(`nd.nod_tercero LIKE ?`);
      values.push(`%${filters.tercero.value}%`);
    }
    if (filters?.usuario?.value) {
      // por nombre o documento
      where.push(
        `(u.usu_nombre LIKE ? OR u.usu_apellido LIKE ? OR u.usu_documento LIKE ?)`
      );
      values.push(
        `%${filters.usuario.value}%`,
        `%${filters.usuario.value}%`,
        `%${filters.usuario.value}%`
      );
    }
    if (filters?.concepto?.value) {
      where.push(`co.con_nombre LIKE ?`);
      values.push(`%${filters.concepto.value}%`);
    }
    if (filters?.datosCuenta?.value) {
      where.push(`nd.nod_datos_cuenta LIKE ?`);
      values.push(`%${filters.datosCuenta.value}%`);
    }

    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

    // ---------- SELECT PAGINADO ----------
    const [rowsData] = await conn.query(
      `
      SELECT
        nd.nod_id              AS nodId,
        nd.nom_id              AS nomId,

        -- Maestro Usuario
        nd.usu_id              AS usuId,
        u.usu_documento        AS usuarioDocumento,
        CONCAT(COALESCE(u.usu_nombre,''), ' ', COALESCE(u.usu_apellido,'')) AS usuario,

        -- Maestro Periodo
        nd.prd_id              AS prdId,
        pr.prd_fec_inicio         AS periodoFechaIni,
        pr.prd_fec_fin         AS periodoFechaFin,
        CONCAT(DATE_FORMAT(pr.prd_fec_inicio, '%Y-%m-%d'),' ↦ ',DATE_FORMAT(pr.prd_fec_fin,'%Y-%m-%d')) AS periodo,

        -- Maestro Tipo Documento Nómina
        nd.tdn_id              AS tdnId,
        td.tdn_nombre          AS tipoDoc,

        -- Maestro Concepto Nómina
        nd.con_id              AS conId,
        co.con_nombre          AS concepto,

        -- Maestro Plan de Cuenta Contable
        nd.pcc_id              AS pccId,
        pc.pcc_nombre          AS planCuenta,

        -- Maestro Centro de Costo
        nd.cco_id              AS ccoId,
        CONCAT(COALESCE(cc.cco_codigo,''),' - ',COALESCE(cc.cco_nombre,'')) AS centroCosto,

        -- Detalle contable y montos
        nd.nod_puc             AS PUC,
        nd.nod_cuenta_contable AS cuentaContable,
        nd.nod_tipo_tercero    AS tipoTercero,
        nd.nod_tercero         AS tercero,
        nd.nod_valor_debito    AS debito,
        nd.nod_valor_credito   AS credito,
        nd.nod_base_impuesto   AS baseImpuesto,

        -- NUEVO: DatosCuenta
        nd.nod_datos_cuenta    AS datosCuenta

      FROM tbl_nomina_detalle nd
      LEFT JOIN tbl_usuarios                u  ON u.usu_id = nd.usu_id
      LEFT JOIN tbl_periodo                 pr ON pr.prd_id = nd.prd_id
      LEFT JOIN tbl_tipo_documento_nomina   td ON td.tdn_id = nd.tdn_id
      LEFT JOIN tbl_concepto_nomina         co ON co.con_id = nd.con_id
      LEFT JOIN tbl_plan_cuenta_contable    pc ON pc.pcc_id = nd.pcc_id
      LEFT JOIN tbl_centro_costos           cc ON cc.cco_id = nd.cco_id
      ${whereSql}
      ORDER BY ${sortCol} ${order}
      LIMIT ${Number(rows)} OFFSET ${Number(first)}
      `,
      [...values]
    );

    // ---------- TOTAL PARA PAGINADOR ----------
    const [[{ total }]] = await conn.query(
      `
      SELECT COUNT(*) AS total
      FROM tbl_nomina_detalle nd
      LEFT JOIN tbl_usuarios                u  ON u.usu_id = nd.usu_id
      LEFT JOIN tbl_periodo                 pr ON pr.prd_id = nd.prd_id
      LEFT JOIN tbl_tipo_documento_nomina   td ON td.tdn_id = nd.tdn_id
      LEFT JOIN tbl_concepto_nomina         co ON co.con_id = nd.con_id
      LEFT JOIN tbl_plan_cuenta_contable    pc ON pc.pcc_id = nd.pcc_id
      LEFT JOIN tbl_centro_costos           cc ON cc.cco_id = nd.cco_id
      ${whereSql}
      `,
      values
    );

    return { items: rowsData, total: Number(total) || 0 };
  } finally {
    if (release && conn) releaseConnection(conn);
  }
};

/**
 * Upsert (insert/update) de detalle.
 * data: {
 *  nodId?, nomId, usuId, prdId, tdnId, conId, pccId, ccoId,
 *  nod_puc, nod_cuenta_contable, nod_tipo_tercero, nod_tercero,
 *  nod_valor_debito, nod_valor_credito, nod_base_impuesto,
 *  nod_usu_reg (para insert) / usuact (para update opcional)
 * }
 */
export const upsertDetail = async ({ connection = null, data }) => {
  let conn = connection,
    release = false;
  try {
    if (!conn) {
      conn = await getConnection();
      release = true;
    }
    await conn.beginTransaction();

    const {
      nodId = 0,
      nomId,
      usuId,
      prdId,
      tdnId,
      conId,
      pccId,
      ccoId,
      nod_puc = 0,
      nod_cuenta_contable = 0,
      nod_tipo_tercero = 1,
      nod_tercero = null,
      nod_valor_debito = 0,
      nod_valor_credito = 0,
      nod_base_impuesto = 0,
      nod_usu_reg = null,
      usuact = null,
    } = data;

    if (!nomId) throw new Error("nomId es obligatorio.");

    if (nodId) {
      // UPDATE
      await conn.query(
        `
        UPDATE tbl_nomina_detalle
           SET usu_id = ?, prd_id = ?, tdn_id = ?, con_id = ?, pcc_id = ?, cco_id = ?,
               nod_puc = ?, nod_cuenta_contable = ?, nod_tipo_tercero = ?, nod_tercero = ?,
               nod_valor_debito = ?, nod_valor_credito = ?, nod_base_impuesto = ?,
               nod_usu_act = ?, nod_fec_act = CURRENT_TIMESTAMP
         WHERE nod_id = ? AND nom_id = ? AND nod_eliminado = 0
        `,
        [
          usuId,
          prdId,
          tdnId,
          conId,
          pccId,
          ccoId,
          nod_puc,
          nod_cuenta_contable,
          nod_tipo_tercero,
          nod_tercero,
          nod_valor_debito,
          nod_valor_credito,
          nod_base_impuesto,
          usuact,
          nodId,
          nomId,
        ]
      );

      await conn.commit();
      return { message: "Detalle actualizado.", nodId, action: "update" };
    } else {
      // INSERT
      const [ins] = await conn.query(
        `
        INSERT INTO tbl_nomina_detalle
          (nom_id, usu_id, prd_id, tdn_id, con_id, pcc_id, cco_id,
           nod_puc, nod_cuenta_contable, nod_tipo_tercero, nod_tercero,
           nod_valor_debito, nod_valor_credito, nod_base_impuesto,
           nod_eliminado, nod_usu_reg)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,0,?)
        `,
        [
          nomId,
          usuId,
          prdId,
          tdnId,
          conId,
          pccId,
          ccoId,
          nod_puc,
          nod_cuenta_contable,
          nod_tipo_tercero,
          nod_tercero,
          nod_valor_debito,
          nod_valor_credito,
          nod_base_impuesto,
          nod_usu_reg,
        ]
      );
      await conn.commit();
      return {
        message: "Detalle creado.",
        nodId: ins.insertId,
        action: "create",
      };
    }
  } catch (e) {
    if (connection === null)
      try {
        await conn?.rollback();
      } catch {}
    throw e;
  } finally {
    if (release && conn) releaseConnection(conn);
  }
};

/** Delete (hard o soft, aquí hard delete como en tu import diff) */
export const deleteDetail = async ({
  connection = null,
  nodId,
  nomId,
  usuact,
}) => {
  let conn = connection,
    release = false;
  try {
    if (!conn) {
      conn = await getConnection();
      release = true;
    }
    await conn.beginTransaction();

    await conn.query(
      `DELETE FROM tbl_nomina_detalle WHERE nod_id = ? AND nom_id = ?`,
      [nodId, nomId]
    );

    // histórico de actualización por eliminación puntual (opcional)
    await conn.query(
      `
      INSERT INTO tbl_nomina_historico
        (nom_id, usu_id, noh_accion, noh_estado_anterior, noh_estado_nuevo, noh_comentario)
      VALUES (?, ?, '2', 'actualizada', 'actualizada', 'Eliminación de detalle (UI)')
      `,
      [nomId, usuact]
    );

    await conn.commit();
    return { message: "Detalle eliminado.", nodId };
  } catch (e) {
    if (connection === null)
      try {
        await conn?.rollback();
      } catch {}
    throw e;
  } finally {
    if (release && conn) releaseConnection(conn);
  }
};

/* =============== PRESUPUESTO =============== */

/**
 * Paginación presupuesto por nómina.
 * params: { nomId, first=0, rows=20, sortField?, sortOrder?, filters? }
 */
export const paginateBudget = async ({ connection = null, params = {} }) => {
  let conn = connection,
    release = false;

  try {
    if (!conn) {
      conn = await getConnection();
      release = true;
    }

    const {
      nomId,
      first = 0,
      rows = 20,
      sortField = "preId",
      sortOrder = 1,
      filters = {},
    } = params;

    if (!nomId) throw new Error("nomId es obligatorio.");

    // Mapea campos de ordenamiento a columnas reales (incluye nombre de proyecto)
    const sortMap = {
      preId: "p.pre_id",
      proId: "p.blo_id",
      proNombre: "pr.blo_nombre",
      valor: "p.pre_valor",
      porcentaje: "p.pre_porcentaje",
    };
    const order = sortOrder === 1 ? "ASC" : "DESC";
    const sortCol = sortMap[sortField] || "p.pre_id";

    // WHERE + valores
    const where = [`p.nom_id = ?`];
    const values = [nomId];

    // (Opcional) filtros
    if (filters?.proNombre?.value) {
      where.push(`pr.blo_nombre LIKE ?`);
      values.push(`%${filters.proNombre.value}%`);
    }
    if (filters?.valorMin?.value != null) {
      where.push(`p.pre_valor >= ?`);
      values.push(Number(filters.valorMin.value) || 0);
    }
    if (filters?.valorMax?.value != null) {
      where.push(`p.pre_valor <= ?`);
      values.push(Number(filters.valorMax.value) || 0);
    }

    const whereSql = `WHERE ${where.join(" AND ")}`;

    // ========== DATA ==========
    const [rowsData] = await conn.query(
      `
      SELECT
        p.pre_id         AS preId,
        p.nom_id         AS nomId,
        p.blo_id         AS proId,
        pr.blo_nombre    AS proNombre,  
        p.pre_valor      AS valor,      
        p.pre_porcentaje AS porcentaje  
      FROM tbl_presupuesto p
      LEFT JOIN tbl_bloques pr ON pr.blo_id = p.blo_id
      ${whereSql}
      ORDER BY ${sortCol} ${order}
      LIMIT ${Number(rows)} OFFSET ${Number(first)}
      `,
      [...values]
    );

    // ========== TOTAL para paginador ==========
    const [[{ total }]] = await conn.query(
      `
      SELECT COUNT(*) AS total
      FROM tbl_presupuesto p
      LEFT JOIN tbl_bloques pr ON pr.blo_id = p.blo_id
      ${whereSql}
      `,
      values
    );

    return { items: rowsData, total: Number(total) || 0 };
  } finally {
    if (release && conn) releaseConnection(conn);
  }
};

/**
 * Upsert presupuesto.
 * data: { preId?, nomId, proId, pre_valor, pre_porcentaje, usu_reg?, usuact? }
 *  - Si existe (por UNIQUE nom_id+blo_id), haz UPDATE.
 */
export const upsertBudget = async ({ connection = null, data }) => {
  let conn = connection,
    release = false;
  try {
    if (!conn) {
      conn = await getConnection();
      release = true;
    }
    await conn.beginTransaction();

    const {
      preId = null,
      nomId,
      proId,
      pre_valor = 0,
      pre_porcentaje = 0,
      usu_reg = null,
      usuact = null,
    } = data;

    if (!nomId) throw new Error("nomId es obligatorio.");
    if (!proId && proId !== 0) throw new Error("proId es obligatorio.");

    if (preId) {
      await conn.query(
        `
        UPDATE tbl_presupuesto
           SET blo_id = ?, pre_valor = ?, pre_porcentaje = ?, pre_usu_act = ?, pre_fec_act = CURRENT_TIMESTAMP
         WHERE pre_id = ? AND nom_id = ?
        `,
        [proId, pre_valor, pre_porcentaje, usuact, preId, nomId]
      );
      await conn.commit();
      return { message: "Presupuesto actualizado.", preId, action: "update" };
    } else {
      const [[exist]] = await conn.query(
        `SELECT pre_id FROM tbl_presupuesto WHERE nom_id = ? AND blo_id = ? LIMIT 1`,
        [nomId, proId]
      );

      if (exist?.pre_id) {
        await conn.query(
          `
          UPDATE tbl_presupuesto
             SET pre_valor = ?, pre_porcentaje = ?, pre_usu_act = ?, pre_fec_act = CURRENT_TIMESTAMP
           WHERE pre_id = ?
          `,
          [pre_valor, pre_porcentaje, usuact, exist.pre_id]
        );
        await conn.commit();
        return {
          message: "Presupuesto actualizado.",
          preId: exist.pre_id,
          action: "update",
        };
      } else {
        const [ins] = await conn.query(
          `
          INSERT INTO tbl_presupuesto
            (nom_id, blo_id, pre_valor, pre_porcentaje, pre_usu_reg)
          VALUES (?,?,?,?,?)
          `,
          [nomId, proId, pre_valor, pre_porcentaje, usu_reg]
        );
        await conn.commit();
        return {
          message: "Presupuesto creado.",
          preId: ins.insertId,
          action: "create",
        };
      }
    }
  } catch (e) {
    if (connection === null)
      try {
        await conn?.rollback();
      } catch {}
    throw e;
  } finally {
    if (release && conn) releaseConnection(conn);
  }
};

export const deleteBudget = async ({
  connection = null,
  preId,
  nomId,
  usuact,
}) => {
  let conn = connection,
    release = false;
  try {
    if (!conn) {
      conn = await getConnection();
      release = true;
    }
    await conn.beginTransaction();

    await conn.query(
      `DELETE FROM tbl_presupuesto WHERE pre_id = ? AND nom_id = ?`,
      [preId, nomId]
    );

    // histórico opcional
    await conn.query(
      `
      INSERT INTO tbl_nomina_historico
        (nom_id, usu_id, noh_accion, noh_estado_anterior, noh_estado_nuevo, noh_comentario)
      VALUES (?, ?, '2', 'actualizada', 'actualizada', 'Eliminación de presupuesto (UI)')
      `,
      [nomId, usuact]
    );

    await conn.commit();
    return { message: "Presupuesto eliminado.", preId };
  } catch (e) {
    if (connection === null)
      try {
        await conn?.rollback();
      } catch {}
    throw e;
  } finally {
    if (release && conn) releaseConnection(conn);
  }
};

/* =============== ELIMINAR TODO (detalle + presupuesto) =============== */

export const deleteAllData = async ({ connection = null, nomId, usuId }) => {
  let conn = connection,
    release = false;
  try {
    if (!conn) {
      conn = await getConnection();
      release = true;
    }
    await conn.beginTransaction();

    await conn.query(`DELETE FROM tbl_nomina_detalle WHERE nom_id = ?`, [
      nomId,
    ]);
    await conn.query(`DELETE FROM tbl_presupuesto   WHERE nom_id = ?`, [nomId]);

    await conn.query(
      `
      INSERT INTO tbl_nomina_historico
        (nom_id, usu_id, noh_accion, noh_estado_anterior, noh_estado_nuevo, noh_comentario)
      VALUES (?, ?, '2', 'actualizada', 'actualizada', 'Eliminación total de detalle y presupuesto')
      `,
      [nomId, usuId]
    );

    await conn.commit();
    return { message: "Se eliminaron detalle y presupuesto.", nomId };
  } catch (e) {
    if (connection === null)
      try {
        await conn?.rollback();
      } catch {}
    throw e;
  } finally {
    if (release && conn) releaseConnection(conn);
  }
};

export async function runReporteEmpleado({ connection = null, nomId, tirId = null }) {
  let conn = connection;
  let release = false;

  try {
    if (!conn) {
      conn = await getConnection();
      release = true;
    }

    const [rs] = await conn.query(
      "CALL sp_reporte_nomina_empleado_con_rollup(?, ?)",
      [Number(nomId), tirId === null ? null : Number(tirId)]
    );

    const dataSet = Array.isArray(rs?.[0]) ? rs[0] : [];
    const projectsSet = Array.isArray(rs?.[1]) ? rs[1] : [];

    const columns = dataSet.length ? Object.keys(dataSet[0]) : [];

    const projectColors = {};
    for (const p of projectsSet) {
      if (p && p.col_alias) {
        projectColors[p.col_alias] = p.blo_color || null;
      }
    }

    return { columns, rows: dataSet, projectColors };
  } finally {
    if (release && conn) releaseConnection(conn);
  }
}


export async function getPayrollMatrixService({ nomId }) {
  let connection = null;
  try {
    connection = await getConnection();

    const proyectos = await executeQuery(
      `
      SELECT
        p.blo_id     AS proId,
        p.blo_nombre AS nombre,
        p.blo_color  AS color,
        CASE WHEN EXISTS (
          SELECT 1
          FROM tbl_nomina_empleado_proyecto nep
          WHERE nep.nom_id = ?        -- nómina actual
            AND nep.blo_id = p.blo_id -- proyecto
        ) THEN 1 ELSE 0 END AS hasUsers
      FROM tbl_bloques p
      WHERE p.blo_estado = 'activo' AND COALESCE(p.blo_eliminado,0) = 0
      ORDER BY p.blo_nombre ASC
      `,
      [nomId],
      connection
    );


    const columns = await executeQuery(
      `
      SELECT
        t.tir_id                                    AS tirId,
        t.tir_nombre                                AS nombre,
        COALESCE(SUM(x.debito),  0)                 AS totalDebito,
        COALESCE(SUM(x.credito), 0)                 AS totalCredito,
        COALESCE(SUM(x.neto),    0)                 AS totalNeto,
        CASE WHEN EXISTS (
          SELECT 1
          FROM tbl_nomina_empleado_tir net2
          WHERE net2.nom_id = ?           -- nómina actual
            AND net2.tir_id = t.tir_id    -- TIR
        ) THEN 1 ELSE 0 END AS hasUsers
      FROM tbl_tipo_reembolsable t
      LEFT JOIN (
        SELECT
          net.tir_id,
          et.debito,
          et.credito,
          et.neto
        FROM tbl_nomina_empleado_tir net
        JOIN (
          SELECT
            nd.nom_id,
            nd.usu_id,
            SUM(nd.nod_valor_debito)                        AS debito,
            SUM(nd.nod_valor_credito)                       AS credito,
            SUM(nd.nod_valor_debito - nd.nod_valor_credito) AS neto
          FROM tbl_nomina_detalle nd
          WHERE nd.nom_id = ?
          GROUP BY nd.nom_id, nd.usu_id
        ) et ON et.nom_id = net.nom_id AND et.usu_id = net.usu_id
        WHERE net.nom_id = ?
      ) x ON x.tir_id = t.tir_id
      GROUP BY t.tir_id, t.tir_nombre
      ORDER BY t.tir_nombre ASC
      `,
      [nomId, nomId, nomId],
      connection
    );

    const totalNomina = columns.reduce((acc, c) => acc + Number(c.totalNeto || 0), 0);

    const presupuesto = await executeQuery(
      `
      SELECT 
        pre_id      AS preId,
        nom_id      AS nomId,
        blo_id      AS proId,
        tir_id      AS tirId,
        pre_base    AS base,
        pre_valor   AS valor,
        pre_porcentaje AS porcentaje
      FROM tbl_presupuesto
      WHERE nom_id = ?
      `,
      [nomId],
      connection
    );

    const preMap = new Map();
    for (const row of presupuesto) {
      const key = `${row.proId}|${row.tirId}`;
      preMap.set(key, {
        preId: Number(row.preId),
        valor: Number(row.valor || 0),
        porcentaje: Number(row.porcentaje || 0),
      });
    }

    const emptyCells = {};
    for (const c of columns) emptyCells[c.tirId] = 0;

    const rows = proyectos.map((p) => {
      const cells = { ...emptyCells };
      const cellMeta = {};
      for (const c of columns) {
        const key = `${p.proId}|${c.tirId}`;
        if (preMap.has(key)) {
          const saved = preMap.get(key);
          cells[c.tirId] = saved.valor;
          cellMeta[c.tirId] = {
            preId: saved.preId,
            porcentaje: saved.porcentaje,
          };
        } else {
          cells[c.tirId] = 0;
          cellMeta[c.tirId] = null;
        }
      }
      return {
        proId: Number(p.proId),
        color: p.color,
        nombre: p.nombre,
        cells,
        cellMeta,
        disabled: !Boolean(p.hasUsers),
      };
    });

    return {
      nomId,
      columns: columns.map((c) => ({
        tirId: Number(c.tirId),
        nombre: c.nombre,
        totalDebito: Number(c.totalDebito || 0),
        totalCredito: Number(c.totalCredito || 0),
        totalNeto: Number(c.totalNeto || 0),
        // nuevo: marcar columna deshabilitada si no hay usuarios para este TIR en la nómina
        disabled: !Boolean(c.hasUsers),
      })),
      rows,
      totals: { totalNomina },
    };
  } catch (err) {
    throw err;
  } finally {
    releaseConnection(connection);
  }
}


export const upsertPayrollBudget = async ({
  payload,
  usuario,
  connection = null,
}) => {
  let conn = connection;
  let release = false;

  try {
    if (!conn) {
      conn = await getConnection();
      release = true;
    }

    const nomId = Number(payload.nomId);
    const preBase = Number(payload?.totales?.global?.baseNominaTotal ?? 0);

    // Normaliza items
    const items = (payload.items || []).map((it) => ({
      nomId,
      proId: Number(it.proId),
      tirId: Number(it.tirId),
      valor: Number(it.valor || 0),
      porcentaje: Number(it.porcentaje || 0),
    }));

    // Solo los que realmente se upsert-ean
    const toUpsert = items.filter((x) => x.valor > 0 || x.porcentaje > 0);

    // Tuplas clave para DELETE (de los que vienen en payload)
    const tuples = items
      .map((x) => `(${nomId},${x.proId},${x.tirId})`)
      .join(",");

    await conn.beginTransaction();

    // 1) Eliminar registros en ceros SOLO para las llaves del payload
    if (tuples.length) {
      const delSql = `
        DELETE FROM tbl_presupuesto
         WHERE (nom_id, blo_id, tir_id) IN (${tuples})
           AND pre_valor = 0
           AND pre_porcentaje = 0
      `;
      await conn.query(delSql);
    }

    // 2) Upsert de los que tienen datos
    if (toUpsert.length) {
      const values = toUpsert.map((x) => [
        x.nomId,
        x.proId,
        x.tirId,
        preBase,
        x.valor,
        x.porcentaje,
        usuario,
      ]);

      const upsertSql = `
        INSERT INTO tbl_presupuesto
          (nom_id, blo_id, tir_id, pre_base, pre_valor, pre_porcentaje, pre_usu_reg)
        VALUES ?
        ON DUPLICATE KEY UPDATE
          pre_base       = VALUES(pre_base),
          pre_valor      = VALUES(pre_valor),
          pre_porcentaje = VALUES(pre_porcentaje),
          pre_usu_act    = VALUES(pre_usu_reg),
          pre_fec_act    = CURRENT_TIMESTAMP
      `;
      await conn.query(upsertSql, [values]);
    }

    await conn.commit();

    return {
      ok: true,
      nomId,
      preBase,
      upserted: toUpsert.length,
      processedKeys: items.length,
      message: "Presupuesto actualizado.",
    };
  } catch (err) {
    if (conn) await conn.rollback();
    throw err;
  } finally {
    if (release && conn) releaseConnection(conn);
  }
};


export async function upsertPayrollEmployeesService({
  nomId,
  items,
  usuarioId,
  replaceProjects = true,
  replaceTirs = true,
}) {
  const toNum = (v) => (Number.isFinite(Number(v)) ? Number(v) : null);
  const normIds = (arr) =>
    Array.from(
      new Set(
        (Array.isArray(arr) ? arr : [])
          .map((x) => toNum(x))
          .filter((n) => Number.isInteger(n) && n > 0)
      )
    );

  let connection = null;

  // ===== validaciones =====
  const getValidTirSet = async (ids) => {
    if (!ids.length) return new Set();
    const ph = ids.map(() => "?").join(",");
    const rows = await executeQuery(
      `SELECT tir_id FROM tbl_tipo_reembolsable WHERE tir_id IN (${ph})`,
      ids,
      connection
    );
    return new Set(rows.map((r) => Number(r.tir_id)));
  };

  const getValidProSet = async (ids) => {
    if (!ids.length) return new Set();
    const ph = ids.map(() => "?").join(",");
    const rows = await executeQuery(
      `SELECT blo_id FROM tbl_bloques WHERE blo_id IN (${ph})`,
      ids,
      connection
    );
    return new Set(rows.map((r) => Number(r.blo_id)));
  };

  // ===== asociaciones =====
  const addNominaEmpleadoTirs = async ({ nom_id, usu_id, tirIds, usu_reg }) => {
    if (!tirIds.length) return;
    const rows = tirIds.map((id) => [nom_id, usu_id, id, usu_reg, usu_reg]);
    const ph = rows.map(() => "(?,?,?,?,?)").join(",");
    await executeQuery(
      `INSERT INTO tbl_nomina_empleado_tir
         (nom_id, usu_id, tir_id, netr_usu_reg, netr_usu_act)
       VALUES ${ph}
       ON DUPLICATE KEY UPDATE netr_usu_act=VALUES(netr_usu_act), netr_fec_act=CURRENT_TIMESTAMP`,
      rows.flat(),
      connection
    );
  };

  const addNominaEmpleadoProyectos = async ({
    nom_id,
    usu_id,
    proIds,
    usu_reg,
  }) => {
    if (!proIds.length) return;
    const rows = proIds.map((id) => [nom_id, usu_id, id, usu_reg, usu_reg]);
    const ph = rows.map(() => "(?,?,?,?,?)").join(",");
    await executeQuery(
      `INSERT INTO tbl_nomina_empleado_proyecto
         (nom_id, usu_id, blo_id, nepp_usu_reg, nepp_usu_act)
       VALUES ${ph}
       ON DUPLICATE KEY UPDATE nepp_usu_act=VALUES(nepp_usu_act), nepp_fec_act=CURRENT_TIMESTAMP`,
      rows.flat(),
      connection
    );
  };

  const deleteMissingFromSet = async ({
    table,
    col,
    nom_id,
    usu_id,
    keepIds,
  }) => {
    if (!keepIds.length) {
      await executeQuery(
        `DELETE FROM ${table} WHERE nom_id=? AND usu_id=?`,
        [nom_id, usu_id],
        connection
      );
      return;
    }
    const ph = keepIds.map(() => "?").join(",");
    await executeQuery(
      `DELETE FROM ${table}
        WHERE nom_id=? AND usu_id=? AND ${col} NOT IN (${ph})`,
      [nom_id, usu_id, ...keepIds],
      connection
    );
  };

  // ===== datos =====
  const getEmpTotal = async (nomId, usuId) => {
    const rows = await executeQuery(
      `SELECT COALESCE(SUM(nd.nod_valor_debito - nd.nod_valor_credito),0) AS total
         FROM tbl_nomina_detalle nd
        WHERE nd.nom_id=? AND nd.usu_id=? AND nd.nod_eliminado=0`,
      [nomId, usuId],
      connection
    );
    return Number(rows?.[0]?.total || 0);
  };

  const getEmpProjects = async (nomId, usuId) => {
    const rows = await executeQuery(
      `SELECT blo_id FROM tbl_nomina_empleado_proyecto WHERE nom_id=? AND usu_id=?`,
      [nomId, usuId],
      connection
    );
    return rows.map((r) => Number(r.blo_id));
  };

  const getEmpProjectsOrDefault10 = async (nomId, usuId) => {
    const proIds = await getEmpProjects(nomId, usuId);
    return proIds.length ? proIds : [10];
  };

  const getCurrentTirs = async (nomId, usuId) => {
    const rows = await executeQuery(
      `SELECT tir_id FROM tbl_nomina_empleado_tir WHERE nom_id=? AND usu_id=?`,
      [nomId, usuId],
      connection
    );
    return rows.map((r) => Number(r.tir_id));
  };

  // ===== mutación de presupuesto (con clamp a 0) =====
  const ensurePresRow = async ({ nomId, proId, tirId }) => {
    await executeQuery(
      `INSERT IGNORE INTO tbl_presupuesto
         (nom_id, blo_id, tir_id, pre_base, pre_valor, pre_porcentaje, pre_usu_reg, pre_usu_act)
       VALUES (?,?,?,?,?,0,?,?)`,
      [nomId, proId, tirId, 0, 0, usuarioId, usuarioId],
      connection
    );
  };

  const upsertDeltaPresupuesto = async ({
    nomId,
    proId,
    tirId,
    delta,
    usuarioId,
  }) => {
    await ensurePresRow({ nomId, proId, tirId });
    await executeQuery(
      `UPDATE tbl_presupuesto
          SET pre_base   = GREATEST(0, pre_base  + ?),
              pre_valor  = GREATEST(0, pre_valor + ?),
              pre_usu_act= ?,
              pre_fec_act= CURRENT_TIMESTAMP
        WHERE nom_id=? AND blo_id=? AND tir_id=?`,
      [delta, delta, usuarioId, nomId, proId, tirId],
      connection
    );
  };

  const recalcPorcentajesNomina = async (nomId) => {
    const rows = await executeQuery(
      `SELECT COALESCE(SUM(pre_valor),0) AS total FROM tbl_presupuesto WHERE nom_id=?`,
      [nomId],
      connection
    );
    const total = Number(rows?.[0]?.total || 0);
    if (total <= 0) {
      await executeQuery(
        `UPDATE tbl_presupuesto SET pre_porcentaje=0 WHERE nom_id=?`,
        [nomId],
        connection
      );
      return;
    }
    await executeQuery(
      `UPDATE tbl_presupuesto
          SET pre_porcentaje = ROUND((pre_valor / ?) * 100, 4)
        WHERE nom_id=?`,
      [total, nomId],
      connection
    );
  };

  try {
    connection = await getConnection();
    await connection.beginTransaction();

    for (const raw of items || []) {
      const usuId = toNum(raw?.usuId);
      if (!usuId) continue;

      let didBudgetChange = false;

      // ======== cambio de TIR (versión simplificada) ========
      if (raw?.tirIds !== undefined || raw?.tirId !== undefined) {
        const newTirIds = raw?.tirIds
          ? normIds(raw.tirIds)
          : normIds([raw.tirId]);

        const validSet = await getValidTirSet(newTirIds);
        const invalid = newTirIds.filter((id) => !validSet.has(id));
        if (invalid.length) {
          const err = new Error(`tirIds inválidos: ${invalid.join(", ")}`);
          err.status = 400;
          throw err;
        }

        const oldTirs = await getCurrentTirs(nomId, usuId);
        const setNew = new Set(newTirIds);
        const setOld = new Set(oldTirs);
        const removedTirs = oldTirs.filter((id) => !setNew.has(id));
        const addedTirs = newTirIds.filter((id) => !setOld.has(id));

        if (removedTirs.length || addedTirs.length) {
          const empTotal = await getEmpTotal(nomId, usuId);
          const empProIds = await getEmpProjectsOrDefault10(nomId, usuId);

          // 1) Para cada TIR removido: restar equitativamente en TODOS los proyectos del empleado
          if (removedTirs.length) {
            const n = empProIds.length || 1;
            const eqDelta = -(empTotal / n); // negativo, equitativo
            for (const oldTirId of removedTirs) {
              for (const proId of empProIds) {
                await upsertDeltaPresupuesto({
                  nomId,
                  proId,
                  tirId: oldTirId,
                  delta: eqDelta,
                  usuarioId,
                });
              }
              didBudgetChange = true;
            }
          }

          // 2) Para cada TIR agregado: sumar TODO al proyecto 10
          if (addedTirs.length) {
            for (const newTirId of addedTirs) {
              await upsertDeltaPresupuesto({
                nomId,
                proId: 10,
                tirId: newTirId,
                delta: empTotal,
                usuarioId,
              });
            }
            didBudgetChange = true;
          }
        }

        if (replaceTirs) {
          await deleteMissingFromSet({
            table: "tbl_nomina_empleado_tir",
            col: "tir_id",
            nom_id: nomId,
            usu_id: usuId,
            keepIds: newTirIds,
          });
        }
        await addNominaEmpleadoTirs({
          nom_id: nomId,
          usu_id: usuId,
          tirIds: newTirIds,
          usu_reg: usuarioId,
        });
      }

      // ======== cambio de PROYECTOS (versión simplificada) ========
      if (raw?.proIds !== undefined || raw?.proId !== undefined) {
        const newProIds = raw?.proIds
          ? normIds(raw.proIds)
          : normIds([raw.proId]);

        const validSet = await getValidProSet(newProIds);
        const invalid = newProIds.filter((id) => !validSet.has(id));
        if (invalid.length) {
          const err = new Error(`proIds inválidos: ${invalid.join(", ")}`);
          err.status = 400;
          throw err;
        }

        const oldProIds = await getEmpProjects(nomId, usuId);
        const setNew = new Set(newProIds);
        const setOld = new Set(oldProIds);
        const removedProIds = oldProIds.filter((id) => !setNew.has(id));
        const addedProIds = newProIds.filter((id) => !setOld.has(id));

        // Regla simplificada: ante CUALQUIER cambio (agregue o quite),
        // para cada TIR actual, restar equitativamente el total del empleado
        // de los proyectos "viejos" (o 10 si no había) y sumar TODO al 10.
        if (removedProIds.length > 0 || addedProIds.length > 0) {
          const empTotal = await getEmpTotal(nomId, usuId);
          const currentTirs = await getCurrentTirs(nomId, usuId);
          const baseProIds = oldProIds.length ? oldProIds : [10];
          const n = baseProIds.length || 1;
          const eqDelta = -(empTotal / n); // negativo, equitativo en set viejo

          for (const tirId of currentTirs) {
            // 1) restar equitativamente de los proyectos anteriores
            for (const proId of baseProIds) {
              await upsertDeltaPresupuesto({
                nomId,
                proId,
                tirId,
                delta: eqDelta,
                usuarioId,
              });
            }
            // 2) sumar TODO al proyecto 10
            await upsertDeltaPresupuesto({
              nomId,
              proId: 10,
              tirId,
              delta: empTotal,
              usuarioId,
            });
          }
          didBudgetChange = true;
        }

        // Persistir asociaciones
        if (replaceProjects) {
          await deleteMissingFromSet({
            table: "tbl_nomina_empleado_proyecto",
            col: "blo_id",
            nom_id: nomId,
            usu_id: usuId,
            keepIds: newProIds,
          });
        }
        await addNominaEmpleadoProyectos({
          nom_id: nomId,
          usu_id: usuId,
          proIds: newProIds,
          usu_reg: usuarioId,
        });
      }

      if (didBudgetChange) {
        await recalcPorcentajesNomina(nomId);
      }
    }

    await connection.commit();
    return { ok: true };
  } catch (err) {
    await connection?.rollback();
    throw err;
  } finally {
    if (connection) releaseConnection(connection);
  }
}
