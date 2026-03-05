// import { dataioService } from "./dataio.service.js";
// import logger from "../../common/configs/winston.config.js";
// import { getIO } from "../../../socket.js";

// // Resuelve el room destino para emitir progreso
// function resolveRoom({ room, userId, jobId }) {
//   if (room && typeof room === "string") return room;
//   if (userId) return `user:${userId}`;
//   return `imports:${jobId}`;
// }

// export const dataioController = {
//   // -------- IMPORT --------
//   async importByConfig(req, res, next) {
//     try {
//       const { configName } = req.params; // opcional
//       const file = req.files?.file;
//       if (!file?.tempFilePath) {
//         return res
//           .status(400)
//           .json({
//             success: false,
//             message: "Archivo no recibido (campo: file).",
//           });
//       }

//       // --- config dinámico ---
//       let config = req.body?.config;
//       if (typeof config === "string") {
//         try {
//           config = JSON.parse(config);
//         } catch {
//           config = null;
//         }
//       }

//       const dryRun = ["1", "true", true].includes(req.body?.dryRun);

//       const jobId =
//         req.body?.jobId ||
//         `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
//       const userId = req.body?.userId ? Number(req.body.userId) : null;
//       const room = resolveRoom({ room: req.body?.room, userId, jobId });

//       let nsp = null;
//       try {
//         nsp = getIO().of("/socket/mth");
//       } catch {
//         logger.warn("Socket.io no inicializado");
//       }

//       const onProgress = (p) => {
//         try {
//           nsp
//             ?.to(room)
//             .emit("dataio:import:progress", {
//               jobId,
//               configName,
//               room,
//               ...p,
//               ts: Date.now(),
//             });
//         } catch {}
//       };

//       const stats = await dataioService.importAny({
//         configName, // si no mandan config, usa el nombre
//         config, // si viene config, se usa este
//         tempFilePath: file.tempFilePath,
//         onProgress,
//         options: { dryRun },
//       });

//       onProgress({
//         stage: "finished",
//         processed: stats.total,
//         ok: stats.ok,
//         bad: stats.bad,
//       });

//       res.json({
//         success: true,
//         message: dryRun ? "Preview/DryRun finalizado" : "Import finalizado",
//         jobId,
//         room,
//         data: stats,
//       });
//     } catch (err) {
//       logger.error(err);
//       next(err);
//     }
//   },
  
//   // -------- EXPORT (POST JSON recomendado) --------
//   async exportXlsxByConfigPost(req, res, next) {
//     try {
//       const { configName } = req.params;
//       const {
//         filename = `${configName}.xlsx`,
//         fields,
//         filters,
//         sort_by,
//         sort_dir,
//         limit,
//         offset,
//         style,
//       } = req.body || {};

//       // Listeners para depurar el stream
//       res.once("finish", () =>
//         logger.info({ configName, filename }, "Export XLSX FINISH")
//       );
//       res.once("close", () =>
//         logger.info({ configName, filename }, "Export XLSX CLOSE")
//       );
//       res.once("error", (e) =>
//         logger.error({ err: e, configName }, "Export XLSX RES ERROR")
//       );

//       await dataioService.exportXlsxByConfig({
//         configName,
//         res,
//         filename,
//         payload: { fields, filters, sort_by, sort_dir, limit, offset, style },
//         source: "body",
//       });
//       // exportToXlsx hace commit y cierra el stream
//     } catch (err) {
//       logger.error(err);
//       next(err);
//     }
//   },

//   // -------- EXPORT (GET legacy con query) --------
//   async exportXlsxByConfigGet(req, res, next) {
//     try {
//       const { configName } = req.params;
//       const filename = req.query?.filename || `${configName}.xlsx`;

//       res.once("finish", () =>
//         logger.info({ configName, filename }, "Export XLSX FINISH")
//       );
//       res.once("close", () =>
//         logger.info({ configName, filename }, "Export XLSX CLOSE")
//       );
//       res.once("error", (e) =>
//         logger.error({ err: e, configName }, "Export XLSX RES ERROR")
//       );

//       await dataioService.exportXlsxByConfig({
//         configName,
//         res,
//         filename,
//         payload: req.query || {},
//         source: "query",
//       });
//     } catch (err) {
//       logger.error(err);
//       next(err);
//     }
//   },
// };
