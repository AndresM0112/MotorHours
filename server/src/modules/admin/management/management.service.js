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
      SELECT ger_id AS id, ger_nombre AS nombre
      FROM tbl_gerencia
      WHERE est_id = 1
      ORDER BY ger_nombre ASC
    `);

    return rows;
  } catch (err) {
    throw err;
  } finally {
    if (release) releaseConnection(conn);
  }
};

export const getById = async (gerId, connection = null) => {
  let conn = connection;
  let release = false;

  try {
    if (!conn) {
      conn = await getConnection();
      release = true;
    }

    const [[tipoAseguradora]] = await conn.query(
      `
      SELECT 
        ger_id AS gerId,
        ger_nombre AS nombre,
        est_id AS estId,
        ger_usu_reg AS usuarioRegistro,
        ger_fec_reg AS fechaRegistro,
        ger_usu_act AS usuarioActualiza,
        ger_fec_act AS fechaActualizacion
      FROM tbl_gerencia
      WHERE ger_id = ? AND est_id = 1
      LIMIT 1
      `,
      [gerId]
    );

    return tipoAseguradora || null;
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
      gerId: "ger_id",
      nombre: "ger_nombre",
      estId: "est_id",
      fechaRegistro: "ger_fec_reg",
      fechaActualizacion: "ger_fec_act",
    };

    const sortColumn = sortMap[sortField] || "ger_nombre";

    const filters = [];
    const values = [];

    if (search) {
      filters.push(`t.ger_nombre LIKE ?`);
      values.push(`%${search}%`);
    }

    if (estId) {
      filters.push(`t.est_id = ?`);
      values.push(estId);
    } else {
      filters.push(`t.est_id != 3`);
    }

    const where = filters.length ? `WHERE ${filters.join(" AND ")}` : "";
    const fromClause = `FROM tbl_gerencia t
  JOIN tbl_estados e ON e.est_id = t.est_id`;
    const [result] = await conn.query(
      `
  SELECT 
    t.ger_id AS gerId,
    t.ger_nombre AS nombre,
    t.est_id AS estId,
    e.est_nombre AS nombreEstado,
    t.ger_usu_reg AS usuarioRegistro,
    t.ger_fec_reg AS fechaRegistro,
    t.ger_usu_act AS usuarioActualiza,
    t.ger_fec_act AS fechaActualizacion
  ${fromClause}
  ${where}
  ORDER BY ${sortColumn} ${order}
  LIMIT ${Number(rows)} OFFSET ${Number(first)}
  `,
      [...values]
    );

    const [[count]] = await conn.query(
      `
  SELECT COUNT(t.ger_id) AS total
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

  const { gerId = 0, nombre, estId = 1, usureg, usuact } = data;

  try {
    if (!conn) {
      conn = await getConnection();
      release = true;
    }

    await conn.beginTransaction();

    const nombreUpper = nombre.trim().toUpperCase();

    // Validar si el nombre ya existe (excepto para sí mismo en update)
    let query = `
  SELECT ger_id FROM tbl_gerencia 
  WHERE UPPER(TRIM(ger_nombre)) = ? AND est_id != 3
`;

    const values = [nombreUpper];

    if (gerId > 0) {
      query += ` AND ger_id != ?`;
      values.push(gerId);
    }

    const [existing] = await conn.query(query, values);

    if (existing.length > 0) {
      throw new Error("Ya existe un registro con ese nombre");
    }

    const tipoAseguradoraPayload = {
      ger_nombre: nombreUpper,
      est_id: estId,
      ger_usu_act: usuact,
    };

    if (gerId > 0) {
      await conn.query(
        `
    UPDATE tbl_gerencia
    SET ?, ger_fec_act = CURRENT_TIMESTAMP
    WHERE ger_id = ?`,
        [tipoAseguradoraPayload, gerId]
      );
    } else {
      tipoAseguradoraPayload.ger_usu_reg = usureg;
      const [insert] = await conn.query(
        `INSERT INTO tbl_gerencia SET ?`,
        [tipoAseguradoraPayload]
      );
      tipoAseguradoraPayload.ger_id = insert.insertId;
    }

    await conn.commit();

    return {
      message: "registro guardada correctamente",
      gerId: tipoAseguradoraPayload.ger_id || gerId,
    };
  } catch (err) {
    if (conn) await conn.rollback();
    throw err;
  } finally {
    if (release) releaseConnection(conn);
  }
};

export const remove = async (gerIds, usuario, connection = null) => {
  let conn = connection;
  let release = false;

  try {
    if (!conn) {
      conn = await getConnection();
      release = true;
    }

    const ids = Array.isArray(gerIds) ? gerIds : [gerIds];
    const placeholders = ids.map(() => "?").join(", ");

    await conn.query(
      `
      UPDATE tbl_gerencia
      SET est_id = 3,
          ger_usu_act = ?,
          ger_fec_act = CURRENT_TIMESTAMP
      WHERE ger_id IN (${placeholders})`,
      [usuario, ...ids]
    );
  } catch (err) {
    throw err;
  } finally {
    if (release) releaseConnection(conn);
  }
};
