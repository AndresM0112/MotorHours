import dotenv from "dotenv";
dotenv.config();

import http from "http";
import { app } from "./app.js";
import { initSocket } from "./socket.js";

const server = http.createServer(app);

const PORT = process.env.PORT || 5042;

// Inicializar sockets con Redis
initSocket(server);

server.listen(PORT, () => {
  console.log(`Servidor corriendo en el puerto ${PORT}`);
});

export { server };
