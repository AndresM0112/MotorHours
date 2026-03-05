import ExcelJS from "exceljs";
import transforms from "../importer/transforms.js";

const LOGO_URL = "https://www.pavastecnologia.com/img/lamayoristanew.png";

// Descarga una URL a Buffer (Node 18+: fetch; fallback: https)
async function fetchBuffer(url) {
  if (typeof fetch === "function") {
    const r = await fetch(url);
    if (!r.ok) throw new Error(`Logo HTTP ${r.status}`);
    const ab = await r.arrayBuffer();
    return Buffer.from(ab);
  }
  const { URL } = await import("node:url");
  const https = await import("node:https");
  return new Promise((resolve, reject) => {
    https
      .get(new URL(url), (res) => {
        if (res.statusCode < 200 || res.statusCode >= 300) {
          return reject(new Error(`Logo HTTP ${res.statusCode}`));
        }
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => resolve(Buffer.concat(chunks)));
      })
      .on("error", reject);
  });
}

/**
 * Exporta XLSX con estilos, tabla nativa y logo centrado.
 */
export async function exportToXlsxStyled({
  sql,
  params = [],
  columns,
  res,
  style = {},
  query,
}) {
  // --- detección ---
  const detect = {
    sampleRows: Math.min(Number(style.detect?.sampleRows) || 200, 1000),
    minRatio: Math.min(Math.max(Number(style.detect?.minRatio) || 0.8, 0.5), 1),
  };

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Datos");

  const colLetter = (n) => {
    let s = "",
      x = n;
    while (x > 0) {
      const m = (x - 1) % 26;
      s = String.fromCharCode(65 + m) + s;
      x = Math.floor((x - 1) / 26);
    }
    return s;
  };

  // ---------- datos ----------
  const allRows = await query(sql, params);
  const sample = allRows.slice(0, detect.sampleRows);

  // ---------- helpers ----------
  // Nunca tratar números como fecha. Solo Date real o strings con patrón de fecha.
  const parseMaybeDate = (v) => {
    if (v instanceof Date && !isNaN(v)) return v;
    if (typeof v === "string") {
      const iso = new Date(v);
      if (!isNaN(iso)) return iso;
      const m =
        /^(\d{2})[\/-](\d{2})[\/-](\d{4})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?$/.exec(
          v
        );
      if (m) {
        const d = new Date(
          +m[3],
          +m[2] - 1,
          +m[1],
          +(m[4] || 0),
          +(m[5] || 0),
          +(m[6] || 0)
        );
        if (!isNaN(d)) return d;
      }
    }
    return null;
  };
  const emailRe = /^\S+@\S+\.\S+$/;

  const inferTypeFor = (values) => {
    const nonEmpty = values.map((v) => v ?? "").filter((v) => String(v) !== "");
    if (!nonEmpty.length) return { type: "text", numFmt: "@", align: "left" };

    const emails = nonEmpty.filter((v) => emailRe.test(String(v)));
    if (emails.length / nonEmpty.length >= detect.minRatio)
      return { type: "email", numFmt: "@", align: "left" };

    const dates = nonEmpty.map(parseMaybeDate).filter(Boolean);
    if (dates.length / nonEmpty.length >= detect.minRatio)
      return { type: "date", numFmt: "dd/mm/yyyy", align: "center" };

    const cleaned = nonEmpty.map((v) => String(v).replace(/[\s,]/g, ""));
    const numeric = cleaned.filter((s) => /^-?\d+(\.\d+)?$/.test(s));
    const decims = cleaned.filter((s) => /\./.test(s));
    const lead0 = cleaned.some((s) => /^0\d+/.test(s));
    const phoney = nonEmpty.some((s) => /[+()\-]/.test(String(s)));

    if (
      numeric.length / nonEmpty.length >= detect.minRatio &&
      !lead0 &&
      !phoney
    ) {
      if (decims.length)
        return {
          type: "number",
          numFmt: "#,##0.00;[Red]-#,##0.00",
          align: "right",
        };
      return { type: "integer", numFmt: "#,##0;[Red]-#,##0", align: "right" };
    }

    const digitLike = nonEmpty.filter((v) =>
      /^[+()\-\s]*\d[\d()\-\s]*$/.test(String(v))
    );
    if (digitLike.length / nonEmpty.length >= detect.minRatio || lead0)
      return { type: "text", numFmt: "@", align: "left" };

    const boolLike = nonEmpty.filter((v) =>
      /^(true|false|sí|si|no|0|1)$/i.test(String(v).trim())
    );
    if (boolLike.length / nonEmpty.length >= detect.minRatio)
      return { type: "boolean", numFmt: "@", align: "center" };

    return { type: "text", numFmt: "@", align: "left" };
  };

  // ---------- inferencias ----------
  const typesByKey = {};
  const fmtsByKey = { ...(style.numFmts || {}) };
  const alignsByKey = {};
  const maxLenByKey = {};

  for (const c of columns) {
    const values = sample.map((r) => r[c.key]);
    const explicit = c.type;

    let inferred = explicit
      ? {
          type: explicit,
          numFmt:
            fmtsByKey[c.key] ||
            (explicit === "date"
              ? "dd/mm/yyyy"
              : explicit.match(/number|integer/)
              ? "#,##0"
              : "@"),
          align:
            explicit === "date"
              ? "center"
              : explicit.match(/number|integer/)
              ? "right"
              : "left",
        }
      : inferTypeFor(values);

    // corrección específica de columnas:
    if (/^id$/i.test(c.key))
      inferred = { type: "integer", numFmt: "#,##0", align: "right" };

    typesByKey[c.key] = inferred.type;
    alignsByKey[c.key] = inferred.align;
    if (!fmtsByKey[c.key]) fmtsByKey[c.key] = inferred.numFmt;

    const headerLen = c.header?.length || 10;
    let maxLen = headerLen;
    for (const v of values) {
      const s = v == null ? "" : v instanceof Date ? "00/00/0000" : String(v);
      maxLen = Math.max(maxLen, s.length);
    }
    maxLenByKey[c.key] = Math.min(Math.max(maxLen, headerLen), 60);
  }

  // ---------- LOGO: fila 1 unificada, centrado y tamaño controlado ----------
  let headerRowIndex = 2;
  try {
    const buf = await fetchBuffer(LOGO_URL);
    ws.addRow([]); // reserva fila 1
    ws.getRow(1).height = Number(style.logo?.rowHeight ?? 50);
    // unificar la fila 1 completa (de A1 a última columna)
    ws.mergeCells(1, 1, 1, columns.length);

    const imgId = wb.addImage({ buffer: buf, extension: "png" });

    // ancho (en columnas) que ocupará el logo
    const spanCols = Math.min(
      Math.max(
        Number(style.logo?.spanCols) || Math.ceil(columns.length * 0.45),
        3
      ),
      columns.length
    );
    // comienzo y fin para centrar
    const startCol = Math.floor((columns.length - spanCols) / 2) + 1;
    const endCol = startCol + spanCols - 1;

    // anclaje por celdas: ocupa 1 fila de alto (fila 1)
    ws.addImage(imgId, {
      tl: { col: startCol - 1, row: 0 }, // 0-based
      br: { col: endCol, row: 1 },
      editAs: "oneCell",
    });
  } catch (e) {
    headerRowIndex = 1; // si falla el logo, encabezado en fila 1
  }

  // ---------- TABLA nativa (tema rojo por defecto) ----------
  const tableName =
    (style.tableName || "TablaDatos")
      .replace(/[^A-Za-z0-9_]/g, "_")
      .slice(0, 254) || "TablaDatos";

  const rowsForTable = allRows.map((r) =>
    columns.map((c) => {
      const raw = c.transform ? transforms[c.transform]?.(r[c.key]) : r[c.key];
      const t = typesByKey[c.key];
      if (t === "date") {
        const d = parseMaybeDate(raw);
        return d || null;
      }
      if (t === "number" || t === "integer") {
        if (raw === null || raw === undefined || raw === "") return null;
        return typeof raw === "number"
          ? raw
          : Number(String(raw).replace(/,/g, ""));
      }
      if (t === "boolean") return /^(true|1|sí|si)$/i.test(String(raw));
      return raw ?? "";
    })
  );

  const table = ws.addTable({
    name: tableName,
    ref: `A${headerRowIndex}`,
    headerRow: true,
    totalsRow: false,
    style: {
      theme: style.tableTheme || "TableStyleMedium10", // rojo
      showRowStripes: true,
      showColumnStripes: false,
    },
    columns: columns.map((c) => ({ name: c.header || c.key })),
    rows: rowsForTable,
  });
  table.commit?.();

  // ---------- formatos / alineación / mailto ----------
  const firstDataRow = headerRowIndex + 1;
  const lastDataRow = headerRowIndex + rowsForTable.length;

  for (let j = 0; j < columns.length; j++) {
    const key = columns[j].key;

    // ancho de columna
    const w = style.colWidths?.[key];
    const inferredW = Math.min(
      Math.max(Math.ceil((maxLenByKey[key] || 10) * 1.1), 10),
      60
    );
    ws.getColumn(j + 1).width = w ? Number(w) : inferredW;

    for (let r = firstDataRow; r <= lastDataRow; r++) {
      const cell = ws.getCell(r, j + 1);
      if (fmtsByKey[key]) cell.numFmt = fmtsByKey[key];
      cell.alignment = {
        vertical: "middle",
        horizontal: alignsByKey[key] || "left",
      };

      if (typesByKey[key] === "email" && cell.value) {
        const val = String(cell.value);
        cell.value = { text: val, hyperlink: `mailto:${val}` };
        cell.font = { underline: true, color: { argb: "FF1D4ED8" } };
      }
    }
  }

  // congelar encabezado (debajo del logo)
  ws.views = [{ state: "frozen", ySplit: headerRowIndex }];

  // ---------- enviar ----------
  const buffer = await wb.xlsx.writeBuffer();
  res.setHeader(
    "Content-Type",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  );
  res.setHeader("Content-Disposition", 'attachment; filename="datos.xlsx"');
  res.end(Buffer.from(buffer));
}
