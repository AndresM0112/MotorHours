import {
  getConnection,
  releaseConnection,
  executeQuery,
} from "../../common/configs/db.config.js";
import jwt from "jsonwebtoken";

export const verifyToken = async (req, res, next) => {
  let connection = null;
  try {
    connection = await getConnection();
    // 1. Intentar cookie httpOnly (PC / Android Chrome)
    // 2. Fallback: Authorization header (mobile Safari con ITP que bloquea cookies cross-site)
    const authHeader = req.headers["authorization"];
    const token =
      req.cookies.tokenMOTORHOURS ||
      (authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null);

    if (!token) {
      return res.status(401).json({ message: "Autorización inválida" });
    }

    jwt.verify(token, process.env.JWT_SECRET, async (err, decoded) => {
      if (err) {
        if (err.name === "TokenExpiredError") {
          return res.status(401).json({ message: "El token ha expirado" });
        } else if (err.name === "JsonWebTokenError") {
          return res.status(401).json({ message: "Token inválido" });
        } else {
          return res.status(401).json({ message: "Error de autorización" });
        }
      }

      const rows = await executeQuery(
        `SELECT usu_id FROM tbl_usuarios WHERE usu_id = ? AND usu_correo = ? AND est_id IN (1,4) LIMIT 1`,
        [decoded.usuId, decoded.correo],
        connection
      );

      if (rows.length > 0) {
        req.user = decoded;
        next();
      } else {
        return res.status(401).json({ message: "Autorización inválida" });
      }
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "Error en el servidor" });
  } finally {
    releaseConnection(connection);
  }
};
