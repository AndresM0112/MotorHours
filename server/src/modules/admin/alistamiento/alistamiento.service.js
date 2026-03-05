import {
  getConnection,
  releaseConnection,
} from "../../../common/configs/db.config.js";

export const saveAlistamiento = async (data, connection = null) => {
  let conn = connection,
    release = false;

  const {
    id = 0,                // id del alistamiento (0 = nuevo)
    description,           // descripción de la tarea
    active = 1,            // estado (1 = activo, 0 = inactivo)
  } = data;

  try {
    if (!conn) {
      conn = await getConnection();
      release = true;
    }

    await conn.beginTransaction();

    // Validación: description requerida
    if (!description || !description.trim()) {
      throw new Error("La descripción es requerida");
    }

    // Payload para INSERT/UPDATE
    const payload = {
      description: description.trim(),
      active: active ? 1 : 0,
    };

    let newId = id;

    if (id > 0) {
      // UPDATE
      await conn.query(
        `
        UPDATE tbl_alistamiento_tasks 
        SET ? 
        WHERE id = ?
        `,
        [payload, id]
      );
    } else {
      // INSERT
      const [ins] = await conn.query(
        `INSERT INTO tbl_alistamiento_tasks SET ?`,
        payload
      );
      newId = ins.insertId;
    }

    await conn.commit();

    return {
      message: "Alistamiento guardado correctamente",
      id: newId,
    };
  } catch (err) {
    if (conn) await conn.rollback();
    throw err;
  } finally {
    if (release) releaseConnection(conn);
  }
};

export const getAlistamientos = async (filters = {}, connection = null) => {
  let conn = connection,
    release = false;

  const { active = null } = filters;

  try {
    if (!conn) {
      conn = await getConnection();
      release = true;
    }

    let sql = `
      SELECT 
        id,
        description,
        active,
        created_at
      FROM tbl_alistamiento_tasks
      WHERE 1=1
    `;
    const params = [];

    if (active != null) {
      sql += ` AND active = ?`;
      params.push(active ? 1 : 0);
    }

    sql += ` ORDER BY created_at DESC`;

    const [rows] = await conn.query(sql, params);
    return rows;
  } finally {
    if (release) releaseConnection(conn);
  }
};

export const getAlistamientoById = async (id, connection = null) => {
  let conn = connection,
    release = false;

  try {
    if (!conn) {
      conn = await getConnection();
      release = true;
    }

    const [rows] = await conn.query(
      `
      SELECT 
        id,
        description,
        active,
        created_at
      FROM tbl_alistamiento_tasks
      WHERE id = ?
      `,
      [id]
    );

    return rows[0] || null;
  } finally {
    if (release) releaseConnection(conn);
  }
};

export const deleteAlistamiento = async (id, connection = null) => {
  let conn = connection,
    release = false;

  try {
    if (!conn) {
      conn = await getConnection();
      release = true;
    }

    await conn.beginTransaction();

    // Validar que el alistamiento existe
    const [alistamientoExists] = await conn.query(
      `SELECT id FROM tbl_alistamiento_tasks WHERE id = ?`,
      [id]
    );
    if (!alistamientoExists.length) {
      throw new Error("El alistamiento no existe");
    }

    await conn.query(
      `DELETE FROM tbl_alistamiento_tasks WHERE id = ?`,
      [id]
    );

    await conn.commit();

    return { message: "Alistamiento eliminado correctamente" };
  } catch (err) {
    if (conn) await conn.rollback();
    throw err;
  } finally {
    if (release) releaseConnection(conn);
  }
};

export const paginateAlistamientos = async (params, connection = null) => {
  let conn = connection,
    release = false;

  try {
    if (!conn) {
      conn = await getConnection();
      release = true;
    }

    const {
      // búsqueda
      search = "",

      // paginación
      rows = 10,
      first = 0,
      sortField = "id",
      sortOrder = 1,

      // filtros anidados opcionales
      filtros = {},
    } = params || {};

    // ACEPTA AMBOS: plano y anidado
    const getFilter = (k) => {
      const v1 = (filtros ?? {})[k];
      const v2 = params?.[k]; // plano
      const v = v1 ?? v2 ?? null;
      if (v === undefined || v === null) return null;
      const s = String(v).trim();
      return s.length ? s : null;
    };

    const description = getFilter("description");
    const active = getFilter("active");

    const order = sortOrder === 1 ? "ASC" : "DESC";
    const sortMap = {
      id: "id",
      description: "description",
      active: "active",
      createdAt: "created_at",
    };
    const sortColumn = sortMap[sortField] || "id";

    const where = ["1=1"];
    const vals = [];

    // Búsqueda general (search)
    if (search) {
      where.push(`UPPER(description) LIKE UPPER(CONCAT('%', ?, '%'))`);
      vals.push(search);
    }

    // Filtro por descripción
    if (!search && description) {
      where.push("UPPER(description) LIKE UPPER(CONCAT('%', ?, '%'))");
      vals.push(description);
    }

    // Filtro por estado
    if (active !== null && active !== "") {
      where.push("active = ?");
      vals.push(active ? 1 : 0);
    }

    const whereSql = `WHERE ${where.join(" AND ")}`;

    const sqlData = `
      SELECT
        id,
        description,
        active,
        created_at AS createdAt

      FROM tbl_alistamiento_tasks
      ${whereSql}
      ORDER BY ${sortColumn} ${order}
      LIMIT ${Number(rows)} OFFSET ${Number(first)}
    `;

    const [rowsData] = await conn.query(sqlData, vals);

    const sqlCount = `
      SELECT COUNT(*) AS total
      FROM tbl_alistamiento_tasks
      ${whereSql}
    `;

    const [[count]] = await conn.query(sqlCount, vals);

    return {
      results: rowsData,
      total: count?.total || 0,
    };
  } finally {
    if (release) releaseConnection(conn);
  }
};

export const getAlistamientosDropdown = async (connection = null, filters = {}) => {
  let conn = connection,
    release = false;

  const { active = null } = filters;

  try {
    if (!conn) {
      conn = await getConnection();
      release = true;
    }

    let sql = `
      SELECT
        id,
        description AS label,
        active,
        created_at AS createdAt
      FROM tbl_alistamiento_tasks
      WHERE 1=1
    `;
    const params = [];

    if (active != null) {
      sql += ` AND active = ?`;
      params.push(active ? 1 : 0);
    }

    sql += ` ORDER BY description ASC`;

    const [rows] = await conn.query(sql, params);
    return rows;
  } finally {
    if (release) releaseConnection(conn);
  }
};
