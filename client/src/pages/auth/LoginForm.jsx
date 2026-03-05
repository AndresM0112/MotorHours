import React, { useState }  from "react";
import { Button } from "primereact/button";

const LoginForm = ({ register, handleSubmit, errors, onLoginUser, loading, setActiveForm }) => {

      const [showPassword, setShowPassword] = useState(false);

    return (
        <form className={`form-login`} onSubmit={handleSubmit(onLoginUser)} noValidate>
            <label>Usuario o correo electrónico</label>
            <input
                type="text"
                name="usuario"
                placeholder="ejemplo@email.com"
                {...register("usuario", {
                    required: "El usuario o correo electrónico es obligatorio",
                })}
            />
            {errors.usuario && <p className="input-error">{errors.usuario.message}</p>}

            <label>Contraseña</label>

            <div className="password-wrapper" style={{ position: "relative" }}>
                <input
                     type={showPassword ? "text" : "password"}
                    name="clave"
                    placeholder="**************"
                    {...register("clave", {
                        required: "La contraseña es obligatoria",
                    })}
                />
                {/* 👁️ Botón ojito */}
                <i
                    className={`pi ${showPassword ? "pi-eye-slash" : "pi-eye"}`}
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                        position: "absolute",
                        right: "10px",
                        top: "50%",
                        transform: "translateY(-50%)",
                        cursor: "pointer",
                        fontSize: "1.2rem",
                        color: "#555",
                    }}
                />
            </div>
            {errors.clave && <p className="input-error">{errors.clave.message}</p>}

            <div className="forgot-password">
                <Button
                    type="button"
                    label="¿Olvidaste tu contraseña?"
                    onClick={() => setActiveForm("recover")}
                    className="p-button-link"
                />
            </div>

            <Button
                type="submit"
                label="Iniciar sesión"
                className="btn-login"
                loading={loading}
                disabled={loading}
            />
        </form>
    );
};

export default LoginForm;
