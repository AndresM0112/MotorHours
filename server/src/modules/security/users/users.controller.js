import {
  getConnection,
  releaseConnection,
  executeQuery,
} from "../../../common/configs/db.config.js";
import { hashPassword } from "../../../common/utils/funciones.js";
import moment from "moment";
import ExcelJS from "exceljs";

const toNullIfEmpty = (v) => {
  if (v === undefined || v === null) return null;
  const t = String(v).trim();
  return t.length ? t : null;
};

const toInt = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};


export const getUsersByPermision = async (req, res, next) => {
  const { perId } = req.body;
  const permisos =
    typeof perId === "string"
      ? perId.split(",").map(Number)
      : Array.isArray(perId)
      ? perId.map(Number)
      : [Number(perId)];
  let connection = null;
  try {
    connection = await getConnection();

    const results = await executeQuery(
      `SELECT 
      CONCAT(IFNULL(u.usu_nombre,"")," ",IFNULL(u.usu_apellido,"")) AS nombre,
      u.usu_id AS id,
      u.usu_valor_hora AS valorHora,
      GROUP_CONCAT(pu.per_id) AS permisos
    FROM tbl_permisos_usuarios pu
    JOIN tbl_usuarios u ON u.usu_id = pu.usu_id
    WHERE per_id in (${permisos.join(",")}) and u.est_id != 3 
    GROUP BY u.usu_id
    ORDER BY nombre ASC`,
      [],
      connection
    );
    res.status(200).json(results);
  } catch (err) {
    next(err);
  } finally {
    releaseConnection(connection);
  }
};

export const getClients = async (_, res, next) => {
  let connection = null;
  try {
    connection = await getConnection();

    const results = await executeQuery(
      `SELECT 
        CONCAT(IFNULL(u.usu_nombre,"")," ",IFNULL(u.usu_apellido,"")) AS nombre,
        u.usu_id AS id,
        u.usu_correo AS correo,
        u.usu_telefono AS telefono,
        u.usu_direccion AS direccion,
        u.usu_documento AS documento
      FROM tbl_usuarios u
      WHERE u.prf_id = 3 and u.est_id = 1 
      GROUP BY u.usu_id
      ORDER BY nombre ASC`,
      [],
      connection
    );
    res.status(200).json(results);
  } catch (err) {
    next(err);
  } finally {
    releaseConnection(connection);
  }
};

export const getPatients = async (req, res, next) => {
  let connection = null;
  try {
    connection = await getConnection();

    const results = await executeQuery(
      ` SELECT 
        TRIM(CONCAT(IFNULL(u.usu_nombre,''), ' ', IFNULL(u.usu_apellido,''))) AS nombre,
        u.usu_id AS id,
        u.usu_valor_hora AS valorHora
      FROM tbl_usuarios u
      WHERE u.prf_id = 3 AND u.est_id = 1
      GROUP BY u.usu_id
      ORDER BY nombre ASC`,
      [],
      connection
    );
    res.status(200).json(results);
  } catch (err) {
    next(err);
  } finally {
    releaseConnection(connection);
  }
};

export const getUsers = async (req, res, next) => {
  const { prfId, estId, limit } = req.query;
  let connection = null;

  try {
    connection = await getConnection();

    const filtros = [`u.est_id != 3`]; // sigue filtrando fuera los "eliminados"
    const params = [];

    // 🔹 Soportar uno o varios perfiles en prfId: "8" o "8,16"
    if (prfId) {
      const ids = String(prfId)
        .split(",")
        .map(x => Number(x.trim()))
        .filter(x => Number.isInteger(x) && x > 0);

      if (ids.length) {
        // los perfiles van directos (ya son números y filtrados)
        filtros.push(`u.prf_id IN (${ids.join(",")})`);
      }
    }

    if (estId) {
      const est = Number(estId);
      if (!Number.isNaN(est)) {
        filtros.push(`u.est_id = ?`);
        params.push(est);
      }
    }

    const whereClause = filtros.length ? `WHERE ${filtros.join(" AND ")}` : "";

    // 🔹 LIMIT como literal, no placeholder
    let limitClause = "";
    if (limit) {
      const lim = Number(limit);
      if (Number.isFinite(lim) && lim > 0) {
        limitClause = ` LIMIT ${lim}`;
      }
    }

    const sql = `
      SELECT 
         u.usu_id AS id, 
         CONCAT(IFNULL(u.usu_nombre, ''), ' ', IFNULL(u.usu_apellido, '')) AS nombre,
         u.usu_correo AS correo,
         u.usu_foto AS foto,
         u.usu_documento AS documento,
         u.usu_telefono AS telefono,
         u.usu_direccion AS direccion,
         u.usu_agenda AS agenda,
         u.usu_instructor AS instructor,
         u.usu_requiere_confirmacion AS requiereConfirmacion,
         u.est_id AS estado,
         p.prf_nombre AS perfil
       FROM tbl_usuarios u
       JOIN tbl_perfil p ON p.prf_id = u.prf_id
       ${whereClause}
       ORDER BY nombre ASC
       ${limitClause}
    `;

    const results = await executeQuery(sql, params, connection);

    res.status(200).json(results);
  } catch (err) {
    console.log(err);
    next(err);
  } finally {
    if (connection) releaseConnection(connection);
  }
};


export const getUserById = async (req, res, next) => {
  const { usuId } = req.params;

  if (!usuId) {
    return res.status(400).json({ message: "ID de usuario requerido" });
  }

  let connection = null;
  try {
    connection = await getConnection();

    // Consulta simplificada para taller de motos - sin tablas obsoletas
    const [user] = await executeQuery(
      `SELECT 
        u.usu_id AS usuId,
        u.usu_foto AS usuFoto,
        u.usu_nombre AS nombre,
        u.usu_apellido AS apellido,
        u.usu_documento AS documento,
        u.usu_usuario AS usuario,
        u.usu_correo AS correo,
        u.usu_telefono AS telefono,
        u.usu_direccion AS direccion,
        u.prf_id AS perfil,
        u.est_id AS estid,
        u.usu_acceso AS acceso,
        u.usu_cambio AS cambioclave,
        u.usu_areas AS usuareas,
        u.usu_usu_act AS usuarioact,
        (
          SELECT GROUP_CONCAT(ven_id)
          FROM tbl_usuarios_ventanas
          WHERE usu_id = ?
        ) AS usuventanas
      FROM tbl_usuarios u
      WHERE u.usu_id = ?`,
      [usuId, usuId],
      connection
    );

    if (!user) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    res.status(200).json(user);
  } catch (err) {
    next(err);
  } finally {
    releaseConnection(connection);
  }
};

export const paginationUsersController = async (req, res, next) => {
  const {
    idusuario,
    prfId,
    nombre,
    apellido,
    correo,
    telefono,
    direccion,
    documento,
    usuario,
    estado,
    rows,
    first,
    sortField,
    sortOrder,
  } = req.body;

  const order = sortOrder === 1 ? "ASC" : "DESC";
  let connection = null;
  try {
    connection = await getConnection();

    const from = `
        FROM tbl_usuarios u
        JOIN tbl_perfil p ON u.prf_id = p.prf_id and p.est_id = 1
        JOIN tbl_estados_usuario e ON u.est_id = e.est_id
    `;

    const whereConditions = [];

    if (idusuario != 1) {
      whereConditions.push(`u.usu_id != 1`);
    }

    if (prfId) {
      whereConditions.push(`(u.prf_id = ${prfId})`);
    }

    if (nombre) {
      whereConditions.push(
        `(u.usu_nombre LIKE REPLACE('%${nombre}%', ' ', '%'))`
      );
    }

    if (apellido) {
      whereConditions.push(
        `(u.usu_apellido LIKE REPLACE('%${apellido}%', ' ', '%'))`
      );
    }

    if (correo) {
      whereConditions.push(
        `(u.usu_correo LIKE REPLACE('%${correo}%', ' ', '%'))`
      );
    }
    if (telefono) {
      whereConditions.push(
        `(u.usu_telefono LIKE REPLACE('%${telefono}%', ' ', '%'))`
      );
    }
    if (direccion) {
      whereConditions.push(
        `(u.usu_direccion LIKE REPLACE('%${direccion}%', ' ', '%'))`
      );
    }

    if (documento) {
      whereConditions.push(
        `(u.usu_documento LIKE REPLACE('%${documento}%', ' ', '%'))`
      );
    }

    if (usuario) {
      whereConditions.push(
        `(u.usu_usuario LIKE REPLACE('%${usuario}%', ' ', '%'))`
      );
    }

    if (estado) {
      whereConditions.push(`(u.est_id = ${estado})`);
    }

    whereConditions.push(`u.est_id != 3`);

    const whereClause =
      whereConditions.length > 0
        ? `WHERE ${whereConditions.join(" AND ")}`
        : "";

    const mainQuery = `
        SELECT
            u.usu_id usuId,
            u.usu_foto usuFoto,
            u.usu_nombre nombre,
            u.usu_apellido apellido,
            u.usu_documento documento,
            u.usu_usuario usuario,
            u.usu_correo correo,
            u.usu_telefono telefono,
            u.usu_direccion direccion,
            p.prf_nombre nomperfil,
            e.est_nombre nomestado,
            u.usu_acceso acceso,
            u.usu_agenda agenda,
            u.usu_instructor instructor,
            u.usu_requiere_confirmacion requiere_confirmacion,
            COALESCE(u.usu_fec_act, u.usu_fec_reg) AS fecact,
            COALESCE(u.usu_usu_act, u.usu_reg)     AS usuact,
            u.est_id estid,
            u.prf_id perfil,
            u.usu_valor_hora valorHora,
            u.usu_cambio cambioclave,
            (
              SELECT GROUP_CONCAT(uv.ven_id)
              FROM tbl_usuarios_ventanas uv
              WHERE uv.usu_id = u.usu_id
            ) AS usuventanas,
            -- TODO: Eliminado - Consultas empresariales obsoletas (proyectos y reembolsos)
            -- (SELECT GROUP_CONCAT(up.blo_id) FROM tbl_usuario_proyecto up WHERE up.usu_id = u.usu_id) AS proIds,
            -- (SELECT GROUP_CONCAT(ur.tir_id) FROM tbl_usuario_tipo_reembolso ur WHERE ur.usu_id = u.usu_id) AS tirIds,
            NULL AS proIds,
            NULL AS tirIds,
            u.usu_areas AS usuareas
        ${from} ${whereClause}
        ORDER BY ${sortField} ${order}
        LIMIT ${rows} OFFSET ${first}
    `;

    const countQuery = `
        SELECT COUNT(DISTINCT u.usu_id) tot
        ${from} ${whereClause}
    `;

    const results = await executeQuery(mainQuery, [], connection);
    const rowsc = await executeQuery(countQuery, [], connection);

    const resultados = {
      results: results,
      total: rowsc[0].tot,
    };

    return res.json(resultados);
  } catch (err) {
    next(err);
  } finally {
    releaseConnection(connection);
  }
};

export const countUsersController = async (req, res, next) => {
  let connection = null;
  try {
    connection = await getConnection();

    const { idusuario } = req.query;
    const wh = +idusuario !== 1 ? "AND p.prf_id != 1" : "";

    const resultQuery = await executeQuery(
      `SELECT COUNT(u.usu_id) AS cant, p.prf_nombre AS nombre, p.prf_id AS prfId
        FROM tbl_perfil p
        LEFT JOIN tbl_usuarios u ON p.prf_id = u.prf_id AND u.est_id != 3
        WHERE p.est_id = 1 ${wh}
        GROUP BY p.prf_id, p.prf_nombre
        ORDER BY p.prf_nombre
        `,
      [],
      connection
    );

    console.log(resultQuery);

    return res.status(200).json(resultQuery);
  } catch (err) {
    next(err);
  } finally {
    releaseConnection(connection);
  }
};

async function checkIfUserExists({
  documento,
  correo,
  usuario,
  usuId,
  connection,
}) {
  const conditions = [];
  const params = [];

  const doc = toNullIfEmpty(documento);
  const mail = toNullIfEmpty(correo);
  const user = toNullIfEmpty(usuario);

  if (doc) {
    conditions.push("usu_documento = ?");
    params.push(doc);
  }
  if (mail) {
    conditions.push("usu_correo = ?");
    params.push(mail);
  }
  if (user) {
    conditions.push("usu_usuario = ?");
    params.push(user);
  }

  // Si no hay nada que validar, no hay duplicado
  if (conditions.length === 0) return [];

  let sql = `
    SELECT usu_id
    FROM tbl_usuarios
    WHERE est_id != 3
      AND (${conditions.join(" OR ")})
  `;
  if (Number(usuId) > 0) {
    sql += ` AND usu_id != ?`;
    params.push(Number(usuId));
  }
  sql += ` LIMIT 1`;

  return await executeQuery(sql, params, connection);
}

export const saveUserController = async (req, res, next) => {
  let connection = null;

  try {
    connection = await getConnection();
    await connection.beginTransaction();

    const {
      usuId,
      usuFoto = null,
      perfil,
      nombre,
      apellido,
      documento = null,
      usuario = null,
      correo = null,
      telefono = null,
      direccion = null,
      clave = null,
      acceso,
      agenda,
      instructor,
      requiere_confirmacion,
      estid: estado,
      idusuario,
      usuarioact,
      usuventanas = null,
      usuareas = null,
      cambioclave = 0,
      valorHora = null,
      ProfileMode = false,
      campo = null,
      value = null,
    } = req.body;

    console.log("CAMPOS", req.body);
    console.log("CAMPOS", req.query);
    console.log("CAMPOS", req.params);


    // ======= ProfileMode (sin cambios) =======
    if (ProfileMode) {
      if (!campo) {
        await connection.rollback();
        return res
          .status(400)
          .json({ message: "Campo requerido en ProfileMode" });
      }
      await executeQuery(
        `UPDATE tbl_usuarios SET ${campo} = ? WHERE usu_id = ?`,
        [value === "null" ? null : value, Number(usuId)],
        connection
      );
      await connection.commit();
      return res.status(200).json({
        message: "Modo perfil activado, cambios guardados correctamente.",
      });
    }

    // ======= Validaciones duplicados/aseguradoras (igual) =======
    const existingUser = await checkIfUserExists({
      documento,
      correo,
      usuario,
      usuId,
      connection,
    });
    if (existingUser.length > 0) {
      const error = new Error(
        "Ya existe un usuario con el documento, correo o usuario ingresado. Verificar."
      );
      error.status = 400;
      throw error;
    }

    const usuarioNorm = toNullIfEmpty(usuario);
    const correoNorm = toNullIfEmpty(correo);
    const documentoNorm = toNullIfEmpty(documento);
    const telefonoNorm = toNullIfEmpty(telefono);
    const direccionNorm = toNullIfEmpty(direccion);
    const fotoNorm = usuFoto === "null" ? null : toNullIfEmpty(usuFoto);

    if (usuId > 0) {
      await executeQuery(
        `UPDATE tbl_usuarios 
   SET usu_foto = ?, usu_nombre = ?, usu_apellido = ?, usu_documento = ?, 
       usu_usuario = ?, usu_correo = ?, usu_telefono = ?, usu_direccion = ?, prf_id = ?, est_id = ?, usu_valor_hora = ?,
       usu_acceso = ?, usu_agenda = ?, usu_instructor = ?, usu_requiere_confirmacion = ?, usu_cambio = ?, 
       usu_usu_act = ?, usu_areas = ?
   WHERE usu_id = ?`,
        [
          fotoNorm,
          nombre,
          apellido,
          documentoNorm,
          usuarioNorm,
          correoNorm,
          telefonoNorm,
          direccionNorm,
          perfil || null,
          estado,
          valorHora,
          acceso ? 1 : 0,
          agenda ? 1 : 0,
          Number(instructor) ? 1 : 0,
          requiere_confirmacion ? 1 : 0,
          cambioclave || null,
          usuarioact,
          toNullIfEmpty(usuareas),
          usuId,
        ],
        connection
      );

      // Ventanas
      await executeQuery(
        "DELETE FROM tbl_usuarios_ventanas WHERE usu_id = ?",
        [usuId],
        connection
      );
      if (usuventanas && typeof usuventanas === "string") {
        const ventanas = usuventanas
          .split(",")
          .map((v) => parseInt(v.trim(), 10))
          .filter((v) => !isNaN(v));
        for (const venId of ventanas) {
          await executeQuery(
            "INSERT INTO tbl_usuarios_ventanas (usu_id, ven_id) VALUES (?, ?)",
            [usuId, venId],
            connection
          );
        }
      }

      // Clave (opcional)
      if (clave) {
        const hash = await hashPassword(clave);
        await executeQuery(
          "UPDATE tbl_usuarios SET usu_clave = ? WHERE usu_id = ?",
          [hash, usuId],
          connection
        );
      }

     
      await connection.commit();
      return res
        .status(200)
        .json({ message: "Usuario Actualizado Correctamente", usuId });
    } else {
      const usuarioNorm = toNullIfEmpty(usuario);
      const correoNorm = toNullIfEmpty(correo);
      const documentoNorm = toNullIfEmpty(documento);
      const telefonoNorm = toNullIfEmpty(telefono);
      const direccionNorm = toNullIfEmpty(direccion);
      const fotoNorm = usuFoto === "null" ? null : toNullIfEmpty(usuFoto);

      const newUserId = await executeQuery(
        `INSERT INTO tbl_usuarios (
     usu_foto, usu_nombre, usu_apellido, usu_documento, usu_usuario, 
     usu_correo, usu_telefono, usu_direccion, usu_clave, prf_id, est_id, usu_valor_hora, usu_acceso,  
     usu_agenda, usu_instructor, usu_requiere_confirmacion,
     usu_cambio, usu_reg, usu_usu_act, usu_areas
   ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          fotoNorm,
          nombre,
          apellido,
          documentoNorm,
          usuarioNorm,
          correoNorm,
          telefonoNorm,
          direccionNorm,
          clave ? await hashPassword(clave) : null,
          perfil,
          estado,
          valorHora,
          acceso ? 1 : 0,
          agenda ? 1 : 0,
          instructor ? 1 : 0,
          requiere_confirmacion ? 1 : 0,
          cambioclave || null,
          idusuario,
          usuarioact,
          toNullIfEmpty(usuareas),
        ],
        connection
      );

      if (!newUserId.insertId) {
        const error = new Error("Error al insertar el usuario.");
        error.status = 400;
        throw error;
      }

      const createdId = newUserId.insertId;

      // Ventanas
      if (usuventanas && typeof usuventanas === "string") {
        const ventanas = usuventanas
          .split(",")
          .map((v) => parseInt(v.trim(), 10))
          .filter((v) => !isNaN(v));
        for (const venId of ventanas) {
          await executeQuery(
            "INSERT INTO tbl_usuarios_ventanas (usu_id, ven_id) VALUES (?, ?)",
            [createdId, venId],
            connection
          );
        }
      }

      // Permisos por perfil
      await executeQuery(
        `INSERT INTO tbl_permisos_usuarios (per_id, usu_id) 
         SELECT per_id, ? FROM tbl_permisos_perfil WHERE prf_id = ?`,
        [createdId, perfil],
        connection
      );

      // TODO: Áreas eliminadas para taller de motos - tabla tbl_areas_usuarios no existe
      // if (usuareas && typeof usuareas === "string") {
      //   const areas = usuareas.split(",").map((a) => parseInt(a.trim(), 10)).filter((a) => !isNaN(a));
      //   for (const areId of areas) {
      //     await executeQuery("INSERT INTO tbl_areas_usuarios (are_id, usu_id) VALUES (?, ?)", [areId, createdId], connection);
      //   }
      // }

      await connection.commit();
      return res
        .status(201)
        .json({ message: "Usuario Creado Correctamente", usuId: createdId });
    }
  } catch (err) {
    if (connection) await connection.rollback();
    next(err);
  } finally {
    releaseConnection(connection);
  }
};

export const updateUserPhotoController = async (req, res, next) => {
  const { usuId, usuFoto } = req.body;
  try {
    if (!usuId || !usuFoto) throw new Error("Datos incompletos");

    await executeQuery(
      "UPDATE tbl_usuarios SET usu_foto = ? WHERE usu_id = ?",
      [usuFoto, usuId]
    );

    return res.status(200).json({ message: "Foto actualizada correctamente" });
  } catch (err) {
    next(err);
  }
};

export const deleteUserController = async (req, res, next) => {
  const { usuId, usuario } = req.body;

  if (!usuId || !usuario) {
    const error = new Error(
      "El ID del usuario y el usuario actual son obligatorios"
    );
    error.status = 400;
    return next(error);
  }

  let connection = null;
  try {
    connection = await getConnection();
    await connection.beginTransaction();

    // Actualizar el estado del usuario a 3 (eliminado)
    const result = await executeQuery(
      `UPDATE tbl_usuarios 
       SET est_id = 3, usu_usu_act = ? 
       WHERE usu_id = ?`,
      [usuario, usuId],
      connection
    );

    if (result.affectedRows > 0) {
      await connection.commit();

      return res.status(200).json({
        message: "Usuario Eliminado Correctamente",
      });
    }

    const error = new Error("Usuario no encontrado o no se pudo eliminar");
    error.status = 404;
    throw error;
  } catch (err) {
    if (connection) await connection.rollback();
    next(err);
  } finally {
    releaseConnection(connection);
  }
};

export const saveUserNovedad = async (req, res, next) => {
  const { novId, usuId, tipoNovedad, descripcion, fecha, horaInicio, horaFin } =
    req.body;
  let connection = null;
  try {
    connection = await getConnection();
    // Editar novedad existente
    // Validar y formatear fechas
    let fechaInicio = null;
    let fechaFin = null;
    let horaInicioFormated = horaInicio
      ? moment(horaInicio, "HH:mm:ss").format("HH:mm:ss")
      : null;
    let horaFinFormated = horaFin
      ? moment(horaFin, "HH:mm:ss").format("HH:mm:ss")
      : null;
    if (Array.isArray(fecha) && fecha.length > 0) {
      // Formatear fechas a 'YYYY-MM-DD'
      const fechasFormateadas = fecha
        .map((f) =>
          moment(f).isValid() ? moment(f).format("YYYY-MM-DD") : null
        )
        .filter((f) => f !== null);

      if (fechasFormateadas.length === 2) {
        // Ordenar para que la menor sea inicio y la mayor fin
        fechasFormateadas.sort();
        fechaInicio = fechasFormateadas[0];
        fechaFin = fechasFormateadas[1];
      } else if (fechasFormateadas.length === 1) {
        fechaInicio = fechaFin = fechasFormateadas[0];
      }
    }
    if (novId > 0) {
      await executeQuery(
        `UPDATE tbl_novedades_usuarios 
         SET tnv_id = ?, nov_descripcion = ?, nov_fecha_inicio = ?, nov_fecha_fin = ?, nov_hora_inicio = ?, nov_hora_fin = ?
         WHERE nov_id = ? AND est_id = 1`,
        [
          tipoNovedad,
          descripcion,
          fechaInicio,
          fechaFin,
          horaInicioFormated,
          horaFinFormated,
          novId,
        ],
        connection
      );
      res.status(200).json({ message: "Novedad actualizada", id: novId });
    } else {
      // Crear nueva novedad
      const result = await executeQuery(
        `INSERT INTO tbl_novedades_usuarios 
          (usu_id, tnv_id, nov_descripcion, nov_fecha_inicio, nov_fecha_fin, nov_hora_inicio, nov_hora_fin, est_id)
         VALUES (?, ?, ?, ?, ?, ?,?, 1)`,
        [
          usuId,
          tipoNovedad,
          descripcion,
          fechaInicio,
          fechaFin,
          horaInicioFormated,
          horaFinFormated,
        ],
        connection
      );
      res
        .status(201)
        .json({ message: "Novedad registrada", id: result.insertId });
    }
  } catch (err) {
    next(err);
  } finally {
    releaseConnection(connection);
  }
};

// Eliminar novedad (cambia estado a 3)
export const deleteUserNovedad = async (req, res, next) => {
  const { id } = req.body;
  let connection = null;
  try {
    connection = await getConnection();
    await executeQuery(
      `UPDATE tbl_novedades_usuarios SET est_id = 3 WHERE nov_id = ?`,
      [id],
      connection
    );
    res.status(200).json({ message: "Novedad eliminada" });
  } catch (err) {
    next(err);
  } finally {
    releaseConnection(connection);
  }
};

// Consultar novedades de un usuario
export const getUserNovedades = async (req, res, next) => {
  const { usuId } = req.body;
  let connection = null;
  try {
    connection = await getConnection();
    const novedades = await executeQuery(
      `SELECT nov_id AS id, tnv_id AS tipoNovedad, nov_descripcion AS descripcion, nov_fecha_inicio AS fechaInicio, nov_fecha_fin AS fechaFin, nov_hora_inicio AS horaIncio, nov_hora_fin AS horaFin, est_id AS estado
       FROM tbl_novedades_usuarios
       WHERE usu_id = ? AND est_id = 1
       ORDER BY id DESC`,
      [usuId],
      connection
    );
    res.status(200).json(novedades);
  } catch (err) {
    next(err);
  } finally {
    releaseConnection(connection);
  }
};

