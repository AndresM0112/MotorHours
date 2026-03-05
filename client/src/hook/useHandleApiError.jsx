import { useCallback, useContext } from "react";
import { ToastContext } from "../context/toast/ToastContext";
import { AuthContext } from "../context/auth/AuthContext"; // Ajusta la ruta si es necesario

const useHandleApiError = () => {
    const { showError } = useContext(ToastContext);
    const { setVisible } = useContext(AuthContext);

    const handleApiError = useCallback(
        (error) => {
            if (error?.response) {
                const status = error.response.status;
                const data = error.response.data;
                function getErrorMessage(defaultMessage) {
                    return data && data.message ? data.message : defaultMessage;
                }

                switch (status) {
                    case 400:
                        showError(getErrorMessage("Solicitud incorrecta"));
                        break;
                    case 401:
                        showError(getErrorMessage("No autorizado"));
                        setVisible(true);
                        break;
                    case 403:
                        showError(getErrorMessage("Prohibido"));
                        break;
                    case 404:
                        showError(getErrorMessage("API no encontrada"));
                        break;
                    case 422:
                        showError(getErrorMessage("Error en los datos enviados"));
                        break;
                    case 429:
                        showError(
                            getErrorMessage(
                                "Haz realizados demasidas peticiones, por favor vuelve a intentarlo despues"
                            )
                        );
                        break;
                    case 500:
                        showError(getErrorMessage("Error interno del servidor"));
                        break;
                    case 502:
                        showError(getErrorMessage("Bad Gateway"));
                        break;
                    case 503:
                        showError(getErrorMessage("Servicio no disponible"));
                        break;
                    case 504:
                        showError(getErrorMessage("Gateway Timeout"));
                        break;

                    case "ERR_NETWORK_CHANGED":
                        showError(
                            "Hay un problema de red o interrupción en la conexión a internet"
                        );
                        break;
                    default:
                        showError(getErrorMessage("Error en la respuesta del servidor"));
                        break;
                }
            } else if (error?.request) {
                // El error ocurrió al hacer la solicitud pero no se recibió una respuesta
                showError("No se recibió respuesta del servidor");
            } else {
                // Errores que ocurren en la configuración de la solicitud
                const errorMessage = error.message || "Error desconocido";

                if (errorMessage.includes("ECONNREFUSED")) {
                    showError("Conexión rechazada por el servidor");
                } else if (errorMessage.includes("ENOTFOUND")) {
                    showError("Servidor no encontrado");
                } else {
                    showError(errorMessage);
                }
            }
        },
        [showError, setVisible]
    );

    return handleApiError;
};

export default useHandleApiError;
