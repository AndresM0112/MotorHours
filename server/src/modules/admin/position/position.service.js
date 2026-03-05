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
      SELECT car_id AS id, car_nombre AS nombre
      FROM tbl_cargos
      WHERE est_id = 1
      ORDER BY car_nombre ASC
    `);

    return rows;
  } catch (err) {
    throw err;
  } finally {
    if (release) releaseConnection(conn);
  }
};

export const getById = async (carId, connection = null) => {
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
        car_id AS carId,
        car_nombre AS nombre,
        est_id AS estId,
        car_usu_reg AS usuarioRegistro,
        car_fec_reg AS fechaRegistro,
        car_usu_act AS usuarioActualiza,
        car_fec_act AS fechaActualizacion
      FROM tbl_cargos
      WHERE car_id = ? AND est_id = 1
      LIMIT 1
      `,
      [carId]
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
      carId: "car_id",
      nombre: "car_nombre",
      estId: "est_id",
      fechaRegistro: "car_fec_reg",
      fechaActualizacion: "car_fec_act",
    };

    const sortColumn = sortMap[sortField] || "car_nombre";

    const filters = [];
    const values = [];

    if (search) {
      filters.push(`t.car_nombre LIKE ?`);
      values.push(`%${search}%`);
    }

    if (estId) {
      filters.push(`t.est_id = ?`);
      values.push(estId);
    } else {
      filters.push(`t.est_id != 3`);
    }

    const where = filters.length ? `WHERE ${filters.join(" AND ")}` : "";
    const fromClause = `FROM tbl_cargos t
  JOIN tbl_estados e ON e.est_id = t.est_id`;
    const [result] = await conn.query(
      `
  SELECT 
    t.car_id AS carId,
    t.car_nombre AS nombre,
    t.est_id AS estId,
    e.est_nombre AS nombreEstado,
    t.car_usu_reg AS usuarioRegistro,
    t.car_fec_reg AS fechaRegistro,
    t.car_usu_act AS usuarioActualiza,
    t.car_fec_act AS fechaActualizacion
  ${fromClause}
  ${where}
  ORDER BY ${sortColumn} ${order}
  LIMIT ${Number(rows)} OFFSET ${Number(first)}
  `,
      [...values]
    );

    const [[count]] = await conn.query(
      `
  SELECT COUNT(t.car_id) AS total
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

  const { carId = 0, nombre, estId = 1, usureg, usuact } = data;

  try {
    if (!conn) {
      conn = await getConnection();
      release = true;
    }

    await conn.beginTransaction();

    const nombreUpper = nombre.trim().toUpperCase();

    // Validar si el nombre ya existe (excepto para sí mismo en update)
    let query = `
  SELECT car_id FROM tbl_cargos 
  WHERE UPPER(TRIM(car_nombre)) = ? AND est_id != 3
`;

    const values = [nombreUpper];

    if (carId > 0) {
      query += ` AND car_id != ?`;
      values.push(carId);
    }

    const [existing] = await conn.query(query, values);

    if (existing.length > 0) {
      throw new Error("Ya existe un registro con ese nombre");
    }

    const tipoAseguradoraPayload = {
      car_nombre: nombreUpper,
      est_id: estId,
      car_usu_act: usuact,
    };

    if (carId > 0) {
      await conn.query(
        `
    UPDATE tbl_cargos
    SET ?, car_fec_act = CURRENT_TIMESTAMP
    WHERE car_id = ?`,
        [tipoAseguradoraPayload, carId]
      );
    } else {
      tipoAseguradoraPayload.car_usu_reg = usureg;
      const [insert] = await conn.query(
        `INSERT INTO tbl_cargos SET ?`,
        [tipoAseguradoraPayload]
      );
      tipoAseguradoraPayload.car_id = insert.insertId;
    }

    await conn.commit();

    return {
      message: "registro guardada correctamente",
      carId: tipoAseguradoraPayload.car_id || carId,
    };
  } catch (err) {
    if (conn) await conn.rollback();
    throw err;
  } finally {
    if (release) releaseConnection(conn);
  }
};

export const remove = async (carIds, usuario, connection = null) => {
  let conn = connection;
  let release = false;

  try {
    if (!conn) {
      conn = await getConnection();
      release = true;
    }

    const ids = Array.isArray(carIds) ? carIds : [carIds];
    const placeholders = ids.map(() => "?").join(", ");

    await conn.query(
      `
      UPDATE tbl_cargos
      SET est_id = 3,
          car_usu_act = ?,
          car_fec_act = CURRENT_TIMESTAMP
      WHERE car_id IN (${placeholders})`,
      [usuario, ...ids]
    );
  } catch (err) {
    throw err;
  } finally {
    if (release) releaseConnection(conn);
  }
};
