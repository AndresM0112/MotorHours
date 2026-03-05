export const confirmAccountTemplate = ({ nombreUsuario, codigoOTP }) => {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <style>
    body {
      background-color: #0e1117;
      margin: 0;
      padding: 0;
      font-family: Arial, sans-serif;
      color: #e6edf3;
    }
    .container {
      max-width: 500px;
      margin: 40px auto;
      background-color: #181e26;
      border-radius: 12px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.6);
      padding: 30px 25px;
      text-align: center;
    }
    .logo {
      margin-bottom: 25px;
    }
    .logo img {
      max-width: 220px;
    }
    h2 {
      color: #ffffff;
      font-size: 20px;
      margin-bottom: 10px;
    }
    p {
      font-size: 14px;
      color: #c9d1d9;
      line-height: 1.5;
      margin-bottom: 20px;
    }
    .otp-code {
      font-size: 32px;
      font-weight: bold;
      background: #222c3d;
      display: inline-block;
      padding: 12px 24px;
      border-radius: 8px;
      letter-spacing: 8px;
      margin-bottom: 20px;
      color: #58a6ff;
    }
    .footer {
      margin-top: 40px;
      font-size: 12px;
      color: #dddddd;
    }
    .footer a {
      color: #58a6ff;
      text-decoration: none;
    }
    .footer a:hover {
      text-decoration: underline;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo">
      <img src="https://static.wixstatic.com/media/0f30bf_d2a2cc02ab9840ea82733e3d999e91ab~mv2.png" alt="Logo Cliente" />
    </div>
    <h2>Tu código de verificación</h2>
    <p>Hola <strong>${nombreUsuario}</strong>, gracias por registrarte.</p>
    <p>Usa el siguiente código para verificar tu cuenta:</p>
    <div class="otp-code">${codigoOTP}</div>
    <p>Este código expirará en 10 minutos.</p>
    <p>¿No creaste esta cuenta? Puedes ignorar este correo.</p>
    <div class="footer">
      &copy; 2025 Pavas | <a href="mailto:soporte@pavas.co">soporte@pavas.co</a>
    </div>
  </div>
</body>
</html>`;
};
