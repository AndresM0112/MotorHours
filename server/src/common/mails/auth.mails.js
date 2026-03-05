import express from "express";
import {
  getConnection,
  releaseConnection,
  executeQuery,
} from "../configs/db.config.js";
import jwt from "jsonwebtoken";
import { urlBase } from "../constants/app.constants.js";
import { restorePasswordTemplate } from "../templates/restore_password.template.js";
import { sendEmail } from "../services/mailerService.js";

const authMailsRoutes = express.Router();

const generateToken = (usuarioID, correo) => {
  const secretKey =
    process.env.JWT_SECRET_TEMP || "dede6899178c8aeb8f14ab46ec8d86e99097e329";
  return jwt.sign({ usuarioID, correo }, secretKey, {
    expiresIn: "24h",
  });
};

// Ruta para enviar correos
authMailsRoutes.post("/restore_credentials_access", async (req, res, next) => {
  const { selectedUsers = null, correo = null } = req.body;

  let connection = null;

  try {
    connection = await getConnection();
    if (selectedUsers) {
      for (const user of selectedUsers) {
        const { usuId, correo, nombre } = user;

        const token = generateToken(usuId, correo);
        const codeTemp = Math.floor(100000 + Math.random() * 900000); // Código temporal
        const linkRecoverPassword = `${urlBase}restore-password/${token}`;

        const html = restorePasswordTemplate({
          asunto: "Creación de contraseña",
          descripcion:
            "Por favor sigue las instrucciones para acceder a tu cuenta.",
          nombreUsuario: nombre,
          linkRecoverPassword,
          codeTemp,
        });

        // Guardar información en la base de datos
        await executeQuery(
          "INSERT INTO tbl_recuperar_cuenta (usu_id, usu_email, res_token, res_code_temp) VALUES (?, ?, ?, ?)",
          [usuId, correo, token, codeTemp],
          connection
        );

        // Enviar correo
        await sendEmail({
          to: correo,
          subject: "Recuperación de contraseña",
          html,
        });
      }

      return res.status(200).json({
        success: true,
        message: "Se enviaron los correos para restablecimiento de contraseña.",
      });
    } else if (correo) {
      const rows = await executeQuery(
        "SELECT usu_id usuId, CONCAT(IFNULL(usu_nombre, ''), ' ', IFNULL(usu_apellido, '')) nombre, est_id estado FROM tbl_usuarios WHERE usu_correo = ?",
        [correo],
        connection
      );

      if (rows.length === 0) {
        const error = new Error(
          `No existe ninguna cuenta asociada a este correo electrónico. Por favor verifica la dirección o contacta a sistemas.`
        );
        error.statusCode = 404;
        throw error;
      }

      const { usuId, nombre, estado } = rows[0];

      if (estado !== 1) {
        const error = new Error(
          `Cuenta no disponible, si crees que es un error, por favor contacta a sistemas.`
        );
        error.statusCode = 400;
        throw error;
      }

      const token = generateToken(usuId, correo);
      const codeTemp = Math.floor(100000 + Math.random() * 900000);
      const linkRecoverPassword = `${urlBase}restore-password/${token}`;

      const html = restorePasswordTemplate({
        asunto: "Restablecer contraseña",
        descripcion:
          "Por favor sigue las instrucciones para restablecer tu contraseña.",
        nombreUsuario: nombre,
        linkRecoverPassword,
        codeTemp,
      });

      await executeQuery(
        "INSERT INTO tbl_recuperar_cuenta (usu_id, usu_email, res_token, res_code_temp) VALUES (?, ?, ?, ?)",
        [usuId, correo, token, codeTemp],
        connection
      );

      await sendEmail({
        to: correo,
        subject: "Recuperación de contraseña",
        html,
      });

      return res.status(200).json({
        success: true,
        message: "Se envió el correo para restablecimiento de contraseña.",
      });
    } else {
      const error = new Error(
        `Debe proporcionar al menos un correo o una lista de usuarios.`
      );
      error.statusCode = 400;
      throw error;
    }
  } catch (err) {
    next(err);
  } finally {
    releaseConnection(connection);
  }
});

export default authMailsRoutes;
