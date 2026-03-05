import moment from "moment-timezone";
import { notifyUserTemplate } from "../common/templates/notifyUserTemplate.js";
import { getConnection } from "../common/configs/db.config.js";
import { sendEmail } from "../common/services/mailerService.js";

const recordatorios_citas = async () => {
  let connection;
  try {
    connection = await getConnection();

    // Obtiene reglas de recordatorio
    const [reglasRows] = await connection.execute(
      `SELECT 
        reg_habilitar_cron_recordatorio,
        reg_recordar_n_dias_antes,
        reg_cron_dias_anticipacion,
        reg_recordar_mismo_dia,
        reg_cron_horas_anticipacion
      FROM tbl_reglas WHERE reg_id = 1`
    );
    const reglas = reglasRows[0] || {};

    if (!reglas.reg_habilitar_cron_recordatorio) return;

    const horaActual = moment().tz("America/Bogota").format("H");
    const fechaActual = moment().tz("America/Bogota").format("YYYY-MM-DD");
    const diaSemana = moment().tz("America/Bogota").format("dddd");

    // Solo días hábiles y horas laborales
    if (
      horaActual >= 7 &&
      horaActual <= 20
      // &&
      // diaSemana !== "sábado" &&
      // diaSemana !== "domingo"
    ) {
      let citas = [];

      // Recordar N días antes
      if (
        reglas.reg_recordar_n_dias_antes &&
        reglas.reg_cron_dias_anticipacion
      ) {
        const fechaTarget = moment()
          .tz("America/Bogota")
          .add(reglas.reg_cron_dias_anticipacion, "days")
          .format("YYYY-MM-DD");
        const [citasNDias] = await connection.execute(
          `SELECT 
              c.cit_id,
              c.cit_fecha,
              c.cit_hora_inicio,
              p.usu_nombre AS paciente,
              p.usu_correo AS email_paciente,
              s.sac_nombre AS sesion_nombre,
              s.sac_descripcion AS sesion_descripcion
            FROM tbl_citas c
            JOIN tbl_usuarios p ON c.usu_id = p.usu_id
            JOIN tbl_sesion_actividad s ON c.sac_id = s.sac_id
            WHERE 
              c.cit_fecha = ?
              AND c.esc_id IN (1,4)
              AND p.usu_correo IS NOT NULL
          `,
          [fechaTarget]
        );
        citas = citas.concat(citasNDias);
      }

      // Recordar el mismo día N horas antes
      if (reglas.reg_recordar_mismo_dia && reglas.reg_cron_horas_anticipacion) {
        const ahora = moment().tz("America/Bogota").format("HH:mm:ss");
        const horaLimite = moment()
          .tz("America/Bogota")
          .add(reglas.reg_cron_horas_anticipacion, "hours")
          .format("HH:mm:ss");
        const [citasHoy] = await connection.execute(
          `SELECT 
              c.cit_id,
              c.cit_fecha,
              c.cit_hora_inicio,
              p.usu_nombre AS paciente,
              p.usu_correo AS email_paciente,
              s.sac_nombre AS sesion_nombre,
              s.sac_descripcion AS sesion_descripcion
            FROM tbl_citas c
            JOIN tbl_usuarios p ON c.usu_id = p.usu_id
            JOIN tbl_sesion_actividad s ON c.sac_id = s.sac_id
            WHERE 
              c.cit_fecha = ?
              AND c.cit_hora_inicio >= ?
              AND c.cit_hora_inicio < ?
              AND c.esc_id IN (1,4)
              AND p.usu_correo IS NOT NULL
          `,
          [fechaActual, ahora, horaLimite]
        );
        citas = citas.concat(citasHoy);
      }

      // Elimina duplicados por cit_id
      const citasUnicas = Object.values(
        citas.reduce((acc, cita) => {
          acc[cita.cit_id] = cita;
          return acc;
        }, {})
      );

      for (const cita of citasUnicas) {
        const { paciente, email_paciente, cit_fecha, cit_hora_inicio, cit_id } = cita;

        // Verifica si ya existe un recordatorio para esta cita
        const [alertaExistente] = await connection.execute(
          `SELECT 1 FROM tbl_alertas WHERE cit_id = ? AND tipo = ? LIMIT 1`,
          [cit_id, 'recordatorio']
        );
        if (alertaExistente.length > 0) {
          // Ya se envió recordatorio para esta cita, saltar
          continue;
        }

        const tabla = []; // en caso de querer recordar algo con detalles en tabla.

        const html = notifyUserTemplate({
          asunto: "Recordatorio de cita",
          nombreUsuario: paciente,
          mensaje: `Le recordamos que tiene una cita agendada con la siguiente información:<br><br>
            <strong>Fecha:</strong> ${cit_fecha}<br>
            <strong>Hora:</strong> ${cit_hora_inicio}<br>
            <strong>Sesión:</strong> ${cita.sesion_nombre || ""}<br>
            <strong>Descripción de la sesión:</strong> ${
              cita.sesion_descripcion || ""
            }<br>
            Por favor, asegúrese de estar disponible en la fecha y hora indicadas.`,
          tabla,
          botones: [],
          logoUrl: "https://www.pavastecnologia.com/img/logo-movico.png",
          footer:
            "Si tienes dudas, contáctanos en <a href='mailto:soporte@pavas.co'>soporte@pavas.co</a>",
        });

        // Cambia aquí el envío de correo
        try {
          await sendEmail({
            to: email_paciente,
            subject: "Recordatorio de cita médica",
            html,
          });
          await connection.execute(
            `INSERT INTO tbl_alertas (ale_nombre, ale_correo, ale_fecha, usu_id, per_id, cit_id, tipo) VALUES(?,?,CURRENT_TIMESTAMP(),?,?,?,?)`,
            ["Recordatorio Cita", email_paciente, null, 0, cit_id, 'recordatorio']
          );
          console.log(`Se envió recordatorio de cita a ${email_paciente}`);
        } catch (err) {
          console.error(
            `Error enviando recordatorio a ${email_paciente}:`,
            err
          );
        }
      }
    }
  } catch (error) {
    console.error(error);
  } finally {
    if (connection) connection.release();
  }
};

export default recordatorios_citas;
