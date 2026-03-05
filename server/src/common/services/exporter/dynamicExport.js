// Arma SELECT/WHERE/ORDER/LIMIT de forma segura a partir de un config declarativo
export function buildDynamicExport({ cfg, query }) {
  // 1) SELECT: fields= id,documento,...
  const reqFields =
    query.fields
      ?.split(",")
      .map((s) => s.trim())
      .filter(Boolean) ||
    cfg.default_select ||
    [];
  const validFields = reqFields.filter((f) => cfg.fields[f]);
  if (!validFields.length)
    throw new Error("No hay columnas válidas en 'fields'.");

  const selectParts = validFields.map(
    (alias) => `${cfg.fields[alias].select} AS \`${alias}\``
  );
  const columns = validFields.map((alias) => ({
    header: cfg.fields[alias].header || alias,
    key: alias,
    transform: cfg.fields[alias].transform,
  }));

  // 2) FROM + JOINS
  const from = `FROM ${cfg.from}`;
  const joins = (cfg.joins || []).join(" ");

  // 3) WHERE (solo filtros whitelisteados)
  const whereParts = [];
  const values = [];

  // filtros simples (estado, pais, ciudad, fecha_desde/hasta)
  for (const [param, def] of Object.entries(cfg.filters || {})) {
    const val = query[param];
    if (val == null || val === "") continue;

    if (def.type === "search_or") {
      // buscar = term → (col1 LIKE ? OR col2 LIKE ?)
      const term = `%${String(val).trim()}%`;
      const ors = def.columns.map((c) => `${c} LIKE ?`);
      whereParts.push(`(${ors.join(" OR ")})`);
      for (let i = 0; i < def.columns.length; i++) values.push(term);
      continue;
    }

    // IN por comas, si el valor trae comas
    if ((def.op || "").toUpperCase() === "IN") {
      const list = Array.isArray(val)
        ? val
        : String(val)
            .split(",")
            .map((v) => v.trim())
            .filter(Boolean);

      if (list.length) {
        whereParts.push(`${def.column} IN (${list.map(() => "?").join(",")})`);
        values.push(...list);
      }
      continue;
    }

    // LIKE si así se definiera en el config
    if (def.op?.toUpperCase() === "LIKE") {
      whereParts.push(`${def.column} LIKE ?`);
      values.push(`%${String(val)}%`);
      continue;
    }

    // Comparadores estándar (=, >=, <=, etc.)
    const op = def.op || "=";
    whereParts.push(`${def.column} ${op} ?`);
    values.push(val);
  }

  const where = whereParts.length ? `WHERE ${whereParts.join(" AND ")}` : "";

  // 4) ORDER BY (solo permitido)
  const sortBy = query.sort_by || cfg.sort?.default?.by;
  const sortDir = (
    query.sort_dir ||
    cfg.sort?.default?.dir ||
    "ASC"
  ).toUpperCase();
  const dir = sortDir === "DESC" ? "DESC" : "ASC";

  let orderBy = "";
  if (sortBy && (cfg.sort?.allowed || []).includes(sortBy)) {
    // order by por alias del select (seguro)
    orderBy = `ORDER BY \`${sortBy}\` ${dir}`;
  }

  // 5) LIMIT/OFFSET con clamp y sanitización
  const maxLimit = Number(cfg.limit?.max || 50000);
  const defLimit = Number(cfg.limit?.default || 10000);
  let limit = Number.isFinite(Number(query.limit))
    ? Number(query.limit)
    : defLimit;
  if (limit > maxLimit) limit = maxLimit;
  if (limit <= 0) limit = defLimit;

  let offset = Number.isFinite(Number(query.offset)) ? Number(query.offset) : 0;
  if (offset < 0) offset = 0;

  const limitClause = `LIMIT ${parseInt(limit, 10)} OFFSET ${parseInt(
    offset,
    10
  )}`;

  // 6) SQL final
  const sql = `SELECT ${selectParts.join(
    ", "
  )} ${from} ${joins} ${where} ${orderBy} ${limitClause}`;
  return { sql, values, columns };
}
