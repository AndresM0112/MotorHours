import React, { useContext, useEffect, useState } from "react";
import { AuthContext } from "@context/auth/AuthContext";
import { ToastContext } from "@context/toast/ToastContext";
// PRIMEREACT
import { Password } from "primereact/password";
import { Button } from "primereact/button";
import { classNames } from "primereact/utils";
// OTROS
import { useForm } from "react-hook-form";
import Axios from "axios";
import { headers, propsPass } from "@utils/converAndConst";
import { FooterPassword, HeaderPassword } from "./ItemTemplates";
import { validatePasswordConfirmation } from "@utils/validations";
import Cookies from "js-cookie";

export const ActualizarClave = () => {
    const { nombreusuario, idusuario, login } = useContext(AuthContext);
    const { showSuccess, showError } = useContext(ToastContext);
    const [loading, setLoading] = useState(false);
    const [isMounted, setIsMounted] = useState(true);
    const {
        register,
        handleSubmit,
        reset,
        setValue,
        watch,
        formState: { errors },
    } = useForm({
        defaultValues: {
            claveactual: "",
            clave: "",
            confclave: "",
        },
    });

    useEffect(() => {
        return () => {
            setIsMounted(false);
        };
    }, []);

    const actualizarClave = async ({ claveactual, clave }) => {
        setLoading(true);
        try {
            const params = {
                currentPassword: claveactual,
                newPassword: clave,
                usuario: nombreusuario,
                usuId: idusuario,
            };

            const { data } = await Axios.put("api/auth/update_password", params, {
                headers: {
                    ...headers,
                    Authorization: `Bearer ${Cookies.get("tokenMOTORHOURS")}`,
                },
            });

            if (isMounted) {
                showSuccess(data.message);

                const usuario = Cookies.get("usuario");
                await login(usuario, clave);

                reset();
            }
        } catch (error) {
            if (isMounted) {
                if (error.response) {
                    if (error.response.status === 404) return showError("Api no encontrada");
                    return showError(error.response?.data.message);
                }
                showError(error);
            }
        } finally {
            if (isMounted) {
                setLoading(false);
            }
        }
    };

    return (
        <form onSubmit={handleSubmit(actualizarClave)}>
            <div className="grid p-fluid">
                <div className="col-12 md:col-12">
                    <label>Contraseña actual</label>
                    <Password
                        feedback={false}
                        className={classNames({ "p-invalid": errors.claveactual })}
                        {...register("claveactual", {
                            required: "El campo confirmar contraseña es requerido",
                            onChange: (e) => setValue("claveactual", e.target.value),
                        })}
                    />
                    <div className={classNames({ "p-error": errors.claveactual })}>
                        {errors.claveactual?.message}
                    </div>
                </div>
                <div className="col-12 md:col-12">
                    <label>Contraseña nueva</label>
                    <Password
                        {...propsPass}
                        header={HeaderPassword}
                        footer={FooterPassword}
                        className={classNames({ "p-invalid": errors.clave })}
                        {...register("clave", {
                            required: "El campo confirmar contraseña es requerido",
                            minLength: {
                                value: 8,
                                message: "El campo debe tener al menos 8 caracteres",
                            },
                            onChange: (e) => setValue("clave", e.target.value),
                        })}
                    />
                    <div className={classNames({ "p-error": errors.clave })}>
                        {errors.clave?.message}
                    </div>
                </div>
                <div className="col-12 md:col-12">
                    <label>Vuelve a escribir la contraseña nueva</label>
                    <Password
                        {...propsPass}
                        feedback={false}
                        header={HeaderPassword}
                        footer={FooterPassword}
                        className={classNames({ "p-invalid": errors.confclave })}
                        {...register("confclave", {
                            validate: validatePasswordConfirmation(watch("clave")),
                            onChange: (e) => setValue("confclave", e.target.value),
                        })}
                    />
                    <div className={classNames({ "p-error": errors.confclave })}>
                        {errors.confclave?.message}
                    </div>
                </div>
            </div>
            <div className="grid">
                <div className="col-12">
                    <Button
                        label="Actualizar Contraseña"
                        className="p-button p-button-primary"
                        onClick={handleSubmit(actualizarClave)}
                        loading={loading}
                    />
                </div>
            </div>
        </form>
    );
};
