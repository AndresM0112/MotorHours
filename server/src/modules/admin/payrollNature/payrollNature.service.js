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
      SELECT nan_id AS id, nan_nombre AS nombre
      FROM tbl_naturaleza_nomina
      WHERE est_id = 1
      ORDER BY nan_nombre ASC
    `);

    return rows;
  } catch (err) {
    throw err;
  } finally {
    if (release) releaseConnection(conn);
  }
};

export const getById = async (nanId, connection = null) => {
  let conn = connection;
  let release = false;

  try {
    if (!conn) {
      conn = await getConnection();
      release = true;
    }

    const [[tipoReembolsable]] = await conn.query(
      `
      SELECT 
        nan_id AS nanId,
        nan_nombre AS nombre,
        est_id AS estId,
        nan_usu_reg AS usuarioRegistro,
        nan_fec_reg AS fechaRegistro,
        nan_usu_act AS usuarioActualiza,
        nan_fec_act AS fechaActualizacion
      FROM tbl_naturaleza_nomina
      WHERE nan_id = ? AND est_id = 1
      LIMIT 1
      `,
      [nanId]
    );

    return tipoReembolsable || null;
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
      nanId: "nan_id",
      nombre: "nan_nombre",
      estId: "est_id",
      fechaRegistro: "nan_fec_reg",
      fechaActualizacion: "nan_fec_act",
    };

    const sortColumn = sortMap[sortField] || "nan_nombre";

    const filters = [];
    const values = [];

    if (search) {
      filters.push(`t.nan_nombre LIKE ?`);
      values.push(`%${search}%`);
    }

    if (estId) {
      filters.push(`t.est_id = ?`);
      values.push(estId);
    } else {
      filters.push(`t.est_id != 3`);
    }

    const where = filters.length ? `WHERE ${filters.join(" AND ")}` : "";
    const fromClause = `FROM tbl_naturaleza_nomina t
  JOIN tbl_estados e ON e.est_id = t.est_id`;
    const [result] = await conn.query(
      `
  SELECT 
    t.nan_id AS nanId,
    t.nan_nombre AS nombre,
    t.est_id AS estId,
    e.est_nombre AS nombreEstado,
    t.nan_usu_reg AS usuarioRegistro,
    t.nan_fec_reg AS fechaRegistro,
    t.nan_usu_act AS usuarioActualiza,
    t.nan_fec_act AS fechaActualizacion
  ${fromClause}
  ${where}
  ORDER BY ${sortColumn} ${order}
  LIMIT ${Number(rows)} OFFSET ${Number(first)}
  `,
      [...values]
    );

    const [[count]] = await conn.query(
      `
  SELECT COUNT(t.nan_id) AS total
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

  const { nanId = 0, nombre, estId = 1, usureg, usuact } = data;

  try {
    if (!conn) {
      conn = await getConnection();
      release = true;
    }

    await conn.beginTransaction();

    const nombreUpper = nombre.trim().toUpperCase();

    // Validar si el nombre ya existe (excepto para sí mismo en update)
    let query = `
  SELECT nan_id FROM tbl_naturaleza_nomina 
  WHERE UPPER(TRIM(nan_nombre)) = ? AND est_id != 3
`;

    const values = [nombreUpper];

    if (nanId > 0) {
      query += ` AND nan_id != ?`;
      values.push(nanId);
    }

    const [existing] = await conn.query(query, values);

    if (existing.length > 0) {
      throw new Error("Ya existe un registro con ese nombre");
    }

    const payload = {
      nan_nombre: nombreUpper,
      est_id: estId,
      nan_usu_act: usuact,
    };

    if (nanId > 0) {
      await conn.query(
        `
    UPDATE tbl_naturaleza_nomina
    SET ?, nan_fec_act = CURRENT_TIMESTAMP
    WHERE nan_id = ?`,
        [payload, nanId]
      );
    } else {
      payload.nan_usu_reg = usureg;
      const [insert] = await conn.query(
        `INSERT INTO tbl_naturaleza_nomina SET ?`,
        [payload]
      );
      payload.nan_id = insert.insertId;
    }

    await conn.commit();

    return {
      message: "registro guardado correctamente",
      nanId: payload.nan_id || nanId,
    };
  } catch (err) {
    if (conn) await conn.rollback();
    throw err;
  } finally {
    if (release) releaseConnection(conn);
  }
};

export const remove = async (nanIds, usuario, connection = null) => {
  let conn = connection;
  let release = false;

  try {
    if (!conn) {
      conn = await getConnection();
      release = true;
    }

    const ids = Array.isArray(nanIds) ? nanIds : [nanIds];
    const placeholders = ids.map(() => "?").join(", ");

    await conn.query(
      `
      UPDATE tbl_naturaleza_nomina
      SET est_id = 3,
          nan_usu_act = ?,
          nan_fec_act = CURRENT_TIMESTAMP
      WHERE nan_id IN (${placeholders})`,
      [usuario, ...ids]
    );
  } catch (err) {
    throw err;
  } finally {
    if (release) releaseConnection(conn);
  }
};
