export const isValidEmail = (email) => {
    const match = String(email)
        .toLowerCase()
        .match(
            /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
        );

    return !!match;
};

export const isEmail = (clave) => (email) => {
    return isValidEmail(email) ? undefined : "Correo invalido. E.j. example@email.com";
};

export const optionalIsEmail = (email) => {
    if (!email) return true;

    return isValidEmail(email) ? undefined : "Correo invalido. E.j. example@email.com";
};

export const validatePasswordConfirmation = (clave) => (value) => {
    if (!clave) return true;
    return clave === value || "Las contraseñas no coinciden";
};

export const isStrongPassword = (password) => {
    // Al menos 8 caracteres, sin espacios en blanco
    const regex = /^\S{8,}$/;
    return regex.test(password)
        ? undefined
        : "La contraseña debe tener al menos 8 caracteres y no contener espacios.";
};

export const isRequired = (required, campo) => (value) => {
    if (required) {
        return value !== "" || `El campo ${campo} es requerido`;
    }

    return true;
};
