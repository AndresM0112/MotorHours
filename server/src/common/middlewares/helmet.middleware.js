import helmet from "helmet";

const helmetMiddleware = helmet({
  contentSecurityPolicy: {
    directives: {
      "default-src": ["'self'"], // Solo permite recursos del mismo dominio
      "script-src": ["'self'", "'unsafe-inline'"], // Permite scripts del mismo origen y scripts inline
      "style-src": ["'self'", "'unsafe-inline'"], // Permite estilos del mismo origen y estilos inline
      "img-src": ["'self'"], // Permite imágenes solo del mismo origen
      "object-src": ["'none'"], // Bloquea la carga de objetos (como plugins)
      "base-uri": ["'self'"], // Restringe las etiquetas base a las del mismo origen
      "form-action": ["'self'"], // Limita las acciones de los formularios al mismo origen
      "frame-ancestors": ["'none'"], // Previene que el sitio sea usado en iframes de otros dominios
    },
  },
  crossOriginEmbedderPolicy: false, // Desactiva la política COEP
  crossOriginResourcePolicy: { policy: "cross-origin" }, // Permite recursos de origen cruzado
  referrerPolicy: { policy: "no-referrer" }, // No envía la cabecera Referrer
  hidePoweredBy: true, // Oculta la cabecera X-Powered-By
  xssFilter: true, // Activa el filtro de XSS
  hsts: {
    maxAge: 31536000, // Configura HSTS para 1 año
    includeSubDomains: true,
    preload: true,
  },
  dnsPrefetchControl: { allow: false }, // Desactiva el prefetch de DNS
  frameguard: { action: "deny" }, // Previene el uso de iframes
});

export default helmetMiddleware;
