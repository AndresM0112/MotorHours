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

export const getPayrollEmployees = async (req, res, next) => {
  const nomIdNum = Number(req.body?.nomId);

  if (!Number.isFinite(nomIdNum) || nomIdNum <= 0) {
    return res
      .status(400)
      .json({ message: "nomId es requerido y debe ser numérico > 0" });
  }

  let connection = null;
  try {
    connection = await getConnection();

    const rows = await executeQuery(
      `
      WITH emp AS (
        SELECT DISTINCT nom_id, usu_id FROM (
          SELECT nd.nom_id, nd.usu_id
          FROM tbl_nomina_detalle nd
          WHERE nd.nom_id = ?
          UNION ALL
          SELECT nepp.nom_id, nepp.usu_id
          FROM tbl_nomina_empleado_bloque nepp
          WHERE nepp.nom_id = ?
          UNION ALL
          SELECT net.nom_id, net.usu_id
          FROM tbl_nomina_empleado_tir net
          WHERE net.nom_id = ?
        ) s
      ),
      tirs AS (
        SELECT nom_id, usu_id,
               GROUP_CONCAT(DISTINCT tir_id ORDER BY tir_id SEPARATOR ',') AS tirIdsCsv
        FROM tbl_nomina_empleado_tir
        WHERE nom_id = ?
        GROUP BY nom_id, usu_id
      ),
      pros AS (
        SELECT nom_id, usu_id,
               GROUP_CONCAT(DISTINCT blo_id ORDER BY blo_id SEPARATOR ',') AS proIdsCsv
        FROM tbl_nomina_empleado_bloque
        WHERE nom_id = ?
        GROUP BY nom_id, usu_id
      )
      SELECT
        u.usu_id AS id,
        u.usu_documento AS cedula,
        TRIM(CONCAT(COALESCE(u.usu_nombre,''), ' ', COALESCE(u.usu_apellido,''))) AS nombre,
        t.tirIdsCsv,
        p.proIdsCsv
      FROM emp e
      JOIN tbl_usuarios u
        ON u.usu_id = e.usu_id
      LEFT JOIN tirs t
        ON t.nom_id = e.nom_id AND t.usu_id = e.usu_id
      LEFT JOIN pros p
        ON p.nom_id = e.nom_id AND p.usu_id = e.usu_id
      WHERE (u.est_id IS NULL OR u.est_id != 3)
      ORDER BY nombre ASC
      `,
      [nomIdNum, nomIdNum, nomIdNum, nomIdNum, nomIdNum],
      connection
    );

    const csvToNumArrayOrNull = (csv) => {
      if (!csv) return null;
      const arr = csv
        .split(",")
        .map((s) => Number(s))
        .filter((n) => Number.isFinite(n));
      return arr.length ? arr : null;
    };

    const result = (rows || []).map((r) => {
      const tirIds = csvToNumArrayOrNull(r.tirIdsCsv);
      const proIds = csvToNumArrayOrNull(r.proIdsCsv);

      const tirId = Array.isArray(tirIds) && tirIds.length ? tirIds[0] : null;

      return {
        id: r.id,
        cedula: r.cedula,
        nombre: r.nombre,
        tirId,
        ...(tirIds ? { tirIds } : { tirIds: null }),
        ...(proIds ? { proIds } : { proIds: null }),
      };
    });

    return res.status(200).json(result);
  } catch (err) {
    return next(err);
  } finally {
    try {
      if (connection) await releaseConnection(connection);
    } catch {}
  }
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
export const getInstructors = async (req, res, next) => {
  // const { perId } = req.body;
  // const permisos =
  //   typeof perId === "string"
  //     ? perId.split(",").map(Number)
  //     : Array.isArray(perId)
  //     ? perId.map(Number)
  //     : [Number(perId)];
  let connection = null;
  try {
    connection = await getConnection();

    const results = await executeQuery(
      `SELECT 
      CONCAT(IFNULL(u.usu_nombre,"")," ",IFNULL(u.usu_apellido,"")) AS nombre,
      u.usu_id AS id,
      u.usu_valor_hora AS valorHora,
      u.usu_documento As documento,
      u.usu_correo AS correo,
      u.usu_foto AS foto
    FROM tbl_usuarios u 
    WHERE u.usu_instructor = 1 and u.est_id != 3 
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

// export const getUsers = async (req, res, next) => {
//    const { prfId, estId, limit } = req.query;
//   let connection = null;

//   try {
//     connection = await getConnection();

//     const filtros = [`u.est_id != 3`];
//     const params = [];

//     // 🔹 Soportar uno o varios perfiles en prfId: "8" o "8,16"
//     if (prfId) {
//       const ids = String(prfId)
//         .split(",")
//         .map(x => Number(x.trim()))
//         .filter(x => !Number.isNaN(x));

//       if (ids.length === 1) {
//         filtros.push(`u.prf_id = ?`);
//         params.push(ids[0]);
//       } else if (ids.length > 1) {
//         filtros.push(`u.prf_id IN (${ids.map(() => "?").join(",")})`);
//         params.push(...ids);
//       }
//     }

    
//     if (estId) {
//       filtros.push(`u.est_id = ?`);
//       params.push(Number(estId));
//     }


//     const whereClause = filtros.length ? `WHERE ${filtros.join(" AND ")}` : "";
//     const limitClause = limit ? " LIMIT ?" : "";

//     if (limit) {
//       params.push(Number(limit));
//     }

//     const results = await executeQuery(
//       `SELECT 
//          u.usu_id AS id, 
//          CONCAT(IFNULL(u.usu_nombre, ''), ' ', IFNULL(u.usu_apellido, '')) AS nombre,
//          u.usu_correo AS correo,
//          u.usu_foto AS foto,
//          u.usu_documento AS documento,
//          u.usu_telefono AS telefono,
//          u.usu_direccion AS direccion,
//          u.usu_agenda AS agenda,
//          u.usu_instructor AS instructor,
//          u.usu_requiere_confirmacion AS requiereConfirmacion,
//          u.est_id AS estado,
//          p.prf_nombre AS perfil
//        FROM tbl_usuarios u
//        JOIN tbl_perfil p ON p.prf_id = u.prf_id
//        ${whereClause}
//        ORDER BY nombre ASC
//        ${limitClause}`,
//       params,
//       connection
//     );

//     res.status(200).json(results);
  
//   } 
//   catch (err) {
//     console.log(err)
//     next(err);
//   } finally {
//     if (connection) releaseConnection(connection);
//   }
// };

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
        u.usu_valor_hora AS valorHora,
        u.usu_acceso AS acceso,
        u.usu_agenda AS agenda,
        u.usu_instructor AS instructor,
        u.usu_requiere_confirmacion AS requiere_confirmacion,
        u.usu_cambio AS cambioclave,
        u.usu_areas AS usuareas,
        u.usu_usu_act AS usuarioact,
        (
          SELECT GROUP_CONCAT(ven_id)
          FROM tbl_usuarios_ventanas
          WHERE usu_id = ?
        ) AS usuventanas,
        (
          SELECT GROUP_CONCAT(ase_id)
          FROM tbl_usuarios_aseguradoras
          WHERE usu_id = ?
        ) AS aseguradoras,
                      (
              SELECT GROUP_CONCAT(up.blo_id)
              FROM tbl_usuario_proyecto up
              WHERE up.usu_id = u.usu_id
            ) AS proIds,
             (
              SELECT SUBSTRING_INDEX(GROUP_CONCAT(up.blo_id ORDER BY up.blo_id), ',', 1)
              FROM tbl_usuario_proyecto up
              WHERE up.usu_id = u.usu_id
            ) AS bloqueId,
            (
              SELECT lc.loc_id
              FROM tbl_local_cliente lc
              WHERE lc.usu_id = u.usu_id AND lc.lcl_estado = 'activo'
              ORDER BY lc.lcl_principal DESC, lc.lcl_fec_reg DESC
              LIMIT 1
            ) AS localId,
             (
              SELECT GROUP_CONCAT(ur.tir_id)
              FROM tbl_usuario_tipo_reembolso ur
              WHERE ur.usu_id = u.usu_id
            ) AS tirIds
      FROM tbl_usuarios u
      WHERE u.usu_id = ?`,
      [usuId, usuId, usuId],
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
             (
              SELECT GROUP_CONCAT(up.blo_id)
              FROM tbl_usuario_proyecto up
              WHERE up.usu_id = u.usu_id
            ) AS proIds,
             (
              SELECT GROUP_CONCAT(ur.tir_id)
              FROM tbl_usuario_tipo_reembolso ur
              WHERE ur.usu_id = u.usu_id
            ) AS tirIds,
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

async function validateAseguradorasExist(connection, ids = []) {
  if (!Array.isArray(ids) || ids.length === 0) return [];
  const clean = [
    ...new Set(ids.map((n) => parseInt(n, 10)).filter((n) => !isNaN(n))),
  ];
  if (clean.length === 0) return [];

  const placeholders = clean.map(() => "?").join(",");
  const rows = await executeQuery(
    `SELECT ase_id FROM tbl_aseguradora WHERE ase_id IN (${placeholders})`,
    clean,
    connection
  );
  const existentes = new Set(rows.map((r) => r.ase_id));
  const invalidos = clean.filter((id) => !existentes.has(id));
  return invalidos;
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

    // ======= Parseo colecciones (FormData JSON) =======
    const unidadesCliente = req.body.unidadesCliente
      ? req.body.unidadesCliente
      : [];

    // nuevos: caer a estos si no mandan unidadesCliente
    const bloqueIdBody = toInt(req.body.bloqueId);
    const localIdBody = toInt(req.body.localId);
    const aseguradoras = req.body.aseguradoras ? req.body.aseguradoras : [];
    const tirIds = req.body.tirIds ? req.body.tirIds : [];
    const proIds = req.body.proIds ? req.body.proIds : [];

    // Normalizaciones a números únicos
    const aseguradorasClean = Array.from(
      new Set(
        (aseguradoras || [])
          .map((n) => parseInt(n, 10))
          .filter((n) => !isNaN(n))
      )
    );

    const tirClean = Array.from(
      new Set(
        (tirIds || []).map((n) => parseInt(n, 10)).filter((n) => !isNaN(n))
      )
    );
    const proClean = Array.from(
      new Set(
        (proIds || []).map((n) => parseInt(n, 10)).filter((n) => !isNaN(n))
      )
    );

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

    const invalidAseg = await validateAseguradorasExist(
      connection,
      aseguradorasClean
    );
    if (invalidAseg.length > 0) {
      const error = new Error(
        `Algunas aseguradoras no existen: [${invalidAseg.join(", ")}]`
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

      // Locales (N:N) – desactivar actuales y volver a insertar activos
      //     await executeQuery(
      //       `UPDATE tbl_local_cliente
      //    SET lcl_estado = 'inactivo', lcl_usu_act = ?, lcl_fec_act = CURRENT_TIMESTAMP
      //  WHERE usu_id = ? AND lcl_estado = 'activo'`,
      //       [usuarioact, usuId],
      //       connection
      //     );

      //     // si no enviaron unidadesCliente, tomar el localId principal del body
      //     const locales =
      //       Array.isArray(unidadesCliente) && unidadesCliente.length
      //         ? unidadesCliente
      //         : localIdBody
      //         ? [{ locId: localIdBody, principal: 1 }]
      //         : [];
      //     for (let i = 0; i < locales.length; i++) {
      //       const it = locales[i] || {};
      //       const locId = it.locId ?? it.uniId; // mapeo por compatibilidad
      //       if (!locId) continue;

      //       const principal = Number(it.principal ?? (i === 0 ? 1 : 0));
      //       await executeQuery(
      //         `INSERT INTO tbl_local_cliente
      //      (loc_id, usu_id, lcl_principal, lcl_estado, lcl_usu_reg, lcl_fec_reg)
      //    VALUES (?, ?, ?, 'activo', ?, CURRENT_TIMESTAMP)`,
      //         [locId, usuId, principal, usuarioact],
      //         connection
      //       );
      //     }
      // Locales (N:N) – UPSERT y desactivación selectiva
      const localesPayloadUpdate =
        Array.isArray(unidadesCliente) && unidadesCliente.length
          ? unidadesCliente
          : localIdBody
          ? [{ locId: localIdBody, principal: 1 }]
          : [];

      // Si NO vienen locales en el payload, NO tocar tbl_local_cliente (evitamos side-effects)
      if (localesPayloadUpdate.length > 0) {
        // Normalizar y deduplicar locIds
        const locIdsUnicos = [
          ...new Set(
            localesPayloadUpdate
              .map((it) => Number(it?.locId ?? it?.uniId))
              .filter((n) => Number.isFinite(n))
          ),
        ];

        // 1) Desactivar SOLO los que ya no vienen en el payload
        await executeQuery(
          `UPDATE tbl_local_cliente
       SET lcl_estado = 'inactivo', lcl_usu_act = ?, lcl_fec_act = CURRENT_TIMESTAMP
     WHERE usu_id = ? AND lcl_estado = 'activo'
       AND loc_id NOT IN (${locIdsUnicos.map(() => "?").join(",")})`,
          [usuarioact, usuId, ...locIdsUnicos],
          connection
        );

        // 2) Para cada loc del payload: UPSERT (reactiva si existe, crea si no)
        for (let i = 0; i < locIdsUnicos.length; i++) {
          const locId = locIdsUnicos[i];
          const original =
            localesPayloadUpdate.find(
              (x) => Number(x?.locId ?? x?.uniId) === locId
            ) || {};
          const principal = Number(original?.principal ?? (i === 0 ? 1 : 0));

          await executeQuery(
            `INSERT INTO tbl_local_cliente
         (loc_id, usu_id, lcl_principal, lcl_estado, lcl_usu_reg, lcl_fec_reg)
       VALUES (?, ?, ?, 'activo', ?, CURRENT_TIMESTAMP)
       ON DUPLICATE KEY UPDATE
         lcl_principal = VALUES(lcl_principal),
         lcl_estado   = 'activo',
         lcl_usu_act  = VALUES(lcl_usu_reg),
         lcl_fec_act  = CURRENT_TIMESTAMP`,
            [locId, usuId, principal, usuarioact],
            connection
          );
        }
      }

      // Áreas
      await executeQuery(
        "DELETE FROM tbl_areas_usuarios WHERE usu_id = ?",
        [usuId],
        connection
      );

      if (usuareas && typeof usuareas === "string") {
        const areas = usuareas
          .split(",")
          .map((a) => parseInt(a.trim(), 10))
          .filter((a) => !isNaN(a));
        for (const areId of areas) {
          await executeQuery(
            "INSERT INTO tbl_areas_usuarios (are_id, usu_id) VALUES (?, ?)",
            [areId, usuId],
            connection
          );
        }
      }

      // Aseguradoras N:N
      await executeQuery(
        "DELETE FROM tbl_usuarios_aseguradoras WHERE usu_id = ?",
        [usuId],
        connection
      );
      if (aseguradorasClean.length > 0) {
        for (const aseId of aseguradorasClean) {
          await executeQuery(
            "INSERT INTO tbl_usuarios_aseguradoras (usu_id, ase_id) VALUES (?, ?)",
            [usuId, aseId],
            connection
          );
        }
      }

      // ======= Tipos de reembolso N:N =======
      await executeQuery(
        "DELETE FROM tbl_usuario_tipo_reembolso WHERE usu_id = ?",
        [usuId],
        connection
      );
      if (tirClean.length > 0) {
        for (const tirId of tirClean) {
          await executeQuery(
            "INSERT INTO tbl_usuario_tipo_reembolso (usu_id, tir_id) VALUES (?, ?)",
            [usuId, tirId],
            connection
          );
        }
      }

      // =======  Proyectos N:N =======
      await executeQuery(
        "DELETE FROM tbl_usuario_proyecto WHERE usu_id = ?",
        [usuId],
        connection
      );
      if (proClean.length > 0 || bloqueIdBody) {
        const toInsert = proClean.length ? proClean : [bloqueIdBody];
        for (const proId of toInsert) {
          await executeQuery(
            "INSERT INTO tbl_usuario_proyecto (usu_id, blo_id) VALUES (?, ?)",
            [usuId, proId],
            connection
          );
        }
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

      // Locales (N:N)
      //   const locales =
      //     Array.isArray(unidadesCliente) && unidadesCliente.length
      //       ? unidadesCliente
      //       : localIdBody
      //       ? [{ locId: localIdBody, principal: 1 }]
      //       : [];

      //   for (let i = 0; i < locales.length; i++) {
      //     const it = locales[i] || {};
      //     const locId = it.locId ?? it.uniId;
      //     if (!locId) continue;

      //     const principal = Number(it.principal ?? (i === 0 ? 1 : 0));
      //     await executeQuery(
      //       `INSERT INTO tbl_local_cliente
      //    (loc_id, usu_id, lcl_principal, lcl_estado, lcl_usu_reg, lcl_fec_reg)
      //  VALUES (?, ?, ?, 'activo', ?, CURRENT_TIMESTAMP)`,
      //       [locId, createdId, principal, usuarioact],
      //       connection
      //     );
      //   }

      const localesPayloadCreate =
        Array.isArray(unidadesCliente) && unidadesCliente.length
          ? unidadesCliente
          : localIdBody
          ? [{ locId: localIdBody, principal: 1 }]
          : [];

      const locIdsUnicosCreate = [
        ...new Set(
          localesPayloadCreate
            .map((it) => Number(it?.locId ?? it?.uniId))
            .filter((n) => Number.isFinite(n))
        ),
      ];

      for (let i = 0; i < locIdsUnicosCreate.length; i++) {
        const locId = locIdsUnicosCreate[i];
        const original =
          localesPayloadCreate.find(
            (x) => Number(x?.locId ?? x?.uniId) === locId
          ) || {};
        const principal = Number(original?.principal ?? (i === 0 ? 1 : 0));

        await executeQuery(
          `INSERT INTO tbl_local_cliente
       (loc_id, usu_id, lcl_principal, lcl_estado, lcl_usu_reg, lcl_fec_reg)
     VALUES (?, ?, ?, 'activo', ?, CURRENT_TIMESTAMP)
     ON DUPLICATE KEY UPDATE
       lcl_principal = VALUES(lcl_principal),
       lcl_estado   = 'activo',
       lcl_usu_act  = VALUES(lcl_usu_reg),
       lcl_fec_act  = CURRENT_TIMESTAMP`,
          [locId, createdId, principal, usuarioact],
          connection
        );
      }

      // Áreas
      if (usuareas && typeof usuareas === "string") {
        const areas = usuareas
          .split(",")
          .map((a) => parseInt(a.trim(), 10))
          .filter((a) => !isNaN(a));
        for (const areId of areas) {
          await executeQuery(
            "INSERT INTO tbl_areas_usuarios (are_id, usu_id) VALUES (?, ?)",
            [areId, createdId],
            connection
          );
        }
      }

      // Aseguradoras N:N
      if (aseguradorasClean.length > 0) {
        for (const aseId of aseguradorasClean) {
          await executeQuery(
            "INSERT INTO tbl_usuarios_aseguradoras (usu_id, ase_id) VALUES (?, ?)",
            [createdId, aseId],
            connection
          );
        }
      }

      // =======  Tipos de reembolso N:N =======
      if (tirClean.length > 0) {
        for (const tirId of tirClean) {
          await executeQuery(
            "INSERT INTO tbl_usuario_tipo_reembolso (usu_id, tir_id) VALUES (?, ?)",
            [createdId, tirId],
            connection
          );
        }
      }

      // =======  Proyectos N:N =======
      if (proClean.length > 0 || bloqueIdBody) {
        const toInsert = proClean.length ? proClean : [bloqueIdBody];
        for (const proId of toInsert) {
          await executeQuery(
            "INSERT INTO tbl_usuario_proyecto (usu_id, blo_id) VALUES (?, ?)",
            [createdId, proId],
            connection
          );
        }
      }

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

// utils de normalización y helpers básicos
const clean = (s) =>
  (s ?? "")
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();

function splitNombreCompleto(full) {
  const p = (full || "").trim().split(/\s+/);
  if (p.length === 0) return { nombres: null, apellidos: null };
  if (p.length === 1) return { nombres: p[0], apellidos: null };
  const apellidos = p.slice(-2).join(" ");
  const nombres = p.slice(0, -2).join(" ");
  return { nombres, apellidos };
}

const pick = (row, ...keys) => {
  for (const k of keys)
    if (row[k] !== undefined && row[k] !== null) return row[k];
  return null;
};

// Cache global en memoria DURANTE el request (para reducir roundtrips)
const DEFAULT_TIR_ID = 14;
const DEFAULT_PROJECT_ID = 10;

const caches = () => ({
  gerencias: new Map(),
  cargos: new Map(),
  centros: new Map(),
  tiposReembolso: new Map(),
  proyectos: new Map(),
});

// Marcas por fila (para invalidar cache si hay rollback de esa fila)
const touchedSet = () => ({
  gerencias: new Set(),
  cargos: new Set(),
  centros: new Set(),
  tiposReembolso: new Set(),
  proyectos: new Set(),
});

function dropTouched(cache, touched) {
  for (const k of touched.gerencias) cache.gerencias.delete(k);
  for (const k of touched.cargos) cache.cargos.delete(k);
  for (const k of touched.centros) cache.centros.delete(k);
  for (const k of touched.tiposReembolso) cache.tiposReembolso.delete(k);
  for (const k of touched.proyectos) cache.proyectos.delete(k);
}

async function excelToRows(fileObj) {
  const wb = new ExcelJS.Workbook();
  if (fileObj?.data && fileObj.data.length) {
    await wb.xlsx.load(fileObj.data);
  } else if (fileObj?.tempFilePath) {
    await wb.xlsx.readFile(fileObj.tempFilePath);
  } else {
    throw new Error("No se pudo leer el archivo subido.");
  }

  const ws = wb.worksheets[0];
  if (!ws) return [];

  const headerRow = ws.getRow(1);
  const colCount =
    ws.actualColumnCount || ws.columnCount || headerRow.cellCount || 0;

  const headers = [];
  for (let c = 1; c <= colCount; c++) {
    headers.push((headerRow.getCell(c).text || "").trim());
  }

  const rows = [];
  const lastRow = ws.actualRowCount || ws.rowCount || 1;
  for (let r = 2; r <= lastRow; r++) {
    const row = ws.getRow(r);
    if (!row || row.cellCount === 0) continue;
    const obj = {};
    for (let c = 1; c <= colCount; c++) {
      const h = headers[c - 1] || `COL_${c}`;
      const cell = row.getCell(c);
      let val = cell.text;
      if (val === undefined || val === null || val === "") {
        if (typeof cell.value === "number") val = cell.value;
        else val = null;
      }
      obj[h] = val;
    }
    if (Object.values(obj).some((v) => v !== null && v !== "")) rows.push(obj);
  }
  return rows;
}

async function getOrCreateGerencia(connection, nombre, cache, touched) {
  const key = clean(nombre);
  if (!key) return null;

  const c = cache.gerencias.get(key);
  if (c) return c.id;

  const [row] = await executeQuery(
    "SELECT ger_id AS id, ger_nombre AS nombre FROM tbl_gerencia WHERE UPPER(TRIM(ger_nombre)) = ? LIMIT 1",
    [key],
    connection
  );
  if (row) {
    cache.gerencias.set(key, row);
    return row.id;
  }

  const ins = await executeQuery(
    "INSERT INTO tbl_gerencia (ger_nombre, est_id) VALUES (?, 1)",
    [nombre.trim()],
    connection
  );
  const id = ins.insertId;
  cache.gerencias.set(key, { id, nombre });
  touched?.gerencias.add(key);
  return id;
}

async function getOrCreateCargo(connection, nombre, ger_id, cache, touched) {
  const key = clean(nombre);
  if (!key) return null;

  const cached = cache.cargos.get(key);
  if (cached) {
    if (ger_id && cached.ger_id !== ger_id) {
      await executeQuery(
        "UPDATE tbl_cargos SET ger_id=? WHERE car_id=?",
        [ger_id, cached.id],
        connection
      );
      cached.ger_id = ger_id;
    }
    return cached.id;
  }

  const [row] = await executeQuery(
    "SELECT car_id AS id, car_nombre AS nombre, ger_id FROM tbl_cargos WHERE UPPER(TRIM(car_nombre)) = ? LIMIT 1",
    [key],
    connection
  );
  if (row) {
    if (ger_id && row.ger_id !== ger_id) {
      await executeQuery(
        "UPDATE tbl_cargos SET ger_id=? WHERE car_id=?",
        [ger_id, row.id],
        connection
      );
      row.ger_id = ger_id;
    }
    cache.cargos.set(key, row);
    return row.id;
  }

  const ins = await executeQuery(
    "INSERT INTO tbl_cargos (car_nombre, ger_id, est_id) VALUES (?, ?, 1)",
    [nombre.trim(), ger_id || null],
    connection
  );
  const id = ins.insertId;
  cache.cargos.set(key, { id, nombre, ger_id });
  touched?.cargos.add(key);
  return id;
}

async function getOrCreateCentroCosto(
  connection,
  codigo,
  nombre,
  ger_id,
  cache,
  touched
) {
  const codeKey = clean(codigo) || null;
  if (!codeKey && !nombre) return null;

  if (codeKey) {
    const c = cache.centros.get(codeKey);
    if (c) {
      if (nombre && clean(c.nombre) !== clean(nombre)) {
        await executeQuery(
          "UPDATE tbl_centro_costos SET cco_nombre=? WHERE cco_id=?",
          [nombre.trim(), c.id],
          connection
        );
        c.nombre = nombre;
      }
      if (ger_id && c.ger_id !== ger_id) {
        await executeQuery(
          "UPDATE tbl_centro_costos SET ger_id=? WHERE cco_id=?",
          [ger_id, c.id],
          connection
        );
        c.ger_id = ger_id;
      }
      return c.id;
    }
  }

  let row = null;
  if (codeKey) {
    [row] = await executeQuery(
      "SELECT cco_id AS id, cco_codigo AS codigo, cco_nombre AS nombre, ger_id FROM tbl_centro_costos WHERE UPPER(TRIM(cco_codigo)) = ? LIMIT 1",
      [codeKey],
      connection
    );
  }
  if (!row && nombre) {
    [row] = await executeQuery(
      "SELECT cco_id AS id, cco_codigo AS codigo, cco_nombre AS nombre, ger_id FROM tbl_centro_costos WHERE UPPER(TRIM(cco_nombre)) = ? LIMIT 1",
      [clean(nombre)],
      connection
    );
  }

  if (row) {
    if (nombre && clean(row.nombre) !== clean(nombre)) {
      await executeQuery(
        "UPDATE tbl_centro_costos SET cco_nombre=? WHERE cco_id=?",
        [nombre.trim(), row.id],
        connection
      );
      row.nombre = nombre;
    }
    if (ger_id && row.ger_id !== ger_id) {
      await executeQuery(
        "UPDATE tbl_centro_costos SET ger_id=? WHERE cco_id=?",
        [ger_id, row.id],
        connection
      );
      row.ger_id = ger_id;
    }
    if (codeKey) cache.centros.set(codeKey, row);
    return row.id;
  }

  const ins = await executeQuery(
    "INSERT INTO tbl_centro_costos (cco_codigo, cco_nombre, ger_id, est_id) VALUES (?, ?, ?, 1)",
    [codigo || null, nombre || null, ger_id || null],
    connection
  );
  const id = ins.insertId;
  const obj = { id, codigo, nombre, ger_id };
  if (codeKey) cache.centros.set(codeKey, obj);
  touched?.centros.add(codeKey || clean(nombre));
  return id;
}

async function getOrCreateTipoReembolso(connection, nombre, cache, touched) {
  const key = clean(nombre);
  if (!key) return null;

  const c = cache.tiposReembolso.get(key);
  if (c) return c.id;

  const [row] = await executeQuery(
    "SELECT tir_id AS id, tir_nombre AS nombre FROM tbl_tipo_reembolsable WHERE UPPER(TRIM(tir_nombre)) = ? LIMIT 1",
    [key],
    connection
  );
  if (row) {
    cache.tiposReembolso.set(key, row);
    return row.id;
  }

  const ins = await executeQuery(
    "INSERT INTO tbl_tipo_reembolsable (tir_nombre, est_id) VALUES (?, 1)",
    [nombre.trim()],
    connection
  );
  const id = ins.insertId;
  cache.tiposReembolso.set(key, { id, nombre });
  touched?.tiposReembolso.add(key);
  return id;
}

async function getOrCreateProyecto(
  connection,
  nombre,
  cache,
  crearSiNoExiste = true,
  touched
) {
  const key = clean(nombre);
  if (!key) return null;

  const c = cache.proyectos.get(key);
  if (c) return c.id;

  const [row] = await executeQuery(
    "SELECT blo_id AS id, blo_nombre AS nombre FROM tbl_bloques WHERE UPPER(TRIM(blo_nombre)) = ? LIMIT 1",
    [key],
    connection
  );
  if (row) {
    cache.proyectos.set(key, row);
    return row.id;
  }
  if (!crearSiNoExiste) return null;

  const ins = await executeQuery(
    "INSERT INTO tbl_bloques (blo_nombre, blo_estado) VALUES (?, 'activo')",
    [nombre.trim()],
    connection
  );
  const id = ins.insertId;
  cache.proyectos.set(key, { id, nombre });
  touched?.proyectos.add(key);
  return id;
}

async function upsertUsuario(
  connection,
  { documento, nombres, apellidos, car_id, cco_id }
) {
  if (!documento)
    return { action: "skip", usuId: null, reason: "sin_documento" };

  const [u] = await executeQuery(
    "SELECT usu_id FROM tbl_usuarios WHERE usu_documento = ? AND est_id != 3 LIMIT 1",
    [String(documento).trim()],
    connection
  );

  if (u) {
    const sets = ["usu_nombre = ?", "usu_apellido = ?", "prf_id = 14"];
    const params = [nombres || null, apellidos || null];

    if (car_id !== undefined && car_id !== null) {
      sets.push("car_id = ?");
      params.push(car_id);
    }
    if (cco_id !== undefined && cco_id !== null) {
      sets.push("cco_id = ?");
      params.push(cco_id);
    }

    params.push(u.usu_id);
    await executeQuery(
      `UPDATE tbl_usuarios SET ${sets.join(", ")} WHERE usu_id = ?`,
      params,
      connection
    );
    return { action: "update", usuId: u.usu_id };
  }

  const ins = await executeQuery(
    `INSERT INTO tbl_usuarios
       (tpd_id, usu_documento, usu_nombre, usu_apellido, usu_usuario, prf_id, est_id, usu_acceso, car_id, cco_id)
     VALUES (1, ?, ?, ?, ?, 14, 1, 0, ?, ?)`,
    [
      String(documento).trim(),
      nombres || null,
      apellidos || null,
      String(documento).trim(),
      car_id ?? null,
      cco_id ?? null,
    ],
    connection
  );
  return { action: "create", usuId: ins.insertId };
}

async function ensureUsuarioProyecto(connection, { usu_id, blo_id }) {
  if (!usu_id || !blo_id) return;
  await executeQuery(
    `INSERT IGNORE INTO tbl_usuario_proyecto (usu_id, blo_id) VALUES (?, ?)`,
    [usu_id, blo_id],
    connection
  );
}

async function ensureUsuarioTipoReembolso(connection, { usu_id, tir_id }) {
  if (!usu_id || !tir_id) return;
  await executeQuery(
    `INSERT IGNORE INTO tbl_usuario_tipo_reembolso (usu_id, tir_id) VALUES (?, ?)`,
    [usu_id, tir_id],
    connection
  );
}

// Busca el tir_id por defecto: intenta ID=14; si no existe, busca por nombre 'N/A'/'NA'/'NO APLICA'; si no hay, lo crea ('N/A').
async function resolveDefaultTirId(connection) {
  const [byId] = await executeQuery(
    "SELECT tir_id FROM tbl_tipo_reembolsable WHERE tir_id = ? LIMIT 1",
    [DEFAULT_TIR_ID],
    connection
  );
  if (byId) return DEFAULT_TIR_ID;

  const [byName] = await executeQuery(
    `SELECT tir_id FROM tbl_tipo_reembolsable
      WHERE UPPER(TRIM(tir_nombre)) IN ('N/A','NA','NO APLICA') LIMIT 1`,
    [],
    connection
  );
  if (byName && byName.tir_id) return byName.tir_id;

  const ins = await executeQuery(
    "INSERT INTO tbl_tipo_reembolsable (tir_nombre, est_id) VALUES ('N/A', 1)",
    [],
    connection
  );
  return ins.insertId;
}

// Fuerza relación 1:1 usuario–tipo de reembolso
async function setUsuarioTipoReembolsoUnique(connection, { usu_id, tir_id }) {
  if (!usu_id) return;
  await executeQuery(
    `DELETE FROM tbl_usuario_tipo_reembolso WHERE usu_id = ?`,
    [usu_id],
    connection
  );
  if (tir_id) {
    await executeQuery(
      `INSERT INTO tbl_usuario_tipo_reembolso (usu_id, tir_id) VALUES (?, ?)`,
      [usu_id, tir_id],
      connection
    );
  }
}

// Igual a ensureUsuarioProyecto pero sabemos si realmente creó
async function ensureUsuarioProyectoReturning(connection, { usu_id, blo_id }) {
  if (!usu_id || !blo_id) return { created: false };
  const r = await executeQuery(
    `INSERT IGNORE INTO tbl_usuario_proyecto (usu_id, blo_id) VALUES (?, ?)`,
    [usu_id, blo_id],
    connection
  );
  const created = !!(r && (r.affectedRows > 0 || r.insertId));
  return { created };
}

// ============ Endpoint principal ============

export const importEmpleados = async (req, res, next) => {
  try {
    const { sheetName, scope, rows } = req.body || {};

    if (!Array.isArray(rows) || rows.length === 0) {
      return res
        .status(400)
        .json({ message: "El payload no contiene filas para importar." });
    }

    const crearProyectos = true;
    const summary = {
      sheetName: sheetName || null,
      scope: scope || "filtered",
      procesados: 0,
      creados: 0,
      actualizados: 0,
      saltados: 0,
      errores: [],
      relacionesUPR: 0,
      relacionesUTR: 0,
    };

    const cache = caches();
    let connection = null;

    try {
      connection = await getConnection();

      // Resolver una sola vez el TIR por defecto (N/A)
      const defaultTirId = await resolveDefaultTirId(connection);

      for (let i = 0; i < rows.length; i++) {
        const touched = touchedSet();
        const src = rows[i];
        summary.procesados++;

        const fullName = (src.fullName ?? "").toString().trim();
        const documento = (src.documento ?? "").toString().trim();
        const cargoNombre = (src.cargoNombre ?? "").toString().trim();
        const gerenciaNombre = (src.gerenciaNombre ?? "").toString().trim();
        const ccCodigo = (src.ccCodigo ?? "").toString().trim();
        const ccNombre = (src.ccNombre ?? "").toString().trim();
        const tipoReembolsoNombre = (src.tipoReembolsoNombre ?? "")
          .toString()
          .trim();

        const proyectos = Array.isArray(src.proyectos)
          ? src.proyectos
          : (src.proyectos ?? "")
              .toString()
              .split("-")
              .map((p) => p.trim())
              .filter(Boolean);

        const { nombres, apellidos } = splitNombreCompleto(fullName || "");

        if (!documento || !fullName) {
          summary.saltados++;
          summary.errores.push({
            fila: i + 2,
            documento,
            error: "Faltan campos obligatorios (documento y/o nombre).",
          });
          continue;
        }

        await connection.beginTransaction();
        try {
          const ger_id = await getOrCreateGerencia(
            connection,
            gerenciaNombre,
            cache,
            touched
          );
          const car_id = await getOrCreateCargo(
            connection,
            cargoNombre,
            ger_id,
            cache,
            touched
          );
          const cco_id = await getOrCreateCentroCosto(
            connection,
            ccCodigo,
            ccNombre,
            ger_id,
            cache,
            touched
          );

          // === Tipo de reembolso: el de la fila, si no -> N/A (default) ===
          let tir_id = null;
          if (tipoReembolsoNombre) {
            tir_id = await getOrCreateTipoReembolso(
              connection,
              tipoReembolsoNombre,
              cache,
              touched
            );
          }
          if (!tir_id) tir_id = defaultTirId;

          // Upsert de usuario
          const rUser = await upsertUsuario(connection, {
            documento,
            nombres,
            apellidos,
            car_id,
            cco_id,
          });
          if (rUser.action === "create") summary.creados++;
          if (rUser.action === "update") summary.actualizados++;

          const usuId = rUser.usuId;

          // === Usuario ↔ Tipo de Reembolso (1:1) ===
          // Elimina relaciones previas y deja SOLO tir_id (el que venga o el default N/A)
          await setUsuarioTipoReembolsoUnique(connection, {
            usu_id: usuId,
            tir_id,
          });
          summary.relacionesUTR++;

          // === Usuario ↔ Proyectos: los que vengan en la fila...
          if (usuId && proyectos.length > 0) {
            for (const pNombreRaw of proyectos) {
              const pNombre = (pNombreRaw ?? "").toString().trim();
              if (!pNombre) continue;

              const blo_id = await getOrCreateProyecto(
                connection,
                pNombre,
                cache,
                crearProyectos,
                touched
              );
              if (!blo_id) continue;

              const { created } = await ensureUsuarioProyectoReturning(
                connection,
                {
                  usu_id: usuId,
                  blo_id,
                }
              );
              if (created) summary.relacionesUPR++;
            }
          }

          // ...y SIEMPRE garantizar el proyecto obligatorio (ID 10)
          if (usuId) {
            const { created } = await ensureUsuarioProyectoReturning(
              connection,
              {
                usu_id: usuId,
                blo_id: DEFAULT_PROJECT_ID,
              }
            );
            if (created) summary.relacionesUPR++;
          }

          await connection.commit();
        } catch (eRow) {
          await connection.rollback();
          dropTouched(cache, touched);
          summary.errores.push({
            fila: i + 2,
            documento,
            error: eRow?.message || String(eRow),
          });
        }
      }

      return res
        .status(200)
        .json({ message: "Importación finalizada", ...summary });
    } catch (err) {
      next(err);
    } finally {
      if (connection) releaseConnection(connection);
    }
  } catch (err) {
    next(err);
  }
};

export const importEmpleadosExcel = async (req, res, next) => {
  try {
    // archivo desde express-fileupload
    let fileObj = null;
    if (req.files?.file) fileObj = req.files.file;
    else if (req.files?.archivo) fileObj = req.files.archivo;

    if (!fileObj) {
      return res
        .status(400)
        .json({ message: "Adjunta el archivo Excel en el campo 'file'." });
    }

    const rows = await excelToRows(fileObj);

    const crearProyectos = true;
    const summary = {
      procesados: 0,
      creados: 0,
      actualizados: 0,
      errores: [],
      relacionesPTR: 0,
      relacionesUPR: 0,
    };

    const cache = caches();
    let connection = null;

    try {
      connection = await getConnection();

      for (let i = 0; i < rows.length; i++) {
        const touched = touchedSet();
        const row = rows[i];
        summary.procesados++;

        const fullName = pick(
          row,
          "NOMBRE EMPLEADO",
          "NOMBRE",
          "EMPLEADO",
          "Nombre Empleado"
        );
        const documento = pick(
          row,
          "IDENTIFICACION",
          "IDENTIFICACIÓN",
          "DOCUMENTO",
          "ID",
          "Nit",
          "NIT"
        );
        const cargoNombre = pick(row, "CARGO");
        const gerenciaNombre = pick(row, "GERENCIA");
        const ccCodigo = pick(
          row,
          "C.COSTO COD",
          "CCOSTO COD",
          "COSTO COD",
          "COSTO_COD",
          "Centro de Costo"
        );
        const ccNombre = pick(
          row,
          "C.COSTO NOMBRE",
          "CCOSTO NOMBRE",
          "COSTO NOMBRE",
          "COSTO_NOMBRE",
          "Nombre Centro de Costos"
        );
        const tipoReembolsoNombre = pick(
          row,
          "TIPO DE REEMBOLSO",
          "TIPO REEMBOLSO",
          "TIPO"
        );
        const proyectosCell = pick(
          row,
          "PROYECTO A REEMBOLSAR",
          "PROYECTOS A REEMBOLSAR",
          "PROYECTO",
          "PROYECTOS"
        );

        const proyectos = (proyectosCell || "")
          .toString()
          .split("-")
          .map((p) => p.trim())
          .filter(Boolean);

        const { nombres, apellidos } = splitNombreCompleto(fullName || "");
        const doc = (documento ?? "").toString().trim();

        if (!doc || !fullName) {
          summary.errores.push({
            fila: i + 2,
            documento: doc,
            error: "Faltan campos obligatorios (documento y/o nombre).",
          });
          continue;
        }

        await connection.beginTransaction();
        try {
          const ger_id = await getOrCreateGerencia(
            connection,
            gerenciaNombre,
            cache,
            touched
          );
          const car_id = await getOrCreateCargo(
            connection,
            cargoNombre,
            ger_id,
            cache,
            touched
          );
          const cco_id = await getOrCreateCentroCosto(
            connection,
            ccCodigo,
            ccNombre,
            ger_id,
            cache,
            touched
          );
          const tir_id = await getOrCreateTipoReembolso(
            connection,
            tipoReembolsoNombre,
            cache,
            touched
          );

          const rUser = await upsertUsuario(connection, {
            documento: doc,
            nombres,
            apellidos,
            car_id,
            cco_id,
          });
          if (rUser.action === "create") summary.creados++;
          if (rUser.action === "update") summary.actualizados++;

          const usuId = rUser.usuId;

          if (proyectos.length > 0) {
            for (const pNombreRaw of proyectos) {
              const pNombre = (pNombreRaw ?? "").toString().trim();
              if (!pNombre) continue;

              const blo_id = await getOrCreateProyecto(
                connection,
                pNombre,
                cache,
                crearProyectos,
                touched
              );
              if (!blo_id) continue;

              if (usuId) {
                await ensureUsuarioProyecto(connection, {
                  usu_id: usuId,
                  blo_id,
                });
                summary.relacionesUPR++;
              }
              if (tir_id) {
                await ensureTipoReembolsoProyecto(connection, tir_id, blo_id);
                summary.relacionesPTR++;
              }
            }
          }

          await connection.commit();
        } catch (eRow) {
          await connection.rollback();
          dropTouched(cache, touched);
          summary.errores.push({
            fila: i + 2,
            documento: doc,
            error: eRow.message || String(eRow),
          });
        }
      }

      return res
        .status(200)
        .json({ message: "Importación finalizada", ...summary });
    } catch (err) {
      next(err);
    } finally {
      releaseConnection(connection);
    }
  } catch (err) {
    next(err);
  }
};
