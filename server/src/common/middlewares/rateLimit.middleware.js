import rateLimit from "express-rate-limit";

// Middleware de limitación de solicitudes avanzado
const defaultRateLimit = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutos
  max: 50, // 100 solicitudes por IP en el intervalo de tiempo
  message: {
    status: 429,
    error: "Demasiadas solicitudes. Inténtalo de nuevo más tarde.",
  },
  headers: true, // Agrega cabeceras estándar para control del límite
  standardHeaders: true,
  legacyHeaders: false,
  skipFailedRequests: true,
  skipSuccessfulRequests: false,

  handler: (req, res) => {
    res.status(429).json({
      status: 429,
      error: "Demasiadas solicitudes. Por favor, inténtalo más tarde.",
      retryAfter: Math.ceil(req.rateLimit.resetTime / 1000),
    });
  },

  trustProxy: true, // Permite reconocer correctamente la IP del cliente si se usa un proxy inverso
});

export default defaultRateLimit;
