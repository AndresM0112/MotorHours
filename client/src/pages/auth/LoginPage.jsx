import React, { useContext, useState } from "react";
import { useHistory } from "react-router-dom";
import Cookies from "js-cookie";
import { AuthContext } from "@context/auth/AuthContext";
import { useForm } from "react-hook-form";
import { VentanaRecuperar } from "@components/generales";
import { VenCambioClave } from "@components/generales/VenCambioClave";
import "./styles/login.css";
import { ruta } from "@utils/converAndConst";
import LoginForm from "./LoginForm";
import RegisterForm from "./RegisterForm";
import OtpVerificationModal from "./OtpVerificationModal";
import useHandleApiError from "@hook/useHandleApiError";
import { registerAPI, resendOtpAPI } from "@api/requests";
import { ToastContext } from "@context/toast/ToastContext";

const Login = () => {
    const history = useHistory();
    const { login } = useContext(AuthContext);
    const { showSuccess } = useContext(ToastContext);
    const [activeForm, setActiveForm] = useState("login"); // "login", "register", "recover"
    const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
    const [loadingLogin, setLoadingLogin] = useState(false);
    const [showOtpModal, setShowOtpModal] = useState(false);
    const [otpUserData, setOtpUserData] = useState(null);
    const handleApiError = useHandleApiError();
    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm({
        defaultValues: {
            usuario: "",
            clave: "",
        },
    });

    const {
        register: registerSignup,
        handleSubmit: handleSubmitSignup,
        watch,
        formState: { errors: errorsSignup },
    } = useForm();

    const onLoginUser = async ({ usuario, clave }) => {
        setLoadingLogin(true);

        try {
            const data = await login(usuario, clave);

            if (!data) return;

            const { cambioclave, usuId, perfil } = data;

            if (Number(cambioclave) === 1) {
                Cookies.set("autentificadoMOTORHOURS", false);
                setShowChangePasswordModal(true);
            } else if (usuId > 0) {
                history.push("/dashboard");
            }
        } catch (error) {
            // manejar error si es necesario
        } finally {
            setLoadingLogin(false);
        }
    };

    const onRegisterUser = async (data) => {
        try {
            const { data: dataRes } = await registerAPI(data);

            if (dataRes?.usuId) {
                // Guardamos info para reintento de OTP y login
                setOtpUserData({
                    usuId: dataRes.usuId,
                    correo: dataRes.correo,
                    usuario: dataRes.usuario,
                    clave: dataRes.clave,
                });
                setShowOtpModal(true);
            }
        } catch (error) {
            handleApiError(error);
        }
    };

    const handleOtpVerifySuccess = async () => {
        const { usuario, clave } = otpUserData;

        try {
            const data = await login(usuario, clave);

            if (!data) return;

            const { cambioclave, usuId } = data;

            if (Number(cambioclave) === 1) {
                Cookies.set("autentificadoMOTORHOURS", false);
                setShowChangePasswordModal(true);
            } else if (usuId > 0) {
                window.location.href = `${ruta}#/dashboard`;
            }
        } catch (error) {
            handleApiError(error);
        }
    };

    const handleResendOtp = async () => {
        try {
            await resendOtpAPI({ usuId: otpUserData.usuId });
            showSuccess("Código reenviado nuevamente.");
        } catch (error) {
            handleApiError(error);
        }
    };

    return (
        <>
            <VenCambioClave
                visible={showChangePasswordModal}
                onClose={() => setShowChangePasswordModal(false)}
            />

            {showOtpModal && otpUserData && (
                <OtpVerificationModal
                    usuId={otpUserData.usuId}
                    correo={otpUserData.correo}
                    onVerifySuccess={handleOtpVerifySuccess}
                    onResendOtp={handleResendOtp}
                />
            )}

            <div className="login-container">
                <div className="login-box">

                    {/* LADO IZQUIERDO */}
                    <div className="login-left">

                        <div className="brand">
                            <h1>MOTOR<span>HOURS</span></h1>
                            <p>Sistema de gestión para talleres de motocross</p>
                        </div>

                        {activeForm === "login" && (
                            <>
                                <h2>Iniciar sesión</h2>

                                <LoginForm
                                    register={register}
                                    handleSubmit={handleSubmit}
                                    errors={errors}
                                    onLoginUser={onLoginUser}
                                    loading={loadingLogin}
                                    setActiveForm={setActiveForm}
                                />

                                <div className="form-switcher-buttons">
                                    <button type="button" onClick={() => setActiveForm("register")}>
                                        ¿No tienes cuenta? Regístrate
                                    </button>
                                </div>
                            </>
                        )}

                        {activeForm === "register" && (
                            <>
                                <h2>Crear cuenta</h2>

                                <RegisterForm
                                    register={registerSignup}
                                    handleSubmit={handleSubmitSignup}
                                    errors={errorsSignup}
                                    onRegisterUser={onRegisterUser}
                                    watch={watch}
                                />

                                <div className="form-switcher-buttons">
                                    <button type="button" onClick={() => setActiveForm("login")}>
                                        ¿Ya tienes cuenta? Inicia sesión
                                    </button>
                                </div>
                            </>
                        )}

                        {activeForm === "recover" && (
                            <VentanaRecuperar onClose={() => setActiveForm("login")} />
                        )}

                    </div>

                    {/* LADO DERECHO */}
                    <div className="login-right">
                        <div className="overlay">
                            <h2>Bienvenido</h2>
                            <p>Administra las motos, reparaciones y mantenimientos en un solo lugar.</p>
                        </div>
                    </div>

                </div>

                {/* <footer>
                    <div>© 2025 TODOS LOS DERECHOS RESERVADOS</div>
                    <img
                        src={`${process.env.PUBLIC_URL}/images/logos/logoPavasStay.png`}
                        alt="Desarrollado por"
                        className="logo-desarrollador-footer"
                    />
                </footer> */}
            </div>
        </>
    );
};

export default Login;
