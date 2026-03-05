export const notifyUserTemplate = ({
  asunto = "Notificación",
  nombreUsuario = "",
  mensaje = "",
  tabla = null,
  botones = [],
  logoUrl = "https://pavastecnologia.com/img/logo-movico.png",
  footer = "Powered By Pavas.sas",
  theme = "dark", // "dark" o "light"
}) => {
  // Paleta de colores según el tema
  const colors =
    theme === "light"
      ? {
          bodyBg: "#f8fafc",
          containerBg: "#fff",
          text: "#222",
          headerTitle: " #e6edf3",
          tableBorder: "#e0e7ef",
          tableThBg: "#f4f8fb",
          tableThText: "#444",
          tableEven: "#fafbfc",
          footerBg: "#f8fafc",
          footerText: "#888",
          contentText: "#222",
        }
      : {
          bodyBg: "#0e1117",
          containerBg: "#181e26",
          text: "#e6edf3",
          headerTitle: " #e6edf3",
          tableBorder: "#e0e7ef",
          tableThBg: "#23272f",
          tableThText: "#e6edf3",
          tableEven: "#23272f",
          footerBg: "#181e26",
          footerText: "#888",
          contentText: "#e6edf3",
        };

  const tablaHtml =
    tabla && tabla.length
      ? `
            <table class="info-table">
                <thead>
                    <tr>
                        ${Object.keys(tabla[0])
                          .map((col) => `<th>${col}</th>`)
                          .join("")}
                    </tr>
                </thead>
                <tbody>
                    ${tabla
                      .map(
                        (row) =>
                          `<tr>${Object.values(row)
                            .map((val) => `<td>${val}</td>`)
                            .join("")}</tr>`
                      )
                      .join("")}
                </tbody>
            </table>
        `
      : "";

const botonesHtml =
    botones && botones.length
        ? `
                    <div class="action-buttons">
                            ${botones
                                .map(
                                    (btn) => `
                                            <a href="${btn.url}" 
                                                 class="action-btn"
                                                 style="
                                                        background: ${btn.color || "#ff6412"};
                                                        min-width: 120px;
                                                        padding: 14px 32px;
                                                        margin: 8px 6px;
                                                        border: none;
                                                        border-radius: 10px;
                                                        font-size: 1.07rem;
                                                        font-weight: 600;
                                                        letter-spacing: 0.02em;
                                                        box-shadow: 0 2px 12px rgba(255,100,18,0.08);
                                                        transition: background 0.18s, transform 0.18s;
                                                        display: inline-block;
                                                        text-align: center;
                                                        color: #fff !important;
                                                        text-decoration: none;
                                                 "
                                                 onmouseover="this.style.background='${btn.hoverColor || "#ff7f32"}';this.style.transform='translateY(-2px) scale(1.03)';"
                                                 onmouseout="this.style.background='${btn.color || "#ff6412"}';this.style.transform='none';"
                                            >
                                                    ${btn.label}
                                            </a>
                                    `
                                )
                                .join("")}
                    </div>
            `
        : "";

  return `<!DOCTYPE html>
<html lang="es">
    <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <style>
            body {
                background-color: ${colors.bodyBg};
                margin: 0;
                padding: 0;
                font-family: Arial, sans-serif;
                color: ${colors.text};
            }
            .container {
                max-width: 600px;
                background-color: ${colors.containerBg};
                border-radius: 16px;
                margin: 32px auto;
                box-shadow: 0 4px 16px rgba(0,0,0,0.07);
                overflow: hidden;
            }
            .header {
                background: linear-gradient(90deg, #ff6412 0%, #ffb347 100%);
                padding: 18px 0 12px 0;
                text-align: center;
            }
            .logo {
                width: 320px;
                margin-bottom: 8px;
            }
            .title {
                font-size: 1.3rem;
                font-weight: 700;
                color: ${colors.headerTitle};
                margin: 0;
            }
            .content {
                padding: 28px 24px 18px 24px;
                color: ${colors.contentText};
                font-size: 1.05rem;
                line-height: 1.7;
            }
            .info-table {
                width: 100%;
                border-collapse: collapse;
                margin: 18px 0;
                font-size: 0.98rem;
            }
            .info-table th, .info-table td {
                border: 1px solid ${colors.tableBorder};
                padding: 8px 10px;
                text-align: left;
            }
            .info-table th {
                background: ${colors.tableThBg};
                color: ${colors.tableThText};
                font-weight: 600;
            }
            .info-table tr:nth-child(even) {
                background: ${colors.tableEven};
            }
            .action-buttons {
                margin: 24px 0 10px 0;
                text-align: center;
            }
            .action-btn {
                display: inline-block;
                margin: 0 8px;
                padding: 12px 28px;
                border-radius: 8px;
                color: #fff !important;
                font-weight: 600;
                font-size: 1rem;
                text-decoration: none;
                transition: background 0.2s;
                box-shadow: 0 2px 8px rgba(88,101,242,0.08);
            }
            .footer {
                font-size: 0.93rem;
                color: ${colors.footerText};
                background: ${colors.footerBg};
                padding: 18px 12px 18px 12px;
                text-align: center;
                border-top: 1px solid ${colors.tableBorder};
            }
            @media (max-width: 650px) {
                .container { margin: 0; border-radius: 0; }
                .content { padding: 18px 6vw 12px 6vw; }
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <img src="${logoUrl}" alt="Logo" class="logo" />
                
            </div>
            <div class="content">
                <p>Hola <strong>${nombreUsuario}</strong>,</p>
                <p>${mensaje}</p>
                ${tablaHtml}
                ${botonesHtml}
            </div>
            <div class="footer">
                ${footer}
            </div>
        </div>
    </body>
</html>
`;
};
