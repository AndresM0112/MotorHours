import {
  getConnection,
  releaseConnection,
  executeQuery,
} from "../../../common/configs/db.config.js";

export const getReasons = async (req, res, next) => {
  const { modulo } = req.query;
  let connection = null;
  try {
    connection = await getConnection();

    const results = await executeQuery(
      `SELECT mt.mot_id AS id, mt.mot_nombre AS nombre
      FROM tbl_motivos mt
      JOIN tbl_motivos_modulos mm ON mm.mot_id = mt.mot_id
      WHERE mm.mod_id = ? AND mt.est_id = 1
      ORDER BY nombre
`,
      [modulo],
      connection
    );

    res.status(200).json(results);
  } catch (err) {
    next(err);
  } finally {
    releaseConnection(connection);
  }
};

export const paginationReasons = async (req, res, next) => {
  const { nombre, estado, rows, first, sortField, sortOrder } = req.body;
  let connection = null;
  try {
    connection = await getConnection();

    const order = sortOrder === 1 ? "ASC" : "DESC";

    const fromClause =
      "FROM tbl_motivos m JOIN tbl_estados e ON e.est_id = m.est_id";

    const whereConditions = ["m.est_id != 3"];

    if (nombre) whereConditions.push(`(m.mot_nombre LIKE ('%${nombre}%'))`);
    if (estado) whereConditions.push(`(m.est_id = ${estado})`);

    const whereClause = `WHERE ${whereConditions.join(" AND ")}`;

    const mainQuery = `SELECT m.mot_id motId, m.mot_nombre nombre, (
  SELECT GROUP_CONCAT(mod_id)
  FROM tbl_motivos_modulos
  WHERE mot_id = m.mot_id
) AS modulos, m.est_id estado, m.mot_usu_act usuact, m.mot_fec_act fecact, e.est_nombre nomestado ${fromClause} ${whereClause} GROUP BY motId ORDER BY ${sortField} ${order} LIMIT ${rows} OFFSET ${first}`;

    const countQuery = `
    SELECT COUNT(DISTINCT m.mot_id) tot
    ${fromClause} ${whereClause}
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

export const saveReason = async (req, res, next) => {
  let connection = null;
  try {
    connection = await getConnection();
    await connection.beginTransaction();

    const { motId, nombre, modulos, estado, usureg, usuact } = req.body;
    const wh = motId > 0 ? `AND mot_id != ${motId}` : "";

    const resultsQuery = await executeQuery(
      `SELECT mot_id FROM tbl_motivos WHERE mot_nombre = ? AND est_id != 3 ${wh} LIMIT 1`,
      [nombre],
      connection
    );

    if (!motId && resultsQuery.length > 0) {
      const error = new Error(
        "Ya existe un Motivo con el nombre ingresado. Verificar"
      );
      error.status = 400;
      throw error;
    }

    if (motId > 0) {
      const updateReasons = await executeQuery(
        `UPDATE tbl_motivos SET mot_nombre = ?, est_id = ?, mot_usu_act = ? WHERE mot_id = ?`,
        [nombre, estado, usuact, motId],
        connection
      );

      if (updateReasons.affectedRows === 0) {
        const error = new Error(
          "No se encontró el Motivo para ser actualizado."
        );
        error.status = 400;
        throw error;
      }

      await executeQuery("DELETE FROM tbl_motivos_modulos WHERE mot_id = ?", [
        motId,
      ]);

      if (modulos && typeof modulos === "string") {
        const modArray = modulos
          .split(",")
          .map((id) => parseInt(id.trim()))
          .filter((id) => !isNaN(id));

        for (const modId of modArray) {
          await executeQuery(
            "INSERT INTO tbl_motivos_modulos (mot_id, mod_id) VALUES (?, ?)",
            [motId, modId],
            connection
          );
        }
      }

      await connection.commit();

      return res
        .status(200)
        .json({ message: `Motivo ${nombre} Modificado Correctamente` });
    } else {
      const columnsInsert = [
        "mot_nombre",
        "est_id",
        "mot_usu_reg",
        "mot_usu_act",
      ];
      const valuesInsert = [nombre, estado, usureg, usuact];

      const insertReasons = await executeQuery(
        `INSERT INTO tbl_motivos (${columnsInsert.join(
          ","
        )}) VALUES(${columnsInsert.map(() => "?").join(", ")})`,
        valuesInsert,
        connection
      );

      if (modulos && typeof modulos === "string") {
        const modArray = modulos
          .split(",")
          .map((id) => parseInt(id.trim()))
          .filter((id) => !isNaN(id));

        for (const modId of modArray) {
          await executeQuery(
            "INSERT INTO tbl_motivos_modulos (mot_id, mod_id) VALUES (?, ?)",
            [insertReasons.insertId, modId],
            connection
          );
        }
      }

      await connection.commit();

      return res.status(200).json({
        message: `Motivo ${nombre} creado correctamente`,
        motId: insertReasons.insertId,
      });
    }
  } catch (err) {
    if (connection) await connection.rollback();
    next(err);
  } finally {
    releaseConnection(connection);
  }
};

export const updateModulesReason = async (req, res, next) => {
  const { motId, modulos, usuact } = req.body;

  let connection = null;
  try {
    connection = await getConnection();
    await connection.beginTransaction();

    const updateModulesReason = await executeQuery(
      "UPDATE tbl_motivos SET mot_modulos = ?, mot_usu_act = ? WHERE mot_id = ?",
      [modulos, usuact, motId],
      connection
    );

    if (updateModulesReason.affectedRows === 0) {
      const error = new Error(`Error al actualizar los módulos.`);
      error.statusCode = 400;
      throw error;
    }

    await connection.commit();
    return res
      .status(200)
      .json({ message: "Módulos Modificados Correctamente." });
  } catch (err) {
    if (connection) await connection.rollback();
    next(err);
  } finally {
    releaseConnection(connection);
  }
};

export const deleteReason = async (req, res, next) => {
  const { motId, usuact } = req.body;

  let connection = null;
  try {
    connection = await getConnection();
    await connection.beginTransaction();

    const deleteReasons = await executeQuery(
      "UPDATE tbl_motivos SET est_id = 3, mot_usu_act = ? WHERE mot_id = ?",
      [usuact, motId],
      connection
    );

    if (deleteReasons.affectedRows === 0) {
      const error = new Error(`Error al eliminar el motivo.`);
      error.statusCode = 400;
      throw error;
    }

    await connection.commit();
    return res.status(200).json({ message: "Motivo Eliminado Correctamente." });
  } catch (err) {
    next(err);
  } finally {
    releaseConnection(connection);
  }
};
