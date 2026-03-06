// import { Server as SocketIOServer } from "socket.io";
// import { createAdapter } from "@socket.io/redis-adapter";
// import Redis from "ioredis";

// let io = null;

// export function initSocket(server) {
//   io = new SocketIOServer(server, {
//     cors: {
//       origin: "*", // Cambia a tu frontend real si es necesario
//     },
//   });

//   // Configuración del cliente Redis para pub/sub
//   const pubClient = new Redis({
//     host: process.env.REDIS_HOST || "localhost",
//     port: Number(process.env.REDIS_PORT) || 6379,
//     password: process.env.REDIS_PASSWORD || undefined,
//   });

//   const subClient = pubClient.duplicate();

//   io.adapter(createAdapter(pubClient, subClient));

//   // Namespace para trazabilidad de La Mayorista
//   const motorhoursNamespace = io.of("/socket/mth");

//   motorhoursNamespace.adapter.on("join-room", (room, id) => {
//     console.log(`[Adapter] Cliente ${id} unido a room ${room}`);
//   });

//   motorhoursNamespace.on("connection", (socket) => {
//     console.log("[La Mayorista] Cliente conectado:", socket.id);

//     // Cliente se une a su sala privada (para notificaciones)
//     socket.on("joinRoom", (room) => {
//       socket.join(room);
//       console.log(`[Socket] ${socket.id} se unió a sala ${room}`);
//     });

//     // Cliente puede salir de la sala si hace logout
//     socket.on("leaveRoom", (room) => {
//       socket.leave(room);
//       console.log(`[Socket] ${socket.id} salió de sala ${room}`);
//     });

//     // Ejemplo de evento general
//     socket.on("mensaje", (data) => {
//       console.log("[La Mayorista] Mensaje recibido:", data);
//       motorhoursNamespace.emit("mensaje", data); // broadcast global
//     });

//     socket.on("disconnect", () => {
//       console.log("[La Mayorista] Cliente desconectado:", socket.id);
//     });
//   });

//   // Mostrar todos los namespaces disponibles
//   console.log("Namespaces disponibles:", Array.from(io._nsps.keys()));

//   return io;
// }

// export function getIO() {
//   if (!io) throw new Error("Socket.io no inicializado");
//   return io;
// }

// socket.js (backend La Mayorista)
import { Server as SocketIOServer } from "socket.io";
import { setIO } from "./src/common/configs/socket.manager.js"; // 👈 IMPORTANTE

export function initSocket(server) {
  // Crear instancia de Socket.IO
  const io = new SocketIOServer(server, {
    cors: {
      origin: [
        "http://localhost:3000",
        "http://localhost:3001",
        "https://pavastecnologia.com",
      ],
      methods: ["GET", "POST", "PUT", "DELETE"],
      credentials: true,
    },
    // path: "/socket.io", // opcional, default
  });

  // 🔴 REGISTRAR LA INSTANCIA GLOBALMENTE (MISMO PATRÓN QUE PONTO)
  setIO(io);

  // Namespace para Motorhours
  const motorhoursNamespace = io.of("/socket/mth");

  motorhoursNamespace.adapter.on("join-room", (room, id) => {
    console.log(`[Adapter] Cliente ${id} unido a room ${room}`);
  });

  motorhoursNamespace.on("connection", (socket) => {
    console.log("[Motorhours] Cliente conectado:", socket.id);

    socket.on("joinRoom", (room) => {
      socket.join(room);
      console.log(`[Socket] ${socket.id} se unió a sala ${room}`);
    });

    socket.on("leaveRoom", (room) => {
      socket.leave(room);
      console.log(`[Socket] ${socket.id} salió de sala ${room}`);
    });

    socket.on("mensaje", (data) => {
      console.log("[Motorhours] Mensaje recibido:", data);
      motorhoursNamespace.emit("mensaje", data);
    });

    socket.on("disconnect", () => {
      console.log("[Motorhours] Cliente desconectado:", socket.id);
    });
  });

  console.log("Namespaces disponibles:", Array.from(io._nsps.keys()));

  return io;
}
