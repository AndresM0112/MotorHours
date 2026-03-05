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
      SELECT tia_id AS id, tia_nombre AS nombre
      FROM tbl_tipo_aseguradora
      WHERE est_id = 1
      ORDER BY tia_nombre ASC
    `);

    return rows;
  } catch (err) {
    throw err;
  } finally {
    if (release) releaseConnection(conn);
  }
};

export const getById = async (tiaId, connection = null) => {
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
        tia_id AS tiaId,
        tia_nombre AS nombre,
        est_id AS estId,
        tia_usu_reg AS usuarioRegistro,
        tia_fec_reg AS fechaRegistro,
        tia_usu_act AS usuarioActualiza,
        tia_fec_act AS fechaActualizacion
      FROM tbl_tipo_aseguradora
      WHERE tia_id = ? AND est_id = 1
      LIMIT 1
      `,
      [tiaId]
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
      tiaId: "tia_id",
      nombre: "tia_nombre",
      estId: "est_id",
      fechaRegistro: "tia_fec_reg",
      fechaActualizacion: "tia_fec_act",
    };

    const sortColumn = sortMap[sortField] || "tia_nombre";

    const filters = [];
    const values = [];

    if (search) {
      filters.push(`t.tia_nombre LIKE ?`);
      values.push(`%${search}%`);
    }

    if (estId) {
      filters.push(`t.est_id = ?`);
      values.push(estId);
    } else {
      filters.push(`t.est_id != 3`);
    }

    const where = filters.length ? `WHERE ${filters.join(" AND ")}` : "";
    const fromClause = `FROM tbl_tipo_aseguradora t
  JOIN tbl_estados e ON e.est_id = t.est_id`;
    const [result] = await conn.query(
      `
  SELECT 
    t.tia_id AS tiaId,
    t.tia_nombre AS nombre,
    t.est_id AS estId,
    e.est_nombre AS nombreEstado,
    t.tia_usu_reg AS usuarioRegistro,
    t.tia_fec_reg AS fechaRegistro,
    t.tia_usu_act AS usuarioActualiza,
    t.tia_fec_act AS fechaActualizacion
  ${fromClause}
  ${where}
  ORDER BY ${sortColumn} ${order}
  LIMIT ${Number(rows)} OFFSET ${Number(first)}
  `,
      [...values]
    );

    const [[count]] = await conn.query(
      `
  SELECT COUNT(t.tia_id) AS total
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

  const { tiaId = 0, nombre, estId = 1, usureg, usuact } = data;

  try {
    if (!conn) {
      conn = await getConnection();
      release = true;
    }

    await conn.beginTransaction();

    const nombreUpper = nombre.trim().toUpperCase();

    // Validar si el nombre ya existe (excepto para sí mismo en update)
    let query = `
  SELECT tia_id FROM tbl_tipo_aseguradora 
  WHERE UPPER(TRIM(tia_nombre)) = ? AND est_id != 3
`;

    const values = [nombreUpper];

    if (tiaId > 0) {
      query += ` AND tia_id != ?`;
      values.push(tiaId);
    }

    const [existing] = await conn.query(query, values);

    if (existing.length > 0) {
      throw new Error("Ya existe un tipo de aseguradora con ese nombre");
    }

    const tipoAseguradoraPayload = {
      tia_nombre: nombreUpper,
      est_id: estId,
      tia_usu_act: usuact,
    };

    if (tiaId > 0) {
      await conn.query(
        `
    UPDATE tbl_tipo_aseguradora
    SET ?, tia_fec_act = CURRENT_TIMESTAMP
    WHERE tia_id = ?`,
        [tipoAseguradoraPayload, tiaId]
      );
    } else {
      tipoAseguradoraPayload.tia_usu_reg = usureg;
      const [insert] = await conn.query(
        `INSERT INTO tbl_tipo_aseguradora SET ?`,
        [tipoAseguradoraPayload]
      );
      tipoAseguradoraPayload.tia_id = insert.insertId;
    }

    await conn.commit();

    return {
      message: "tipo de aseguradora guardada correctamente",
      tiaId: tipoAseguradoraPayload.tia_id || tiaId,
    };
  } catch (err) {
    if (conn) await conn.rollback();
    throw err;
  } finally {
    if (release) releaseConnection(conn);
  }
};

export const remove = async (tiaIds, usuario, connection = null) => {
  let conn = connection;
  let release = false;

  try {
    if (!conn) {
      conn = await getConnection();
      release = true;
    }

    const ids = Array.isArray(tiaIds) ? tiaIds : [tiaIds];
    const placeholders = ids.map(() => "?").join(", ");

    await conn.query(
      `
      UPDATE tbl_tipo_aseguradora
      SET est_id = 3,
          tia_usu_act = ?,
          tia_fec_act = CURRENT_TIMESTAMP
      WHERE tia_id IN (${placeholders})`,
      [usuario, ...ids]
    );
  } catch (err) {
    throw err;
  } finally {
    if (release) releaseConnection(conn);
  }
};
