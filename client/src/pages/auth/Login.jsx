import React, { useContext, useState } from "react";
import { AuthContext } from "@context/auth/AuthContext";
import Cookies from "js-cookie";

// PrimeReact Components
import { InputText } from "primereact/inputtext";
import { Button } from "primereact/button";
import { Password } from "primereact/password";
import { classNames } from "primereact/utils";

// Third-party Libraries
// import { UnauthenticatedSessionControl } from "react-session-control";
import { useForm } from "react-hook-form";

// Custom Components
import { VenCambioClave } from "@components/generales/VenCambioClave";
import { VentanaRecuperar } from "@components/generales/VentanaRecuperar";

// Utilities
import { nameSystem, ruta } from "@utils/converAndConst";

import "./styles/login.css";

const Login = () => {
    const { login } = useContext(AuthContext);
    const [visible, setVisible] = useState(false);
    const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);

    const {
        register,
        handleSubmit,
        setValue,
        formState: { errors },
    } = useForm({
        defaultValues: {
            usuario: "",
            clave: "",
        },
    });

    const onLoginUser = async ({ usuario, clave }) => {
        try {
            await login(usuario, clave);
            const cambioclave = Number(localStorage.getItem("cambioclave"));
            if (cambioclave === 1) {
                Cookies.set("autentificadoMOTORHOURS", false);
                setShowChangePasswordModal(true);
            }
        } catch (error) {
            window.location.href = `${ruta}`;
        }
    };

    return (
        <>
            <VentanaRecuperar visible={visible} onClose={() => setVisible(false)} />
            <VenCambioClave
                visible={showChangePasswordModal}
                onClose={() => setShowChangePasswordModal(false)}
            />
           {/* <UnauthenticatedSessionControl storageTokenKey="token" />*/}
            <div className="login-body">
                <div className="login-wrapper">
                    <div className="login-panel">
                        <img
                            src={`${process.env.PUBLIC_URL}/images/logos/miniLogoMotorHours.png`}
                            className="login-logo"
                            alt="logo-motorhours"
                        />
                        <form
                            onSubmit={handleSubmit(onLoginUser)}
                            noValidate
                            className="login-form"
                        >
                            <div
                                className="text-center"
                                style={{ marginBottom: "30px", color: "#eaecec" }}
                            >
                                <h2>{nameSystem}</h2>
                                <h5 style={{ marginTop: "-1px" }}>
                                    Introduce tus datos para iniciar sesión
                                </h5>
                            </div>
                            <InputText
                                placeholder="Usuario o Correo Electrónico"
                                className={`p-inputtext-lg ${classNames({
                                    "p-invalid": errors.usuario,
                                })}`}
                                {...register("usuario", {
                                    required: "El campo usuario es requerido",
                                })}
                            />
                            <label className={classNames({ "p-error": errors.usuario })}>
                                {errors.usuario?.message}
                            </label>
                            <Password
                                placeholder="Contraseña"
                                feedback={false}
                                toggleMask={true}
                                className={`p-inputtext-lg ${classNames({
                                    "p-invalid": errors.clave,
                                })}`}
                                {...register("clave", {
                                    required: "El campo contraseña es requerido",
                                    onChange: (e) => setValue("clave", e.target.value),
                                })}
                            />
                            <label className={classNames({ "p-error": errors.clave })}>
                                {errors.clave?.message}
                            </label>
                            <Button
                                label="Iniciar sesión"
                                type="submit"
                                className="p-button-primary p-button-lg"
                            />
                        </form>
                        <img
                            src={`${process.env.PUBLIC_URL}/images/logos/logoPavasStay.png`}
                            className="logo"
                            alt="logo-layout"
                        />
                        <p style={{ fontSize: "14px" }}>
                            ¿Olvidaste tu contraseña?{" "}
                            <Button
                                onClick={() => setVisible(true)}
                                label="Click aquí"
                                className="p-button-text"
                                style={{
                                    fontSize: "14px",
                                    display: "contents",
                                    fontWeight: "bold",
                                }}
                            />{" "}
                            para restablecer.
                        </p>
                    </div>
                    <div
                        className="login-image"
                        style={{
                            backgroundImage: `url("${process.env.PUBLIC_URL}/images/bg-login.webp")`,
                        }}
                    >
                        <div className="image-footer">
                            {/* <p>Desing By PAVAS S.A.S </p> */}
                            <div className="icons">
                                <i
                                    onClick={() => window.open("https://pavastecnologia.com")}
                                    className="pi pi-globe"
                                ></i>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default Login;
