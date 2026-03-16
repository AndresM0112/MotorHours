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
    alistamiento_items = [], // items de alistamiento (solo para ALISTAMIENTO)
    updatedBy = null,        // nombre del usuario que actualiza
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
        [{ ...servicioPayload, updated_at: new Date(), updated_by: updatedBy }, id]
      );
      
      // Eliminar items de alistamiento previos para actualizar
      if (service_type === 'ALISTAMIENTO') {
        await conn.query(
          `DELETE FROM tbl_service_alistamiento_tasks WHERE service_id = ?`,
          [id]
        );
      }
    } else {
      // INSERT servicio
      const [ins] = await conn.query(
        `INSERT INTO tbl_services SET ?`,
        { ...servicioPayload, updated_by: updatedBy }
      );
      newServicioId = ins.insertId;
    }

    // Guardar items de alistamiento si es un servicio de ALISTAMIENTO
    if (service_type === 'ALISTAMIENTO' && alistamiento_items && alistamiento_items.length > 0) {
      for (const item of alistamiento_items) {
        const { id: alistamiento_task_id, realizada, observaciones } = item;
        
        if (alistamiento_task_id && realizada !== null && realizada !== undefined) {
          const alistamientoPayload = {
            service_id: newServicioId,
            alistamiento_task_id: Number(alistamiento_task_id),
            is_done: realizada ? 1 : 0,
            observations: observaciones ? observaciones.trim() : null,
          };
          
          await conn.query(
            `INSERT INTO tbl_service_alistamiento_tasks SET ?`,
            alistamientoPayload
          );
        }
      }
    }

    await conn.commit();

    const now = new Date();
    return {
      message: "Servicio guardado correctamente",
      id: newServicioId,
      updatedBy: updatedBy,
      updatedAt: id > 0 ? now : null,
      createdAt: id > 0 ? null : now,
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
        s.moto_id AS bikeId,
        s.service_type AS serviceType,
        s.moto_hours AS hours,
        s.status_id AS statusId,
        ss.code AS statusCode,
        ss.name AS statusName,
        s.created_at AS createdAt,
        m.type AS bikeType,
        m.pilot_id AS pilotId,
        p.name AS pilotName
      FROM tbl_services s
      LEFT JOIN tbl_motos m ON m.id = s.moto_id
      LEFT JOIN tbl_pilots p ON p.id = m.pilot_id
      LEFT JOIN service_status ss ON ss.id = s.status_id
      ORDER BY s.created_at DESC
    `;

    const [rows] = await conn.query(sql);

    // Para cada servicio de ALISTAMIENTO, traer sus items relacionados
    for (const servicio of rows) {
      if (servicio.serviceType === 'ALISTAMIENTO') {
        const [alistamientoItems] = await conn.query(
          `
          SELECT 
            sat.alistamiento_task_id AS id,
            sat.is_done AS realizada,
            sat.observations AS observaciones,
            at.description
          FROM tbl_service_alistamiento_tasks sat
          LEFT JOIN tbl_alistamiento_tasks at ON at.id = sat.alistamiento_task_id
          WHERE sat.service_id = ?
          ORDER BY sat.alistamiento_task_id ASC
          `,
          [servicio.id]
        );

        servicio.items = alistamientoItems.map(item => ({
          id: item.id,
          completed: Boolean(item.realizada),
          notes: item.observaciones || "",
          description: item.description
        }));
      } else {
        servicio.items = [];
      }
    }

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
        s.moto_id AS bikeId,
        s.service_type AS serviceType,
        s.moto_hours AS hours,
        s.status_id AS statusId,
        ss.code AS statusCode,
        ss.name AS statusName,
        s.created_at AS createdAt,
        m.type AS bikeType,
        m.pilot_id AS pilotId,
        p.name AS pilotName
      FROM tbl_services s
      LEFT JOIN tbl_motos m ON m.id = s.moto_id
      LEFT JOIN tbl_pilots p ON p.id = m.pilot_id
      LEFT JOIN service_status ss ON ss.id = s.status_id
      WHERE s.id = ?
      `,
      [id]
    );

    if (!rows.length) {
      return null;
    }

    const servicio = rows[0];

    // Si es un servicio de ALISTAMIENTO, traer los items relacionados
    if (servicio.serviceType === 'ALISTAMIENTO') {
      const [alistamientoItems] = await conn.query(
        `
        SELECT 
          sat.alistamiento_task_id AS id,
          sat.is_done AS realizada,
          sat.observations AS observaciones,
          at.description
        FROM tbl_service_alistamiento_tasks sat
        LEFT JOIN tbl_alistamiento_tasks at ON at.id = sat.alistamiento_task_id
        WHERE sat.service_id = ?
        ORDER BY sat.alistamiento_task_id ASC
        `,
        [id]
      );

      servicio.alistamiento_items = alistamientoItems.map(item => ({
        id: item.id,
        realizada: Boolean(item.realizada),
        observaciones: item.observaciones || "",
        description: item.description
      }));
    } else {
      servicio.alistamiento_items = [];
    }

    return servicio;
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
      `SELECT id, service_type FROM tbl_services WHERE id = ?`,
      [id]
    );
    if (!servicioExists.length) {
      throw new Error("El servicio no existe");
    }

    // Los items de alistamiento se eliminarán automáticamente por CASCADE
    // Pero podemos ser explícitos para mayor claridad
    await conn.query(
      `DELETE FROM tbl_service_alistamiento_tasks WHERE service_id = ?`, 
      [id]
    );

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
      bikeId: "s.moto_id", 
      serviceType: "s.service_type",
      hours: "s.moto_hours",
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
          OR p.name LIKE CONCAT('%', ?, '%')
        )
      `);
      vals.push(search, search, search, search);
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
        s.moto_id AS bikeId,
        s.service_type AS serviceType,
        s.moto_hours AS hours,
        s.status_id AS statusId,
        ss.code AS statusCode,
        ss.name AS statusName,
        s.created_at AS createdAt,
        s.updated_at AS updatedAt,
        s.updated_by AS updatedBy,
        m.type AS bikeType,
        m.pilot_id AS pilotId,
        p.name AS pilotName

      FROM tbl_services s
      LEFT JOIN tbl_motos m ON m.id = s.moto_id
      LEFT JOIN tbl_pilots p ON p.id = m.pilot_id
      LEFT JOIN service_status ss ON ss.id = s.status_id
      ${whereSql}
      ORDER BY ${sortColumn} ${order}
      LIMIT ${Number(rows)} OFFSET ${Number(first)}
    `;

    const [rowsData] = await conn.query(sqlData, vals);

    // Para cada servicio de ALISTAMIENTO, traer sus items relacionados
    for (const servicio of rowsData) {
      if (servicio.serviceType === 'ALISTAMIENTO') {
        const [alistamientoItems] = await conn.query(
          `
          SELECT 
            sat.alistamiento_task_id AS id,
            sat.is_done AS realizada,
            sat.observations AS observaciones,
            at.description
          FROM tbl_service_alistamiento_tasks sat
          LEFT JOIN tbl_alistamiento_tasks at ON at.id = sat.alistamiento_task_id
          WHERE sat.service_id = ?
          ORDER BY sat.alistamiento_task_id ASC
          `,
          [servicio.id]
        );

        servicio.items = alistamientoItems.map(item => ({
          id: item.id,
          completed: Boolean(item.realizada),
          notes: item.observaciones || "",
          description: item.description
        }));
      } else {
        servicio.items = [];
      }
    }

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

export const changeServicioStatus = async (id, statusId, description, changedById, changedByName, connection = null) => {
  let conn = connection,
    release = false;

  try {
    if (!conn) {
      conn = await getConnection();
      release = true;
    }

    await conn.beginTransaction();

    // Validaciones básicas
    if (!id || Number(id) <= 0) {
      throw new Error("El id del servicio es requerido");
    }

    if (!statusId || Number(statusId) <= 0) {
      throw new Error("El estado es requerido");
    }

    if (!description || !String(description).trim()) {
      throw new Error("La descripción del cambio de estado es obligatoria");
    }

    // 1. Obtener el servicio actual con su estado
    const [serviceRows] = await conn.query(
      `SELECT s.id, s.status_id, s.service_type, ss.code AS currentStatusCode
       FROM tbl_services s
       LEFT JOIN service_status ss ON ss.id = s.status_id
       WHERE s.id = ?`,
      [id]
    );

    if (!serviceRows.length) {
      throw new Error("El servicio no existe");
    }

    const service = serviceRows[0];

    // 2. Obtener el nuevo estado
    const [newStatusRows] = await conn.query(
      `SELECT id, code, name FROM service_status WHERE id = ?`,
      [statusId]
    );

    if (!newStatusRows.length) {
      throw new Error("El estado indicado no existe");
    }

    const newStatus = newStatusRows[0];

    // 3. Validar que la transición sea permitida
    const ALLOWED_TRANSITIONS = {
      OPEN: ["IN_PROGRESS", "CLOSED"],
      IN_PROGRESS: ["CLOSED"],
      CLOSED: [],
    };

    const currentCode = service.currentStatusCode;
    const allowedNext = ALLOWED_TRANSITIONS[currentCode] ?? [];

    if (!allowedNext.includes(newStatus.code)) {
      throw new Error(
        `Transición no permitida: ${currentCode} → ${newStatus.code}`
      );
    }

    // 4. Si el nuevo estado es CLOSED y el servicio es de tipo ALISTAMIENTO,
    //    validar que todos los alistamientos estén respondidos correctamente
    if (newStatus.code === "CLOSED" && service.service_type === "ALISTAMIENTO") {
      // Verificar que todos los alistamientos del catálogo tienen respuesta en este servicio
      const [[counts]] = await conn.query(
        `SELECT
          (SELECT COUNT(*) FROM tbl_service_alistamiento_tasks WHERE service_id = ?) AS answered,
          (SELECT COUNT(*) FROM tbl_alistamiento_tasks) AS total`,
        [id]
      );

      if (Number(counts.answered) < Number(counts.total)) {
        throw new Error(
          "Todos los alistamientos deben estar respondidos antes de cerrar el servicio"
        );
      }

      // Verificar que los alistamientos marcados como NO tienen descripción
      const [[noItems]] = await conn.query(
        `SELECT COUNT(*) AS invalid
         FROM tbl_service_alistamiento_tasks
         WHERE service_id = ?
           AND is_done = 0
           AND (observations IS NULL OR TRIM(observations) = '')`,
        [id]
      );

      if (Number(noItems.invalid) > 0) {
        throw new Error(
          "Todos los alistamientos marcados como NO deben tener una descripción obligatoria"
        );
      }
    }

    // 5. Actualizar el estado en tbl_services
    await conn.query(
      `UPDATE tbl_services SET status_id = ?, updated_at = NOW(), updated_by = ? WHERE id = ?`,
      [Number(statusId), changedByName ?? null, Number(id)]
    );

    // 6. Registrar el cambio en el historial
    await conn.query(
      `INSERT INTO tbl_service_status_history SET ?`,
      [{
        service_id: Number(id),
        previous_status_id: service.status_id,
        new_status_id: Number(statusId),
        description: String(description).trim(),
        changed_by: changedById ?? null,
      }]
    );

    await conn.commit();

    return {
      message: `Estado actualizado correctamente a ${newStatus.name}`,
      previousStatusId: service.status_id,
      newStatusId: Number(statusId),
    };
  } catch (err) {
    if (conn) await conn.rollback();
    throw err;
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
        s.moto_id AS bikeId,
        s.service_type AS serviceType,
        s.moto_hours AS hours,
        s.created_at AS createdAt,
        m.type AS bikeType,
        m.pilot_id AS pilotId,
        p.name AS pilotName
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
