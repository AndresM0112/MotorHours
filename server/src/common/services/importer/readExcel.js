// importer/readExcel.js
import ExcelJS from "exceljs";
import fs from "fs";

/**
 * Iterador async que entrega objetos por fila. Soporta headerRow "auto".
 * opts: { sheet?:string, headerRow?: number | "auto", skipEmptyRows?:boolean, minHeaderCells?: number }
 */
export async function* readXlsxRows(
  tempFilePath,
  {
    sheet = "Hoja1",
    headerRow = 1,
    skipEmptyRows = true,
    minHeaderCells = 3,
  } = {}
) {
  const stream = fs.createReadStream(tempFilePath);
  const wb = new ExcelJS.stream.xlsx.WorkbookReader(stream, {
    entries: "emit",
    worksheets: "emit",
    sharedStrings: "cache",
  });

  for await (const ws of wb) {
    if (sheet && ws.name !== sheet) continue;

    let headers = [];
    let headerFound = false;

    for await (const row of ws) {
      const vals = Array.isArray(row.values) ? row.values : [];
      const nonEmptyCount = vals.filter(
        (v, i) => i > 0 && v !== undefined && v !== null && v !== ""
      ).length;

      if (!headerFound) {
        if (headerRow === "auto") {
          if (nonEmptyCount >= minHeaderCells) {
            headers = vals.map((v) => (v ?? "").toString().trim());
            headerFound = true;
            continue;
          }
        } else if (row.number === headerRow) {
          headers = vals.map((v) => (v ?? "").toString().trim());
          headerFound = true;
          continue;
        } else {
          continue; // todavía no llegamos al encabezado
        }
      }

      const obj = {};
      let empty = true;
      for (let i = 1; i < vals.length; i++) {
        const key = headers[i - 1] || String(i);
        const val = vals[i];
        if (val !== undefined && val !== null && val !== "") empty = false;
        obj[key] = val;
      }
      if (skipEmptyRows && empty) continue;
      yield obj;
    }
  }
}
