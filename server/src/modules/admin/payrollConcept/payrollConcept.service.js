import {
  getConnection,
  releaseConnection,
} from "../../../common/configs/db.config.js";

export const getAll = async (connection = null) => {
  let conn = connection;
  let release = false;

  try {
    if (!conn) {
      conn = await getConnection();
      release = true;
    }

    const [rows] = await conn.query(`
      SELECT con_id AS id, con_nombre AS nombre
      FROM tbl_concepto_nomina
      WHERE est_id = 1
      ORDER BY con_nombre ASC
    `);

    return rows;
  } catch (err) {
    throw err;
  } finally {
    if (release) releaseConnection(conn);
  }
};

export const getById = async (conId, connection = null) => {
  let conn = connection;
  let release = false;

  try {
    if (!conn) {
      conn = await getConnection();
      release = true;
    }

    const [[data]] = await conn.query(
      `
      SELECT 
        t.con_id AS conId,
        t.con_nombre AS nombre,
        t.con_prefijo AS prefijo,
        t.con_factor AS factor,
        t.con_fuera_nomina AS fueraNomina,
        t.con_req_fondo AS requiereFondo,
        t.con_predeterminado AS predeterminado,

        t.tcn_id AS tipoConceptoId,
        tc.tcn_nombre AS tipoConceptoNombre,

        t.nan_id AS naturalezaId,
        nn.nan_nombre AS naturalezaNombre,

        t.est_id AS estId,
        e.est_nombre AS estadoNombre,

        t.con_usu_reg AS usuarioRegistro,
        t.con_fec_reg AS fechaRegistro,
        t.con_usu_act AS usuarioActualiza,
        t.con_fec_act AS fechaActualizacion

      FROM tbl_concepto_nomina t
      LEFT JOIN tbl_tipo_conceptonomina tc ON tc.tcn_id = t.tcn_id
      LEFT JOIN tbl_naturaleza_nomina nn ON nn.nan_id = t.nan_id
      LEFT JOIN tbl_estados e ON e.est_id = t.est_id
      WHERE t.con_id = ? AND t.est_id = 1
      LIMIT 1
      `,
      [conId]
    );

    return data || null;
  } catch (err) {
    throw err;
  } finally {
    if (release) releaseConnection(conn);
  }
};

export const pagination = async (params, connection = null) => {
  let conn = connection;
  let release = false;

  try {
    if (!conn) {
      conn = await getConnection();
      release = true;
    }

    const {
      search = "",
      estId = null,
      rows = 10,
      first = 0,
      sortField = "nombre",
      sortOrder = 1,
    } = params;

    const order = sortOrder === 1 ? "ASC" : "DESC";

    const sortMap = {
      conId: "t.con_id",
      nombre: "t.con_nombre",
      prefijo: "t.con_prefijo",
      tipoConcepto: "tc.tcn_nombre",
      naturaleza: "nn.nan_nombre",
      factor: "t.con_factor",
      estado: "e.est_nombre",
      fechaRegistro: "t.con_fec_reg",
      fechaActualizacion: "t.con_fec_act",
    };

    const sortColumn = sortMap[sortField] || "t.con_nombre";

    const filters = [];
    const values = [];

    if (search) {
      filters.push(`t.con_nombre LIKE ?`);
      values.push(`%${search}%`);
    }

    if (estId) {
      filters.push(`t.est_id = ?`);
      values.push(estId);
    } else {
      filters.push(`t.est_id != 3`);
    }

    const where = filters.length ? `WHERE ${filters.join(" AND ")}` : "";

    const fromClause = `
      FROM tbl_concepto_nomina t
      LEFT JOIN tbl_estados e ON e.est_id = t.est_id
      LEFT JOIN tbl_tipo_conceptonomina tc ON tc.tcn_id = t.tcn_id
      LEFT JOIN tbl_naturaleza_nomina nn ON nn.nan_id = t.nan_id
    `;

    const [result] = await conn.query(
      `
      SELECT 
        t.con_id AS conId,
        t.con_nombre AS nombre,
        t.con_prefijo AS prefijo,
        t.con_factor AS factor,
        t.con_fuera_nomina AS fueraNomina,
        t.con_req_fondo AS requiereFondo,
        t.con_predeterminado AS predeterminado,
        t.tcn_id AS tcnId,
        tc.tcn_nombre AS tipoConceptoNombre,
        t.nan_id AS nanId,
        nn.nan_nombre AS naturalezaNombre,
        t.est_id AS estId,
        t.con_aplica AS aplica,
        e.est_nombre AS estadoNombre,
        t.con_usu_reg AS usuarioRegistro,
        t.con_fec_reg AS fechaRegistro,
        t.con_usu_act AS usuarioActualiza,
        t.con_fec_act AS fechaActualizacion
      ${fromClause}
      ${where}
      ORDER BY ${sortColumn} ${order}
      LIMIT ${Number(rows)} OFFSET ${Number(first)}
      `,
      [...values]
    );

    const [[count]] = await conn.query(
      `
      SELECT COUNT(t.con_id) AS total
      ${fromClause}
      ${where}
      `,
      values
    );

    return {
      results: result,
      total: count?.total || 0,
    };
  } catch (err) {
    throw err;
  } finally {
    if (release) releaseConnection(conn);
  }
};

export const save = async (data, connection = null) => {
  let conn = connection;
  let release = false;

  const {
    conId = 0,
    nombre,
    prefijo,
    tcnId,
    nanId,
    factor = 0,
    fueraNomina = 0,
    requiereFondo = 0,
    predeterminado = 0,
    estId = 1,
    aplica = 0,
    usureg,
    usuact,
  } = data;

  try {
    if (!conn) {
      conn = await getConnection();
      release = true;
    }

    await conn.beginTransaction();

    const nombreUpper = nombre.trim().toUpperCase();

    let query = `
      SELECT con_id FROM tbl_concepto_nomina 
      WHERE UPPER(TRIM(con_nombre)) = ? AND est_id != 3
    `;

    const values = [nombreUpper];

    if (conId > 0) {
      query += ` AND con_id != ?`;
      values.push(conId);
    }

    const [existing] = await conn.query(query, values);

    if (existing.length > 0) {
      throw new Error("Ya existe un registro con ese nombre");
    }

    const payload = {
      con_nombre: nombreUpper,
      con_prefijo: prefijo,
      tcn_id: tcnId,
      nan_id: nanId,
      con_factor: factor,
      con_fuera_nomina: fueraNomina,
      con_req_fondo: requiereFondo,
      con_predeterminado: predeterminado,
      est_id: estId,
      con_usu_act: usuact,
      con_aplica: aplica,
    };

    if (conId > 0) {
      await conn.query(
        `UPDATE tbl_concepto_nomina SET ?, con_fec_act = CURRENT_TIMESTAMP WHERE con_id = ?`,
        [payload, conId]
      );
    } else {
      payload.con_usu_reg = usureg;
      const [insert] = await conn.query(
        `INSERT INTO tbl_concepto_nomina SET ?`,
        [payload]
      );
      payload.con_id = insert.insertId;
    }

    await conn.commit();

    return {
      message: "Registro guardado correctamente",
      conId: payload.con_id || conId,
    };
  } catch (err) {
    if (conn) await conn.rollback();
    throw err;
  } finally {
    if (release) releaseConnection(conn);
  }
};

export const remove = async (conIds, usuario, connection = null) => {
  let conn = connection;
  let release = false;

  try {
    if (!conn) {
      conn = await getConnection();
      release = true;
    }

    const ids = Array.isArray(conIds) ? conIds : [conIds];
    const placeholders = ids.map(() => "?").join(", ");

    await conn.query(
      `
      UPDATE tbl_concepto_nomina
      SET est_id = 3,
          con_usu_act = ?,
          con_fec_act = CURRENT_TIMESTAMP
      WHERE con_id IN (${placeholders})`,
      [usuario, ...ids]
    );
  } catch (err) {
    throw err;
  } finally {
    if (release) releaseConnection(conn);
  }
};
