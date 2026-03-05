// import compression from "compression";

// // Middleware de compresión avanzado
// const compressionMiddleware = compression({
//   // Nivel de compresión (rango 0-9)
//   level: 6, // Valor recomendado para equilibrar rendimiento y compresión

//   // Algoritmo de compresión (por defecto usa gzip)
//   filter: (req, res) => {
//     // Comprime solo si la respuesta tiene un tipo de contenido adecuado
//     const contentType = res.getHeader("Content-Type");

//     // Evita comprimir ciertos tipos de contenido que no se benefician de la compresión
//     if (!contentType) return false;

//     // Comprimir solo si el contenido es texto, JSON, HTML, imágenes optimizables o videos
//     return /text|json|html|javascript|css|image|video/.test(contentType);
//   },

//   // Umbral mínimo de tamaño en bytes para comprimir la respuesta
//   threshold: 10240, // 10 KB. Las respuestas menores no se comprimirán para evitar sobrecarga innecesaria.

//   // Tamaño del búfer interno para manejar grandes volúmenes de datos
//   chunkSize: 16 * 1024, // 16 KB. Mejora la eficiencia al manejar grandes volúmenes de datos.

//   // Estrategia de memoria (ajusta la memoria dedicada al proceso de compresión)
//   memLevel: 8, // Nivel óptimo para mayor velocidad y menor consumo de recursos (rango 1-9)

//   // Tiempo máximo que se permite para que una compresión continúe antes de detenerse
//   timeout: 5000, // 5 segundos. Evita que solicitudes largas consuman recursos indefinidamente.

//   // Control de nivel de compresión más específico
//   strategy: compression.Z_RLE, // Estrategia optimizada para comprimir datos repetitivos (útil en archivos JSON grandes)

//   // Algoritmos alternativos (acepta Brotli en lugar de solo Gzip para mayor eficiencia)
//   brotli: {
//     enabled: true, // Activa Brotli si el cliente lo soporta (mayor eficiencia que Gzip)
//     zlib: {
//       level: 6, // Nivel recomendado para Brotli
//     },
//   },
// });

// export default compressionMiddleware;
import compression from "compression";

// Rutas que nunca deben comprimirse (thumbs / binarios)
const DONT_COMPRESS_PATHS = [
  /^\/api\/management\/tickets\/evidencias\//,
  /^\/api\/management\/tickets\/evidencias\//,
];
// Tipos de contenido que no se benefician (o se dañan) con compresión
const DONT_COMPRESS_TYPES = /^(image\/|video\/|audio\/|application\/pdf|application\/zip|application\/octet-stream|font\/)/i;

const compressionMiddleware = compression({
  threshold: 10240, // 10KB
  level: 6,         // zlib level (equilibrio)
  memLevel: 8,
  strategy: compression.Z_RLE,
  chunkSize: 16 * 1024,

  // Filtro de compresión inteligente
  filter: (req, res) => {
    // Respeto explícito: desactivar si el cliente lo pide
    if (req.headers["x-no-compression"] === "1") return false;

    // Nunca comprimir rutas marcadas (thumbnails, etc.)
    if (DONT_COMPRESS_PATHS.some(rx => rx.test(req.originalUrl || ""))) return false;

    const type = String(res.getHeader("Content-Type") || "").toLowerCase();

    // Si aún no hay Content-Type, deja la decisión al filtro por defecto
    if (!type) return compression.filter(req, res);

    // Evitar compresión en tipos binarios
    if (DONT_COMPRESS_TYPES.test(type)) return false;

    // Para el resto, aplicar criterio estándar de compression (acepta gzip/br si el cliente lo soporta)
    return compression.filter(req, res);
  },

  // Brotli (si tu versión de `compression` y Node lo soportan).
  // Si no, simplemente ignora este bloque.
  brotli: {
    enabled: true,
    zlib: { level: 6 },
  },
});

export default compressionMiddleware;
