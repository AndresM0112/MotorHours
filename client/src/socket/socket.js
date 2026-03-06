import { io } from "socket.io-client";

// Namespace y URL del socket
const NAMESPACE = "/socket/mth";
const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || process.env.REACT_APP_API_URL || "http://localhost:3000";



// Inicializar socket
const socket = io(`${SOCKET_URL}${NAMESPACE}`, {
    transports: ["websocket"],
    autoConnect: true,
});

console.log("SOCKET_URL:", SOCKET_URL, "NAMESPACE:", NAMESPACE);
console.log("[SOCK] uri:", socket.io.uri);

// Detecta conexión
socket.on("connect", () => {
    console.log("Socket conectado:", socket.id);
    console.log("[CLIENT] conectado ✅ id:", socket.id);
    console.log("[CLIENT] transport usado:", socket.io.engine.transport.name);
});

socket.io.on("reconnect_attempt", (n) => {
  console.log("[SOCK] reconnect_attempt #", n, "transports:", socket.io.opts.transports);
});

socket.io.on("error", (err) => {
  console.log("[SOCK.IO MANAGER error]", err?.message || err);
});

// Detecta errores
socket.on("connect_error", (err) => {
    console.error("Error de conexión socket:", err.message);
    console.log("[SOCK] connect_error:", err?.message, "code:", err?.code, "stack:", err?.stack);
  console.log("[SOCK] last transport tried:", socket.io?.engine?.transport?.name);
});

// Detecta desconexión
socket.on("disconnect", (reason) => {
    console.warn("Socket desconectado:", reason);
});


socket.on("tickets_evidencias_procesadas", (payload) => {
  console.log("[Socket] tickets_evidencias_procesadas:", payload);
});

export default socket;
