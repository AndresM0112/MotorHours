// import { getIO } from "../../../../socket.js";
import {
  getConnection,
  releaseConnection,
  executeQuery,
} from "../../../common/configs/db.config.js";
import { getIO } from "../../../common/configs/socket.manager.js";

export const getProfileWindowsController = async (req, res, next) => {
  const { prfId, idu } = req.query;

  if (!prfId && !idu) {
    const error = new Error(
      "Debe proporcionar al menos el ID de usuario (idu) o el ID de perfil (prfId)."
    );
    error.status = 400;
    return next(error);
  }

  let connection = null;

  try {
    connection = await getConnection();
    let rows = [];

    if (idu) {
      const ventanaRows = await executeQuery(
        `SELECT ven_id FROM tbl_usuarios_ventanas WHERE usu_id = ?`,
        [idu],
        connection
      );

      if (!ventanaRows || ventanaRows.length === 0) {
        return res.status(200).json([]);
      }

      const venIds = ventanaRows.map((v) => v.ven_id);

      if (venIds.length === 0) {
        return res.status(200).json([]);
      }

      const placeholders = venIds.map(() => "?").join(",");

      const query = `
        SELECT  
            v1.ven_id AS venid, 
            v1.ven_descripcion AS descripcion,
            v1.ven_padre AS parent_id,
            v2.ven_descripcion AS parent_descripcion,
            COUNT(p.per_id) AS cantidad,
            v1.ven_orden AS orden
        FROM tbl_ventanas v1
        LEFT JOIN tbl_ventanas v2 ON v1.ven_padre = v2.ven_id
        LEFT JOIN tbl_permisos p ON v1.ven_id = p.ven_id
        WHERE v1.ven_id IN (${placeholders})
        GROUP BY venid, descripcion, parent_id
        ORDER BY v1.ven_padre DESC, v1.ven_orden ASC
      `;

      rows = await executeQuery(query, venIds, connection);
    } else if (prfId) {
      const venRows = await executeQuery(
        `SELECT ven_id FROM tbl_perfil_ventanas WHERE prf_id = ?`,
        [prfId],
        connection
      );

      if (!venRows || venRows.length === 0) {
        return res.status(200).json([]);
      }

      const venIds = venRows.map((v) => v.ven_id);

      const placeholders = venIds.map(() => "?").join(",");

      const query = `
    SELECT  
        v1.ven_id AS venid, 
        v1.ven_descripcion AS descripcion,
        v1.ven_padre AS parent_id,
        v2.ven_descripcion AS parent_descripcion,
        COUNT(p.per_id) AS cantidad,
        v1.ven_orden AS orden
    FROM tbl_ventanas v1
    LEFT JOIN tbl_ventanas v2 ON v1.ven_padre = v2.ven_id
    LEFT JOIN tbl_permisos p ON v1.ven_id = p.ven_id
    WHERE v1.ven_id IN (${placeholders})
    GROUP BY venid, descripcion, parent_id
    ORDER BY v1.ven_padre DESC, v1.ven_orden ASC
  `;

      rows = await executeQuery(query, venIds, connection);
    }

    // Obtener permisos por ventana
    const ventanaPermisos = await Promise.all(
      rows.map(async (ventana) => {
        const permisos = await executeQuery(
          `SELECT per_id AS perId, per_nombre AS nombre FROM tbl_permisos WHERE ven_id = ? ORDER BY per_orden ASC`,
          [ventana.venid],
          connection
        );
        return { ...ventana, permisos };
      })
    );

    res.status(200).json(ventanaPermisos);
  } catch (err) {
    next(err);
  } finally {
    releaseConnection(connection);
  }
};

export const getUserPermissionsController = async (req, res, next) => {
  const { venids, usuId } = req.body;

  // Validar entrada
  if (!Array.isArray(venids) || venids.length === 0 || !usuId) {
    return res.status(200).json([]); // Si no hay ventanas o usuId, devolver vacío
  }

  let connection = null;
  try {
    connection = await getConnection();

    const placeholders = venids.map(() => "?").join(",");

    const query = `
      SELECT 
          p.ven_id AS venid, 
          p.per_id AS perId, 
          p.per_nombre AS nombre, 
          CASE WHEN pu.usu_id IS NOT NULL THEN 1 ELSE 0 END AS asignado
      FROM tbl_permisos p 
      LEFT JOIN tbl_permisos_usuarios pu ON p.per_id = pu.per_id AND pu.usu_id = ?
      WHERE p.ven_id IN (${placeholders})
      ORDER BY p.per_orden ASC
    `;

    const params = [usuId, ...venids];
    const resultsQuery = await executeQuery(query, params, connection);

    res.status(200).json(resultsQuery);
  } catch (err) {
    next(err);
  } finally {
    releaseConnection(connection);
  }
};

export const getProfilePermissionsController = async (req, res, next) => {
  const { venids, prfId } = req.body;

  // Si no hay ventanas o prfId, retornar respuesta vacía
  if (!Array.isArray(venids) || venids.length === 0 || !prfId) {
    return res.status(200).json([]);
  }

  let connection = null;
  try {
    connection = await getConnection();

    const placeholders = venids.map(() => "?").join(",");

    const query = `
      SELECT 
          p.ven_id AS venid, 
          p.per_id AS perId, 
          p.per_nombre AS nombre, 
          CASE WHEN pf.prf_id IS NOT NULL THEN 1 ELSE 0 END AS asignado
      FROM tbl_permisos p
      LEFT JOIN tbl_permisos_perfil pf ON p.per_id = pf.per_id AND pf.prf_id = ?
      WHERE p.ven_id IN (${placeholders})
      ORDER BY p.per_orden ASC
    `;

    const rows = await executeQuery(query, [prfId, ...venids], connection);

    res.status(200).json(rows);
  } catch (err) {
    next(err);
  } finally {
    releaseConnection(connection);
  }
};

export const updateProfilePermissionsController = async (req, res, next) => {
  const { permissions, prfId } = req.body;

  if (!permissions || !prfId) {
    const error = new Error(
      "Los permisos (permissions) y el perfil (prfId) son obligatorios"
    );
    error.status = 400;
    return next(error);
  }

  let connection = null;
  try {
    connection = await getConnection();
    await connection.beginTransaction();

    const currentPermissions = await executeQuery(
      `SELECT per_id FROM tbl_permisos_perfil WHERE prf_id = ?`,
      [prfId],
      connection
    );

    const currentPermissionsSet = new Set(
      currentPermissions.map((p) => p.per_id)
    );
    const permissionsToDelete = Array.from(currentPermissionsSet).filter(
      (perId) => !permissions.includes(perId)
    );
    const permissionsToInsert = permissions.filter(
      (perId) => !currentPermissionsSet.has(perId)
    );

    if (permissionsToDelete.length > 0) {
      await executeQuery(
        `DELETE FROM tbl_permisos_perfil WHERE prf_id = ? AND per_id IN (${permissionsToDelete.join(
          ","
        )})`,
        [prfId],
        connection
      );
    }

    for (const perId of permissionsToInsert) {
      await executeQuery(
        `INSERT INTO tbl_permisos_perfil (per_id, prf_id) VALUES (?, ?)`,
        [perId, prfId],
        connection
      );
    }

    await connection.commit();
    res.status(200).json({ message: "Permisos actualizados" });
  } catch (err) {
    if (connection) await connection.rollback();
    next(err);
  } finally {
    releaseConnection(connection);
  }
};

export const updateUserPermissionsController = async (req, res, next) => {
  const { permissions, usuId } = req.body;
  const io = getIO();

  if (!permissions || !usuId) {
    const error = new Error(
      "Los permisos (permissions) y el usuario (usuId) son obligatorios"
    );
    error.status = 400;
    return next(error);
  }

  let connection = null;
  try {
    connection = await getConnection();
    await connection.beginTransaction();

    const currentPermissions = await executeQuery(
      `SELECT per_id FROM tbl_permisos_usuarios WHERE usu_id = ?`,
      [usuId],
      connection
    );

    const currentPermissionsSet = new Set(
      currentPermissions.map((p) => p.per_id)
    );
    const permissionsToDelete = Array.from(currentPermissionsSet).filter(
      (perId) => !permissions.includes(perId)
    );
    const permissionsToInsert = permissions.filter(
      (perId) => !currentPermissionsSet.has(perId)
    );

    if (permissionsToDelete.length > 0) {
      await executeQuery(
        `DELETE FROM tbl_permisos_usuarios WHERE usu_id = ? AND per_id IN (${permissionsToDelete.join(
          ","
        )})`,
        [usuId],
        connection
      );
    }

    for (const perId of permissionsToInsert) {
      await executeQuery(
        `INSERT INTO tbl_permisos_usuarios (per_id, usu_id) VALUES (?, ?)`,
        [perId, usuId],
        connection
      );
    }

    await connection.commit();

    // Obtener los permisos actualizados del usuario
    const updatedPermissions = await executeQuery(
      `SELECT per_id perId FROM tbl_permisos_usuarios WHERE usu_id = ?`,
      [usuId],
      connection
    );

    const namespace = io.of("/socket/mth");
    const room = `user:${usuId}`;
    namespace
      .to(room)
      .emit("update-permissions", { usuId, updatedPermissions });

    res.status(200).json({ message: "Permisos actualizados" });
  } catch (err) {
    if (connection) await connection.rollback();
    next(err);
  } finally {
    releaseConnection(connection);
  }
};
