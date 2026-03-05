import {
  getConnection,
  releaseConnection,
  executeQuery,
} from "../../../common/configs/db.config.js";
import { styleData, styleSubTitles } from "../../../common/configs/excelJS.js";
import { fileURLToPath } from "url";
import moment from "moment";
import ExcelJS from "exceljs";
import fs from "fs-extra";
import path from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const reportInventory = async (req, res, next) => {
  const {
    bodId,
    dateInventory = new Date(),
    dateOption = 1, // 1 para (<=), 2 para (=)
    segment,
    codigo,
    nombre,
    tipoEntrada,
    stockMin,
    stockMax,
    entradas,
    salidas,
    disponible,
    sortField = "codigo",
    sortOrder = 1,
  } = req.body;

  const order = sortOrder === 1 ? "ASC" : "DESC";

  let connection = null;
  try {
    connection = await getConnection();

    const dateOperator = dateOption === 1 ? "<=" : "=";
    const dateString = new Date(dateInventory).toISOString().split("T")[0];

    const selectClause = `
        SELECT
          a.art_id AS articulo,
          a.art_codigo AS codigo,
          a.art_nombre AS nomArticulo,
          un.uni_nombre unidad,
          m.tie_id AS tieId,
          t.tie_nombre AS tipoEntrada,
          ab.arb_stock_minimo AS stockMin,
          ab.arb_stock_maximo AS stockMax,
          COALESCE(SUM(CASE 
            WHEN m.mov_tipo IN ('Registro Entrada', 'Aprobación Traslado') THEN m.mov_cantidad 
            ELSE 0 
          END), 0) AS entradas,
          COALESCE(SUM(CASE 
              WHEN m.mov_tipo IN ('Registro Salida', 'Eliminación Salida', 'Actualización Salida') THEN m.mov_cantidad 
              ELSE 0 
          END), 0) AS salidas,
          (COALESCE(SUM(CASE 
              WHEN m.mov_tipo IN ('Registro Entrada', 'Aprobación Traslado') THEN m.mov_cantidad 
              ELSE 0 
          END), 0) - 
          COALESCE(SUM(CASE 
              WHEN m.mov_tipo IN ('Registro Salida', 'Eliminación Salida', 'Actualización Salida') THEN m.mov_cantidad 
              ELSE 0 
          END), 0)) AS disponible,
          COALESCE(SUM(IF(m.mov_tipo = 'Registro Diferencia', m.mov_cantidad, 0)),0) diferencia
      `;

    const fromClause = `
        FROM tbl_articulos a 
                JOIN tbl_movimientos_inventario m ON m.art_id = a.art_id  AND m.bod_id = ?
                LEFT JOIN tbl_tipo_entrada t ON t.tie_id = m.tie_id
                LEFT JOIN tbl_articulo_bodega ab ON a.art_id = ab.art_id AND ab.bod_id = ?
                JOIN tbl_unidad un ON un.uni_id = a.uni_id
      `;

    const whereConditions = [];
    const havingConditions = [];
    const params = [bodId, bodId];

    if (dateOperator)
      whereConditions.push(`m.mov_fecha ${dateOperator} ?`),
        params.push(dateString);
    if (codigo) whereConditions.push(`a.art_codigo LIKE '%${codigo}%'`);
    if (nombre) whereConditions.push(`a.art_nombre LIKE '%${nombre}%'`);
    if (tipoEntrada)
      whereConditions.push(`m.tie_id = ?`), params.push(tipoEntrada);
    if (stockMin)
      whereConditions.push(`ab.arb_stock_minimo = ?`), params.push(stockMin);
    if (stockMax)
      whereConditions.push(`ab.arb_stock_maximo = ?`), params.push(stockMax);

    if (entradas) havingConditions.push(`entradas = ${+entradas}`);
    if (salidas) havingConditions.push(`salidas = ${+salidas}`);
    if (disponible) havingConditions.push(`disponible = ${+disponible}`);

    // Filtro de segment
    switch (segment) {
      case "OUT_OF_STOCK":
        havingConditions.push(`disponible = 0`);
        break;
      case "LOW":
        havingConditions.push(`
            disponible <= ab.arb_stock_minimo AND disponible > 0
          `);
        break;
      case "NORMAL":
        havingConditions.push(`
            disponible > ab.arb_stock_minimo AND disponible < ab.arb_stock_maximo
          `);
        break;
      case "HIGH":
        havingConditions.push(`
            disponible >= ab.arb_stock_maximo
          `);
        break;
      default:
        break;
    }

    const whereClause = whereConditions.length
      ? `WHERE ${whereConditions.join(" AND ")}`
      : "";
    const havingClause = havingConditions.length
      ? `HAVING ${havingConditions.join(" AND ")}`
      : "";

    const mainQuery = `
        ${selectClause}
        ${fromClause}
        ${whereClause}
        GROUP BY articulo, tieId
        ${havingClause}
        ORDER BY ${sortField} ${order}
      `;

    const mainParams = [...params];

    const results = await executeQuery(mainQuery, mainParams, connection);

    // Crear el workbook y worksheet
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Inventario");

    // Agregar logo
    const imageData = fs.readFileSync(
      path.join(__dirname, "../../../common/images/logo.jpeg")
    );
    const imageId = workbook.addImage({ buffer: imageData, extension: "png" });
    worksheet.addImage(imageId, {
      tl: { col: 0, row: 0 },
      ext: { width: 250, height: 50 },
    });

    worksheet.mergeCells("A1:I1");
    worksheet.getRow(1).height = 55;

    // Definir encabezados
    const headers = [
      "Código",
      "Nombre del Artículo",
      "Unidad",
      "Tipo de Entrada",
      "Stock Mínimo",
      "Stock Máximo",
      "Entradas",
      "Salidas",
      "Disponible",
    ];

    worksheet.addRow(headers);

    // Aplicar estilos a los encabezados
    worksheet.getRow(2).eachCell((cell) => {
      cell.style = styleSubTitles;
    });

    // Ajustar ancho de columnas
    worksheet.columns = [
      { width: 15 },
      { width: 30 },
      { width: 15 },
      { width: 20 },
      { width: 15 },
      { width: 15 },
      { width: 15 },
      { width: 15 },
      { width: 15 },
    ];

    // Agregar datos
    results.forEach((row) => {
      worksheet.addRow([
        row.codigo,
        row.nomArticulo,
        row.unidad,
        row.tipoEntrada,
        row.stockMin,
        row.stockMax,
        row.entradas,
        row.salidas,
        row.disponible,
      ]);
    });

    // Aplicar estilos a los datos
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber > 2) {
        row.eachCell((cell) => {
          cell.style = styleData;
        });
      }
    });

    // Enviar archivo Excel al cliente
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=inventario.xlsx"
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    next(err);
  } finally {
    releaseConnection(connection);
  }
};

export const reportMovements = async (req, res, next) => {
  const {
    bodId,
    dateInventory = new Date(),
    dateOption,
    codigo,
    nombre,
    cantidad,
    usureg,
    fecreg,
  } = req.body;

  const dateOperator = dateOption === 1 ? "<=" : "=";

  let connection = null;
  try {
    connection = await getConnection();

    // 📌 Construcción de los filtros globales aplicables a ambas consultas
    const whereConditions = [`m.bodId = ${bodId}`];

    if (dateInventory) {
      whereConditions.push(
        `m.fecha ${dateOperator} '${
          new Date(dateInventory).toISOString().split("T")[0]
        }'`
      );
    }

    if (codigo) whereConditions.push(`m.codigo LIKE '%${codigo}%'`);
    if (nombre) whereConditions.push(`m.nombre LIKE '%${nombre}%'`);
    if (usureg) whereConditions.push(`m.usureg LIKE '%${usureg}%'`);
    if (cantidad) whereConditions.push(`m.cantidad = ${cantidad}`);
    if (fecreg && fecreg.length === 2) {
      whereConditions.push(
        `m.fecreg BETWEEN '${fecreg[0]}' AND '${fecreg[1]}'`
      );
    }

    const whereClause = `WHERE ${whereConditions.join(" AND ")}`;

    const mainQuery = `
    SELECT  bodId,
            salId,
            fecha,
            artId,
            codigo,
            proveedor,
            nombre,
            unidad,
            tipoEntrada,
            tipoSalida,
            cantidad,
            temperatura,
            fechaVencimiento,
            valor,
            lote,
            factura,
            observacion,
            usureg,
            fecreg,
            tipoMovimiento


            FROM(
            SELECT 
                e.bod_id AS bodId,
                NULL AS salId,
                e.ent_fecha AS fecha,
                a.art_id AS artId,
                a.art_codigo AS codigo,
                p.prv_nombre AS proveedor,
                a.art_nombre AS nombre,
                un.uni_nombre AS unidad,
                t.tie_nombre AS tipoEntrada,
                NULL AS tipoSalida,
                e.ent_cantidad AS cantidad,
                e.ent_temperatura AS temperatura,
                e.ent_fec_vencimiento AS fechaVencimiento,
                e.ent_valor AS valor,
                e.ent_lote AS lote,
                e.ent_factura AS factura,
                e.ent_observacion AS observacion,
                CONCAT(u.usu_nombre, ' ', IFNULL(u.usu_apellido, '')) AS usureg,
                e.ent_fec_reg AS fecreg,
                'Entrada' AS tipoMovimiento
            FROM tbl_entradas e
            JOIN tbl_articulos a ON a.art_id = e.art_id
            JOIN tbl_tipo_entrada t ON t.tie_id = e.tie_id
            JOIN tbl_usuarios u ON u.usu_id = e.ent_usu_reg
            LEFT JOIN tbl_proveedores p ON e.prv_id = p.prv_id
            JOIN tbl_unidad un ON un.uni_id = a.uni_id
            
            UNION ALL

            SELECT 
                s.bod_id AS bodId,
                s.sal_id AS salId,
                s.sal_fecha AS fecha,
                a.art_id AS artId,
                a.art_codigo AS codigo,
                NULL AS proveedor,
                a.art_nombre AS nombre,
                un.uni_nombre AS unidad,
                te.tie_nombre AS tipoEntrada,
                t.tis_nombre AS tipoSalida,
                s.sal_cantidad AS cantidad,
                NULL AS temperatura,
                NULL AS fechaVencimiento,
                NULL AS valor,
                NULL AS lote,
                NULL AS factura,
                s.sal_observacion AS observacion,
                CONCAT(u.usu_nombre, ' ', IFNULL(u.usu_apellido, '')) AS usureg,
                s.sal_fec_reg AS fecreg,
                'Salida' AS tipoMovimiento
            FROM tbl_salidas s
            JOIN tbl_articulos a ON a.art_id = s.art_id
            JOIN tbl_unidad un ON un.uni_id = a.uni_id
            JOIN tbl_tipo_salida t ON t.tis_id = s.tis_id
            JOIN tbl_tipo_entrada te ON te.tie_id = s.tie_id
            JOIN tbl_usuarios u ON u.usu_id = s.sal_usu_reg
            LEFT JOIN tbl_bodega b ON b.bod_id = s.sal_destino
  ) m
      ${whereClause}
      ORDER BY nombre ASC, fecreg ASC
    `;

    const results = await executeQuery(mainQuery, [], connection);

    const bodegaQuery = `SELECT bod_nombre FROM tbl_bodega WHERE bod_id = ?`;
    const bodegaResult = await executeQuery(bodegaQuery, [bodId], connection);
    const nombreBodega = bodegaResult.length
      ? bodegaResult[0].bod_nombre
      : "N/A";

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Movimientos");

    const imageData = fs.readFileSync(
      path.join(__dirname, "../../../common/images/logo.jpeg")
    );
    const imageId = workbook.addImage({ buffer: imageData, extension: "png" });
    worksheet.addImage(imageId, {
      tl: { col: 0, row: 0 },
      ext: { width: 250, height: 50 },
    });

    worksheet.mergeCells("A1:S1");
    const titleCell = worksheet.getCell("A1");
    titleCell.value = `Movimientos de Inventario - ${nombreBodega}`;
    titleCell.style = {
      font: { bold: true, size: 14 },
      alignment: { horizontal: "center" },
    };

    worksheet.getRow(1).height = 55;

    const headers = [
      "Fecha de Registro",
      "Tipo de Movimiento",
      "Código Artículo",
      "Nombre del Artículo",
      "Unidad",
      "Cantidad",
      "Proveedor",
      "Tipo de Entrada",
      "Tipo de Salida",
      "Temperatura",
      "Fecha de Vencimiento",
      "Valor",
      "Lote",
      "Factura",
      "Observación",
      "Usuario",
    ];

    worksheet.addRow(headers);

    worksheet.getRow(2).eachCell((cell) => {
      cell.style = styleSubTitles;
    });

    worksheet.columns = [
      { width: 18 }, // Fecha de Registro
      { width: 20 }, // Tipo de Movimiento
      { width: 15 }, // Código Artículo
      { width: 30 }, // Nombre del Artículo
      { width: 15 }, // Unidad
      { width: 15 }, // Cantidad
      { width: 25 }, // Proveedor
      { width: 20 }, // Tipo de Entrada
      { width: 20 }, // Tipo de Salida
      { width: 15 }, // Temperatura
      { width: 20 }, // Fecha de Vencimiento
      { width: 15 }, // Valor
      { width: 15 }, // Lote
      { width: 15 }, // Factura
      { width: 30 }, // Observación
      { width: 20 }, // Usuario
    ];

    results.forEach((row) => {
      worksheet.addRow([
        moment(row.fecreg).format("YYYY-MM-DD HH:mm"),
        row.tipoMovimiento,
        row.codigo,
        row.nombre,
        row.unidad,
        row.cantidad,
        row.proveedor || "N/A",
        row.tipoEntrada || "N/A",
        row.tipoSalida || "N/A",
        row.temperatura || "N/A",
        row.fechaVencimiento
          ? moment(row.fechaVencimiento).format("YYYY-MM-DD")
          : "N/A",
        row.valor || "N/A",
        row.lote || "N/A",
        row.factura || "N/A",
        row.observacion || "N/A",
        row.usureg,
      ]);
    });

    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber > 2) {
        row.eachCell((cell) => {
          cell.style = styleData;
        });
      }
    });

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=movimientos.xlsx"
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    next(err);
  } finally {
    releaseConnection(connection);
  }
};
