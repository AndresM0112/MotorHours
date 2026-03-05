import { getConnection, releaseConnection } from "../../configs/db.config.js";

/**
 * Inserta por lotes con ON DUPLICATE KEY UPDATE
 * updateCols = columnas que se actualizan al duplicado
 */
export async function upsertBatch({ table, rows, updateCols }) {
  if (!rows.length) return;
  const cols = Object.keys(rows[0]);
  const placeholders = "(" + cols.map(() => "?").join(",") + ")";

  const sql = `
    INSERT INTO \`${table}\` (${cols.map((c) => `\`${c}\``).join(",")})
    VALUES ${rows.map(() => placeholders).join(",")}
    ON DUPLICATE KEY UPDATE ${updateCols
      .map((c) => `\`${c}\`=VALUES(\`${c}\`)`)
      .join(",")}
  `;
  const values = rows.flatMap((r) => cols.map((c) => r[c]));

  const conn = await getConnection();
  try {
    await conn.query(sql, values);
  } finally {
    releaseConnection(conn);
  }
}
