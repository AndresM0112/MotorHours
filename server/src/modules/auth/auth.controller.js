import {
  getConnection,
  releaseConnection,
  executeQuery,
} from "../../common/configs/db.config.js";
import jwt from "jsonwebtoken";
import { hashPassword, comparePassword } from "../../common/utils/funciones.js";
import { sendEmail } from "../../common/services/mailerService.js";
import { confirmAccountTemplate } from "../../common/templates/confirm_account.template.js";
import { generarCodigoOTP } from "../../common/utils/otp.utils.js";

export const loginController = async (req, res, next) => {
  const { usuario, clave } = req.body;
  let connection = null;
  try {
    connection = await getConnection();

    const rows = await executeQuery(
      `
        SELECT
          usu_foto AS usuFoto,
          usu_id AS usuId,
          usu_clave AS clave,
          CONCAT(usu_nombre, ' ', IFNULL(usu_apellido, '')) AS nombre,
          usu_correo AS correo,
          usu_telefono AS telefono,
          usu_correo AS documento,
          est_id AS estado,
          prf_id AS perfil,
          usu_agenda AS agenda,
          usu_instructor AS instructor,
          usu_cambio AS cambioclave
        FROM tbl_usuarios
        WHERE (usu_correo = ? OR usu_usuario = ?) AND est_id IN (1,4)
      `,
      [usuario, usuario],
      connection
    );

    if (rows.length === 0) {
      const error = new Error(
        `Credenciales incorrectas, por favor valida nuevamente.`
      );
      error.statusCode = 403;
      throw error;
    }

    const {
      usuId,
      usuFoto,
      nombre,
      correo,
      documento,
      telefono,
      perfil,
      agenda,
      instructor,
      cambioclave,
    } = rows[0];

    const matchPassword = await comparePassword(clave, rows[0].clave);

    if (!matchPassword) {
      const error = new Error(
        `Credenciales incorrectas, por favor valida nuevamente.`
      );
      error.statusCode = 403;
      throw error;
    }

    if (cambioclave === 1) {
      return res.status(200).json({
        usuId,
        usuFoto,
        nombre: nombre.trim(),
        cambioclave: cambioclave,
        message: "Debe cambiar la contraseña",
      });
    }

    const rowsPermisos = await executeQuery(
      `SELECT per_id perId FROM tbl_permisos_usuarios WHERE usu_id = ?`,
      [usuId],
      connection
    );

    const userToken = {
      usuId,
      nombre: nombre.trim(),
      correo,
      perfil,
    };

    const token = jwt.sign(userToken, process.env.JWT_SECRET, {
      expiresIn: 60 * 60 * 24, // 24 horas
    });

    // Configurar la cookie con el token
    // Railway usa proxy HTTPS → detectar por x-forwarded-proto en vez de NODE_ENV
    const isHttps = req.secure || req.headers["x-forwarded-proto"] === "https";
    res.cookie("tokenMOTORHOURS", token, {
      httpOnly: true,
      secure: isHttps,
      sameSite: isHttps ? "None" : "Lax", // None = permite envío cross-origin (Vercel→Railway)
      maxAge: 60 * 60 * 24 * 1000,        // 24 horas
    });

    // Retornar la respuesta JSON sin el token
    return res.json({
      usuId,
      usuFoto,
      nombre: nombre.trim(),
      usuario,
      correo,
      telefono,
      documento,
      perfil,
      agenda,
      instructor,
      permisos: rowsPermisos,
      cambioclave,
    });
  } catch (err) {
    next(err);
  } finally {
    releaseConnection(connection);
  }
};

export const registerUser = async (req, res, next) => {
  let connection = null;

  try {
    connection = await getConnection();
    await connection.beginTransaction();

    const {
      nombre,
      apellido,
      documento,
      tipoDocumento,
      genero,
      ciudad,
      pais,
      fechaNacimiento,
      telefono,
      correo,
      usuario,
      clave,
    } = req.body;

    if (
      !nombre ||
      !apellido ||
      !documento ||
      !tipoDocumento ||
      !genero ||
      !ciudad ||
      !pais ||
      !fechaNacimiento ||
      !telefono ||
      !correo ||
      !usuario ||
      !clave
    ) {
      const error = new Error("Faltan campos obligatorios.");
      error.status = 400;
      throw error;
    }

    // Validar duplicidad (verificados y pendientes)
    const duplicates = await executeQuery(
      `SELECT usu_id, usu_verificado FROM tbl_usuarios 
       WHERE usu_usuario = ? OR usu_correo = ? OR usu_documento = ?`,
      [usuario, correo, documento],
      connection
    );

    if (duplicates.length > 0) {
      const yaVerificado = duplicates.find((u) => u.usu_verificado === 1);
      if (yaVerificado) {
        const error = new Error(
          "Ya existe un usuario registrado con estos datos."
        );
        error.status = 409;
        throw error;
      }

      const pendiente = duplicates.find((u) => u.usu_verificado === 0);
      if (pendiente) {
        const error = new Error(
          "Ya existe un registro pendiente de confirmación. Verifica tu correo."
        );
        error.status = 409;
        throw error;
      }
    }

    const hash = await hashPassword(clave);
    const codigoOTP = generarCodigoOTP(); // Ej: '842919'

    const result = await executeQuery(
      `INSERT INTO tbl_usuarios (
        usu_nombre, usu_apellido, usu_documento, usu_usuario,
        usu_correo, usu_clave, prf_id, est_id, usu_acceso,
        usu_cambio, usu_reg, usu_verificado, usu_usu_act,
        tpd_id, gen_id, ciu_id, pai_id, usu_fec_nacimiento, usu_telefono
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        nombre,
        apellido,
        documento,
        usuario,
        correo,
        hash,
        3, // prf_id: usuario paciente
        4, // est_id: Por verificar
        1, // acceso
        0, // no requiere cambio clave
        null, // usu_reg
        0, // no verificado
        usuario, // actuado por
        tipoDocumento,
        genero,
        ciudad,
        pais,
        fechaNacimiento,
        telefono,
      ],
      connection
    );

    const usuId = result.insertId;

    await executeQuery(
      `INSERT INTO tbl_otp_codigos (usu_id, codigo, fecha_generado, usado)
       VALUES (?, ?, NOW(), 0)`,
      [usuId, codigoOTP],
      connection
    );

    await connection.commit();

    const html = confirmAccountTemplate({
      nombreUsuario: nombre,
      codigoOTP,
    });

    await sendEmail({
      to: correo,
      subject: "Tu código de verificación",
      html,
    });

    return res.status(201).json({
      message: "Usuario registrado correctamente. Verifica tu correo.",
      usuId,
      correo,
      usuario,
      clave,
    });
  } catch (err) {
    if (connection) await connection.rollback();
    next(err);
  } finally {
    releaseConnection(connection);
  }
};

export const resendOtpCode = async (req, res, next) => {
  let connection = null;
  try {
    const { usuId } = req.body;

    if (!usuId) {
      const error = new Error("Falta el ID de usuario.");
      error.status = 400;
      throw error;
    }

    connection = await getConnection();

    const [user] = await executeQuery(
      `SELECT usu_nombre, usu_correo FROM tbl_usuarios WHERE usu_id = ? AND usu_verificado = 0`,
      [usuId],
      connection
    );

    if (!user) {
      const error = new Error("Usuario no encontrado o ya verificado.");
      error.status = 404;
      throw error;
    }

    const nuevoCodigo = generarCodigoOTP();

    await executeQuery(
      `INSERT INTO tbl_otp_codigos (usu_id, codigo, fecha_generado, usado)
       VALUES (?, ?, NOW(), 0)`,
      [usuId, nuevoCodigo],
      connection
    );

    const html = confirmAccountTemplate({
      nombreUsuario: user.usu_nombre,
      codigoOTP: nuevoCodigo,
    });

    await sendEmail({
      to: user.usu_correo,
      subject: "Nuevo código de verificación",
      html,
    });

    res
      .status(200)
      .json({ success: true, message: "Código reenviado correctamente." });
  } catch (err) {
    next(err);
  } finally {
    releaseConnection(connection);
  }
};

export const verifyOtpCode = async (req, res, next) => {
  let connection = null;
  try {
    const { usuId, codigo } = req.body;

    if (!usuId || !codigo) {
      const error = new Error("Datos incompletos.");
      error.status = 400;
      throw error;
    }

    connection = await getConnection();

    const rows = await executeQuery(
      `SELECT id FROM tbl_otp_codigos 
       WHERE usu_id = ? AND codigo = ? AND usado = 0 
         AND fecha_generado >= NOW() - INTERVAL 10 MINUTE`,
      [usuId, codigo],
      connection
    );

    if (rows.length === 0) {
      const error = new Error("Código inválido o expirado.");
      error.status = 400;
      throw error;
    }

    // Marcar OTP como usado
    await executeQuery(
      `UPDATE tbl_otp_codigos SET usado = 1 WHERE id = ?`,
      [rows[0].id],
      connection
    );

    // Verificar usuario
    await executeQuery(
      `UPDATE tbl_usuarios SET usu_verificado = 1 WHERE usu_id = ?`,
      [usuId],
      connection
    );

    res.status(200).json({ success: true, message: "Verificación exitosa." });
  } catch (err) {
    next(err);
  } finally {
    releaseConnection(connection);
  }
};

export const getSettlementController = async (req, res, next) => {
  const { usuId } = req.query;
  let connection = null;
  try {
    connection = await getConnection();

    const resultsQuery = await executeQuery(
      `SELECT usu_nombre nombre, usu_apellido apellido, usu_usuario usuario, usu_correo correo FROM tbl_usuarios WHERE usu_id = ? LIMIT 1`,
      [usuId],
      connection
    );

    res.status(200).json(resultsQuery[0]);
  } catch (err) {
    next(err);
  } finally {
    releaseConnection(connection);
  }
};

export const updateAccountController = async (req, res, next) => {
  let connection = null;
  try {
    connection = await getConnection();

    const { nombre, apellido, usuario, correo, usuarioact, usuId } = req.body;

    const updateAccount = await executeQuery(
      "UPDATE tbl_usuarios SET usu_nombre = ?, usu_apellido = ?, usu_usuario = ?, usu_correo = ?, usu_usu_act = ? WHERE usu_id = ?",
      [nombre, apellido, usuario, correo, usuarioact, usuId],
      connection
    );

    if (updateAccount.affectedRows > 0) {
      res.status(200).json({ message: "Cuenta Modificada Correctamente" });
    }

    const error = new Error(`Error al actualizar la cuenta.`);
    error.statusCode = 400;
    throw error;
  } catch (err) {
    next(err);
  } finally {
    releaseConnection(connection);
  }
};

export const updatePasswordController = async (req, res, next) => {
  const { currentPassword, newPassword, usuario, usuId } = req.body;

  let connection = null;
  try {
    connection = await getConnection();

    const resultsQuery = await executeQuery(
      `SELECT usu_clave clave FROM tbl_usuarios WHERE usu_id = ?`,
      [usuId],
      connection
    );

    if (resultsQuery.length > 0) {
      const matchPassword = await comparePassword(
        currentPassword,
        resultsQuery[0].clave
      );

      if (matchPassword) {
        const hash = await hashPassword(newPassword);

        const updatePassword = await executeQuery(
          `UPDATE tbl_usuarios SET usu_clave = ?, usu_usu_act = ?, usu_cambio = ? WHERE usu_id = ?`,
          [hash, usuario, 0, usuId],
          connection
        );

        if (updatePassword.affectedRows > 0) {
          return res
            .status(200)
            .json({ message: "Contraseña Actualizada Correctamente" });
        }
        const error = new Error(`Hubo un problema al cambiar tu contraseña.`);
        error.statusCode = 400;
        throw error;
      }

      const error = new Error(
        `Contraseña incorrecta, por favor valida nuevamente.`
      );
      error.statusCode = 400;
      throw error;
    }
  } catch (err) {
    next(err);
  } finally {
    releaseConnection(connection);
  }
};

export const getWindowsByProfileController = async (req, res, next) => {
  let connection = null;
  try {
    connection = await getConnection();

    const { prfId } = req.query;

    const resultQuery = await executeQuery(
      `SELECT v.ven_id AS id, v.ven_nombre AS nombre
       FROM tbl_perfil_ventanas pv
       JOIN tbl_ventanas v ON pv.ven_id = v.ven_id
       WHERE pv.prf_id = ?`,
      [prfId],
      connection
    );

    return res.status(200).json(resultQuery);
  } catch (err) {
    next(err);
  } finally {
    releaseConnection(connection);
  }
};

export const validateCodePasswordController = async (req, res, next) => {
  const { token, codeTemp } = req.body;

  let connection = null;
  try {
    connection = await getConnection();
    // Verificar el token
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET_TEMP || "dede6899178c8aeb8f14ab46ec8d86e99097e329"
    );

    const { usuarioID } = decoded;

    // Obtener conexión y verificar el código temporal
    const result = await executeQuery(
      "SELECT res_code_temp FROM tbl_recuperar_cuenta WHERE usu_id = ? AND res_token = ?",
      [usuarioID, token],
      connection
    );

    if (!result.length || result[0].res_code_temp !== parseInt(codeTemp)) {
      const error = new Error(`Código Incorrecto.`);
      error.statusCode = 400;
      throw error;
    }

    return res.status(200).json({
      success: true,
      message: "Código verificado.",
    });
  } catch (error) {
    next(error);
  } finally {
    releaseConnection(connection);
  }
};

export const restorePasswordController = async (req, res, next) => {
  const { token, nuevaContrasena, codeTemp } = req.body;

  let connection = null;
  try {
    connection = await getConnection();
    // Verificar el token
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET_TEMP || "dede6899178c8aeb8f14ab46ec8d86e99097e329"
    );

    const { usuarioID } = decoded;

    // Obtener conexión y verificar el código temporal
    const result = await executeQuery(
      "SELECT res_code_temp FROM tbl_recuperar_cuenta WHERE usu_id = ? AND res_token = ?",
      [usuarioID, token],
      connection
    );

    if (!result.length || result[0].res_code_temp !== parseInt(codeTemp)) {
      const error = new Error(`Código Temporal Incorrecto.`);
      error.statusCode = 400;
      throw error;
    }

    // Hashear la nueva contraseña
    const hashedPassword = await hashPassword(nuevaContrasena);

    // Actualizar la contraseña en la base de datos
    await executeQuery(
      "UPDATE tbl_usuarios SET usu_clave = ? WHERE usu_id = ?",
      [hashedPassword, usuarioID],
      connection
    );

    // Eliminar el código temporal después de su uso (opcional)
    await executeQuery(
      "DELETE FROM tbl_recuperar_cuenta WHERE usu_id = ?",
      [usuarioID],
      connection
    );

    return res
      .status(200)
      .json({ success: true, message: "Contraseña actualizada con éxito." });
  } catch (error) {
    next(error);
  } finally {
    releaseConnection(connection);
  }
};
