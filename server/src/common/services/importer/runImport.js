// importer/runImport.js
import { buildZodSchema } from "./validator.js";
import { createLookup } from "./lookups.js";
import { upsertBatch } from "./writer.js";
import { readXlsxRows } from "./readExcel.js";
import { readCsvRows } from "./readCsv.js"; // nuevo lector CSV (abajo)

export async function runImport({
  config,
  tempFilePath,
  logger,
  onProgress,
  options = {},
}) {
  const dryRun = !!options.dryRun;
  const lookupFns = {};
  for (const k of Object.keys(config.lookups || {}))
    lookupFns[k] = createLookup(config.lookups[k]);

  // --- mapping dinámico: permite aliases, source y default ---
  // Estructura soportada por cada entrada de mapping:
  // { field, type, required?, trim?, transform?, lookup?, aliases?:[], source?:string|number, default?:any }
  const zSchema = buildZodSchema(config.mapping);

  const stats = { total: 0, ok: 0, bad: 0, errors: [], preview: [] };
  const batch = [];
  const batchSize = config.output.batchSize || 500;
  const maxErr = config.errors?.max ?? 1000;

  const report = (stage = "reading") =>
    onProgress?.({
      stage,
      processed: stats.total,
      ok: stats.ok,
      bad: stats.bad,
    });

  const flush = async () => {
    if (!batch.length || dryRun) {
      batch.length = 0;
      return;
    }
    await upsertBatch({
      table: config.output.table,
      rows: batch,
      updateCols: config.output.onDuplicate,
    });
    batch.length = 0;
    report("flushed");
  };

  // --- reader por tipo ---
  const reader =
    config.file?.type === "csv"
      ? readCsvRows(tempFilePath, config.file || {})
      : readXlsxRows(tempFilePath, config.file || {});

  for await (const raw of reader) {
    stats.total++;
    try {
      const out = {};
      for (const k of Object.keys(config.mapping)) {
        const m = config.mapping[k];
        const candidates = [
          k, // clave tal cual en el mapping
          m?.source, // nombre alterno/índice
          ...(m?.aliases || []), // aliases de encabezado
          m?.field, // por si coincidiera con el nombre de columna
        ].filter((x) => x !== undefined && x !== null && x !== "");

        let val = null;
        for (const c of candidates) {
          if (raw[c] !== undefined) {
            val = raw[c];
            break;
          }
        }
        if (
          (val === null || val === undefined || val === "") &&
          "default" in (m || {})
        )
          val = m.default;

        if (m?.trim) val = transforms.trim(val);
        if (m?.transform && transforms[m.transform])
          val = transforms[m.transform](val);
        if (m?.lookup && val !== null && val !== undefined)
          val = await lookupFns[m.lookup](val);

        out[m.field] = val;
      }

      const parsed = zSchema.parse(out);
      batch.push(parsed);
      if (stats.preview.length < 20) stats.preview.push(parsed); // muestrita
      if (batch.length >= batchSize) await flush();

      stats.ok++;
    } catch (err) {
      stats.bad++;
      if (config.errors?.mode === "fail-fast") throw err;
      if (stats.errors.length < maxErr)
        stats.errors.push({
          row: stats.total,
          error: String(err?.message || err),
        });
      if (stats.bad % 500 === 0)
        logger?.warn?.({ bad: stats.bad }, "Import warnings…");
    }

    if (stats.total % 1000 === 0) report();
  }

  await flush();
  report("done");
  return { ...stats, dryRun };
}
