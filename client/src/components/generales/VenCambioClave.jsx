import React, { useContext } from "react";
import { AuthContext } from "@context/auth/AuthContext";
//PRIMERECT
import { Dialog } from "primereact/dialog";
// COMPONENTES
import { ActualizarClave } from "./ActualizarClave";

export const VenCambioClave = ({ visible }) => {
    const { nombreusuario } = useContext(AuthContext);

    return (
        <Dialog
            closeOnEscape={false}
            draggable
            header="Solicitud actualización contraseña"
            visible={visible}
            closable={false}
            style={{ width: 480 }}
        >
            <div className="grid p-fluid">
                <div className="col-12" style={{ cursor: "pointer" }}>
                    <div className="card mb-0 bg-cyan-500">
                        <div className="flex justify-content-between mb-3">
                            <div>
                                <h4 className="block text-blue-50 font-medium mb-3">Importante!</h4>
                                <div className="text-blue-50 font-medium">
                                    Saludos {nombreusuario}, por seguridad se recomienda hacer
                                    cambio de su contraseña por una nueva
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <ActualizarClave />
            </div>
        </Dialog>
    );
};
