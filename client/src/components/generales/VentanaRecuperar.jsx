import React, { useContext, useState } from "react";
import { ToastContext } from "@context/toast/ToastContext";
import { Button } from "primereact/button";
import { useForm } from "react-hook-form";
import { restorePasswordsUsersAPI } from "@api/requests/authAPI";
import useHandleApiError from "@hook/useHandleApiError";
import { FaFingerprint } from "react-icons/fa";
import "./styles/VentanaRecuperar.css";

export const VentanaRecuperar = ({ onClose }) => {
    const { showSuccess } = useContext(ToastContext);
    const handleApiError = useHandleApiError();
    const [loading, setLoading] = useState(false);
    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm({
        defaultValues: {
            correo: "",
        },
    });

    const onSubmit = async ({ correo }) => {
        setLoading(true);
        try {
            const { data } = await restorePasswordsUsersAPI({ correo });
            showSuccess(data.message);
        } catch (error) {
            handleApiError(error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="ventana-recuperar">
            <FaFingerprint className="fingerprint-icon" />

            <h1 className="forgot-password-title">¿Olvidaste tu contraseña?</h1>
            <p className="forgot-password-subtitle">
                No te preocupes​, nosotros enviaremos instrucciones para cambiar tu contraseña.
            </p>

            <form onSubmit={handleSubmit(onSubmit)} className="password-reset-form">
                <div className="input-container">
                    <label htmlFor="correo" className="input-label">
                        Ingresa tu correo electrónico
                    </label>
                    <input
                        type="email"
                        id="correo"
                        autoComplete="email"
                        className={`input-email ${errors.correo ? "p-invalid" : ""}`}
                        placeholder="ejemplo@correo.com"
                        {...register("correo", {
                            required: "El correo electrónico es obligatorio.",
                            pattern: {
                                value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                                message: "Correo electrónico no válido.",
                            },
                        })}
                    />

                    {errors.correo && <small className="p-error">{errors.correo.message}</small>}
                </div>

                <Button
                    type="submit"
                    className="reset-password-button"
                    label="Restablecer contraseña"
                    loading={loading}
                />

                <p className="back-to-login" onClick={onClose}>
                    ← Regresar al inicio de sesión
                </p>
            </form>
        </div>
    );
};
