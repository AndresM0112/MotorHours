import {
  getConnection,
  releaseConnection,
  executeQuery,
} from "../../../common/configs/db.config.js";
import _ from "lodash";

export const paginationProfilesController = async (req, res, next) => {
  const { idusuario, nombre, estado, rows, first, sortField, sortOrder } =
    req.body;

  const order = sortOrder === 1 ? "ASC" : "DESC";
  let connection = null;
  try {
    connection = await getConnection();
    const from = `
        FROM tbl_perfil p 
        JOIN tbl_estados e ON p.est_id = e.est_id
    `;

    const whereConditions = [
      `p.est_id != 3`,
      `(p.prf_nombre LIKE REPLACE('%${nombre}%', ' ', '%') OR '${nombre}' IS NULL OR '${nombre}' = '')`,
      `(p.est_id = ${estado} OR ${estado} IS NULL OR '${estado}' = '')`,
    ];

    if (idusuario != 1) {
      whereConditions.push(`p.prf_id != 1`);
    }

    const whereClause =
      whereConditions.length > 0
        ? `WHERE ${whereConditions.join(" AND ")}`
        : "";

    const mainQuery = `
        SELECT 
            p.prf_id prfId, 
            p.prf_nombre nombre, 
            e.est_nombre nomestado, 
            p.prf_usu_act usuact, 
            p.prf_fec_act fecact, 
            p.est_id estid 
        ${from} ${whereClause} 
        ORDER BY ${sortField} ${order} 
        LIMIT ${rows} OFFSET ${first}
    `;

    const countQuery = `
        SELECT COUNT(DISTINCT prf_id) tot
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

export const getModulesController = async (req, res, next) => {
  const { prfId } = req.query;
  let connection = null;
  try {
    connection = await getConnection();

    const resultsAso = await executeQuery(
      "SELECT  v.ven_padre padre, v.ven_id venid, v.ven_descripcion descripcion FROM tbl_ventanas v JOIN tbl_perfil_ventanas pv ON v.ven_id = pv.ven_id WHERE pv.prf_id = ? ORDER BY ven_orden",
      [prfId],
      connection
    );

    const idasociados = resultsAso.length
      ? resultsAso.map(({ venid }) => venid).join(",")
      : `''`;

    const results = await executeQuery(
      `SELECT ven_padre padre,  ven_id venid, ven_descripcion descripcion FROM tbl_ventanas WHERE ven_id NOT IN (${idasociados})`,
      [],
      connection
    );

    return res.status(200).json({
      asociados: resultsAso,
      sinasociar: results,
    });
  } catch (err) {
    next(err);
  } finally {
    releaseConnection(connection);
  }
};

export const saveProfileController = async (req, res, next) => {
  const { prfId, nombre, estid, modulos, modulosant, usuario, idusuario } =
    req.body;

  const wh = prfId > 0 ? `AND prf_id != ${prfId}` : "";
  let connection = null;
  try {
    connection = await getConnection();
    await connection.beginTransaction();

    const resultsQuery = await executeQuery(
      `SELECT prf_id FROM tbl_perfil WHERE prf_nombre = ? AND est_id != 3 ${wh} LIMIT 1`,
      [nombre],
      connection
    );

    if (resultsQuery.length > 0) {
      const error = new Error(
        "Ya existe un Perfil con el nombre ingresado. Verificar"
      );
      error.status = 400;
      throw error;
    }

    if (prfId > 0) {
      const updateProfile = await executeQuery(
        `UPDATE tbl_perfil SET prf_nombre = ?, est_id = ?, prf_usu_act = ? WHERE prf_id = ?`,
        [nombre, estid, usuario, prfId],
        connection
      );

      if (updateProfile.affectedRows > 0) {
        const moddelete = _.difference(modulosant, modulos);
        const modinsert = _.difference(modulos, modulosant);

        if (moddelete.length > 0) {
          await executeQuery(
            `DELETE FROM tbl_perfil_ventanas WHERE prf_id = ? AND ven_id IN(${moddelete.join(
              ","
            )})`,
            [prfId],
            connection
          );
        }

        if (modinsert.length > 0) {
          for (const venid of modinsert) {
            await executeQuery(
              "INSERT INTO tbl_perfil_ventanas(prf_id, ven_id) values(?, ?)",
              [prfId, venid],
              connection
            );
          }
        }

        await connection.commit();
        return res
          .status(200)
          .json({ message: `Perfil ${nombre} Modificado Correctamente` });
      }

      const error = new Error("No se encontró el perfil para ser actualizado.");
      error.status = 400;
      throw error;
    } else {
      const insertProfile = await executeQuery(
        `INSERT INTO tbl_perfil (prf_nombre, est_id, prf_usu_reg, prf_usu_act) VALUES(?,?,?,?)`,
        [nombre, estid, idusuario, usuario],
        connection
      );

      if (insertProfile.insertId > 0) {
        if (modulos.length > 0) {
          for (const venid of modulos) {
            await executeQuery(
              "INSERT INTO tbl_perfil_ventanas(prf_id, ven_id) values(?, ?)",
              [insertProfile.insertId, venid],
              connection
            );
          }
        }

        await connection.commit();
        return res.status(200).json({
          message: `Perfil ${nombre} Creado Correctamente`,
          prfId: insertProfile.insertId,
        });
      }

      const error = new Error(
        "Ocurrió un error al intentar registrar el perfil."
      );
      error.status = 500;
      throw error;
    }
  } catch (err) {
    if (connection) await connection.rollback();
    next(err);
  } finally {
    releaseConnection(connection);
  }
};

export const deleteProfileController = async (req, res, next) => {
  const { prfId, usuario } = req.body;
  let connection = null;
  try {
    connection = await getConnection();
    await connection.beginTransaction();

    const deleteProfile = await executeQuery(
      "UPDATE tbl_perfil SET est_id = 3, prf_usu_act = ? WHERE prf_id = ?",
      [usuario, prfId],
      connection
    );

    if (deleteProfile.affectedRows > 0) {
      await executeQuery(
        "DELETE FROM tbl_perfil_ventanas WHERE prf_id = ?",
        [prfId],
        connection
      );

      await connection.commit();
      res.status(200).json({ message: "Perfil Eliminado Correctamente" });
    }

    const error = new Error(`Error al eliminar el perfil.`);
    error.statusCode = 400;
    throw error;
  } catch (err) {
    if (connection) await connection.rollback();
    next(err);
  } finally {
    releaseConnection(connection);
  }
};
