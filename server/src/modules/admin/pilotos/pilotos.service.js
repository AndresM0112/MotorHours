import {
  getConnection,
  releaseConnection,
} from "../../../common/configs/db.config.js";

export const savePiloto = async (data, connection = null) => {
  let conn = connection,
    release = false;

  const {id = 0, name, phone, email, moto = {},} = data;

  try {
    if (!conn) {
      conn = await getConnection();
      release = true;
    }

    await conn.beginTransaction();

    // Validación: name requerido
    if (!name || !name.trim()) {
      throw new Error("El nombre del piloto es requerido");
    }

    // Payload para piloto INSERT/UPDATE
    const pilotPayload = {
      name: name.trim(),
      phone: phone?.trim() || null,
      email: email?.trim() || null,
    };

    let newPilotoId = id;

    if (id > 0) {
      // UPDATE piloto
      await conn.query(
        `
        UPDATE tbl_pilots 
        SET ? 
        WHERE id = ?
        `,
        [pilotPayload, id],
      );
    } else {
      // INSERT piloto
      const [ins] = await conn.query(
        `INSERT INTO tbl_pilots SET ?`,
        pilotPayload,
      );
      newPilotoId = ins.insertId;
    }

    // Guardar moto asociada si viene en los datos
    let newMotoId = null;
    if (moto && Object.keys(moto).length > 0) {
      const { id: motoId = 0, type } = moto;

      // Validación: type requerido para moto
      if (!type || !type.trim()) {
        throw new Error("El tipo de moto es requerido");
      }

      const motoPayload = {
        pilot_id: newPilotoId,
        type: type.trim(),
      };

      if (motoId > 0) {
        // UPDATE moto
        await conn.query(
          `
          UPDATE tbl_motos 
          SET ? 
          WHERE id = ? AND pilot_id = ?
          `,
          [motoPayload, motoId, newPilotoId],
        );
        
        newMotoId = motoId;
      } else {
        // INSERT moto
        const [ins] = await conn.query(
          `INSERT INTO tbl_motos SET ?`,
          motoPayload,
        );
        newMotoId = ins.insertId;
      }
    }

    await conn.commit();

    return {
      message: "Piloto guardado correctamente",
      id: newPilotoId,
      motoId: newMotoId,
    };
  } catch (err) {
    if (conn) await conn.rollback();
    throw err;
  } finally {
    if (release) releaseConnection(conn);
  }
};

export const getPilotos = async (filters = {}, connection = null) => {
  let conn = connection,
    release = false;

  try {
    if (!conn) {
      conn = await getConnection();
      release = true;
    }

    const [rows] = await conn.query(`
      SELECT 
        p.id,
        p.name,
        p.phone,
        p.email,
        p.created_at AS createdAt,
        m.id AS motoId,
        m.type AS motoType
      FROM tbl_pilots p
      LEFT JOIN tbl_motos m ON m.pilot_id = p.id
      ORDER BY p.created_at DESC
    `);

    // Agrupar motos por piloto
    const pilotos = {};
    rows.forEach((row) => {
      if (!pilotos[row.id]) {
        pilotos[row.id] = {
          id: row.id,
          name: row.name,
          phone: row.phone,
          email: row.email,
          createdAt: row.createdAt,
          motos: [],
        };
      }
      if (row.motoId) {
        pilotos[row.id].motos.push({
          id: row.motoId,
          type: row.motoType,
        });
      }
    });

    return Object.values(pilotos);
  } finally {
    if (release) releaseConnection(conn);
  }
};

export const getPilotoById = async (id, connection = null) => {
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
        p.id,
        p.name,
        p.phone,
        p.email,
        p.created_at AS createdAt,
        m.id AS motoId,
        m.type AS motoType
      FROM tbl_pilots p
      LEFT JOIN tbl_motos m ON m.pilot_id = p.id
      WHERE p.id = ?
      `,
      [id],
    );

    if (!rows.length) {
      return null;
    }

    // Agrupar motos si hay varias
    const piloto = {
      id: rows[0].id,
      name: rows[0].name,
      phone: rows[0].phone,
      email: rows[0].email,
      createdAt: rows[0].createdAt,
      motos: rows
        .filter((r) => r.motoId)
        .map((r) => ({
          id: r.motoId,
          type: r.motoType,
        })),
    };

    return piloto;
  } finally {
    if (release) releaseConnection(conn);
  }
};

export const deletePiloto = async (id, connection = null) => {
  let conn = connection,
    release = false;

  try {
    if (!conn) {
      conn = await getConnection();
      release = true;
    }

    await conn.beginTransaction();

    // Validar que el piloto existe
    const [pilotoExists] = await conn.query(
      `SELECT id FROM tbl_pilots WHERE id = ?`,
      [id],
    );
    if (!pilotoExists.length) {
      throw new Error("El piloto no existe");
    }

    // Las motos se eliminarán automáticamente por FK CASCADE
    await conn.query(`DELETE FROM tbl_pilots WHERE id = ?`, [id]);

    await conn.commit();

    return { message: "Piloto eliminado correctamente" };
  } catch (err) {
    if (conn) await conn.rollback();
    throw err;
  } finally {
    if (release) releaseConnection(conn);
  }
};

export const paginatePilotos = async (params, connection = null) => {
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

    const name = getFilter("name");
    const phone = getFilter("phone");
    const email = getFilter("email");

    const order = sortOrder === 1 ? "ASC" : "DESC";
    const sortMap = {
      id: "p.id",
      name: "p.name",
      phone: "p.phone",
      email: "p.email",
      createdAt: "p.created_at",
    };
    const sortColumn = sortMap[sortField] || "p.id";

    const where = ["1=1"];
    const vals = [];

    // Búsqueda general (search)
    if (search) {
      where.push(`
        (
          UPPER(p.name) LIKE UPPER(CONCAT('%', ?, '%'))
          OR UPPER(p.email) LIKE UPPER(CONCAT('%', ?, '%'))
          OR UPPER(p.phone) LIKE UPPER(CONCAT('%', ?, '%'))
          OR UPPER(m.type) LIKE UPPER(CONCAT('%', ?, '%'))
        )
      `);
      vals.push(search, search, search, search);
    }

    // Filtro por nombre
    if (!search && name) {
      where.push("UPPER(p.name) LIKE UPPER(CONCAT('%', ?, '%'))");
      vals.push(name);
    }

    // Filtro por email
    if (email) {
      where.push("UPPER(p.email) LIKE UPPER(CONCAT('%', ?, '%'))");
      vals.push(email);
    }

    // Filtro por teléfono
    if (phone) {
      where.push("UPPER(p.phone) LIKE UPPER(CONCAT('%', ?, '%'))");
      vals.push(phone);
    }

    const whereSql = `WHERE ${where.join(" AND ")}`;

    const sqlData = `
      SELECT 
        p.id                 AS id,
        p.name               AS name,
        p.phone              AS phone,
        p.email              AS email,
        p.created_at         AS createdAt,
        m.id                 AS motoId,
        m.type               AS motoType
      FROM tbl_pilots p
      LEFT JOIN tbl_motos m ON m.pilot_id = p.id
      ${whereSql}
      ORDER BY ${sortColumn} ${order}
    `;

    const [allRows] = await conn.query(sqlData, vals);

    // Agrupar motos por piloto
    const pilotosMap = {};
    allRows.forEach((row) => {
      if (!pilotosMap[row.id]) {
        pilotosMap[row.id] = {
          id: row.id,
          name: row.name,
          phone: row.phone,
          email: row.email,
          createdAt: row.createdAt,
          motos: [],
        };
      }
      if (row.motoId) {
        pilotosMap[row.id].motos.push({
          id: row.motoId,
          type: row.motoType,
        });
      }
    });

    const allPilotos = Object.values(pilotosMap);

    // Aplicar paginación después de agrupar
    const startIndex = Number(first);
    const endIndex = startIndex + Number(rows);
    const rowsData = allPilotos.slice(startIndex, endIndex);

    const sqlCount = `
      SELECT COUNT(DISTINCT p.id) AS total
      FROM tbl_pilots p
      LEFT JOIN tbl_motos m ON m.pilot_id = p.id
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

export const getPilotosDropdown = async (connection = null, filters = {}) => {
  let conn = connection,
    release = false;

  try {
    if (!conn) {
      conn = await getConnection();
      release = true;
    }

    const [rows] = await conn.query(`
      SELECT 
        p.id,
        p.name,
        p.phone,
        p.email,
        p.created_at AS createdAt,
        m.id AS motoId,
        m.type AS motoType
      FROM tbl_pilots p
      LEFT JOIN tbl_motos m ON m.pilot_id = p.id
      ORDER BY p.name ASC
    `);

    // Agrupar motos por piloto
    const pilotos = {};
    rows.forEach((row) => {
      if (!pilotos[row.id]) {
        pilotos[row.id] = {
          id: row.id,
          name: row.name,
          phone: row.phone,
          email: row.email,
          createdAt: row.createdAt,
          motos: [],
        };
      }
      if (row.motoId) {
        pilotos[row.id].motos.push({
          id: row.motoId,
          type: row.motoType,
        });
      }
    });

    return Object.values(pilotos);
  } finally {
    if (release) releaseConnection(conn);
  }
};
