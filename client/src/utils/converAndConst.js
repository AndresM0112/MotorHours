import { getContrastingTextColor } from "@pages/auth/func/functions";
import { useRef } from "react";

// CONSTANTES
export const APP_PREFIX = "mth";

export const headers = { "Content-Type": "application/json" };

export const nameSystem = "Gestión de tickets";

export const urlLogo = `${process.env.PUBLIC_URL}/images/logos/lamayoristanew.jpg`;

export const ruta = process.env.NODE_ENV === "development" ? "" : "/lamayoristanew/";

export const getInitials = (fullName) => {
    if (!fullName) return "";
    const parts = fullName.trim().split(/\s+/);
    const first = parts[0]?.[0] || "";
    const second = parts.length > 1 ? parts[parts.length - 1]?.[0] || "" : "";
    return (first + second).toUpperCase();
};

export const urlSocket =
    process.env.NODE_ENV === "development"
        ? "http://localhost:3000/"
        : "https://pavastecnologia.com/";

export const ticketPreviewURL =
    process.env.NODE_ENV === "development" 
    ? "/api/tickets/thumb/" : 
    "/lamayoristanew/api/tickets/thumb/";

export const pathSocket =
    process.env.NODE_ENV === "development" ? "/socket.io/" : "/lamayoristanew/socket.io/";

export const msnDatosObligatorios = "Hay información obligatoria por ingresar. Verificar";

export const appointmentsStatusColors = {
    1: { background: " #fde68a", color: "#7c4700", label: "POR CONFIRMAR" }, // Amarillo pastel
    2: { background: " #fed7aa", color: "#9a3412", label: "REPROGRAMADA" }, // Naranja pastel
    3: { background: " #fecaca", color: "#3730a3", label: "CANCELADA" }, // Azul pastel
    4: { background: " #fed7aa", color: "#991b1b", label: "CONFIRMADA" }, // Naranja pastel
    5: { background: " #e5e7eb", color: "#374151", label: "ASISTIÓ" }, // Gris pastel
    6: { background: " #fef9c3", color: "#a16207", label: "NO ASISTIÓ" }, // Amarillo claro pastel
    7: { background: " #fdf6b2", color: "#a16207", label: "POR REPROGRAMAR" }, // Amarillo muy claro pastel
};
export const daysOfWeek = [
    { label: "L", value: "monday", id: 1 },
    { label: "M", value: "tuesday", id: 2 },
    { label: "X", value: "wednesday", id: 3 },
    { label: "J", value: "thursday", id: 4 },
    { label: "V", value: "friday", id: 5 },
    { label: "S", value: "saturday", id: 6 },
    { label: "D", value: "sunday", id: 7 },
];

export const urlbase =
    process.env.NODE_ENV === "development"
        ? "http://localhost:5042/"
        : "https://pavastecnologia.com/lamayoristanew/";

export const estados = [
    { nombre: "Activo", id: 1 },
    { nombre: "Inactivo", id: 2 },
];

export const prioridades = [
    { nombre: "Normal", id: 1 },
    { nombre: "Urgente", id: 2 },
];

export const checkStatus = [
    { nombre: "Bueno", id: 1 },
    { nombre: "Malo", id: 2 },
];

export const optionsSelect = [
    { nombre: "SI", id: 1 },
    { nombre: "NO", id: 0 },
];

export const optionsYesorNotSelect = [
    { nombre: "SI", id: 2 },
    { nombre: "NO", id: 1 },
];

export const optionsAccountTypeSelect = [
    { nombre: "Crédito", id: 3 },
    { nombre: "Corriente", id: 2 },
    { nombre: "Ahorros", id: 1 },
];

export const propsDataTable = {
    scrollable: true,
    paginator: true,
    lazy: true,
    size: "small",
    emptyMessage: "No se encontraron datos",
    paginatorTemplate:
        "CurrentPageReport FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink RowsPerPageDropdown",
    currentPageReportTemplate: "{first} a {last} de {totalRecords}",
    rowsPerPageOptions: [50, 100, 150],    
};

export const propsPass = {
    weakLabel: "Debil",
    mediumLabel: "Media",
    strongLabel: "Alto",
};

export const propsSelectVS = {
    resetFilterOnHide: true,
    emptyMessage: "No Hay Datos",
    emptyFilterMessage: "No Hay Datos",
    optionLabel: "nombre",
    filterBy: "nombre",
    optionValue: "id",
    filter: true,
    showClear: true,
    virtualScrollerOptions: {
        emptyMessage: "No Hay Datos",
        itemSize: 38,
        lazy: false,
        showLoader: false,
        numToleratedItems: 2,
        delay: 0,
    },
    onShow: (e) => {
        const panel = document.querySelector(".p-dropdown-panel, .p-multiselect-panel");
        if (!panel) return;
        const scroller = panel.querySelector(".p-virtualscroller");
        const content = scroller?.querySelector(".p-virtualscroller-content");
        if (scroller && content) {
            scroller.scrollTop = 0;
            content.style.transform = "translateY(0px)";
        }
    },
    onFilter: (e) => {
        const panel = document.querySelector(".p-dropdown-panel, .p-multiselect-panel");
        if (!panel) return;
        const scroller = panel.querySelector(".p-virtualscroller");
        const content = scroller?.querySelector(".p-virtualscroller-content");
        if (scroller && content) {
            scroller.scrollTop = 0;
            content.style.transform = "translateY(0px)";
        }
    },
};

export const propsSelect = {
    resetFilterOnHide: true,
    emptyMessage: "No Hay Datos",
    emptyFilterMessage: "No Hay Datos",
    optionLabel: "nombre",
    filterBy: "nombre",
    optionValue: "id",
    filter: true,
    showClear: true,
    // virtualScrollerOptions: { itemSize: 38 },
};

export const propsSelectGeneric = {
    resetFilterOnHide: true,
    emptyMessage: "No Hay Datos",
    emptyFilterMessage: "No Hay Datos",
    filter: true,
    showClear: true,
};

export const arraysEqual = (a, b) => {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
        if (a[i] !== b[i]) return false;
    }
    return true;
};

export const propsSelectButton = {
    optionLabel: "nombre",
    optionValue: "id",
    unselectable: false,
};

export const propsCurrencyInput = {
    prefix: "$",
    decimalScale: 2,
    decimalsLimit: "10",
    decimalSeparator: ".",
    groupSeparator: ",",
    intlConfig: { locale: "en-US", currency: "USD" },
    className: "p-inputtext p-component text-right",
};

export const propsCalendar = {
    showButtonBar: true,
    showIcon: true,
    readOnlyInput: true,
    dateFormat: "yy-mm-dd",
    monthNavigator: "true",
    yearNavigator: "true",
    yearRange: "2000:2050",
};

export const brnl = (str, replaceMode) => {
    const replaceStr = replaceMode ? "\n" : "";
    return str !== null && str !== undefined && str !== ""
        ? str.replace(/<\s*\/?br\s*\/?>/gi, replaceStr)
        : "";
};

export const nlbr = (str, replaceMode, isXhtml) => {
    const breakTag = isXhtml ? "<br />" : "<br>";
    const replaceStr = replaceMode ? "$1" + breakTag : "$1" + breakTag + "$2";
    return (str + "").replace(/([^>\r\n]?)(\r\n|\n\r|\r|\n)/g, replaceStr);
};

export const strip_tags = (str, allow) => {
    allow = (((allow || "") + "").toLowerCase().match(/<[a-z][a-z0-9]*>/g) || []).join("");

    const tags = /<\/?([a-z][a-z0-9]*)\b[^>]*>/gi;
    const commentsAndPhpTags = /<!--[\s\S]*?-->|<\?(?:php)?[\s\S]*?\?>/gi;
    return str.replace(commentsAndPhpTags, "").replace(tags, function ($0, $1) {
        return allow.indexOf("<" + $1.toLowerCase() + ">") > -1 ? $0 : "";
    });
};

export const stripslashes = (str) => {
    return str
        .replace(/\\'/g, "'")
        .replace(/"/g, '"') // Escapes innecesarios eliminados
        .replace(/\\\\/g, "\\")
        .replace(/\\0/g, "\0")
        .replace(/font-family:.+?;/i, ""); // Aquí el patrón se corrigió también
};

export function maskEmail(email) {
    const [localPart, domain] = email.split("@");
    if (localPart.length > 2) {
        const firstTwo = localPart.substring(0, 2);
        const lastTwo = localPart.substring(localPart.length - 2);
        return `${firstTwo}********${lastTwo}@${domain}`;
    } else {
        return `${localPart}@${domain}`; // Caso en que el nombre de usuario es muy corto
    }
}

export const decodeToken = (token) => {
    try {
        const base64Url = token.split(".")[1]; // Extraer la parte del payload
        const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
        const jsonPayload = decodeURIComponent(
            atob(base64)
                .split("")
                .map(function (c) {
                    return "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2);
                })
                .join("")
        );

        return JSON.parse(jsonPayload); // Retorna el payload como objeto JSON
    } catch (error) {
        return null;
    }
};

export const truncateText = (text, maxLength = 100) => {
    if (!text) return "";
    if (text.length > maxLength) {
        return text.substring(0, maxLength) + "...";
    }
    return text;
};

// Diccionario para traducir meses de inglés a español
const monthTranslations = {
    January: "Enero",
    February: "Febrero",
    March: "Marzo",
    April: "Abril",
    May: "Mayo",
    June: "Junio",
    July: "Julio",
    August: "Agosto",
    September: "Septiembre",
    October: "Octubre",
    November: "Noviembre",
    December: "Diciembre",
};

// Función para traducir nombres de meses
export const translateMonths = (months) => {
    return months.map((monthYear) => {
        const [month, year] = monthYear.split(" "); // Separar mes y año
        const translatedMonth = monthTranslations[month] || month; // Traducir mes
        return `${translatedMonth} ${year}`; // Combinar mes traducido con el año
    });
};

export const CAPTCHA_SITE_KEY = process.env.REACT_APP_CAPTCHA_SITE_KEY;

// utils/rowColors.js

function hexToRgb(hex) {
    let h = String(hex || "")
        .replace("#", "")
        .trim();
    if (!h) h = "FFFFFF";
    if (h.length === 3)
        h = h
            .split("")
            .map((c) => c + c)
            .join("");
    const r = parseInt(h.slice(0, 2), 16);
    const g = parseInt(h.slice(2, 4), 16);
    const b = parseInt(h.slice(4, 6), 16);
    return { r: isFinite(r) ? r : 255, g: isFinite(g) ? g : 255, b: isFinite(b) ? b : 255 };
}

function getDynamicSheet() {
    const STYLE_ID = "dynamic-row-colors";
    let el = document.getElementById(STYLE_ID);
    if (!el) {
        el = document.createElement("style");
        el.id = STYLE_ID;
        el.type = "text/css";
        document.head.appendChild(el);
    }
    return el.sheet;
}

/**
 * Genera (si no existe) una clase con fondo rgba(color, alpha) y color de texto contrastante.
 * Devuelve el nombre de clase para usar en rowClassName.
 *
 * @param {object} rowData - Debe traer .color (por ejemplo "#FFAA00" o "FFAA00")
 * @param {number} alpha   - 0..1 (ej: 0.08)
 */
export function rowClassNew(rowData, alpha = 0.08) {
    const raw = rowData?.color ? String(rowData.color) : "FFFFFF";
    const hex = raw.startsWith("#") ? raw : `#${raw}`;
    const { r, g, b } = hexToRgb(hex);

    const hexClean = hex.replace("#", "").toUpperCase();
    const aKey = String(Math.round(Math.max(0, Math.min(1, alpha)) * 100)).padStart(2, "0");
    const className = `bg-color-${hexClean}-a${aKey}`;

    const sheet = getDynamicSheet();
    const exists = Array.from(sheet.cssRules || []).some(
        (rule) => rule.selectorText === `.${className}`
    );

    if (!exists) {
        const textColor =
            typeof getContrastingTextColor === "function"
                ? getContrastingTextColor(hex)
                : "#000000";

        // 1) regla base (UN SOLO BLOQUE)
        const ruleBase = `.${className}{background-color:rgba(${r},${g},${b},${alpha})!important;color:${textColor}!important;}`;
        sheet.insertRule(ruleBase, sheet.cssRules.length);

        // 2) regla para inputs (OTRO BLOQUE, otra llamada)
        const ruleInputs = `.${className} input,.${className} .p-inputtext{background-color:transparent!important;color:inherit;}`;
        sheet.insertRule(ruleInputs, sheet.cssRules.length);
    }

    return className;
}

export function useDebouncedCallback(callback, delay = 600) {
    const timeout = useRef();
    return (...args) => {
        if (timeout.current) clearTimeout(timeout.current);
        timeout.current = setTimeout(() => callback(...args), delay);
    };
}
