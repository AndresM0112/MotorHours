// import { replace } from "lodash";
// import numeral from "numeral";

// // ----------------------------------------------------------------------

// export function fCurrency(number) {
//     return numeral(number).format(Number.isInteger(number) ? "$0,0" : "$0,0.00");
// }

// export function fCurrencyWithOutDecimal(number) {
//     return numeral(number).format("$0,0");
// }

// export function fPercent(number) {
//     return numeral(number / 100).format("0.0%");
// }

// export function fNumber(number) {
//     return numeral(number).format();
// }

// export function fShortenNumber(number) {
//     return replace(numeral(number).format("0.00a"), ".00", "");
// }

// export function fData(number) {
//     return numeral(number).format("0.0 b");
// }

// export const formatNumber = (value) => {
//     if (!value) return "";
//     return parseFloat(value).toLocaleString("es-ES", {
//         minimumFractionDigits: 2,
//         maximumFractionDigits: 2,
//     });
// };

// Formato moneda con decimales si no es entero
export function fCurrency(number, locale = "es-CO", currency = "COP") {
    if (number == null || isNaN(number)) return "";
    const options = {
        style: "currency",
        currency,
        minimumFractionDigits: Number.isInteger(number) ? 0 : 2,
        maximumFractionDigits: 2,
    };
    return new Intl.NumberFormat(locale, options).format(number);
}

// Moneda sin decimales
export function fCurrencyWithOutDecimal(number, locale = "es-CO", currency = "COP") {
    if (number == null || isNaN(number)) return "";
    return new Intl.NumberFormat(locale, {
        style: "currency",
        currency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(number);
}

// Porcentaje con un decimal
export function fPercent(number, locale = "es-CO") {
    if (number == null || isNaN(number)) return "";
    return (number / 100).toLocaleString(locale, {
        style: "percent",
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
    });
}

// Número estándar con separadores
export function fNumber(number, locale = "es-CO") {
    if (number == null || isNaN(number)) return "";
    return number.toLocaleString(locale);
}

// Números abreviados (K, M, B, T)
export function fShortenNumber(number, locale = "es-CO") {
    if (number == null || isNaN(number)) return "";
    const abs = Math.abs(number);
    const suffixes = ["", "K", "M", "B", "T"];
    const tier = Math.floor(Math.log10(abs) / 3);
    if (tier === 0) return number.toLocaleString(locale);
    const scaled = number / Math.pow(10, tier * 3);
    return `${scaled.toFixed(2)}${suffixes[tier]}`;
}

// Formato de bytes (ej: 3.5 MB)
export function fData(bytes, locale = "es-CO") {
    if (bytes == null || isNaN(bytes)) return "";
    const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
    if (bytes === 0) return "0 Bytes";
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    const size = bytes / Math.pow(1024, i);
    return `${size.toLocaleString(locale, {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
    })} ${sizes[i]}`;
}

// Formato genérico de número con 2 decimales
export const formatNumber = (value, locale = "es-CO") => {
    if (!value || isNaN(value)) return "";
    return parseFloat(value).toLocaleString(locale, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
};
