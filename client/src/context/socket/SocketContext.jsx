import React, { createContext, useContext, useEffect } from "react";
import { urlSocket, pathSocket } from "@utils/converAndConst";
import io from "socket.io-client";

const socketConfig = io(urlSocket, {
    forceNew: true,
    transports: ["polling"],
    withCredentials: true,
    path: pathSocket,
    reconnectionAttempts: 3,
});

// Crea un contexto para los sockets
const SocketContext = createContext();

// Crea un proveedor de contexto que envuelve a tus componentes
export const SocketProvider = ({ children }) => {
    useEffect(() => {
        return () => socketConfig.close(); // Cierra la conexión cuando el componente se desmonta
    }, []);

    return <SocketContext.Provider value={socketConfig}>{children}</SocketContext.Provider>;
};

// Hook personalizado para usar el contexto de socket
export const useSocket = () => useContext(SocketContext);
