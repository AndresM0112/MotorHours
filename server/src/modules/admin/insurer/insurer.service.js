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
      SELECT ase_id AS id, ase_nombre AS nombre
      FROM tbl_aseguradora
      WHERE est_id = 1
      ORDER BY ase_nombre ASC
    `);

    return rows;
  } catch (err) {
    throw err;
  } finally {
    if (release) releaseConnection(conn);
  }
};

export const getById = async (aseId, connection = null) => {
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
        ase_id AS aseId,
        ase_nombre AS nombre,
        est_id AS estId,
        ase_usu_reg AS usuarioRegistro,
        ase_fec_reg AS fechaRegistro,
        ase_usu_act AS usuarioActualiza,
        ase_fec_act AS fechaActualizacion
      FROM tbl_aseguradora
      WHERE ase_id = ? AND est_id = 1
      LIMIT 1
      `,
      [aseId]
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
      aseId: "ase_id",
      nombre: "ase_nombre",
      estId: "est_id",
      fechaRegistro: "ase_fec_reg",
      fechaActualizacion: "ase_fec_act",
    };

    const sortColumn = sortMap[sortField] || "ase_nombre";

    const filters = [];
    const values = [];

    if (search) {
      filters.push(`t.ase_nombre LIKE ?`);
      values.push(`%${search}%`);
    }

    if (estId) {
      filters.push(`t.est_id = ?`);
      values.push(estId);
    } else {
      filters.push(`t.est_id != 3`);
    }

    const where = filters.length ? `WHERE ${filters.join(" AND ")}` : "";
    const fromClause = `FROM tbl_aseguradora t
                        JOIN tbl_tipo_aseguradora ta ON t.tia_id = ta.tia_id
                        JOIN tbl_estados e ON e.est_id = t.est_id`;

    const [result] = await conn.query(
      `
      SELECT 
        t.ase_id AS aseId,
        t.ase_nombre AS nombre,
        t.ase_nit AS nit,
        t.tia_id AS tiaId,
        ta.tia_nombre AS tipoAseguradora,
        t.est_id AS estId,
        e.est_nombre AS nombreEstado,
        t.ase_usu_reg AS usuarioRegistro,
        t.ase_fec_reg AS fechaRegistro,
        t.ase_usu_act AS usuarioActualiza,
        t.ase_fec_act AS fechaActualizacion
      ${fromClause}
      ${where}
      ORDER BY ${sortColumn} ${order}
      LIMIT ${Number(rows)} OFFSET ${Number(first)}
  `,
      [...values]
    );

    const [[count]] = await conn.query(
      `
  SELECT COUNT(t.ase_id) AS total
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

  const { aseId = 0, nombre, nit, estId = 1, tiaId, usureg, usuact } = data;

  try {
    if (!conn) {
      conn = await getConnection();
      release = true;
    }

    await conn.beginTransaction();

    const nombreUpper = nombre.trim().toUpperCase();

    // Validar si el nombre ya existe (excepto para sí mismo en update)
    let query = `
  SELECT ase_id FROM tbl_aseguradora 
  WHERE UPPER(TRIM(ase_nombre)) = ? AND est_id != 3
`;

    const values = [nombreUpper];

    if (aseId > 0) {
      query += ` AND ase_id != ?`;
      values.push(aseId);
    }

    const [existing] = await conn.query(query, values);

    if (existing.length > 0) {
      throw new Error("Ya existe un registro con ese nombre");
    }

    const payload = {
      ase_nombre: nombreUpper,
      ase_nit: nit,
      tia_id: tiaId,
      est_id: estId,
      ase_usu_act: usuact,
    };

    if (aseId > 0) {
      await conn.query(
        `
    UPDATE tbl_aseguradora
    SET ?, ase_fec_act = CURRENT_TIMESTAMP
    WHERE ase_id = ?`,
        [payload, aseId]
      );
    } else {
      payload.ase_usu_reg = usureg;
      const [insert] = await conn.query(`INSERT INTO tbl_aseguradora SET ?`, [
        payload,
      ]);
      payload.ase_id = insert.insertId;
    }

    await conn.commit();

    return {
      message: "registro guardado correctamente",
      aseId: payload.ase_id || aseId,
    };
  } catch (err) {
    if (conn) await conn.rollback();
    throw err;
  } finally {
    if (release) releaseConnection(conn);
  }
};

export const remove = async (aseIds, usuario, connection = null) => {
  let conn = connection;
  let release = false;

  try {
    if (!conn) {
      conn = await getConnection();
      release = true;
    }

    const ids = Array.isArray(aseIds) ? aseIds : [aseIds];
    const placeholders = ids.map(() => "?").join(", ");

    await conn.query(
      `
      UPDATE tbl_aseguradora
      SET est_id = 3,
          ase_usu_act = ?,
          ase_fec_act = CURRENT_TIMESTAMP
      WHERE ase_id IN (${placeholders})`,
      [usuario, ...ids]
    );
  } catch (err) {
    throw err;
  } finally {
    if (release) releaseConnection(conn);
  }
};
