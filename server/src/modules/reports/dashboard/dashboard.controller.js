import {
  getConnection,
  releaseConnection,
  executeQuery,
} from "../../../common/configs/db.config.js";
import moment from "moment";

export const getStatusOperationReport = async (_req, res, next) => {
  let connection = null;

  try {
    connection = await getConnection();

    const results = await executeQuery(
      `
        SELECT
          CASE 
            WHEN eop_id = 1 THEN 'Por cerrar'
            WHEN eop_id = 2 THEN 'Cerradas'
            WHEN eop_id = 3 THEN 'Finalizado'
            ELSE 'Otros'
          END AS estado,
          COUNT(ope_id) AS cantidad
        FROM tbl_operacion
        GROUP BY estado
        `,
      [],
      connection
    );

    const ordered = ["Por cerrar", "Cerradas", "Finalizado"].map((label) => {
      const found = results.find((r) => r.estado === label);
      return found ? found.cantidad : 0;
    });

    res.status(200).json({
      labels: ["Por cerrar", "Cerradas", "Finalizado"],
      series: ordered,
    });
  } catch (err) {
    next(err);
  } finally {
    releaseConnection(connection);
  }
};

export const getTopEquipmentsUsage = async (_req, res, next) => {
  let connection = null;
  try {
    connection = await getConnection();

    const results = await executeQuery(
      `
      SELECT 
        e.equ_nombre AS nombre, 
        COUNT(o.ope_id) AS cantidad
      FROM tbl_operacion o
      INNER JOIN tbl_equipos e ON e.equ_id = o.equ_id
      WHERE o.eop_id != 4
      GROUP BY o.equ_id
      ORDER BY cantidad DESC
      LIMIT 5
      `,
      [],
      connection
    );

    const labels = results.map((r) => r.nombre);
    const values = results.map((r) => r.cantidad);

    res.status(200).json({
      labels,
      series: [
        {
          name: "Horas operadas",
          data: values,
        },
      ],
    });
  } catch (err) {
    next(err);
  } finally {
    releaseConnection(connection);
  }
};

export const getOperationsByProject = async (_req, res, next) => {
  let connection = null;
  try {
    connection = await getConnection();

    const results = await executeQuery(
      `
      SELECT 
        p.pry_nombre AS nombre,
        COUNT(o.ope_id) AS cantidad
      FROM tbl_operacion o
      JOIN tbl_bloques p ON p.pry_id = o.pry_id
      WHERE o.eop_id != 4
      GROUP BY o.pry_id
      ORDER BY cantidad DESC
      LIMIT 5
      `,
      [],
      connection
    );

    const total = results.reduce((acc, r) => acc + r.cantidad, 0);
    const series = results.map((r) =>
      Number(((r.cantidad / total) * 100).toFixed(1))
    ); // Porcentajes
    const labels = results.map((r) => r.nombre);
    const quantities = results.map((r) => r.cantidad);

    res.status(200).json({ labels, series, quantities, total });
  } catch (err) {
    next(err);
  } finally {
    releaseConnection(connection);
  }
};

export const getAverageClosureTimePerDay = async (_req, res, next) => {
  let connection = null;
  try {
    connection = await getConnection();

    const currentWeek = moment().week();

    // Consulta para el promedio de cierre
    const cierreResults = await executeQuery(
      `
      SELECT 
        DAYNAME(ope_fec_reg) AS dia,
         ROUND(AVG(TIMESTAMPDIFF(SECOND, ope_fec_reg, ope_fec_cierre) / 3600.0), 2) AS promedio_cierre
      FROM tbl_operacion
      WHERE 
        ope_fec_reg IS NOT NULL
        AND ope_fec_cierre IS NOT NULL
        AND eop_id = 2
        AND WEEK(ope_fec_reg) = ${currentWeek}
      GROUP BY dia
    `,
      [],
      connection
    );

    // Consulta para el promedio de finalización
    const finalResults = await executeQuery(
      `
      SELECT 
        DAYNAME(ope_fec_reg) AS dia,
         ROUND(AVG(TIMESTAMPDIFF(SECOND, ope_fec_reg, ope_fec_finalizado) / 3600.0), 2) AS promedio_finalizacion
      FROM tbl_operacion
      WHERE 
        ope_fec_reg IS NOT NULL
        AND ope_fec_finalizado IS NOT NULL
        AND eop_id = 3
        AND WEEK(ope_fec_reg) = ${currentWeek}
      GROUP BY dia
    `,
      [],
      connection
    );

    const diasOrdenados = [
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
      "Sunday",
    ];
    const traduccion = {
      Monday: "Lun",
      Tuesday: "Mar",
      Wednesday: "Mié",
      Thursday: "Jue",
      Friday: "Vie",
      Saturday: "Sáb",
      Sunday: "Dom",
    };

    const datosCierre = diasOrdenados.map((d) => {
      const encontrado = cierreResults.find((r) => r.dia === d);
      return encontrado ? Number(encontrado.promedio) : 0;
    });

    const datosFinalizacion = diasOrdenados.map((d) => {
      const encontrado = finalResults.find((r) => r.dia === d);
      return encontrado ? Number(encontrado.promedio) : 0;
    });

    const labels = diasOrdenados.map((d) => traduccion[d]);

    console.log({
      categories: labels,
      cierre: datosCierre,
      finalizacion: datosFinalizacion,
    });

    res.status(200).json({
      categories: labels,
      cierre: datosCierre,
      finalizacion: datosFinalizacion,
    });
  } catch (err) {
    next(err);
  } finally {
    releaseConnection(connection);
  }
};
