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
      SELECT tcn_id AS id, tcn_nombre AS nombre
      FROM tbl_tipo_conceptonomina
      WHERE est_id = 1
      ORDER BY tcn_nombre ASC
    `);

    return rows;
  } catch (err) {
    throw err;
  } finally {
    if (release) releaseConnection(conn);
  }
};

export const getById = async (tcnId, connection = null) => {
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
        tcn_id AS tcnId,
        tcn_nombre AS nombre,
        est_id AS estId,
        tcn_usu_reg AS usuarioRegistro,
        tcn_fec_reg AS fechaRegistro,
        tcn_usu_act AS usuarioActualiza,
        tcn_fec_act AS fechaActualizacion
      FROM tbl_tipo_conceptonomina
      WHERE tcn_id = ? AND est_id = 1
      LIMIT 1
      `,
      [tcnId]
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
      tcnId: "tcn_id",
      nombre: "tcn_nombre",
      estId: "est_id",
      fechaRegistro: "tcn_fec_reg",
      fechaActualizacion: "tcn_fec_act",
    };

    const sortColumn = sortMap[sortField] || "tcn_nombre";

    const filters = [];
    const values = [];

    if (search) {
      filters.push(`t.tcn_nombre LIKE ?`);
      values.push(`%${search}%`);
    }

    if (estId) {
      filters.push(`t.est_id = ?`);
      values.push(estId);
    } else {
      filters.push(`t.est_id != 3`);
    }

    const where = filters.length ? `WHERE ${filters.join(" AND ")}` : "";
    const fromClause = `FROM tbl_tipo_conceptonomina t
  JOIN tbl_estados e ON e.est_id = t.est_id`;
    const [result] = await conn.query(
      `
  SELECT 
    t.tcn_id AS tcnId,
    t.tcn_nombre AS nombre,
    t.est_id AS estId,
    e.est_nombre AS nombreEstado,
    t.tcn_usu_reg AS usuarioRegistro,
    t.tcn_fec_reg AS fechaRegistro,
    t.tcn_usu_act AS usuarioActualiza,
    t.tcn_fec_act AS fechaActualizacion
  ${fromClause}
  ${where}
  ORDER BY ${sortColumn} ${order}
  LIMIT ${Number(rows)} OFFSET ${Number(first)}
  `,
      [...values]
    );

    const [[count]] = await conn.query(
      `
  SELECT COUNT(t.tcn_id) AS total
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

  const { tcnId = 0, nombre, estId = 1, usureg, usuact } = data;

  try {
    if (!conn) {
      conn = await getConnection();
      release = true;
    }

    await conn.beginTransaction();

    const nombreUpper = nombre.trim().toUpperCase();

    // Validar si el nombre ya existe (excepto para sí mismo en update)
    let query = `
  SELECT tcn_id FROM tbl_tipo_conceptonomina 
  WHERE UPPER(TRIM(tcn_nombre)) = ? AND est_id != 3
`;

    const values = [nombreUpper];

    if (tcnId > 0) {
      query += ` AND tcn_id != ?`;
      values.push(tcnId);
    }

    const [existing] = await conn.query(query, values);

    if (existing.length > 0) {
      throw new Error("Ya existe un registro con ese nombre");
    }

    const payload = {
      tcn_nombre: nombreUpper,
      est_id: estId,
      tcn_usu_act: usuact,
    };

    if (tcnId > 0) {
      await conn.query(
        `
    UPDATE tbl_tipo_conceptonomina
    SET ?, tcn_fec_act = CURRENT_TIMESTAMP
    WHERE tcn_id = ?`,
        [payload, tcnId]
      );
    } else {
      payload.tcn_usu_reg = usureg;
      const [insert] = await conn.query(
        `INSERT INTO tbl_tipo_conceptonomina SET ?`,
        [payload]
      );
      payload.tcn_id = insert.insertId;
    }

    await conn.commit();

    return {
      message: "registro guardado correctamente",
      tcnId: payload.tcn_id || tcnId,
    };
  } catch (err) {
    if (conn) await conn.rollback();
    throw err;
  } finally {
    if (release) releaseConnection(conn);
  }
};

export const remove = async (tcnIds, usuario, connection = null) => {
  let conn = connection;
  let release = false;

  try {
    if (!conn) {
      conn = await getConnection();
      release = true;
    }

    const ids = Array.isArray(tcnIds) ? tcnIds : [tcnIds];
    const placeholders = ids.map(() => "?").join(", ");

    await conn.query(
      `
      UPDATE tbl_tipo_conceptonomina
      SET est_id = 3,
          tcn_usu_act = ?,
          tcn_fec_act = CURRENT_TIMESTAMP
      WHERE tcn_id IN (${placeholders})`,
      [usuario, ...ids]
    );
  } catch (err) {
    throw err;
  } finally {
    if (release) releaseConnection(conn);
  }
};
