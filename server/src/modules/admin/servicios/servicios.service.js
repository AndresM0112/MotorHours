import {
  getConnection,
  releaseConnection,
} from "../../../common/configs/db.config.js";

export const saveServicio = async (data, connection = null) => {
  let conn = connection,
    release = false;

  const {
    id = 0,                  // id del servicio (0 = nuevo)
    moto_id,                 // id de la moto
    service_type,            // 'ALISTAMIENTO' o 'REPARACION'
    moto_hours,              // horas de servicio
  } = data;

  try {
    if (!conn) {
      conn = await getConnection();
      release = true;
    }

    await conn.beginTransaction();

    // Validaciones
    if (!moto_id || moto_id <= 0) {
      throw new Error("El id de la moto es requerido");
    }

    if (!service_type || !["ALISTAMIENTO", "REPARACION"].includes(service_type)) {
      throw new Error("El tipo de servicio debe ser 'ALISTAMIENTO' o 'REPARACION'");
    }

    if (moto_hours === undefined || moto_hours === null || moto_hours < 0) {
      throw new Error("Horas de servicio requeridas y debe ser mayor a 0");
    }

    // Validar que la moto existe
    const [motoExists] = await conn.query(
      `SELECT id FROM tbl_motos WHERE id = ?`,
      [moto_id]
    );
    if (!motoExists.length) {
      throw new Error("La moto no existe");
    }

    const servicioPayload = {
      moto_id,
      service_type,
      moto_hours: Number(moto_hours),
    };

    let newServicioId = id;

    if (id > 0) {
      // UPDATE servicio
      await conn.query(
        `UPDATE tbl_services SET ? WHERE id = ?`,
        [servicioPayload, id]
      );
    } else {
      // INSERT servicio
      const [ins] = await conn.query(
        `INSERT INTO tbl_services SET ?`,
        servicioPayload
      );
      newServicioId = ins.insertId;
    }

    await conn.commit();

    return {
      message: "Servicio guardado correctamente",
      id: newServicioId,
    };
  } catch (err) {
    if (conn) await conn.rollback();
    throw err;
  } finally {
    if (release) releaseConnection(conn);
  }
};

export const getServicios = async (filters = {}, connection = null) => {
  let conn = connection,
    release = false;

  try {
    if (!conn) {
      conn = await getConnection();
      release = true;
    }

    let sql = `
      SELECT 
        s.id,
        s.moto_id,
        s.service_type,
        s.moto_hours,
        s.created_at,
        m.type AS moto_type,
        m.pilot_id,
        p.name AS pilot_name
      FROM tbl_services s
      LEFT JOIN tbl_motos m ON m.id = s.moto_id
      LEFT JOIN tbl_pilots p ON p.id = m.pilot_id
      ORDER BY s.created_at DESC
    `;

    const [rows] = await conn.query(sql);
    return rows;
  } finally {
    if (release) releaseConnection(conn);
  }
};

export const getServicioById = async (id, connection = null) => {
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
        s.id,
        s.moto_id,
        s.service_type,
        s.moto_hours,
        s.created_at,
        m.type AS moto_type,
        m.pilot_id,
        p.name AS pilot_name
      FROM tbl_services s
      LEFT JOIN tbl_motos m ON m.id = s.moto_id
      LEFT JOIN tbl_pilots p ON p.id = m.pilot_id
      WHERE s.id = ?
      `,
      [id]
    );

    if (!rows.length) {
      return null;
    }

    return rows[0];
  } finally {
    if (release) releaseConnection(conn);
  }
};

export const deleteServicio = async (id, connection = null) => {
  let conn = connection,
    release = false;

  try {
    if (!conn) {
      conn = await getConnection();
      release = true;
    }

    await conn.beginTransaction();

    // Validar que el servicio existe
    const [servicioExists] = await conn.query(
      `SELECT id FROM tbl_services WHERE id = ?`,
      [id]
    );
    if (!servicioExists.length) {
      throw new Error("El servicio no existe");
    }

    await conn.query(`DELETE FROM tbl_services WHERE id = ?`, [id]);

    await conn.commit();

    return { message: "Servicio eliminado correctamente" };
  } catch (err) {
    if (conn) await conn.rollback();
    throw err;
  } finally {
    if (release) releaseConnection(conn);
  }
};

export const paginateServicios = async (params, connection = null) => {
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

    const moto_id = getFilter("moto_id");
    const service_type = getFilter("service_type");

    const order = sortOrder === 1 ? "ASC" : "DESC";
    const sortMap = {
      id: "s.id",
      moto_id: "s.moto_id",
      service_type: "s.service_type",
      moto_hours: "s.moto_hours",
      createdAt: "s.created_at",
    };
    const sortColumn = sortMap[sortField] || "s.id";

    const where = ["1=1"];
    const vals = [];

    // Búsqueda general (search)
    if (search) {
      where.push(`
        (
          s.service_type LIKE CONCAT('%', ?, '%')
          OR s.moto_hours LIKE CONCAT('%', ?, '%')
          OR m.type LIKE CONCAT('%', ?, '%')
        )
      `);
      vals.push(search, search, search);
    }

    // Filtro por moto_id
    if (moto_id) {
      where.push("s.moto_id = ?");
      vals.push(moto_id);
    }

    // Filtro por service_type
    if (service_type) {
      where.push("s.service_type = ?");
      vals.push(service_type);
    }

    const whereSql = `WHERE ${where.join(" AND ")}`;

    const sqlData = `
      SELECT
        s.id,
        s.moto_id,
        s.service_type,
        s.moto_hours,
        s.created_at AS createdAt,
        m.type AS moto_type,
        m.pilot_id,
        p.name AS pilot_name

      FROM tbl_services s
      LEFT JOIN tbl_motos m ON m.id = s.moto_id
      LEFT JOIN tbl_pilots p ON p.id = m.pilot_id
      ${whereSql}
      ORDER BY ${sortColumn} ${order}
      LIMIT ${Number(rows)} OFFSET ${Number(first)}
    `;

    const [rowsData] = await conn.query(sqlData, vals);

    const sqlCount = `
      SELECT COUNT(s.id) AS total
      FROM tbl_services s
      LEFT JOIN tbl_motos m ON m.id = s.moto_id
      LEFT JOIN tbl_pilots p ON p.id = m.pilot_id
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

export const getServiciosDropdown = async (connection = null, filters = {}) => {
  let conn = connection,
    release = false;

  try {
    if (!conn) {
      conn = await getConnection();
      release = true;
    }

    let sql = `
      SELECT
        s.id,
        CONCAT('Servicio #', s.id, ' - ', s.service_type, ' (', s.moto_hours, ' hrs)') AS label,
        s.moto_id,
        s.service_type,
        s.moto_hours,
        s.created_at AS createdAt,
        m.type AS moto_type,
        m.pilot_id,
        p.name AS pilot_name
      FROM tbl_services s
      LEFT JOIN tbl_motos m ON m.id = s.moto_id
      LEFT JOIN tbl_pilots p ON p.id = m.pilot_id
      WHERE 1=1
      ORDER BY s.created_at DESC
    `;

    const [rows] = await conn.query(sql);
    return rows;
  } finally {
    if (release) releaseConnection(conn);
  }
};
