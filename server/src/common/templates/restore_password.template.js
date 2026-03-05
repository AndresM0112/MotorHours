export const restorePasswordTemplate = ({
  asunto,
  nombreUsuario,
  descripcion,
  linkRecoverPassword,
  codeTemp,
}) => {
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <style>
      body {
        font-family: Arial, sans-serif;
        background-color: #f9f9fb;
        margin: 0;
        padding: 0;
      }

      table {
        width: 100%;
        border-collapse: collapse;
      }

      .container {
        width: 100%;
        max-width: 600px;
        background-color: #ffffff;
        border-radius: 15px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        margin: 0 auto;
        overflow: hidden;
      }

      .header {
        padding: 20px;
        text-align: center;
      }

      .header-gradient {
        background: rgba(255, 100, 18, 1);    
        height: 10px;
        width: 100%;
      }

      .header-title {
        font-size: 16px;
        font-weight: bold;
        color: #4a4a4a;
        margin-top: 10px;
      }

      .code-block {
        background-color: #e4e4e4;
        padding: 15px;
        border-radius: 5px;
        font-size: 16px;
        font-weight: 900;
        text-align: center;
        margin: 20px 0;
      }

      .button {
        background-color: #5865f2;
        color: #ffffff;
        padding: 10px 20px;
        border: none;
        border-radius: 10px;
        font-size: 14px;
        text-align: center;
        cursor: pointer;
        display: inline-block;
      }

      .footer {
        font-size: 12px;
        color: #aaaaaa;
        margin-top: 20px;
        text-align: center;
        padding-bottom: 20px;
      }

      a {
        color: #000000;
        text-decoration: none;
        font-weight: bold;
      }

     
    </style>
  </head>
  <body style="background-color: #f9f9fb; padding: 0; margin: 0">
    <!-- <img
      src="https://www.pavastecnologia.com/img/lamayoristanew.png"
      alt="Soportica Logo"
      width="150"
      style="display: block; margin: 0 auto" /> -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td align="center" style="padding: 20px 0">
          <table
            class="container"
            width="100%"
            cellpadding="0"
            cellspacing="0"
            style="max-width: 600px">
           
            <tr>
              <td>
                <div class="header-gradient"></div>
              </td>
            </tr>
            <tr>
              <td class="header" style="padding: 20px">
                <div class="header-title">${asunto}</div>
              </td>
            </tr>
            <tr>
              <td style="padding: 20px">
                <p>
                  Estimado/a <strong>${nombreUsuario}</strong>, <br /><br />
                  ${descripcion}
                </p>
                <p></p>
                  <strong>1.</strong> Haz clic en el siguiente enlace para crear tu contraseña de
                    acceso:</p>
                  </li>
                  <div class="code-block">
                    <a
                      href="${linkRecoverPassword}"
                      style="color: #000000; text-decoration: none"
                      >Crear contraseña</a
                    >
                  </div>
                
                <p>
                  <strong>2.</strong> Utiliza el siguiente
                  código temporal para validar tu cuenta:
                </p>
                <div class="code-block">${codeTemp}</div>
                <p>
                  Te recomendamos completar este proceso lo antes posible, ya
                  que el enlace y el código caducarán en las próximas 24 horas.
                  Si no has solicitado esta información, por favor ignora este
                  correo.
                </p>
              </td>
            </tr>
          </table>
          <table width="100%" style="margin-top: 20px">
            <tr>
              <td class="footer">
                Copyright © Pavas Stay Connected 2024 <br />Si cree que ha
                recibido este mensaje por error, por favor póngase en contacto
                <br />con nuestro centro de soporte técnico en
                <a href="mailto:soporte@pavas.co">soporte@pavas.co</a>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
`;
};
