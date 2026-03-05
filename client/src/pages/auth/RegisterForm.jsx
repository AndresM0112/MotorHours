import { Button } from "primereact/button";
import React, { useState } from "react";
import { useForm } from "react-hook-form";

const RegisterForm = ({ onRegisterUser }) => {
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);

    const {
        register,
        handleSubmit,
        watch,
        trigger,
        formState: { errors },
    } = useForm({ mode: "onTouched" });
    const [lists] = useState({
        documentTypeList: [],
        genderList: [],
        countryList: [],
        municipalitiesList: [],
    });

    const nextStep = async () => {
        const valid = await trigger(
            step === 1
                ? ["tipoDocumento", "documento", "nombre", "apellido", "fechaNacimiento", "genero"]
                : ["telefono", "ciudad", "correo", "usuario", "clave", "confirmarClave"]
        );
        if (valid) setStep((prev) => prev + 1);
    };

    const prevStep = () => setStep((prev) => prev - 1);

    const onSubmit = async (data) => {
        setLoading(true);
        try {
            await onRegisterUser(data);
        } catch (err) {
            console.error("Error al registrar usuario:", err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <form
            onSubmit={handleSubmit(onSubmit)}
            className="form-signup"
            autoComplete="off"
            noValidate
        >
            <div className="form-grid">
                {step === 1 && (
                    <>
                        {/* Tipo de Documento */}
                        <div>
                            <label>Tipo de documento</label>
                            <select
                                autoComplete="off"
                                {...register("tipoDocumento", {
                                    required: "El campo Tipo de documento es obligatorio",
                                    valueAsNumber: true,
                                })}
                            >
                                <option value="">Selecciona una opción</option>
                                {lists.documentTypeList.map((item) => (
                                    <option key={item.id} value={item.id}>
                                        {item.nombre}
                                    </option>
                                ))}
                            </select>
                            {errors.tipoDocumento && (
                                <p className="input-error">{errors.tipoDocumento.message}</p>
                            )}
                        </div>

                        {/* Número de Documento */}
                        <div>
                            <label>Número de documento</label>
                            <input
                                type="text"
                                inputMode="numeric"
                                autoComplete="document-number"
                                placeholder="Ej: 1234567890"
                                {...register("documento", {
                                    required: "El campo Número de documento es obligatorio",
                                    pattern: {
                                        value: /^[0-9]{6,15}$/,
                                        message: "Debe contener solo números entre 6 y 15 dígitos",
                                    },
                                })}
                            />
                            {errors.documento && (
                                <p className="input-error">{errors.documento.message}</p>
                            )}
                        </div>

                        {/* Nombre */}
                        <div>
                            <label>Nombre</label>
                            <input
                                type="text"
                                inputMode="text"
                                placeholder="Tu nombre"
                                autoComplete="given-name"
                                {...register("nombre", {
                                    required: "El campo Nombre es obligatorio",
                                    pattern: {
                                        value: /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/,
                                        message: "Solo se permiten letras",
                                    },
                                })}
                            />
                            {errors.nombre && (
                                <p className="input-error">{errors.nombre.message}</p>
                            )}
                        </div>

                        {/* Apellido */}
                        <div>
                            <label>Apellido</label>
                            <input
                                type="text"
                                inputMode="text"
                                placeholder="Tu apellido"
                                autoComplete="family-name"
                                {...register("apellido", {
                                    required: "El campo Apellido es obligatorio",
                                    pattern: {
                                        value: /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/,
                                        message: "Solo se permiten letras",
                                    },
                                })}
                            />
                            {errors.apellido && (
                                <p className="input-error">{errors.apellido.message}</p>
                            )}
                        </div>

                        {/* Fecha de nacimiento */}
                        <div>
                            <label>Fecha de nacimiento</label>
                            <input
                                type="date"
                                className="input-date"
                                autoComplete="bday"
                                {...register("fechaNacimiento", {
                                    required: "El campo Fecha de nacimiento es obligatorio",
                                })}
                            />
                            {errors.fechaNacimiento && (
                                <p className="input-error">{errors.fechaNacimiento.message}</p>
                            )}
                        </div>

                        {/* Género */}
                        <div>
                            <label>Género</label>
                            <select
                                autoComplete="sex"
                                {...register("genero", {
                                    required: "El campo Género es obligatorio",
                                    valueAsNumber: true,
                                })}
                            >
                                <option value="">Selecciona una opción</option>
                                {lists.genderList.map((item) => (
                                    <option key={item.id} value={item.id}>
                                        {item.nombre}
                                    </option>
                                ))}
                            </select>
                            {errors.genero && (
                                <p className="input-error">{errors.genero.message}</p>
                            )}
                        </div>
                    </>
                )}

                {step === 2 && (
                    <>
                        {/* Teléfono */}
                        <div>
                            <label>Teléfono</label>
                            <input
                                type="tel"
                                inputMode="tel"
                                placeholder="Número de contacto"
                                autoComplete="tel"
                                {...register("telefono", {
                                    required: "El campo Teléfono es obligatorio",
                                    pattern: {
                                        value: /^[0-9]{7,15}$/,
                                        message: "Debe ser un número válido entre 7 y 15 dígitos",
                                    },
                                })}
                            />
                            {errors.telefono && (
                                <p className="input-error">{errors.telefono.message}</p>
                            )}
                        </div>

                        {/* País */}
                        <div>
                            <label>País</label>
                            <select
                                autoComplete="country"
                                {...register("pais", {
                                    required: "El campo País es obligatorio",
                                    valueAsNumber: true,
                                })}
                            >
                                <option value="">Selecciona un país</option>
                                {lists.countryList.map((item) => (
                                    <option key={item.id} value={item.id}>
                                        {item.nombre}
                                    </option>
                                ))}
                            </select>
                            {errors.pais && <p className="input-error">{errors.pais.message}</p>}
                        </div>

                        {/* Ciudad */}
                        <div>
                            <label>Ciudad</label>
                            <select
                                autoComplete="address-level2"
                                {...register("ciudad", {
                                    required: "El campo Ciudad es obligatorio",
                                    valueAsNumber: true,
                                })}
                            >
                                <option value="">Selecciona una ciudad</option>
                                {lists.municipalitiesList.map((item) => (
                                    <option key={item.id} value={item.id}>
                                        {item.nombre}
                                    </option>
                                ))}
                            </select>
                            {errors.ciudad && (
                                <p className="input-error">{errors.ciudad.message}</p>
                            )}
                        </div>

                        {/* Correo electrónico */}
                        <div>
                            <label>Correo electrónico</label>
                            <input
                                type="email"
                                autoComplete="email"
                                placeholder="ejemplo@email.com"
                                {...register("correo", {
                                    required: "El campo Correo electrónico es obligatorio",
                                    pattern: {
                                        value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                                        message: "Correo electrónico no válido",
                                    },
                                })}
                            />
                            {errors.correo && (
                                <p className="input-error">{errors.correo.message}</p>
                            )}
                        </div>

                        {/* Usuario */}
                        <div>
                            <label>Usuario</label>
                            <input
                                type="text"
                                autoComplete="username"
                                placeholder="Nombre de usuario"
                                {...register("usuario", {
                                    required: "El campo Usuario es obligatorio",
                                    pattern: {
                                        value: /^[a-zA-Z0-9._]{4,20}$/,
                                        message: "Solo letras, números, . y _ (mín. 4 caracteres)",
                                    },
                                })}
                            />
                            {errors.usuario && (
                                <p className="input-error">{errors.usuario.message}</p>
                            )}
                        </div>

                        {/* Contraseña */}
                        <div>
                            <label>Contraseña</label>
                            <input
                                type="password"
                                autoComplete="new-password"
                                placeholder="Crea una contraseña"
                                {...register("clave", {
                                    required: "El campo Contraseña es obligatorio",
                                    minLength: {
                                        value: 8,
                                        message: "Mínimo 8 caracteres",
                                    },
                                })}
                            />
                            {errors.clave && <p className="input-error">{errors.clave.message}</p>}
                        </div>

                        {/* Confirmar contraseña */}
                        <div>
                            <label>Confirmar contraseña</label>
                            <input
                                type="password"
                                autoComplete="new-password"
                                placeholder="Confirma tu contraseña"
                                {...register("confirmarClave", {
                                    required: "El campo Confirmar contraseña es obligatorio",
                                    validate: (value) =>
                                        value === watch("clave") || "Las contraseñas no coinciden",
                                })}
                            />
                            {errors.confirmarClave && (
                                <p className="input-error">{errors.confirmarClave.message}</p>
                            )}
                        </div>
                    </>
                )}

                {step === 3 && (
                    <div className="col-span-2">
                        <div className="checkbox-wrapper">
                            <label htmlFor="aceptaTerminos">
                                <input
                                    type="checkbox"
                                    id="aceptaTerminos"
                                    className="checkbox"
                                    {...register("aceptaTerminos", {
                                        required:
                                            "Debes aceptar los términos y la política de privacidad",
                                    })}
                                />
                                <span className="custom-checkbox"></span>
                            </label>
                            <div className="checkbox-text">
                                Acepto los{" "}
                                <a href="#/terminos" target="_blank" rel="noopener noreferrer">
                                    términos y condiciones
                                </a>{" "}
                                y la{" "}
                                <a href="#/privacidad" target="_blank" rel="noopener noreferrer">
                                    política de privacidad
                                </a>
                                .
                            </div>
                        </div>
                        {errors.aceptaTerminos && (
                            <p className="input-error">{errors.aceptaTerminos.message}</p>
                        )}
                    </div>
                )}
            </div>

            <div style={{ marginTop: "24px", display: "flex", justifyContent: "space-between" }}>
                {step > 1 && (
                    <button
                        type="submit"
                        onClick={prevStep}
                        className="btn-login"
                        style={{ backgroundColor: "#444" }}
                    >
                        Atrás
                    </button>
                )}

                {step < 3 && (
                    <button type="button" onClick={nextStep} className="btn-login">
                        Siguiente
                    </button>
                )}

                {step === 3 && (
                    <Button
                        type="submit"
                        label="Registrarme"
                        icon="pi pi-user-plus"
                        className="btn-login"
                        loading={loading}
                        disabled={loading}
                    />
                )}
            </div>
        </form>
    );
};

export default RegisterForm;
