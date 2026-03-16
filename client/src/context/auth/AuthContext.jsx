import React, { createContext, useContext, useEffect, useReducer, useState } from "react";
import { authReducer } from "./authReducer";
import { ToastContext } from "../toast/ToastContext";
import Axios from "axios";
import { headers, ruta } from "@utils/converAndConst";
import { loginAPI, validateTokenAPI } from "@api/requests";
// import { Dialog } from "primereact/dialog";
// import { useSocket } from "@context/socket/SocketContext";
import Cookies from "js-cookie";
import socket from "socket/socket";

const initialState = {
    autentificado: false,
    usuFoto: null,
    idusuario: null,
    nombreusuario: null,
    perfil: null,
    agenda: null,
    instructor: null,
    permisos: [],
    cambioclave: null,
    stores: [],
    ventanas: [],
    selectedStore: localStorage.getItem("selectedStore")
        ? JSON.parse(localStorage.getItem("selectedStore"))
        : null,
};

export const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
    const [state, dispatch] = useReducer(authReducer, initialState);
    const { showError } = useContext(ToastContext);
    const [visible, setVisible] = useState(false);
    // const socket = useSocket();

    // Validar el token
    useEffect(() => {
        const usuId = Number(Cookies.get("idMOTORHOURS"));
        const currentPath = window.location.pathname;

        if (!usuId > 0) {
            if (currentPath !== "/MOTORHOURS/" && currentPath !== "/MOTORHOURS" && currentPath !== "/") {
                // alert("ALERTA DE CIERRE DE SESION");
                logout();
            }
            return;
        }

        let timeoutId;

        const validarToken = async () => {
            try {
                await validateTokenAPI();

                dispatch({
                    type: "login",
                    payload: {
                        autentificado: Cookies.get("autentificadoMOTORHOURS") === "true",
                        usuId: Cookies.get("idMOTORHOURS"),
                        nombre: Cookies.get("usuarioMOTORHOURS"),
                        usuFoto: localStorage.getItem("usuFoto"), // Cambiado para tomar la foto del localStorage
                        usuario: Cookies.get("usuarioMOTORHOURS"),
                        correo: Cookies.get("correoMOTORHOURS"),
                        telefono: Cookies.get("telefonoMOTORHOURS"),
                        documento: Cookies.get("documentoMOTORHOURS"),
                        perfil: Number(Cookies.get("perfilMOTORHOURS")),
                        permisos: JSON.parse(Cookies.get("permisosMOTORHOURS")),
                        // ventanas: JSON.parse(Cookies.get("ventanasMOTORHOURS")) || [],
                        cambioclave: localStorage.getItem("cambioclave"),
                    },
                });
            } catch (error) {
                console.log({ error });

                timeoutId = setTimeout(() => {
                    alert("ALERTA DE CIERRE DE SESION");
                    logout();
                    setVisible(false);
                }, 5000);
            }
        };

        validarToken();
        return () => clearTimeout(timeoutId);
    }, [visible, showError]);

    // Actualizar permisos desde el API
    useEffect(() => {
        const abortController = new AbortController();
        const usuId = Number(Cookies.get("idMOTORHOURS"));

        if (usuId > 0) {
            Axios.get("api/app/get_permissions_user", {
                params: { usuId },
                headers: {
                    ...headers,
                    Authorization: `Bearer ${Cookies.get("tokenMOTORHOURS")}`,
                },
            })
                .then(({ data }) => {
                    console.log(data);

                    dispatch({ type: "setPermisos", payload: data.permissions });
                    Cookies.set("permisosMOTORHOURS", JSON.stringify(data.permissions));

                    dispatch({ type: "setVentanas", payload: data.windows });
                    Cookies.set("ventanasMOTORHOURS", JSON.stringify(data.windows));
                })
                .catch((error) => {
                    if (error.response) {
                        if (error.response.status === 404) return showError("Api no encontrada");
                        return showError(error.response?.data.message);
                    }
                    showError(error);
                });
        }

        return () => abortController.abort();
    }, [showError]);

    useEffect(() => {
        if (!socket) return;

        const usuId = Number(Cookies.get("idMOTORHOURS"));

        // Unirse al room privado
        if (socket.connected && usuId) {
            socket.emit("joinRoom", `user:${usuId}`);
        }

        socket.on("connect", () => {
            if (usuId) {
                socket.emit("joinRoom", `user:${usuId}`);
                console.log("Re-join room", `user:${usuId}`);
            }
        });

        const handleUpdatePermissions = ({ usuId: eventUsuId, updatedPermissions }) => {
            const loggedId = Number(Cookies.get("idMOTORHOURS"));
            if (eventUsuId === loggedId) {
                console.log("Permisos actualizados por socket:", updatedPermissions);

                dispatch({ type: "setPermisos", payload: updatedPermissions });
                Cookies.set("permisosMOTORHOURS", JSON.stringify(updatedPermissions));
            }
        };

        socket.on("update-permissions", handleUpdatePermissions);

        return () => {
            socket.off("connect");
            socket.off("update-permissions", handleUpdatePermissions);
        };
    }, []);

    const login = async (usuario, clave) => {
        try {
            const { data } = await loginAPI(usuario, clave);
            const {
                usuId,
                usuFoto,
                nombre,
                perfil,
                agenda,
                instructor,
                correo,
                documento,
                telefono,
                token,
                permisos,
                ventanas,
                cambioclave,
            } = data;

            dispatch({
                type: "login",
                payload: { ...data, autentificado: true, usuFoto },
            });

            Cookies.set("idMOTORHOURS", usuId);
            Cookies.set("usuarioMOTORHOURS", nombre);
            localStorage.setItem("usuFoto", usuFoto);
            Cookies.set("usuario", usuario);
            Cookies.set("correoMOTORHOURS", correo);
            Cookies.set("telefonoMOTORHOURS", telefono);
            Cookies.set("documentoMOTORHOURS", documento);
            Cookies.set("perfilMOTORHOURS", perfil);
            Cookies.set("tokenMOTORHOURS", token);
            Cookies.set("autentificadoMOTORHOURS", true);
            Cookies.set("permisosMOTORHOURS", JSON.stringify(permisos));
            Cookies.set("ventanasMOTORHOURS", JSON.stringify(ventanas));
            localStorage.setItem("cambioclave", cambioclave);

            return data;
        } catch (error) {
            Cookies.remove("autentificadoMOTORHOURS");
            localStorage.setItem("cambioclave", 0);
            if (error.response) {
                if (error.response.status === 404) return showError("Api no encontrada");
                return showError(error.response?.data.message);
            }
        }
    };

    const logout = async () => {
        dispatch({ type: "logout" });

        Cookies.remove("idMOTORHOURS");
        Cookies.remove("usuarioMOTORHOURS");
        Cookies.remove("autentificadoMOTORHOURS");
        Cookies.remove("perfilMOTORHOURS");
        Cookies.remove("correoMOTORHOURS");
        Cookies.remove("documentoMOTORHOURS");
        Cookies.remove("telefonoMOTORHOURS");
        Cookies.remove("perfilMOTORHOURS");
        Cookies.remove("permisosMOTORHOURS");
        Cookies.remove("ventanasMOTORHOURS");
        Cookies.remove("tokenMOTORHOURS");
        Cookies.remove("fotoMOTORHOURS");
        localStorage.removeItem("cambioclave");
        // localStorage.removeItem("sc-last-activity-time");
        window.location.href = ruta;
    };

    const setSelectedStore = (storeId) => {
        dispatch({ type: "setSelectedStore", payload: storeId });
        localStorage.setItem("selectedStore", JSON.stringify(storeId)); // Guardamos en localStorage
    };
    return (
        <AuthContext.Provider
            value={{
                ...state,
                login,
                logout,
                setVisible,
                setSelectedStore,
            }}
        >
            {children}
            {/* <CloseApp visible={visible} /> */}
        </AuthContext.Provider>
    );
};
