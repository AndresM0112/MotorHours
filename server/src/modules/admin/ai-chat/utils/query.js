import { executeQuery } from "../../../../common/configs/db.config.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Lista de tablas
const tables = [
  "tbl_actividad",
  "tbl_citas",
  "tbl_ciudad",
  "tbl_confirmacion_asistencia",
  "tbl_estado_cita",
  "tbl_estados",
  "tbl_genero",
  "tbl_horarios",
  "tbl_modulos",
  "tbl_motivos",
  "tbl_motivos_modulos",
  "tbl_notificaciones",
  "tbl_otp_codigos",
  "tbl_pais",
  "tbl_perfil",
  "tbl_perfil_ventanas",
  "tbl_permisos",
  "tbl_permisos_perfil",
  "tbl_permisos_usuarios",
  "tbl_permisos_ventana",
  "tbl_personal_actividad",
  "tbl_prioridad",
  "tbl_recuperar",
  "tbl_recuperar_cuenta",
  "tbl_reglas",
  "tbl_reglas_disponibilidad",
  "tbl_sesion_actividad",
  "tbl_tipo_documento",
  "tbl_tipo_sesion",
  "tbl_usuarios",
  "tbl_usuarios_ventanas",
  "tbl_ventanas",
];

(async () => {
  let fullOutput = "";

  for (const table of tables) {
    const rows = await executeQuery(
      `
      SELECT
        c.COLUMN_NAME,
        c.COLUMN_TYPE,
        c.IS_NULLABLE,
        c.COLUMN_KEY,
        c.EXTRA,
        k.REFERENCED_TABLE_NAME,
        k.REFERENCED_COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS c
      LEFT JOIN INFORMATION_SCHEMA.KEY_COLUMN_USAGE k
        ON c.TABLE_SCHEMA = k.TABLE_SCHEMA
        AND c.TABLE_NAME = k.TABLE_NAME
        AND c.COLUMN_NAME = k.COLUMN_NAME
        AND k.REFERENCED_TABLE_NAME IS NOT NULL
      WHERE c.TABLE_SCHEMA = 'bdmotorhours'
        AND c.TABLE_NAME = ?
      ORDER BY c.ORDINAL_POSITION
      `,
      [table]
    );
    fullOutput += `\ntabla_name: ${table}\n`;
    fullOutput += `\nvariables\n`;
    rows.forEach((col) => {
      fullOutput += `- ${col.COLUMN_NAME}, ${col.COLUMN_TYPE}, ${col.IS_NULLABLE}, ${col.COLUMN_KEY}, ${col.EXTRA}\n`;
    });
  }

  // Guardar en archivo .txt
  const filePath = path.join(__dirname, "estructura_movico.txt");
  fs.writeFileSync(filePath, fullOutput, "utf8");

  console.log(`Estructura guardada en: ${filePath}`);
})();

// import mysql from "mysql2/promise";
// import axios from "axios";
// import { translate } from "@vitalets/google-translate-api";

// // Espera (pausa) entre traducciones para evitar bloqueo de IP
// const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// // Configuración de la conexión MySQL
// const dbConfig = {
//   host: "localhost",
//   user: "root",
//   password: "",
//   database: "bdtrazostickets",
// };

// async function alimentarPaisesCiudades() {
//   const connection = await mysql.createConnection(dbConfig);

//   try {
//     console.log("🔌 Conectado a la base de datos.");

//     // Obtener países y ciudades
//     const response = await axios.get(
//       "https://countriesnow.space/api/v0.1/countries"
//     );
//     const paises = response.data.data;

//     for (const pais of paises) {
//       try {
//         // Traducir país
//         const paisTraducido = await translate(pais.country, { to: "es" });
//         await sleep(500);
//         const nombrePaisEs = paisTraducido.text;

//         // Insertar país
//         const [res] = await connection.execute(
//           "INSERT INTO tbl_pais (pai_nombre) VALUES (?)",
//           [nombrePaisEs]
//         );
//         const paisId = res.insertId;
//         console.log(`✔ País insertado: ${nombrePaisEs}`);

//         // Traducir e insertar ciudades
//         for (const ciudad of pais.cities) {
//           try {
//             const ciudadTraducida = await translate(ciudad, { to: "es" });
//             await sleep(300);
//             const nombreCiudadEs = ciudadTraducida.text;

//             await connection.execute(
//               "INSERT INTO tbl_ciudad (ciu_nombre, pai_id) VALUES (?, ?)",
//               [nombreCiudadEs, paisId]
//             );
//           } catch (err) {
//             console.warn(
//               `⚠ Error al traducir ciudad "${ciudad}": ${err.message}`
//             );
//           }
//         }
//       } catch (err) {
//         console.warn(
//           `⚠ Error al traducir país "${pais.country}": ${err.message}`
//         );
//       }
//     }

//     console.log("✅ Todos los países y ciudades fueron insertados en español.");
//   } catch (err) {
//     console.error("❌ Error general:", err.message);
//   } finally {
//     await connection.end();
//     console.log("🔒 Conexión cerrada.");
//   }
// }

// alimentarPaisesCiudades();
