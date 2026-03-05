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
      SELECT tir_id AS id, tir_nombre AS nombre
      FROM tbl_tipo_reembolsable
      WHERE est_id = 1
      ORDER BY tir_nombre ASC
    `);

    return rows;
  } catch (err) {
    throw err;
  } finally {
    if (release) releaseConnection(conn);
  }
};

export const getById = async (tirId, connection = null) => {
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
        tir_id AS tirId,
        tir_nombre AS nombre,
        est_id AS estId,
        tir_usu_reg AS usuarioRegistro,
        tir_fec_reg AS fechaRegistro,
        tir_usu_act AS usuarioActualiza,
        tir_fec_act AS fechaActualizacion
      FROM tbl_tipo_reembolsable
      WHERE tir_id = ? AND est_id = 1
      LIMIT 1
      `,
      [tirId]
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
      tirId: "tir_id",
      nombre: "tir_nombre",
      estId: "est_id",
      fechaRegistro: "tir_fec_reg",
      fechaActualizacion: "tir_fec_act",
    };

    const sortColumn = sortMap[sortField] || "tir_nombre";

    const filters = [];
    const values = [];

    if (search) {
      filters.push(`t.tir_nombre LIKE ?`);
      values.push(`%${search}%`);
    }

    if (estId) {
      filters.push(`t.est_id = ?`);
      values.push(estId);
    } else {
      filters.push(`t.est_id != 3`);
    }

    const where = filters.length ? `WHERE ${filters.join(" AND ")}` : "";
    const fromClause = `FROM tbl_tipo_reembolsable t
  JOIN tbl_estados e ON e.est_id = t.est_id`;
    const [result] = await conn.query(
      `
  SELECT 
    t.tir_id AS tirId,
    t.tir_nombre AS nombre,
    t.est_id AS estId,
    e.est_nombre AS nombreEstado,
    t.tir_usu_reg AS usuarioRegistro,
    t.tir_fec_reg AS fechaRegistro,
    t.tir_usu_act AS usuarioActualiza,
    t.tir_fec_act AS fechaActualizacion
  ${fromClause}
  ${where}
  ORDER BY ${sortColumn} ${order}
  LIMIT ${Number(rows)} OFFSET ${Number(first)}
  `,
      [...values]
    );

    const [[count]] = await conn.query(
      `
  SELECT COUNT(t.tir_id) AS total
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

  const { tirId = 0, nombre, estId = 1, usureg, usuact } = data;
  console.log(data);
  
  try {
    if (!conn) {
      conn = await getConnection();
      release = true;
    }

    await conn.beginTransaction();

    const nombreUpper = nombre.trim().toUpperCase();

    // Validar si el nombre ya existe (excepto para sí mismo en update)
    let query = `
  SELECT tir_id FROM tbl_tipo_reembolsable 
  WHERE UPPER(TRIM(tir_nombre)) = ? AND est_id != 3
`;

    const values = [nombreUpper];

    if (tirId > 0) {
      query += ` AND tir_id != ?`;
      values.push(tirId);
    }

    const [existing] = await conn.query(query, values);

    if (existing.length > 0) {
      throw new Error("Ya existe un tipo de reembolsable con ese nombre");
    }

    const payload = {
      tir_nombre: nombreUpper,
      est_id: estId,
      tir_usu_act: usuact
    };

    if (tirId > 0) {
      await conn.query(
        `
    UPDATE tbl_tipo_reembolsable
    SET ?, tir_fec_act = CURRENT_TIMESTAMP
    WHERE tir_id = ?`,
        [payload, tirId]
      );
    } else {
      payload.tir_usu_reg = usureg;
      const [insert] = await conn.query(
        `INSERT INTO tbl_tipo_reembolsable SET ?`,
        [payload]
      );
      payload.tir_id = insert.insertId;
    }

    await conn.commit();

    return {
      message: "tipo de reembolsable guardada correctamente",
      tirId: payload.tir_id || tirId,
    };
  } catch (err) {
    if (conn) await conn.rollback();
    throw err;
  } finally {
    if (release) releaseConnection(conn);
  }
};

export const remove = async (tirIds, usuario, connection = null) => {
  let conn = connection;
  let release = false;

  try {
    if (!conn) {
      conn = await getConnection();
      release = true;
    }

    const ids = Array.isArray(tirIds) ? tirIds : [tirIds];
    const placeholders = ids.map(() => "?").join(", ");

    await conn.query(
      `
      UPDATE tbl_tipo_reembolsable
      SET est_id = 3,
          tir_usu_act = ?,
          tir_fec_act = CURRENT_TIMESTAMP
      WHERE tir_id IN (${placeholders})`,
      [usuario, ...ids]
    );
  } catch (err) {
    throw err;
  } finally {
    if (release) releaseConnection(conn);
  }
};
