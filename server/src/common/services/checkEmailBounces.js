import dotenv from "dotenv";
import Imap from "imap-simple";

dotenv.config();

export async function checkEmailBounces(messageId) {
  const config = {
    imap: {
      user: process.env.MAIL_USER,
      password: process.env.MAIL_PASS,
      host: "imap.hostinger.com",
      port: 993,
      tls: true,
      authTimeout: 5000,
      tlsOptions: {
        rejectUnauthorized: false,
      },
    },
  };

  try {
    const connection = await Imap.connect(config);
    await connection.openBox("INBOX");

    const since = new Date(Date.now() - 3 * 60 * 1000).toISOString(); // últimos 3 minutos
    const searchCriteria = ["UNSEEN", ["SINCE", since]];
    const fetchOptions = {
      bodies: ["HEADER", "TEXT"],
      markSeen: true,
    };

    const messages = await connection.search(searchCriteria, fetchOptions);
    const bounces = [];

    for (const message of messages) {
      const headers = message.parts.find((p) => p.which === "HEADER")?.body;
      const subject = headers?.subject?.[0] || "";
      const textBody =
        message.parts.find((p) => p.which === "TEXT")?.body || "";

      const isBounce =
        (subject.includes("Undelivered") ||
          subject.includes("Mail Delivery") ||
          textBody.includes("Delivery has failed") ||
          textBody.includes("User unknown") ||
          (headers && headers["x-failed-recipients"])) &&
        (textBody.includes(messageId) || subject.includes(messageId));

      if (isBounce) {
        bounces.push({
          subject,
          to: headers["x-failed-recipients"]?.[0] || "desconocido",
          date: headers.date?.[0] || new Date().toISOString(),
          rawText: textBody,
        });
      }
    }

    await connection.end();
    return bounces;
  } catch (err) {
    console.error("Error al revisar rebotes:", err.message);
    return [];
  }
}
