import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// Obtener __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ruta al archivo de esquema
const schemaFilePath = path.resolve(
  __dirname,
  "estructura_bdmaquinaria.txt"
);

// Leer archivo una sola vez
const schemaText = fs.readFileSync(schemaFilePath, "utf-8");

/**
 * Extrae fragmentos del esquema relacionados con las tablas indicadas.
 * @param {string[]} tableNames - Nombres de tablas como 'tbl_equipos', 'tbl_bodega', etc.
 * @returns {string} Fragmento de esquema relevante
 */
export function getSchemaForTables(tableNames) {
  const bloques = schemaText.split(/tabla_name:/g).slice(1); // evitar encabezado vacío
  const esquemas = [];

  for (const bloque of bloques) {
    const [nombreTablaRaw, ...resto] = bloque.split("\n");
    const nombreTabla = nombreTablaRaw.trim();

    if (tableNames.includes(nombreTabla)) {
      esquemas.push(`tabla_name: ${nombreTabla}\n${resto.join("\n")}`);
    }
  }

  return esquemas.join("\n\n");
}

/**
 * Detecta palabras clave en el mensaje del usuario y retorna las tablas relacionadas
 * @param {string} userMessage - Mensaje del usuario
 * @returns {string[]} - Lista de tablas relevantes
 */
export function extractRelevantTables(userMessage) {
  const msg = userMessage.toLowerCase();
  const tablas = new Set();

  // === Equipos y mantenimiento
  if (msg.includes("equipo")) {
    tablas.add("tbl_equipos");
    tablas.add("tbl_equipos_asignacion");
    tablas.add("tbl_equipos_asignacionfoto");
    tablas.add("tbl_equipos_asociados");
    tablas.add("tbl_equipos_documentacion");
    tablas.add("tbl_equipos_historico");
    tablas.add("tbl_equipos_imagenes");
    tablas.add("tbl_equipos_movimiento");
    tablas.add("tbl_equipos_pm");
    tablas.add("tbl_estados_equipo");
  }

  if (msg.includes("asignación") || msg.includes("asignacion")) {
    tablas.add("tbl_equipos_asignacion");
    tablas.add("tbl_estados_asignacion");
  }

  if (msg.includes("pm")) {
    tablas.add("tbl_equipos_pm");
  }

  if (msg.includes("documentación") || msg.includes("documentacion")) {
    tablas.add("tbl_equipos_documentacion");
  }

  if (msg.includes("imagen")) {
    tablas.add("tbl_equipos_imagenes");
  }

  if (msg.includes("movimiento")) {
    tablas.add("tbl_equipos_movimiento");
    tablas.add("tbl_movimientos");
    tablas.add("tbl_movimientos_inventario");
  }

  if (msg.includes("estado")) {
    tablas.add("tbl_estados");
    tablas.add("tbl_estados_ot");
    tablas.add("tbl_estados_operacion");
    tablas.add("tbl_estados_equipo");
    tablas.add("tbl_estados_asignacion");
    tablas.add("tbl_estados_programacion");
    tablas.add("tbl_estado_entrada");
  }

  // === Artículos, bodega, inventario
  if (msg.includes("artículo") || msg.includes("articulo")) {
    tablas.add("tbl_articulos");
    tablas.add("tbl_articulo_bodega");
    tablas.add("tbl_articulo_proveedor");
    tablas.add("tbl_proveedor_articulo");
    tablas.add("tbl_subcategoria");
    tablas.add("tbl_marcas");
    tablas.add("tbl_categorias");
    tablas.add("tbl_tipo_producto");
    tablas.add("tbl_tipo_entrada");
    tablas.add("tbl_tipo_salida");
  }

  if (msg.includes("bodega")) {
    tablas.add("tbl_bodega");
  }

  if (msg.includes("inventario")) {
    tablas.add("tbl_inventario");
  }

  if (msg.includes("entrada")) {
    tablas.add("tbl_entradas");
  }

  if (msg.includes("salida")) {
    tablas.add("tbl_salidas");
  }

  if (msg.includes("traslado")) {
    tablas.add("tbl_traslados");
  }

  // === Proveedores
  if (msg.includes("proveedor")) {
    tablas.add("tbl_proveedores");
    tablas.add("tbl_articulo_proveedor");
    tablas.add("tbl_proveedor_articulo");
    tablas.add("tbl_forma_pago");
  }

  // === Usuarios y permisos
  if (msg.includes("usuario")) {
    tablas.add("tbl_usuarios");
    tablas.add("tbl_perfil");
    tablas.add("tbl_permisos");
    tablas.add("tbl_permisos_perfil");
    tablas.add("tbl_permisos_usuarios");
    tablas.add("tbl_permisos_ventana");
    tablas.add("tbl_ventanas");
  }

  // === Operaciones y producción
  if (msg.includes("operación") || msg.includes("operacion")) {
    tablas.add("tbl_operacion");
    tablas.add("tbl_operacion_detalle");
    tablas.add("tbl_estados_operacion");
  }

  if (msg.includes("producción") || msg.includes("produccion")) {
    tablas.add("tbl_produccion");
    tablas.add("tbl_procesos_produccion");
  }

  // === Consumos, bombeo, excavación, perforación, inyección, tensado, trayecto
  if (msg.includes("consumo")) {
    tablas.add("tbl_consumibles");
  }

  if (msg.includes("bombeo")) {
    tablas.add("tbl_bombeo");
  }

  if (msg.includes("excavación") || msg.includes("excavacion")) {
    tablas.add("tbl_excavacion");
  }

  if (msg.includes("perforación") || msg.includes("perforacion")) {
    tablas.add("tbl_perforacion");
  }

  if (msg.includes("inyección") || msg.includes("inyeccion")) {
    tablas.add("tbl_inyecciones");
  }

  if (msg.includes("tensado")) {
    tablas.add("tbl_tensado");
  }

  if (msg.includes("trayecto")) {
    tablas.add("tbl_trayecto");
    tablas.add("tbl_trayecto_foto");
  }

  // === Órdenes de trabajo
  if (msg.includes("orden de trabajo") || msg.includes("ot")) {
    tablas.add("tbl_ot");
    tablas.add("tbl_ot_detalle");
    tablas.add("tbl_ot_subparte");
    tablas.add("tbl_ot_tecnico");
    tablas.add("tbl_ot_imagenes");
    tablas.add("tbl_ot_historico");
  }

  if (msg.includes("tipo ot")) {
    tablas.add("tbl_tipo_ot");
  }

  // === Fallas y mantenimiento
  if (msg.includes("falla")) {
    tablas.add("tbl_fallas_comunes");
  }

  if (msg.includes("mantenimiento")) {
    tablas.add("tbl_ot");
    tablas.add("tbl_equipos_pm");
  }

  if (msg.includes("motivo")) {
    tablas.add("tbl_motivos");
  }

  // === Proyectos y sociedades
  if (msg.includes("proyecto")) {
    tablas.add("tbl_bloques");
  }

  if (msg.includes("sociedad")) {
    tablas.add("tbl_sociedades");
  }

  // === Reglas del sistema
  if (msg.includes("regla")) {
    tablas.add("tbl_reglas");
  }

  // === Recuperación y reset
  if (msg.includes("recuperar")) {
    tablas.add("tbl_recuperar");
  }

  if (msg.includes("reset")) {
    tablas.add("tbl_reset_password");
  }

  // === Notificaciones
  if (msg.includes("notificación") || msg.includes("notificacion")) {
    tablas.add("tbl_notificaciones");
  }

  // === Reportes
  if (msg.includes("no reportado") || msg.includes("noreportado")) {
    tablas.add("tbl_noreportados");
  }

  // === Partes, subpartes, herramientas
  if (msg.includes("parte")) {
    tablas.add("tbl_partes");
    tablas.add("tbl_sub_partes");
  }

  if (msg.includes("herramienta")) {
    tablas.add("tbl_equipos"); // por campo equ_herramientas
  }

  return [...tablas];
}

/**
 * Genera el prompt dinámico con el esquema reducido
 * @param {string} userMessage
 * @returns {string} - Prompt listo para enviar a OpenAI
 */
export function generateIntentPrompt(userMessage) {
  const relevantTables = extractRelevantTables(userMessage);
  const partialSchema = getSchemaForTables(relevantTables);

  return `
 Eres un generador experto de consultas SQL. Tu única tarea es generar una consulta SQL del tipo **SELECT** basada en la intención del usuario y en el esquema de base de datos proporcionado a continuación.
 
Reglas obligatorias:
 - Solo debes generar una consulta SQL válida de tipo SELECT.
 - No incluyas texto explicativo, comentarios, encabezados, ni introducciones.
 - Si no puedes generar una consulta segura con la información proporcionada, responde únicamente:
 No puedo generar una consulta segura con la información dada.
 
 Notas:
 - Si se espera una lista grande de resultados, utiliza 'LIMIT 20'.
 - No devuelvas IDs sin sentido. Usa joins si es necesario para mostrar nombres o datos legibles.
 - Asegúrate de que los campos usados existan en el esquema provisto.
 
 ---
 
 Pregunta del usuario:
 ${userMessage}
 
 ---
 
 Esquema relevante de la base de datos:
 ${partialSchema}
 `.trim();
}

export const responseFormatterPrompt = `
Eres un asistente técnico profesional que responde en español con claridad y precisión.

Tu objetivo es:
1. Recibir la consulta original del usuario.
2. Recibir los datos obtenidos de la base de datos tras ejecutar una consulta SELECT.
3. Generar una **respuesta natural**, entendible por usuarios no técnicos, a partir de esos datos.

No muestres el SQL. No repitas la pregunta. Solo entrega la información como un informe o resumen útil.

Sé directo y usa lenguaje formal pero accesible.
`.trim();

export const fallbackPrompt = `
Eres un asistente técnico del sistema de mantenimiento y operación de equipos. Cuando no puedes encontrar una consulta SQL adecuada para responder la pregunta del usuario, debes informarlo con claridad y profesionalismo.

Responde algo como:

Actualmente no tengo suficiente información en la base de datos para responder a esa consulta con precisión.

No inventes respuestas. Sé honesto, directo y cordial.
`.trim();
