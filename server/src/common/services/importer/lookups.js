// import LRUCacheDefault from "lru-cache";
// const LRUCache = LRUCacheDefault;
// import { getConnection, releaseConnection } from "../../configs/db.config.js";

// /**
//  * cfg = {
//  *   table, keyColumn, valueColumn,
//  *   ensure?: { enabled: true, pkColumn: 'id', defaults?: { ... } },
//  *   cache?: { size?: 1000, ttlMs?: 300000 }
//  * }
//  */
// export function createLookup(cfg) {
//   const cache = new LRUCache({
//     max: cfg?.cache?.size ?? 1000,
//     ttl: cfg?.cache?.ttlMs ?? 300000, // ms
//     ttlAutopurge: true, // limpia expirados automáticamente
//     updateAgeOnGet: true, // mantiene caliente lo usado
//   });

//   async function selectVal(conn, key) {
//     const [rows] = await conn.query(
//       `SELECT \`${cfg.valueColumn}\` AS val
//          FROM \`${cfg.table}\`
//         WHERE \`${cfg.keyColumn}\` = ?
//         LIMIT 1`,
//       [key]
//     );
//     return rows?.[0]?.val ?? null;
//   }

//   async function ensureVal(conn, key) {
//     if (!cfg.ensure?.enabled) return selectVal(conn, key);

//     const cols = [
//       cfg.keyColumn,
//       ...(cfg.ensure?.defaults ? Object.keys(cfg.ensure.defaults) : []),
//     ];
//     const vals = [
//       key,
//       ...(cfg.ensure?.defaults ? Object.values(cfg.ensure.defaults) : []),
//     ];
//     const placeholders = "(" + cols.map(() => "?").join(",") + ")";

//     const sqlIns = `INSERT IGNORE INTO \`${cfg.table}\`
//       (${cols.map((c) => `\`${c}\``).join(",")}) VALUES ${placeholders}`;
//     await conn.query(sqlIns, vals);

//     return selectVal(conn, key);
//   }

//   return async (rawKey) => {
//     if (rawKey === undefined || rawKey === null || rawKey === "") return null;
//     const key = String(rawKey);

//     const hit = cache.get(key);
//     if (hit !== undefined) return hit;

//     const conn = await getConnection();
//     try {
//       const val = cfg.ensure?.enabled
//         ? await ensureVal(conn, key)
//         : await selectVal(conn, key);
//       cache.set(key, val);
//       return val;
//     } finally {
//       releaseConnection(conn);
//     }
//   };
// }
