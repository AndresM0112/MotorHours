import React, { useEffect, useRef, useState } from "react";
import "./styles/otp.css";
import { verifyOtpAPI } from "@api/requests";
import { Button } from "primereact/button";

const OtpVerificationModal = ({ usuId, correo, onVerifySuccess, onResendOtp }) => {
    const [otp, setOtp] = useState(new Array(6).fill(""));
    const [timer, setTimer] = useState(60);
    const [canResend, setCanResend] = useState(false);
    const [error, setError] = useState("");
    const [loadingSubmit, setLoadingSubmit] = useState(false);
    const [loadingResend, setLoadingResend] = useState(false);

    const inputRefs = useRef([]);

    useEffect(() => {
        if (timer > 0) {
            const interval = setInterval(() => setTimer((t) => t - 1), 1000);
            return () => clearInterval(interval);
        } else {
            setCanResend(true);
        }
    }, [timer]);

    const handleChange = (e, index) => {
        const value = e.target.value;
        if (/^[0-9]?$/.test(value)) {
            const newOtp = [...otp];
            newOtp[index] = value;
            setOtp(newOtp);

            if (value !== "" && index < 5) {
                inputRefs.current[index + 1].focus();
            }
        }
    };

    const handleKeyDown = (e, index) => {
        if (e.key === "Backspace" && otp[index] === "" && index > 0) {
            inputRefs.current[index - 1].focus();
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const otpCode = otp.join("");

        if (otpCode.length < 6) {
            setError("Completa los 6 dígitos del código.");
            return;
        }

        setLoadingSubmit(true);
        setError("");

        try {
            const { data } = await verifyOtpAPI({ usuId, codigo: otpCode });

            if (data?.success) {
                onVerifySuccess();
            } else {
                setError(data?.message || "Código incorrecto.");
            }
        } catch (err) {
            setError(err?.response?.data?.message || "Error al verificar el código.");
        } finally {
            setLoadingSubmit(false);
        }
    };

    const resendCode = async () => {
        setLoadingResend(true);
        try {
            await onResendOtp();
            setTimer(60);
            setCanResend(false);
        } catch (error) {
            console.error("Error al reenviar el código:", error);
        } finally {
            setLoadingResend(false);
        }
    };

    return (
        <div className="otp-modal-overlay">
            <div className="otp-modal">
                <h2>Verificación de código</h2>
                <p>
                    Hemos enviado un código a <strong>{correo}</strong>
                </p>

                <form onSubmit={handleSubmit}>
                    <div className="otp-input-container">
                        {otp.map((digit, index) => (
                            <input
                                key={index}
                                type="text"
                                maxLength="1"
                                className="otp-input"
                                value={digit}
                                ref={(el) => (inputRefs.current[index] = el)}
                                onChange={(e) => handleChange(e, index)}
                                onKeyDown={(e) => handleKeyDown(e, index)}
                            />
                        ))}
                    </div>

                    {error && <p className="otp-error">{error}</p>}

                    <Button
                        type="submit"
                        label="Verificar código"
                        className="otp-btn-submit"
                        loading={loadingSubmit}
                        disabled={loadingSubmit}
                    />
                </form>

                <div className="otp-resend-text">
                    {canResend ? (
                        <>
                            ¿No recibiste el código?{" "}
                            <Button
                                label="Reenviar código"
                                className="p-button-link p-button-xl p-0"
                                onClick={resendCode}
                                loading={loadingResend}
                                disabled={loadingResend}
                            />
                        </>
                    ) : (
                        <span>Reenviar en {timer}s</span>
                    )}
                </div>
            </div>
        </div>
    );
};

export default OtpVerificationModal;
