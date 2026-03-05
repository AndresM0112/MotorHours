import {
  getConnection,
  releaseConnection,
} from "../../../common/configs/db.config.js";

export const getAllAreasByProject = async (projectId, connection = null) => {
  let conn = connection;
  let release = false;

  try {
    if (!conn) {
      conn = await getConnection();
      release = true;
    }

    const [rows] = await conn.query(
      `
      SELECT a.are_id AS id, a.are_nombre AS nombre
      FROM tbl_areas a
      WHERE a.are_estado = 'activo' AND a.are_eliminado = 0
      ORDER BY a.are_nombre ASC
    `
    );

    return rows;
  } catch (err) {
    throw err;
  } finally {
    if (release) releaseConnection(conn);
  }
};

export const getAllAreas = async (connection = null) => {
  let conn = connection;
  let release = false;

  try {
    if (!conn) {
      conn = await getConnection();
      release = true;
    }

    const [rows] = await conn.query(`
      SELECT are_id AS id, are_nombre AS nombre
      FROM tbl_areas
      WHERE are_estado = 'activo' AND are_eliminado = 0
      ORDER BY are_nombre ASC
    `);

    return rows;
  } catch (err) {
    throw err;
  } finally {
    if (release) releaseConnection(conn);
  }
};

export const getAreaById = async (id, connection = null) => {
  let conn = connection;
  let release = false;

  try {
    if (!conn) {
      conn = await getConnection();
      release = true;
    }

    const [[area]] = await conn.query(
      `
      SELECT 
        are_id AS areId,
        are_nombre AS nombre,
        are_cantidad_estimado AS cantidadEstimado,
        fre_id AS frecuenciaId,
        are_tiempo_estimado_minutos AS tiempoEstimadoMinutos,
        are_estado AS estado,
        are_eliminado AS eliminado,
        are_usu_reg AS usuarioRegistro,
        are_fec_reg AS fechaRegistro,
        are_usu_act AS usuarioActualiza,
        are_fec_act AS fechaActualizacion
      FROM tbl_areas
      WHERE are_id = ? AND are_eliminado = 0
      LIMIT 1
      `,
      [id]
    );

    return area || null;
  } catch (err) {
    throw err;
  } finally {
    if (release) releaseConnection(conn);
  }
};

export const paginationAreas = async (params, connection = null) => {
  let conn = connection;
  let release = false;

  try {
    if (!conn) {
      conn = await getConnection();
      release = true;
    }

    const {
      search = "",
      estado = null,
      rows = 10,
      first = 0,
      sortField = "nombre",
      sortOrder = 1,
    } = params;

    const order = sortOrder === 1 ? "ASC" : "DESC";

    const sortMap = {
      areId: "are_id",
      nombre: "are_nombre",
      estado: "are_estado",
      fechaRegistro: "are_fec_reg",
      fechaActualizacion: "are_fec_act",
    };

    const sortColumn = sortMap[sortField] || "are_nombre";

    const filters = [`are_eliminado = 0`];
    const values = [];

    if (search) {
      filters.push(`are_nombre LIKE ?`);
      values.push(`%${search}%`);
    }

    if (estado) {
      filters.push(`are_estado = ?`);
      values.push(estado);
    }

    const where = filters.length ? `WHERE ${filters.join(" AND ")}` : "";

    const [result] = await conn.query(
      `
      SELECT 
        are_id AS areId,
        are_nombre AS nombre,
        are_estado AS estado,
        are_cantidad_estimado AS cantidadEstimado,
        fre_id AS frecuenciaId,
        are_tiempo_estimado_minutos AS tiempoEstimadoMinutos,
        are_fec_reg AS fechaRegistro,
        are_fec_act AS fechaActualizacion
      FROM tbl_areas
      ${where}
      ORDER BY ${sortColumn} ${order}
      LIMIT ${Number(rows)} OFFSET ${Number(first)}
    `,
      [...values]
    );

    const [[count]] = await conn.query(
      `SELECT COUNT(are_id) AS total FROM tbl_areas ${where}`,
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

export const saveArea = async (data, connection = null) => {
  let conn = connection;
  let release = false;

  const {
    areId = 0,
    nombre,
    estado = "activo",
    usuario,
    cantidadEstimado,
    frecuenciaId,
    encargados = [],
  } = data;

  try {
    if (!conn) {
      conn = await getConnection();
      release = true;
    }

    await conn.beginTransaction();

    const nombreUpper = nombre.trim().toUpperCase();

    // Validar si el nombre ya existe (excepto para sí mismo en update)
    let query = `
  SELECT are_id FROM tbl_areas 
  WHERE UPPER(TRIM(are_nombre)) = ? AND are_eliminado = 0
`;

    const values = [nombreUpper];

    if (areId > 0) {
      query += ` AND are_id != ?`;
      values.push(areId);
    }

    const [existing] = await conn.query(query, values);

    if (existing.length > 0) {
      throw new Error("Ya existe un área con ese nombre");
    }

    const [[frecuencia]] = await conn.query(
      `SELECT fre_multiplicador FROM tbl_frecuencias WHERE fre_id = ? LIMIT 1`,
      [frecuenciaId]
    );

    if (!frecuencia) {
      throw new Error("Frecuencia no válida");
    }

    const tiempoEstimadoMinutos =
      cantidadEstimado * frecuencia.fre_multiplicador;

    const areaPayload = {
      are_nombre: nombreUpper,
      are_estado: estado,
      are_cantidad_estimado: cantidadEstimado,
      fre_id: frecuenciaId,
      are_tiempo_estimado_minutos: tiempoEstimadoMinutos,
    };

    if (areId > 0) {
      await conn.query(
        `
    UPDATE tbl_areas
    SET ?, are_usu_act = ?, are_fec_act = CURRENT_TIMESTAMP
    WHERE are_id = ?`,
        [areaPayload, usuario, areId]
      );
    } else {
      areaPayload.are_usu_reg = usuario;
      const [insert] = await conn.query(
        `INSERT INTO tbl_areas SET ?`,
        areaPayload
      );
      areaPayload.are_id = insert.insertId;
    }

    // === Guardar encargados en tabla relacional (opcional) ===
    const finalAreaId = areaPayload.are_id || areId;
    // limpia relaciones anteriores
    await conn.query(`DELETE FROM tbl_areas_usuarios WHERE are_id = ?`, [
      finalAreaId,
    ]);
    if (Array.isArray(encargados) && encargados.length > 0) {
      const values = encargados.map((usuId) => [finalAreaId, Number(usuId)]);
      await conn.query(
        `INSERT INTO tbl_areas_usuarios (are_id, usu_id) VALUES ?`,
        [values]
      );
    }

    await conn.commit();

    return {
      message: "Área guardada correctamente",
      areaId: areaPayload.are_id || areId,
      areId: finalAreaId, // para que el front lo use directo
      tiempoEstimadoMinutos: tiempoEstimadoMinutos,
    };
  } catch (err) {
    if (conn) await conn.rollback();
    throw err;
  } finally {
    if (release) releaseConnection(conn);
  }
};

export const deleteAreas = async (areaIds, usuario, connection = null) => {
  let conn = connection;
  let release = false;

  try {
    if (!conn) {
      conn = await getConnection();
      release = true;
    }

    const ids = Array.isArray(areaIds) ? areaIds : [areaIds];
    const placeholders = ids.map(() => "?").join(", ");

    await conn.query(
      `
      UPDATE tbl_areas
      SET are_eliminado = 1,
          are_usu_act = ?,
          are_fec_act = CURRENT_TIMESTAMP
      WHERE are_id IN (${placeholders})`,
      [usuario, ...ids]
    );
  } catch (err) {
    throw err;
  } finally {
    if (release) releaseConnection(conn);
  }
};

export const getAllManagerByIdArea = async (ids, connection = null) => {
  let conn = connection;
  let release = false;

  try {
    if (!conn) {
      conn = await getConnection();
      release = true;
    }

    const arr = Array.isArray(ids) ? ids : [ids];

    const [rows] = await conn.query(
      `
      SELECT 
    au.are_id AS areaId,
    u.usu_id AS encargadoId,
    TRIM(CONCAT(IFNULL(u.usu_nombre,''), ' ', IFNULL(u.usu_apellido,''))) AS encargadoNombre
  FROM tbl_areas_usuarios au
  INNER JOIN tbl_usuarios u ON u.usu_id = au.usu_id
  WHERE au.are_id IN (?)
    AND (u.est_id IS NULL OR u.est_id != 3) -- no eliminados
  ORDER BY au.are_id ASC, encargadoNombre ASC
    `,
      [arr] // ← así sí expande el IN
    );

    return rows;
  } catch (err) {
    throw err;
  } finally {
    if (release) releaseConnection(conn);
  }
};

export const getAllEtapasByProject = async (id, connection = null) => {
  let conn = connection;
  let release = false;

  try {
    if (!conn) {
      conn = await getConnection();
      release = true;
    }

    const [rows] = await conn.query(
      `
      SELECT 
        aus.aen_id AS idRelacion,
        aus.are_id AS areaId,
        aus.usu_id AS encargadoId,
        u.usu_nombre AS encargadoNombre
      FROM tbl_areas_usuarios aus
      INNER JOIN tbl_usuarios u ON aus.usu_id = u.usu_id
      WHERE aus.are_id = ?
    `,
      [id]
    );

    return rows;
  } catch (err) {
    throw err;
  } finally {
    if (release) releaseConnection(conn);
  }
};


export const getAreasWithEncargadosByProject = async (
  proId,
  connection = null
) => {
  let conn = connection;
  let release = false;
  try {
    if (!conn) {
      conn = await getConnection();
      release = true;
    }

    // Áreas y encargados
    const [areas] = await conn.query(
      `
      SELECT 
        a.are_id AS id,
        a.are_nombre AS nombre,
        -- checked si existe al menos un encargado para el área
        CASE WHEN EXISTS (
          SELECT 1
          FROM tbl_areas_usuarios au
          JOIN tbl_usuarios u ON u.usu_id = au.usu_id
          WHERE au.are_id = a.are_id
            AND (u.est_id IS NULL OR u.est_id != 3)
        ) THEN 1 ELSE 0 END AS checked,
        -- lista de encargados (ids) si existen
        GROUP_CONCAT(DISTINCT au.usu_id) AS encargados
      FROM tbl_areas a
      LEFT JOIN tbl_areas_usuarios au ON au.are_id = a.are_id
      WHERE a.are_estado = 'activo' AND a.are_eliminado = 0
      GROUP BY a.are_id, a.are_nombre
      ORDER BY a.are_nombre ASC
      `
    );

    // Convierte encargados a array de números
    areas.forEach((a) => {
      a.encargados = a.encargados
        ? a.encargados.split(",").map((id) => Number(id))
        : [];
    });

    // Todos los usuarios con sus áreas
    const [usuarios] = await conn.query(
      `
      SELECT 
        u.usu_id AS id,
        TRIM(CONCAT(IFNULL(u.usu_nombre,''), ' ', IFNULL(u.usu_apellido,''))) AS nombre,
        u.usu_areas AS areas
      FROM tbl_usuarios u
      WHERE u.est_id = 1 AND u.prf_id != 3
      ORDER BY nombre ASC
      `
    );

    return { areas, usuarios };
  } catch (err) {
    throw err;
  } finally {
    if (release) releaseConnection(conn);
  }
};
