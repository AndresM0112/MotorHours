/**
 * Utilidad para limpiar y sanitizar datos de forma escalable
 */
const cleanData = (data) => {
  if (typeof data === "string") {
    return data.trim().replace(/\s+/g, " "); // Elimina espacios dobles y limpia espacios en blanco
  }

  if (typeof data === "number" || typeof data === "boolean") {
    return data; // No se realiza limpieza en números o booleanos
  }

  if (Array.isArray(data)) {
    return data.map(cleanData); // Iterar y limpiar cada elemento en el array
  }

  if (typeof data === "object" && data !== null) {
    const cleanedObject = {};
    for (const key in data) {
      if (Object.hasOwnProperty.call(data, key)) {
        cleanedObject[key] = cleanData(data[key]); // Llamada recursiva para objetos anidados
      }
    }
    return cleanedObject;
  }

  return data; // Devuelve cualquier otro tipo de dato sin modificar
};

/**
 * Middleware para limpiar datos entrantes
 */
const cleanRequestData = (req, res, next) => {
  // Limpiar datos de las principales fuentes de entrada
  if (req.body) req.body = cleanData(req.body);
  if (req.query) req.query = cleanData(req.query);
  if (req.params) req.params = cleanData(req.params);

  next();
};

export default cleanRequestData;
