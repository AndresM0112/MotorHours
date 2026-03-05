import {
  getConnection,
  releaseConnection,
} from "../../../common/configs/db.config.js";

export const saveMoto = async (data, connection = null) => {
  let conn = connection,
    release = false;

  const {
    id = 0,                // id de la moto (0 = nueva)
    pilotId,               // pilot_id (FK a tbl_pilots.id)
    type,                  // tipo de moto
  } = data;

  try {
    if (!conn) {
      conn = await getConnection();
      release = true;
    }

    await conn.beginTransaction();

    // Validación: pilot_id requerido
    if (!pilotId) {
      throw new Error("El piloto es requerido");
    }

    // Validación: type requerido
    if (!type || !type.trim()) {
      throw new Error("El tipo de moto es requerido");
    }

    // Validar que el piloto existe
    const [pilotExists] = await conn.query(
      `SELECT id FROM tbl_pilots WHERE id = ?`,
      [pilotId]
    );
    if (!pilotExists.length) {
      throw new Error("El piloto no existe");
    }

    // Payload para INSERT/UPDATE
    const payload = {
      pilot_id: pilotId,
      type: type.trim(),
    };

    let newId = id;

    if (id > 0) {
      // UPDATE
      await conn.query(
        `
        UPDATE tbl_motos 
        SET ? 
        WHERE id = ?
        `,
        [payload, id]
      );
    } else {
      // INSERT
      const [ins] = await conn.query(
        `INSERT INTO tbl_motos SET ?`,
        payload
      );
      newId = ins.insertId;
    }

    await conn.commit();

    return {
      message: "Moto guardada correctamente",
      id: newId,
    };
  } catch (err) {
    if (conn) await conn.rollback();
    throw err;
  } finally {
    if (release) releaseConnection(conn);
  }
};

export const getMotos = async (filters = {}, connection = null) => {
  let conn = connection,
    release = false;

  const { pilotId = null } = filters;

  try {
    if (!conn) {
      conn = await getConnection();
      release = true;
    }

    let sql = `
      SELECT 
        m.id,
        m.pilot_id,
        m.type,
        m.created_at,
        p.name AS pilotName
      FROM tbl_motos m
      LEFT JOIN tbl_pilots p ON p.id = m.pilot_id
      WHERE 1=1
    `;
    const params = [];

    if (pilotId != null) {
      sql += ` AND m.pilot_id = ?`;
      params.push(pilotId);
    }

    sql += ` ORDER BY m.created_at DESC`;

    const [rows] = await conn.query(sql, params);
    return rows;
  } finally {
    if (release) releaseConnection(conn);
  }
};

export const getMotoById = async (id, connection = null) => {
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
        m.id,
        m.pilot_id,
        m.type,
        m.created_at,
        p.name AS pilotName
      FROM tbl_motos m
      LEFT JOIN tbl_pilots p ON p.id = m.pilot_id
      WHERE m.id = ?
      `,
      [id]
    );

    return rows[0] || null;
  } finally {
    if (release) releaseConnection(conn);
  }
};

export const deleteMoto = async (id, connection = null) => {
  let conn = connection,
    release = false;

  try {
    if (!conn) {
      conn = await getConnection();
      release = true;
    }

    await conn.beginTransaction();

    // Validar que la moto existe
    const [motoExists] = await conn.query(
      `SELECT id FROM tbl_motos WHERE id = ?`,
      [id]
    );
    if (!motoExists.length) {
      throw new Error("La moto no existe");
    }

    await conn.query(
      `DELETE FROM tbl_motos WHERE id = ?`,
      [id]
    );

    await conn.commit();

    return { message: "Moto eliminada correctamente" };
  } catch (err) {
    if (conn) await conn.rollback();
    throw err;
  } finally {
    if (release) releaseConnection(conn);
  }
};

export const paginateMotos = async (params, connection = null) => {
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

    const type       = getFilter("type");       // tipo de moto
    const pilotName  = getFilter("pilotName");  // nombre del piloto
    const pilotId    = getFilter("pilotId");    // id del piloto

    const order = sortOrder === 1 ? "ASC" : "DESC";
    const sortMap = {
      id: "m.id",
      type: "m.type",
      pilotName: "p.name",
      pilotId: "m.pilot_id",
      createdAt: "m.created_at",
    };
    const sortColumn = sortMap[sortField] || "m.id";

    const where = ["1=1"];
    const vals = [];

    // Búsqueda general (search)
    if (search) {
      where.push(`
        (
          UPPER(m.type) LIKE UPPER(CONCAT('%', ?, '%'))
          OR UPPER(p.name) LIKE UPPER(CONCAT('%', ?, '%'))
        )
      `);
      vals.push(search, search);
    }

    // Filtro por tipo de moto
    if (!search && type) {
      where.push("UPPER(m.type) LIKE UPPER(CONCAT('%', ?, '%'))");
      vals.push(type);
    }

    // Filtro por nombre del piloto
    if (pilotName) {
      where.push("UPPER(p.name) LIKE UPPER(CONCAT('%', ?, '%'))");
      vals.push(pilotName);
    }

    // Filtro por id del piloto
    if (pilotId) {
      where.push("m.pilot_id = ?");
      vals.push(pilotId);
    }

    const whereSql = `WHERE ${where.join(" AND ")}`;

    const sqlData = `
      SELECT
        m.id                 AS id,
        m.pilot_id           AS pilotId,
        m.type               AS type,
        m.created_at         AS createdAt,
        p.name               AS pilotName,
        p.id                 AS pilotInfo

      FROM tbl_motos m
      LEFT JOIN tbl_pilots p
             ON p.id = m.pilot_id
      ${whereSql}
      ORDER BY ${sortColumn} ${order}
      LIMIT ${Number(rows)} OFFSET ${Number(first)}
    `;

    const [rowsData] = await conn.query(sqlData, vals);

    const sqlCount = `
      SELECT COUNT(*) AS total
      FROM tbl_motos m
      LEFT JOIN tbl_pilots p
             ON p.id = m.pilot_id
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

export const getMotosDropdown = async (connection = null, filters = {}) => {
  let conn = connection,
    release = false;

  const { pilotId = null } = filters;

  try {
    if (!conn) {
      conn = await getConnection();
      release = true;
    }

    let sql = `
      SELECT
        m.id         AS id,
        m.type       AS label,
        m.pilot_id   AS pilotId,
        p.name       AS pilotName,
        m.created_at AS createdAt
      FROM tbl_motos m
      LEFT JOIN tbl_pilots p ON p.id = m.pilot_id
      WHERE 1=1
    `;
    const params = [];

    if (pilotId != null) {
      sql += ` AND m.pilot_id = ?`;
      params.push(pilotId);
    }

    sql += ` ORDER BY m.type ASC`;

    const [rows] = await conn.query(sql, params);
    return rows;
  } finally {
    if (release) releaseConnection(conn);
  }
};
