import {
  getConnection,
  releaseConnection,
  executeQuery,
} from "../../../common/configs/db.config.js";
import jwt from "jsonwebtoken";

export const getMenuController = async (req, res, next) => {
  let connection = null;
  try {
    connection = await getConnection();
    const { per, idu } = req.query;
    const datos = {
      padres: [],
      hijos: [],
    };

    const rowsv = await executeQuery(
      `SELECT ven_id FROM tbl_usuarios_ventanas WHERE usu_id = ?`,
      [idu],
      connection
    );

    const ven = rowsv.map((v) => v.ven_id).join(",");

    const wh = ven ? `AND v.ven_id IN(${ven})` : ``;

    const rows = await executeQuery(
      `SELECT v.ven_id id, v.ven_descripcion, v.ven_url toa, v.ven_icono icon, v.ven_orden, v.ven_nombre label FROM tbl_ventanas v JOIN tbl_perfil_ventanas p ON v.ven_id = p.ven_id WHERE ven_padre = 0 AND p.prf_id = ? ${wh} ORDER BY v.ven_orden`,
      [per],
      connection
    );

    if (rows.length > 0) {
      datos.padres = rows;

      const rows2 = await executeQuery(
        `SELECT v.ven_id, v.ven_descripcion, v.ven_padre padre, v.ven_url toa, v.ven_icono icon, v.ven_orden, v.ven_nombre label FROM tbl_ventanas v JOIN tbl_perfil_ventanas p ON v.ven_id = p.ven_id WHERE ven_padre != 0 AND p.prf_id = ? ${wh} ORDER BY v.ven_orden`,
        [per],
        connection
      );

      if (rows2.length > 0) {
        datos.hijos = rows2;
      }
    }
    return res.json(datos);
  } catch (err) {
    next(err);
  } finally {
    releaseConnection(connection);
  }
};

export const getProfilesController = async (_, res, next) => {
  let connection = null;
  try {
    connection = await getConnection();
    const resultQuery = await executeQuery(
      `SELECT prf_id id, prf_nombre nombre FROM tbl_perfil WHERE est_id = 1 ORDER BY nombre`,
      [],
      connection
    );
    res.status(200).json(resultQuery);
  } catch (err) {
    next(err);
  } finally {
    releaseConnection(connection);
  }
};

export const verifyTokenController = async (req, res, next) => {
  // Primero intenta la cookie (same-origin / desktop).
  // En mobile Safari las cookies cross-origin son bloqueadas (ITP),
  // así que se usa el header Authorization como fallback.
  const token =
    req.cookies.tokenMOTORHOURS ||
    req.headers.authorization?.replace("Bearer ", "").trim();

  if (!token) {
    return res.status(401).json({ message: "Autorización inválida" });
  }

  let connection = null;

  try {
    // Verificación del token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Conexión a base de datos
    connection = await getConnection();

    const rows = await executeQuery(
      `SELECT usu_id FROM tbl_usuarios WHERE usu_id = ? AND usu_correo = ? AND est_id IN (1,4) LIMIT 1`,
      [decoded.usuId, decoded.correo],
      connection
    );

    if (rows && rows.length > 0 && rows[0].usu_id) {
      return res.status(200).json({
        usuId: decoded.usuId,
        cambioclave: decoded.cambioclave,
      });
    } else {
      return res.status(401).json({ message: "Autorización inválida" });
    }
  } catch (err) {
    next(err);
  } finally {
    releaseConnection(connection);
  }
};

export const getUserPermissionsController = async (req, res, next) => {
  const { usuId } = req.query;
  let connection = null;
  try {
    connection = await getConnection();

    // Permisos del usuario
    const permissions = await executeQuery(
      `SELECT per_id perId FROM tbl_permisos_usuarios WHERE usu_id = ?`,
      [usuId],
      connection
    );

    // Ventanas asignadas al usuario (ahora correctamente)
    const windows = await executeQuery(
      `SELECT v.ven_url AS path
       FROM tbl_ventanas v
       JOIN tbl_usuarios_ventanas uv ON v.ven_id = uv.ven_id
       WHERE uv.usu_id = ?`,
      [usuId],
      connection
    );

    res.status(200).json({ permissions, windows });
  } catch (err) {
    next(err);
  } finally {
    releaseConnection(connection);
  }
};

export const getRules = async (req, res, next) => {
  let connection = null;
  try {
    connection = await getConnection();

    const [rules] = await executeQuery(
      `SELECT 
        reg_ipc AS ipc,
        reg_margen AS margen,
        reg_const AS constante,
        reg_tenant_id AS tenantId,
        reg_client_id AS clientId,
        reg_client_secret AS clientSecret,
        reg_usuario AS usuario,
        reg_biblioteca AS biblioteca,
        reg_carpeta AS carpeta,
        reg_dias_ven_cotizacion AS diasVenCotizacion,
        reg_horario_inicio AS horarioInicio,
        reg_horario_fin AS horarioFin,
        reg_anticipacion_minima_reagendar AS anticipacionMinimaReagendar,
        reg_anticipacion_minima_cancelar AS anticipacionMinimaCancelar,
        reg_permitir_cancelar_mismo_dia AS permitirCancelarMismoDia,
        reg_notificar_antes_minutos AS notificarAntesMinutos,
        reg_metodos_notificacion AS metodosNotificacion,
        reg_max_sesiones_dia AS maxSesionesPorDia,
        reg_habilitar_whatsapp AS habilitarWhatsapp,
        reg_whatsapp_token AS whatsappToken,
        reg_whatsapp_numero AS whatsappNumero,
        reg_habilitar_sms AS habilitarSMS,
        reg_sms_apikey AS smsAPIKey,
        reg_numero_principal AS numeroPrincipal,
        reg_otro_numero AS otroNumero,
        reg_habilitar_cron_recordatorio AS habilitarCronRecordatorio,
        reg_recordar_n_dias_antes AS recordarNDiasAntes,
        reg_cron_dias_anticipacion AS cronDiasAnticipacion,
        reg_recordar_mismo_dia AS recordarMismoDia,
        reg_cron_horas_anticipacion AS cronHorasAnticipacion,
        reg_habilitar_correo AS habilitarCorreo
      FROM tbl_reglas
      LIMIT 1`,
      [],
      connection
    );

    return res.status(200).json(rules);
  } catch (err) {
    next(err);
  } finally {
    releaseConnection(connection);
  }
};

export const saveRules = async (req, res, next) => {
  const {
    ipc,
    margen,
    constante,
    tenantId,
    clientId,
    clientSecret,
    usuario,
    biblioteca,
    carpeta,
    diasVenCotizacion,
    horarioInicio,
    horarioFin,
    anticipacionMinimaReagendar,
    anticipacionMinimaCancelar,
    permitirCancelarMismoDia,
    notificarAntesMinutos,
    metodosNotificacion,
    maxSesionesPorDia,
    habilitarWhatsapp,
    whatsappToken,
    whatsappNumero,
    habilitarSMS,
    smsAPIKey,
    usuAct,
    numeroPrincipal,
    otroNumero,
    habilitarCronRecordatorio,
    recordarNDiasAntes,
    cronDiasAnticipacion,
    recordarMismoDia,
    cronHorasAnticipacion,
    habilitarCorreo,
  } = req.body;

  let connection = null;
  try {
    connection = await getConnection();

    await executeQuery(
      `UPDATE tbl_reglas SET
        reg_ipc = ?,
        reg_margen = ?,
        reg_const = ?,
        reg_tenant_id = ?,
        reg_client_id = ?,
        reg_client_secret = ?,
        reg_usuario = ?,
        reg_biblioteca = ?,
        reg_carpeta = ?,
        reg_dias_ven_cotizacion = ?,
        reg_horario_inicio = ?,
        reg_horario_fin = ?,
        reg_anticipacion_minima_reagendar = ?,
        reg_anticipacion_minima_cancelar = ?,
        reg_permitir_cancelar_mismo_dia = ?,
        reg_notificar_antes_minutos = ?,
        reg_metodos_notificacion = ?,
        reg_max_sesiones_dia = ?,
        reg_habilitar_whatsapp = ?,
        reg_whatsapp_token = ?,
        reg_whatsapp_numero = ?,
        reg_habilitar_sms = ?,
        reg_sms_apikey = ?,
        reg_usu_act = ?,
        reg_numero_principal = ?,
        reg_otro_numero = ?,
        reg_habilitar_cron_recordatorio = ?,
        reg_recordar_n_dias_antes = ?,
        reg_cron_dias_anticipacion = ?,
        reg_recordar_mismo_dia = ?,
        reg_cron_horas_anticipacion = ?,
        reg_habilitar_correo = ?,
        reg_fec_act = CURRENT_TIMESTAMP
      WHERE reg_id = 1`,
      [
        ipc ?? null,
        margen ?? null,
        constante ?? null,
        tenantId ?? null,
        clientId ?? null,
        clientSecret ?? null,
        usuario ?? null,
        biblioteca ?? null,
        carpeta ?? null,
        diasVenCotizacion ?? null,
        horarioInicio ?? null,
        horarioFin ?? null,
        anticipacionMinimaReagendar ?? null,
        anticipacionMinimaCancelar ?? null,
        permitirCancelarMismoDia ? 1 : 0,
        notificarAntesMinutos ?? null,
        Array.isArray(metodosNotificacion)
          ? metodosNotificacion.join(",")
          : null,
        maxSesionesPorDia ?? null,
        habilitarWhatsapp ?? 0,
        whatsappToken ?? null,
        whatsappNumero ?? null,
        habilitarSMS ?? 0,
        smsAPIKey ?? null,
        usuAct ?? null,
        numeroPrincipal ?? null,
        otroNumero ?? null,
        habilitarCronRecordatorio ?? 0,
        recordarNDiasAntes ?? 0,
        cronDiasAnticipacion ?? null,
        recordarMismoDia ?? 0,
        cronHorasAnticipacion ?? null,
        habilitarCorreo ?? null,
      ],
      connection
    );

    return res
      .status(200)
      .json({ message: "Configuración actualizada correctamente" });
  } catch (err) {
    next(err);
  } finally {
    releaseConnection(connection);
  }
};

export const getModules = async (_req, res, next) => {
  let connection = null;
  try {
    connection = await getConnection();

    const resultsQuery = await executeQuery(
      `SELECT mod_id id, mod_nombre nombre FROM tbl_modulos`,
      [],
      connection
    );
    return res.status(200).json(resultsQuery);
  } catch (err) {
    next(err);
  } finally {
    releaseConnection(connection);
  }
};

//FUNCIÓN PARA CONSULTAR LAS REGLAS DE LA APP
export const getReglas = async () => {
  let connection = null;
  try {
    connection = await getConnection();

    const query = `
            SELECT 
                reg_id AS id,
                reg_ipc AS ipc,
                reg_margen AS margen,
                reg_const AS constante,
                reg_tenant_id AS tenantId,
                reg_client_id AS clientId,
                reg_client_secret AS clientSecret,
                reg_usuario AS usuario,
                reg_biblioteca AS biblioteca,
                reg_sitio AS sitio,
                reg_ruta AS ruta,
                reg_carpeta AS carpeta,
                reg_dias_ven_cotizacion AS diasVencimientoCotizacion,
                reg_usu_act AS usuarioActualizacion,
                reg_fec_act AS fechaActualizacion,
                reg_horario_inicio AS horarioInicio,
                reg_horario_fin AS horarioFin,
                reg_anticipacion_minima_reagendar AS anticipacionMinimaReagendar,
                reg_permitir_cancelar_mismo_dia AS permitirCancelarMismoDia,
                reg_notificar_antes_minutos AS notificarAntesMinutos,
                reg_metodos_notificacion AS metodosNotificacion,
                reg_max_sesiones_dia AS maxSesionesDia,
                reg_habilitar_whatsapp AS habilitarWhatsapp,
                reg_whatsapp_token AS whatsappToken,
                reg_whatsapp_numero AS whatsappNumero,
                reg_habilitar_sms AS habilitarSms,
                reg_sms_apikey AS smsApiKey,
                reg_numero_principal AS numeroPrincipal,
                reg_otro_numero AS otroNumero,
                reg_anticipacion_minima_cancelar AS anticipacionMinimaCancelar,
                reg_habilitar_correo AS habilitarCorreo
            FROM tbl_reglas;
        `;

    const [rows] = await connection.query(query);

    return rows; // Retorna los datos como un arreglo de objetos
  } catch (error) {
    throw new Error(`Error al consultar las reglas: ${error.message}`);
  } finally {
    if (connection) {
      connection.release();
    }
  }
};
