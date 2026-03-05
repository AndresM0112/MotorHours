import React, { useContext, useState } from "react";
import { useParams } from "react-router-dom";

// Componentes y estilos de terceros
import { Password } from "primereact/password"; // Componente de PrimeReact
import { Button } from "primereact/button";
// APIs y hooks personalizados
import { restorePasswordAPI, validateCodePasswordAPI } from "@api/requests/authAPI";
import { ToastContext } from "@context/toast/ToastContext";
import useHandleApiError from "@hook/useHandleApiError";
import { decodeToken, maskEmail } from "@utils/converAndConst";
import { AuthContext } from "@context/auth/AuthContext";
import { generatePassword } from "./func/functions";
import "./styles/resetPassword.css";
import "./styles/recover.css";

const ResetPassword = () => {
    // Hooks y contextos
    const { login } = useContext(AuthContext); // Contexto de autenticación
    const { showSuccess } = useContext(ToastContext); // Contexto de Toast
    const handleApiError = useHandleApiError(); // Hook personalizado para manejar errores

    // Obtención de parámetros y token
    const { token } = useParams(); // Obtiene el token de la URL
    const email = decodeToken(token)?.correo; // Decodificamos el token para obtener el correo

    // Estados locales
    const [generatedPassword, setGeneratedPassword] = useState("");
    const [copied, setCopied] = useState(false);
    const [otp, setOtp] = useState(new Array(6).fill("")); // Estado para el código OTP
    const [isCodeValid, setIsCodeValid] = useState(false); // Estado para la validación del código
    const [password, setPassword] = useState(""); // Estado para la nueva contraseña
    const [confirmPassword, setConfirmPassword] = useState(""); // Estado para confirmar la contraseña
    const [error, setError] = useState(null); // Estado para manejar errores
    const [success, setSuccess] = useState(false); // Estado para manejar el éxito
    const [loadingCode, setLoadingCode] = useState(false); // Estado de carga para la validación del código
    const [loadingPassword, setLoadingPassword] = useState(false); // Estado de carga para el cambio de contraseña

    // Validación de contraseña
    const validatePassword = (password) => {
        const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;
        return regex.test(password);
    };

    const handleOtpChange = (element, index) => {
        if (isNaN(element.value)) return;
        let newOtp = [...otp];
        newOtp[index] = element.value;
        setOtp(newOtp);

        // Mover el foco al siguiente campo automáticamente
        if (element.nextSibling && element.value !== "") {
            element.nextSibling.focus();
        }
    };

    const handlePasteOtp = (e) => {
        const paste = e.clipboardData.getData("text"); // Captura el valor pegado
        if (paste.length === otp.length && /^\d+$/.test(paste)) {
            // Verifica si el valor pegado tiene la longitud correcta y es numérico
            const newOtp = paste.split(""); // Convierte el string en un array
            setOtp(newOtp);
        }
    };

    // Función para manejar la validación del código temporal
    const handleCodeSubmit = async (e) => {
        e.preventDefault();
        const codeTemp = otp.join(""); // Unir los 6 dígitos del OTP

        setLoadingCode(true); // Activa el estado de carga
        try {
            const { data } = await validateCodePasswordAPI({
                token,
                codeTemp,
            });

            setIsCodeValid(true);
            showSuccess(data.message);
        } catch (error) {
            handleApiError(error);
        } finally {
            setLoadingCode(false); // Desactiva el estado de carga
        }
    };

    // Función para manejar el cambio de contraseña
    const handleSubmit = async (e) => {
        e.preventDefault();
        const codeTemp = otp.join(""); // Unir los 6 dígitos del OTP

        if (!validatePassword(password)) {
            setError(
                "La contraseña debe tener al menos 8 caracteres, una mayúscula, una minúscula, un número y un carácter especial."
            );
            return;
        }

        if (password !== confirmPassword) {
            setError("Las contraseñas no coinciden");
            return;
        }

        setLoadingPassword(true); // Activa el estado de carga
        try {
            const { data } = await restorePasswordAPI({
                token,
                nuevaContrasena: password,
                codeTemp,
            });

            if (data.success) {
                setSuccess(true);

                setTimeout(async () => {
                    const result = await login(email, password);
                    if (result) {
                        window.location.href = "#/";
                    }
                }, 3000);
            } else {
                setError(data.message);
            }
        } catch (error) {
            handleApiError(error);
        } finally {
            setLoadingPassword(false);
        }
    };

    // Función para generar password
    const handleGeneratePassword = () => {
        const password = generatePassword();
        setGeneratedPassword(password);
        setCopied(false);
    };

    const handleCopyPassword = () => {
        if (generatedPassword) {
            navigator.clipboard
                .writeText(generatedPassword) // Copiar al portapapeles
                .then(() => {
                    // Asignar la contraseña generada a los campos
                    setPassword(generatedPassword);
                    setConfirmPassword(generatedPassword);
                    setCopied(true); // Actualizar el estado para mostrar que se copió

                    // Restablecer el mensaje de copiado después de 2 segundos
                    setTimeout(() => setCopied(false), 2000);
                })
                .catch(() => {
                    setError("No se pudo copiar la contraseña. Inténtalo de nuevo.");
                });
        }
    };

    return (
        <div className="reset-password-container">
            {/* Logotipo superior */}
            <div className="logo-top">
                <img src={`${process.env.PUBLIC_URL}/images/logos/miniLogoMotorHours.png`} alt="MotorHours Logo" />
            </div>

            {/* <div className="icon-container">
                <GrSecure className="envelope-icon" />
            </div> */}
            {success ? (
                <p>Contraseña actualizada con éxito. Serás redirigido al menú principal.</p>
            ) : isCodeValid ? (
                <>
                    <form onSubmit={handleSubmit}>
                        <div className="grid p-fluid">
                            <label
                                style={{ fontSize: "14px", fontWeight: 600 }}
                                htmlFor="newPassword"
                            >
                                Nueva Contraseña
                            </label>
                            <div className=" col-12">
                                <Password
                                    id="newPassword"
                                    className="p-inputtext-lg"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    promptLabel="Ingrese una contraseña"
                                    weakLabel="Débil"
                                    mediumLabel="Media"
                                    strongLabel="Fuerte"
                                    feedback={true}
                                    toggleMask
                                    required
                                />
                            </div>
                            <label
                                style={{ fontSize: "14px", fontWeight: 600 }}
                                htmlFor="confirmPassword"
                            >
                                Confirmar Nueva Contraseña
                            </label>
                            <div className=" col-12">
                                <Password
                                    id="confirmPassword"
                                    className="p-inputtext-lg"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    feedback={false}
                                    toggleMask
                                    required
                                />
                            </div>
                        </div>
                        <Button
                            label="Cambiar Contraseña"
                            type="submit"
                            className="p-mt-2 p-button-lg"
                            style={{ width: "100%" }}
                            loading={loadingPassword}
                        />
                        <Button
                            label="Generar Contraseña Segura"
                            type="button"
                            className="mt-2 p-button-lg p-button-text p-button-secondary"
                            style={{ width: "100%" }}
                            onClick={handleGeneratePassword}
                        />
                        {error && <p style={{ color: "red" }}>{error}</p>}{" "}
                        {/* Mensaje de error si hay */}
                        {generatedPassword && (
                            <div className="generated-password-recover">
                                <div className="password-container-recover">
                                    <p>
                                        Contraseña Generada{" "}
                                        <span className="password-text-recover">
                                            {generatedPassword}
                                        </span>
                                    </p>

                                    <Button
                                        label={copied ? "Copiado" : "Copiar"}
                                        type="button"
                                        className="copy-button-recover"
                                        onClick={handleCopyPassword}
                                    />
                                </div>
                            </div>
                        )}
                    </form>
                </>
            ) : (
                <>
                    <h2>Ingresa tu código</h2>
                    <p>
                        Que hemos enviado a tu correo electrónico{" "}
                        <strong>{maskEmail(email)}</strong>
                    </p>
                    <form onSubmit={handleCodeSubmit}>
                        <div className="otp-inputs">
                            {otp.map((data, index) => (
                                <input
                                    key={index}
                                    type="text"
                                    maxLength="1"
                                    className="otp-input"
                                    value={data}
                                    onChange={(e) => handleOtpChange(e.target, index)}
                                    onFocus={(e) => e.target.select()}
                                    onPaste={index === 0 ? handlePasteOtp : null}
                                />
                            ))}
                        </div>
                        <Button
                            label="Validar Código"
                            type="submit"
                            className="p-mt-2 p-button-lg"
                            style={{ width: "100%" }}
                            loading={loadingCode}
                        />
                    </form>
                </>
            )}

            {/* Logotipo inferior y mensaje de copyright */}
            <div className="footer">
                <img
                    src={`${process.env.PUBLIC_URL}/images/logos/logoPavasStay.png`}
                    alt="Bottom Logo"
                />
                <p>&copy; 2025 Pavas Stay Connected. Todos los derechos reservados.</p>
            </div>
        </div>
    );
};

export default ResetPassword;
