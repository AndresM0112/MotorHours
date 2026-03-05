import React, { useContext, useEffect, useState } from "react";
import { AuthContext } from "@context/auth/AuthContext";
import { ToastContext } from "@context/toast/ToastContext";
// PRIMEREACT
import { Dialog } from "primereact/dialog";
import { InputText } from "primereact/inputtext";
import { Accordion, AccordionTab } from "primereact/accordion";
import { classNames } from "primereact/utils";
// OTROS
import { useForm } from "react-hook-form";
import Axios from "axios";
// UTILS
import { headers } from "@utils/converAndConst";
import { ActualizarClave } from "./ActualizarClave";
import Cookies from "js-cookie";

export const VenAjusteCuenta = ({ visible, setVisible }) => {
    const appendTarget = typeof window !== 'undefined' ? document.body : null;
    const { nombreusuario, idusuario } = useContext(AuthContext);
    const { showSuccess, showError, showInfo } = useContext(ToastContext);

    const {
        register,
        handleSubmit,
        setValue,
        getValues,
        reset,
        formState: { errors },
    } = useForm({
        defaultValues: {
            nombre: "",
            apellido: "",
            usuario: "",
            correo: "",
        },
    });

    const [originalData, setOriginalData] = useState({
        nombre: "",
        apellido: "",
        usuario: "",
        correo: "",
    });

    useEffect(() => {
        const abortController = new AbortController();

        if (idusuario > 0) {
            Axios.get("api/auth/get_basic_information", {
                params: { usuId: idusuario },
                headers: { ...headers, Authorization: `Bearer ${Cookies.get("tokenMOTORHOURS")}` },
            })
                .then(({ data }) => {
                    Object.keys(data).forEach((fieldName) => {
                        const fieldExists = getValues(fieldName);

                        if (fieldExists !== undefined) {
                            const type = typeof fieldExists;
                            const value =
                                type === "number" ? Number(data[fieldName]) : data[fieldName];
                            setValue(fieldName, value);
                        }
                    });

                    setOriginalData(data);
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
    }, [idusuario, setValue, getValues, showError]);

    const modificarCuenta = async ({ nombre, apellido, usuario, correo }) => {
        if (
            nombre === originalData.nombre &&
            apellido === originalData.apellido &&
            usuario === originalData.usuario &&
            correo === originalData.correo
        ) {
            return showInfo("No has hecho ninguna Actualización");
        }

        const params = {
            nombre,
            apellido,
            usuario,
            correo,
            usuarioact: nombreusuario,
            usuId: idusuario,
        };

        try {
            const { data } = await Axios.put("api/security/users/update_account", params, {
                headers: { ...headers, Authorization: `Bearer ${Cookies.get("tokenMOTORHOURS")}` },
            });
            showSuccess(data.message);
            reset();
            setVisible(false);
        } catch (error) {
            if (error.response) {
                if (error.response.status === 404) return showError("Api no encontrada");
                return showError(error.response?.data.message);
            }
            showError(error);
        }
    };

    return (
        <Dialog
            closeOnEscape={false}
            header="Ajuste Cuenta"
            visible={visible}

            onHide={() => {
                setVisible(false);
                reset();
            }}
            breakpoints={{ "960px": "75vw", "640px": "100vw" }}
            style={{ width: "40vw" }}
            appendTo={appendTarget}   // ⬅︎ clave
            baseZIndex={7000}
            className="zfix-dialog"
            maskClassName="zfix-mask"
            modal
            blockScroll
        // footer={
        //     <div>
        //         <Button
        //             className="p-button-danger"
        //             label="Cerrar"
        //             icon="pi pi-times"
        //             onClick={() => {
        //                 setVisible(false);
        //                 reset();
        //             }}
        //         />
        //         <Button
        //             className="p-button-info"
        //             label="Guardar"
        //             icon="pi pi-check"
        //             onClick={handleSubmit(modificarCuenta)}
        //         />
        //     </div>
        // }
        >
            <form onSubmit={handleSubmit(modificarCuenta)}>
                <div className="grid p-fluid">
                    <div className="col-12 md:col-6 ">
                        <label>Nombre</label>
                        <InputText
                            readOnly
                            placeholder="Nombre"
                            className={classNames({ "p-invalid": errors.nombre })}
                            {...register("nombre", { required: "El campo nombre es requerido" })}
                        />
                        <div className={classNames({ "p-error": errors.nombre })}>
                            {errors.nombre?.message}
                        </div>
                    </div>
                    <div className="col-12 md:col-6 ">
                        <label>Apellido</label>
                        <InputText
                            readOnly
                            placeholder="Apellido"
                            className={classNames({ "p-invalid": errors.apellido })}
                            {...register("apellido")}
                        />
                    </div>
                    <div className="col-12 md:col-6">
                        <label>Usuario</label>
                        <InputText
                            readOnly
                            placeholder="Usuario"
                            className={classNames({ "p-invalid": errors.usuario })}
                            {...register("usuario", { required: "El campo usuario es requerido" })}
                        />
                        <div className={classNames({ "p-error": errors.usuario })}>
                            {errors.usuario?.message}
                        </div>
                    </div>
                    <div className="col-12 md:col-6">
                        <label>Correo Electrónico</label>
                        <InputText
                            readOnly
                            placeholder="Correo"
                            className={classNames({ "p-invalid": errors.correo })}
                            {...register("correo", { required: "El campo correo es requerido" })}
                        />
                        <div className={classNames({ "p-error": errors.correo })}>
                            {errors.correo?.message}
                        </div>
                    </div>
                </div>
            </form>

            <div className="col-12 mt-3">
                <Accordion activeIndex={0}>
                    <AccordionTab header="Cambiar contraseña">
                        <ActualizarClave />
                    </AccordionTab>
                </Accordion>
            </div>
        </Dialog>
    );
};
