// import fs from "fs";
// import path from "path";
// import logger from "../../common/configs/winston.config.js";

// import { runImport } from "../../common/services/importer/runImport.js";

// // Exportadores
// import { buildDynamicExport } from "../../common/services/exporter/dynamicExport.js";
// import { exportConfigs } from "../../common/services/exporter/exports.registry.js";
// import { exportToXlsx } from "../../common/services/exporter/exportXlsx.js"; // básico
// import { exportToXlsxStyled } from "../../common/services/exporter/exportXlsxStyled.js"; // con estilos (skin)
// import { skinPresets } from "../../common/services/exporter/skins.presets.js";

// // DB helpers
// import {
//   getConnection,
//   releaseConnection,
// } from "../../common/configs/db.config.js";

// function loadJsonConfig(absPath) {
//   if (!fs.existsSync(absPath))
//     throw new Error(`Config no encontrada: ${absPath}`);
//   return JSON.parse(fs.readFileSync(absPath, "utf8"));
// }

// // ---------- helper de consulta para preview / exportStyled ----------
// async function runQuery(sql, params = []) {
//   const conn = await getConnection();
//   try {
//     const [rows] = await conn.query(sql, params);
//     return rows;
//   } finally {
//     releaseConnection(conn);
//   }
// }

// export const dataioService = {
//   // -------- IMPORT --------
//   async importAny({
//     configName,
//     config,
//     tempFilePath,
//     onProgress,
//     options = {},
//   }) {
//     let cfg = config;
//     if (!cfg) {
//       if (!configName) throw new Error("Falta config o configName.");
//       const cfgPath = path.join(
//         process.cwd(),
//         "src/common/configs/imports",
//         `${configName}.json`
//       );
//       cfg = loadJsonConfig(cfgPath);
//     }
//     try {
//       return await runImport({
//         config: cfg,
//         tempFilePath,
//         logger,
//         onProgress,
//         options,
//       });
//     } finally {
//       try {
//         fs.unlinkSync(tempFilePath);
//       } catch {}
//     }
//   },

//   // -------- EXPORT DINÁMICO (con preview/debug y skins opcionales) --------
//   async exportXlsxByConfig({ configName, res, filename, payload = {} }) {
//     // 1) Cargar config desde registry
//     const cfg = exportConfigs[configName];
//     if (!cfg) {
//       res.status(404).json({
//         success: false,
//         message: `Export config '${configName}' no soportado.`,
//       });
//       return;
//     }

//     // 2) Normalizar payload
//     const {
//       fields,
//       filters = {},
//       sort_by,
//       sort_dir,
//       limit,
//       offset,
//       // depuración
//       preview = false,
//       preview_limit,
//       debug = false,
//       dryRun = false,
//       // estilos
//       style = null, // { preset?: 'corporate', colWidths?, numFmts?, ... }
//     } = payload || {};

//     const flattened = {
//       ...filters,
//       fields: Array.isArray(fields) ? fields.join(",") : fields,
//       sort_by,
//       sort_dir,
//       limit,
//       offset,
//     };

//     // 3) Build seguro (SQL + columns)
//     let built;
//     try {
//       built = buildDynamicExport({ cfg, query: flattened });
//     } catch (e) {
//       res.status(400).json({ success: false, message: e.message });
//       return;
//     }
//     const { sql, values, columns } = built;

//     // 4) Modos de depuración (sin generar XLSX)
//     if (debug || dryRun || preview) {
//       const out = {
//         success: true,
//         mode: "dynamic",
//         sql,
//         params: values,
//         columns,
//       };
//       if (preview) {
//         const lim = Math.min(Number(preview_limit) || 50, 200);
//         const previewSql = `SELECT * FROM (${sql}) AS _t LIMIT ${lim}`;
//         try {
//           out.sample = await runQuery(previewSql, values);
//           out.sample_count = out.sample.length;
//         } catch (err) {
//           logger.error({ err, configName }, "Preview query error");
//           out.sample_error = String(err.message || err);
//         }
//       }
//       res.json(out);
//       return;
//     }

//     // 5) Headers de descarga (cuando ya está todo listo)
//     const downloadName = filename || `${configName}.xlsx`;
//     res.setHeader(
//       "Content-Type",
//       "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
//     );
//     res.setHeader(
//       "Content-Disposition",
//       `attachment; filename="${downloadName}"`
//     );
//     res.setHeader("Content-Encoding", "identity");
//     res.setHeader("X-Accel-Buffering", "no");
//     res.setHeader("Cache-Control", "no-cache");

//     logger.info(
//       {
//         configName,
//         columnsCount: columns.length,
//         valuesCount: values.length,
//         sqlPreview: String(sql).slice(0, 200) + "...",
//       },
//       "Export XLSX START"
//     );

//     // 6) Elegir exportador
//     try {
//       if (style && typeof style === "object") {
//         // aplicar preset + overrides
//         const preset =
//           skinPresets[style.preset || "default"] || skinPresets.default;
//         const effectiveStyle = {
//           ...preset,
//           ...style,
//           colWidths: {
//             ...(preset.colWidths || {}),
//             ...(style.colWidths || {}),
//           },
//           numFmts: { ...(preset.numFmts || {}), ...(style.numFmts || {}) },
//         };
//         // formato por defecto para fecha_registro si no viene
//         if (!effectiveStyle.numFmts?.fecha_registro) {
//           effectiveStyle.numFmts = {
//             ...effectiveStyle.numFmts,
//             fecha_registro: "yyyy-mm-dd hh:mm",
//           };
//         }

//         await exportToXlsxStyled({
//           sql,
//           params: values,
//           columns,
//           res,
//           style: effectiveStyle,
//           query: runQuery,
//         });
//       } else {
//         // exportador básico (sin estilos)
//         await exportToXlsx({ sql, params: values, columns, res });
//       }

//       logger.info({ configName }, "Export XLSX DONE");
//     } catch (err) {
//       logger.error({ err, configName }, "Export XLSX ERROR");
//       throw err;
//     }
//   },
// };
