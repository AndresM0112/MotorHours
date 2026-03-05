import ExcelJS from "exceljs";
import { getConnection, releaseConnection } from "../../configs/db.config.js";
import transforms from "../importer/transforms.js";

export async function exportToXlsx({ sql, params = [], columns, res }) {
  const wb = new ExcelJS.stream.xlsx.WorkbookWriter({ stream: res });
  const ws = wb.addWorksheet("Datos");

  ws.columns = columns.map((c) => ({ header: c.header, key: c.key }));

  const conn = await getConnection();
  try {
    const [rows] = await conn.query(sql, params);

    for (const r of rows) {
      const out = {};
      for (const c of columns) {
        const v = r[c.key];
        out[c.key] = c.transform ? transforms[c.transform]?.(v) : v;
      }
      ws.addRow(out).commit();
    }
  } catch (err) {
    try {
      await wb.commit();
    } catch {}
    throw err;
  } finally {
    releaseConnection(conn);
  }

  await wb.commit();
}
