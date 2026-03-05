import dotenv from "dotenv";
import nodemailer from "nodemailer";
import Imap from "imap-simple";
import MailComposer from "nodemailer/lib/mail-composer/index.js";
import { checkEmailBounces } from "./checkEmailBounces.js";
import { nameAppMail } from "../../common/constants/app.constants.js";

dotenv.config();

const FROM_MAIL = `${nameAppMail} <${process.env.MAIL_ALIAS_USER}>`;

const transporter = nodemailer.createTransport({
  host: process.env.MAIL_HOST,
  port: parseInt(process.env.MAIL_PORT),
  secure: true,
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS,
  },
});

export async function sendTestEmail() {
  try {
    const info = await transporter.sendMail({
      from: "Pruebas <admin.soportica@pavasapps.com>",
      to: "programador@pavas.co",
      subject: "Correo de prueba",
      text: "Este es un correo de prueba enviado desde el sistema.",
      html: "<p>Este es un <b>correo de prueba</b> enviado desde el sistema.</p>",
    });

    const messageId = info.messageId?.replace(/^<|>$/g, "");

    console.log("Correo enviado con messageId:", messageId);

    await new Promise((res) => setTimeout(res, 5000)); // esperar posibles rebotes

    const bounces = await checkEmailBounces(messageId);

    if (bounces.length === 0) {
      console.log("✅ No se detectaron rebotes.");
      return;
    }

    console.log(`⚠️ Se detectaron ${bounces.length} rebotes para este envío:`);

    for (const bounce of bounces) {
      console.log(`- A: ${bounce.to} | Fecha: ${bounce.date}`);
    }
  } catch (error) {
    console.error("Error al enviar correo:", error);
  }
}

export async function sendEmail({
  to,
  subject,
  text = "",
  html = "",
  attachments = [],
  copyTo = [],
  replyTo = "",
}) {
  if (!to || !subject) {
    return { success: false, error: "Faltan destinatario o asunto." };
  }

  // const bounces = await checkEmailBounces(messageId);

  // if (bounces.length === 0) {
  //   console.log("✅ No se detectaron rebotes.");
  //   return;
  // }

  // console.log(`⚠️ Se detectaron ${bounces.length} rebotes para este envío:`);

  // for (const bounce of bounces) {
  //   console.log(`- A: ${bounce.to} | Fecha: ${bounce.date}`);
  // }

  try {
    const mailOptions = {
      from: FROM_MAIL,
      to,
      subject,
    };

    if (text) mailOptions.text = text;
    if (html) mailOptions.html = html;
    if (attachments.length > 0) mailOptions.attachments = attachments;
    if (copyTo.length > 0) mailOptions.cc = copyTo;
    if (replyTo) mailOptions.replyTo = replyTo;

    const info = await transporter.sendMail(mailOptions);

    await saveToSent(mailOptions);

    console.log("Correo enviado:", info.messageId);

    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("Error al enviar el correo:", error);
    return { success: false, error: error.message || error };
  }
}

async function saveToSent(mailOptions) {
  try {
    const rawMessage = await new MailComposer(mailOptions).compile().build();

    const config = {
      imap: {
        user: process.env.MAIL_USER,
        password: process.env.MAIL_PASS,
        host: process.env.MAIL_HOST_IMAP,
        port: parseInt(process.env.MAIL_PORT_IMAP),
        tls: true,
        authTimeout: 5000,
      },
    };

    const connection = await Imap.connect(config);

    await connection.append(rawMessage, { mailbox: "INBOX.Sent" });
    await connection.end();
  } catch (err) {
    console.error("No se pudo guardar en 'Enviados':", err.message);
  }
}
