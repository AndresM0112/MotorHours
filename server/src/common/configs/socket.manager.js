let io = null;

export const setIO = (socketInstance) => {
  io = socketInstance;
};

export const getIO = () => {
  if (!io) {
    throw new Error("Socket.IO no inicializado.");
  }
  return io;
};

export const tryGetIO = () => {
  try {
    return getIO();
  } catch {
    return { emit: () => {} }; // no-op
  }
};
