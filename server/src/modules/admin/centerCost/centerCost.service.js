import {
  getConnection,
  releaseConnection,
} from "../../../common/configs/db.config.js";

export const getAll = async ({ gerId = null } = {}, connection = null) => {
  let conn = connection;
  let release = false;

  try {
    if (!conn) {
      conn = await getConnection();
      release = true;
    }

    const filters = ["t.est_id = 1"];
    const values = [];

    if (gerId) {
      filters.push("t.ger_id = ?");
      values.push(gerId);
    }

    const where = `WHERE ${filters.join(" AND ")}`;

    const [rows] = await conn.query(
      `
      SELECT 
        t.cco_id     AS id,
        t.cco_nombre AS nombre,
        t.cco_codigo AS codigo,
        t.ger_id     AS gerId,
        g.ger_nombre AS nombreGerencia
      FROM tbl_centro_costos t
      LEFT JOIN tbl_gerencia g ON g.ger_id = t.ger_id
      ${where}
      ORDER BY t.cco_nombre ASC
    `,
      values
    );

    return rows;
  } catch (err) {
    throw err;
  } finally {
    if (release) releaseConnection(conn);
  }
};

export const getById = async (ccoId, connection = null) => {
  let conn = connection;
  let release = false;

  try {
    if (!conn) {
      conn = await getConnection();
      release = true;
    }

    const [[centroCosto]] = await conn.query(
      `
      SELECT 
        t.cco_id       AS ccoId,
        t.cco_nombre   AS nombre,
        t.cco_codigo   AS codigo,
        t.est_id       AS estId,
        t.ger_id       AS gerId,
        g.ger_nombre   AS nombreGerencia,
        t.cco_usu_reg  AS usuarioRegistro,
        t.cco_fec_reg  AS fechaRegistro,
        t.cco_usu_act  AS usuarioActualiza,
        t.cco_fec_act  AS fechaActualizacion
      FROM tbl_centro_costos t
      LEFT JOIN tbl_gerencia g ON g.ger_id = t.ger_id
      WHERE t.cco_id = ? AND t.est_id = 1
      LIMIT 1
      `,
      [ccoId]
    );

    return centroCosto || null;
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
      gerId = null,
      rows = 10,
      first = 0,
      sortField = "nombre",
      sortOrder = 1,
    } = params;

    const order = sortOrder === 1 ? "ASC" : "DESC";

    const sortMap = {
      ccoId: "t.cco_id",
      codigo: "t.cco_codigo",
      nombre: "t.cco_nombre",
      estId: "t.est_id",
      fechaRegistro: "t.cco_fec_reg",
      fechaActualizacion: "t.cco_fec_act",
      gerId: "t.ger_id",
      nombreGerencia: "g.ger_nombre",
    };

    const sortColumn = sortMap[sortField] || "t.cco_nombre";

    const filters = [];
    const values = [];

    if (search) {
      filters.push(`t.cco_nombre LIKE ?`);
      values.push(`%${search}%`);
    }

    if (estId) {
      filters.push(`t.est_id = ?`);
      values.push(estId);
    } else {
      filters.push(`t.est_id != 3`);
    }

    if (gerId) {
      filters.push(`t.ger_id = ?`);
      values.push(gerId);
    }

    const where = filters.length ? `WHERE ${filters.join(" AND ")}` : "";
    const fromClause = `
      FROM tbl_centro_costos t
      JOIN tbl_estados e  ON e.est_id  = t.est_id
      LEFT JOIN tbl_gerencia g ON g.ger_id  = t.ger_id
    `;

    const [result] = await conn.query(
      `
      SELECT 
        t.cco_id       AS ccoId,
        t.cco_codigo   AS codigo,
        t.cco_nombre   AS nombre,
        t.est_id       AS estId,
        e.est_nombre   AS nombreEstado,
        t.ger_id       AS gerId,
        g.ger_nombre   AS nombreGerencia,
        t.cco_usu_reg  AS usuarioRegistro,
        t.cco_fec_reg  AS fechaRegistro,
        t.cco_usu_act  AS usuarioActualiza,
        t.cco_fec_act  AS fechaActualizacion
      ${fromClause}
      ${where}
      ORDER BY ${sortColumn} ${order}
      LIMIT ${Number(rows)} OFFSET ${Number(first)}
      `,
      values
    );

    const [[count]] = await conn.query(
      `
      SELECT COUNT(t.cco_id) AS total
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

  const { ccoId = 0, codigo, nombre, estId = 1, usureg, usuact, gerId } = data;

  try {
    if (!conn) {
      conn = await getConnection();
      release = true;
    }

    await conn.beginTransaction();

    const nombreUpper = nombre.trim().toUpperCase();
    const codigoUpper = codigo.trim().toUpperCase();

    // Validar gerencia existente
    const [[gerenciaExiste]] = await conn.query(
      `SELECT 1 AS ok FROM tbl_gerencia WHERE ger_id = ? LIMIT 1`,
      [gerId]
    );
    if (!gerenciaExiste) {
      throw new Error("La gerencia indicada no existe.");
    }

    // Validar duplicados (por gerencia, estado != 3)
    let query = `
      SELECT cco_id FROM tbl_centro_costos 
      WHERE (UPPER(TRIM(cco_nombre)) = ? OR UPPER(TRIM(cco_codigo)) = ?)
        AND est_id != 3
        AND ger_id = ?
    `;
    const values = [nombreUpper, codigoUpper, gerId];

    if (ccoId > 0) {
      query += ` AND cco_id != ?`;
      values.push(ccoId);
    }

    const [existing] = await conn.query(query, values);
    if (existing.length > 0) {
      throw new Error(
        "Ya existe un centro de costos con ese nombre o código en la misma gerencia."
      );
    }

    const centroCostoPayload = {
      cco_nombre: nombreUpper,
      cco_codigo: codigoUpper,
      est_id: estId,
      ger_id: gerId,
      cco_usu_act: usuact,
    };

    if (ccoId > 0) {
      await conn.query(
        `
        UPDATE tbl_centro_costos
        SET ?, cco_fec_act = CURRENT_TIMESTAMP
        WHERE cco_id = ?`,
        [centroCostoPayload, ccoId]
      );
    } else {
      centroCostoPayload.cco_usu_reg = usureg;
      const [insert] = await conn.query(`INSERT INTO tbl_centro_costos SET ?`, [
        centroCostoPayload,
      ]);
      centroCostoPayload.cco_id = insert.insertId;
    }

    await conn.commit();

    return {
      message: "Registro guardado correctamente",
      ccoId: centroCostoPayload.cco_id || ccoId,
    };
  } catch (err) {
    if (conn) await conn.rollback();
    throw err;
  } finally {
    if (release) releaseConnection(conn);
  }
};

export const remove = async (ccoIds, usuario, connection = null) => {
  let conn = connection;
  let release = false;

  try {
    if (!conn) {
      conn = await getConnection();
      release = true;
    }

    const ids = Array.isArray(ccoIds) ? ccoIds : [ccoIds];
    const placeholders = ids.map(() => "?").join(", ");

    await conn.query(
      `
      UPDATE tbl_centro_costos
      SET est_id = 3,
          cco_usu_act = ?,
          cco_fec_act = CURRENT_TIMESTAMP
      WHERE cco_id IN (${placeholders})`,
      [usuario, ...ids]
    );
  } catch (err) {
    throw err;
  } finally {
    if (release) releaseConnection(conn);
  }
};
