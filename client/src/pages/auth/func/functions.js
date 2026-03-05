export const generatePassword = () => {
    const upperCaseChars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const lowerCaseChars = "abcdefghijklmnopqrstuvwxyz";
    const numberChars = "0123456789";
    const specialChars = "!@#$%^&*()";

    // Asegurar que la contraseña tiene al menos un carácter de cada tipo
    let password = "";
    password += upperCaseChars.charAt(Math.floor(Math.random() * upperCaseChars.length));
    password += lowerCaseChars.charAt(Math.floor(Math.random() * lowerCaseChars.length));
    password += numberChars.charAt(Math.floor(Math.random() * numberChars.length));
    password += specialChars.charAt(Math.floor(Math.random() * specialChars.length));

    const allChars = upperCaseChars + lowerCaseChars + numberChars + specialChars;

    // Completar la contraseña hasta que tenga 12 caracteres
    for (let i = 4; i < 12; i++) {
        password += allChars.charAt(Math.floor(Math.random() * allChars.length));
    }

    // Mezclar los caracteres para que no siempre estén en el mismo orden
    password = password
        .split("")
        .sort(() => 0.5 - Math.random())
        .join("");

    return password;
};

export function getContrastingTextColor(hexColor = "#F9D689") {
    // Eliminar el `#` si está presente
    hexColor = hexColor?.replace("#", "");

    // Convertir el color a RGB
    const r = parseInt(hexColor?.substr(0, 2), 16);
    const g = parseInt(hexColor?.substr(2, 2), 16);
    const b = parseInt(hexColor?.substr(4, 2), 16);

    // Calcular luminancia relativa
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

    // Si es brillante, usar texto oscuro; si es oscuro, usar texto claro
    return luminance > 0.7 ? "#000000" : "#ffffff";
}
