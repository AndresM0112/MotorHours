import dotenv from "dotenv";
import mysql from "mysql2/promise";

dotenv.config();

// Crear el pool de conexiones
const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASS || "",
  database: process.env.DB_DATABASE || "",
  port: process.env.DB_PORT || 3306,
  waitForConnections: true, // Espera conexiones si el pool está lleno
  connectionLimit: 10, // Número máximo de conexiones simultáneas
  queueLimit: 0, // Sin límite de solicitudes en espera
  dateStrings: true, // Manejar fechas como strings
});

// Función para obtener una conexión
const getConnection = async () => {
  try {
    const connection = await pool.getConnection();
    // console.log("Conexión obtenida del pool");
    return connection;
  } catch (error) {
    console.error("Error al obtener la conexión:", error);
    throw error;
  }
};

// Función para liberar una conexión
const releaseConnection = (connection) => {
  if (connection) {
    connection.release(); // Devuelve la conexión al pool
    // console.log("Conexión liberada al pool");
  }
};

// Función para probar la conexión
const testConnection = async () => {
  let connection;
  try {
    connection = await getConnection();
    console.log(
      `Conexión exitosa a la base de datos ${process.env.DB_DATABASE} en ${process.env.DB_HOST}`
    );
    await connection.query("SELECT 1"); // Prueba simple
  } catch (error) {
    console.error("Error en la prueba de conexión:", error);
  } finally {
    releaseConnection(connection);
  }
};

// Función para ejecutar una consulta
const executeQuery = async (query, params = [], connection) => {
  let connectionDb = null;
  try {
    connectionDb = connection ? connection : await getConnection();
    const [results] = await connectionDb.execute(query, params);
    return results;
  } catch (error) {
    console.error("Error ejecutando la consulta:", error);
    throw error;
  } finally {
    if (!connection && connectionDb) releaseConnection(connectionDb);
  }
};


/**
 * Construye cláusulas dinámicas y valores para WHERE y SET
 */
function buildWhereClause(whereObj = {}) {
  const keys = Object.keys(whereObj || {});
  if (!keys.length) return { clause: "", values: [] };
  const clause = keys.map((k) => `\`${k}\` = ?`).join(" AND ");
  const values = keys.map((k) => whereObj[k]);
  return { clause, values };
}

function buildSetClause(setObj = {}) {
  const keys = Object.keys(setObj || {});
  if (!keys.length) throw new Error("SET vacío");
  const clause = keys.map((k) => `\`${k}\` = ?`).join(", ");
  const values = keys.map((k) => setObj[k]);
  return { clause, values };
}

/**
 * Upsert genérico con verificación de existencia por múltiples campos.
 *
 * @param {Object} params
 * @param {string} params.table               - Nombre de la tabla (valídalo antes de pasar).
 * @param {Object} params.payload             - Campos a insertar/actualizar.
 * @param {Object} [params.where]             - Criterio de existencia (SELECT) y WHERE por defecto del UPDATE.
 * @param {Object} [params.updateWhere]       - Criterio específico para el UPDATE (si es distinto de `where`).
 * @param {boolean} [params.useTx=false]      - Usar transacción.
 * @param {Object} params.connection          - Conexión MySQL (mysql2/promise o similar).
 * @param {Function} params.executeQueryQ     - Wrapper para queries (query, values, connection).
 *
 * @returns {Promise<{action:'insert'|'update', insertId?:number, affectedRows:number}>}
 */

const executeQueryQ = async (query, params = [], connection) => {
  let connectionDb = null;
  try {
    connectionDb = connection ? connection : await getConnection();
    const [results] = await connectionDb.query(query, params);
    return results;
  } catch (error) {
    console.error("Error ejecutando la consulta:", error);
    throw error;
  } finally {
    if (!connection && connectionDb) releaseConnection(connectionDb);
  }
};

async function upsertRecord({
  table,
  field,
  payload,
  where = {},
  updateWhere = null,
  useTx = false,
  connection,
}) {
  if (!table) throw new Error("table es requerido");
  if (!payload || typeof payload !== "object")
    throw new Error("payload inválido");
  if (!connection) throw new Error("connection es requerido");
  if (typeof executeQueryQ !== "function")
    throw new Error("executeQueryQ es requerido");

  // ⚠️ Seguridad: valida table y nombres de campos si provienen de entrada externa
  const beginTx = async () =>
    useTx && (await executeQueryQ("START TRANSACTION", [], connection));
  const commitTx = async () =>
    useTx && (await executeQueryQ("COMMIT", [], connection));
  const rollbackTx = async () =>
    useTx && (await executeQueryQ("ROLLBACK", [], connection));

  try {
    await beginTx();

    // 1) Verificar existencia
    const { clause: whereClause, values: whereValues } =
      buildWhereClause(where);
    let exists = false;
    let id = null;

    if (whereClause) {
      const selectSql = `SELECT \`${field}\` AS id FROM \`${table}\` WHERE ${whereClause} LIMIT 1`;
      const rows = await executeQueryQ(selectSql, whereValues, connection);

      if (Array.isArray(rows) && rows.length > 0) {
        exists = true;
        id = rows[0].id; // lee el id y lo guarda si hay fila
      }
    }

    if (!exists) {
      // 2) INSERT
      const { clause: setClause, values: setValues } = buildSetClause(payload);
      const insertSql = `INSERT INTO \`${table}\` SET ${setClause}`;
      const result = await executeQueryQ(insertSql, setValues, connection);

      await commitTx();
      return {
        action: "insert",
        insertId: result?.insertId ?? null,
        affectedRows: result?.affectedRows ?? 0,
      };
    } else {
      // 3) UPDATE (usar updateWhere si viene, si no, usar where)
      const { clause: setClause, values: setValues } = buildSetClause(payload);
      const { clause: updWhereClause, values: updWhereValues } =
        buildWhereClause(updateWhere || where);

      if (!updWhereClause) {
        throw new Error("UPDATE requiere un WHERE (updateWhere o where).");
      }

      const updateSql = `UPDATE \`${table}\` SET ${setClause} WHERE ${updWhereClause}`;
      const result = await executeQueryQ(
        updateSql,
        [...setValues, ...updWhereValues],
        connection
      );

      await commitTx();
      return {
        action: "update",
        affectedRows: result?.affectedRows ?? 0,
        insertId: id,
      };
    }
  } catch (err) {
    await rollbackTx();
    throw err;
  }
}

export {
  pool,
  testConnection,
  getConnection,
  releaseConnection,
  executeQuery,
  upsertRecord,
};

