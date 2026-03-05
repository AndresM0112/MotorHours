/* eslint-disable  */
import moment from "moment";
import "moment/locale/es";
import { formatDistanceToNow, parseISO, format } from "date-fns";
import { es } from "date-fns/locale";

// eslint-disable-next-line prettier/prettier
// ----------------------------------------------------------------------

export function getCurrentDate() {
    return moment().format("YYYY-MM-DD HH:mm:ss");
}

export function fDate(date) {
    return moment(date).format("DD MMMM yyyy");
}

export function fDateTime(date) {
    return moment(date).format("DD MMM yyyy HH:mm");
}

export function fTime(date) {
    return moment(date, "HH:mm").format("HH:mm");
}

export function fDateTimeSuffix(date) {
    return moment(date).format("DD/MM/yyyy hh:mm p");
}

export function fDateYearMonth(date) {
    return moment(date).format("yyyy - MMM");
}

export function fDate2(date) {
    return moment(date).format("YYYY-MM-DD");
}

export const forfecha = (f) => {
    return new Date(moment(f).format("YYYY"), moment(f).format("MM") - 1, moment(f).format("DD"));
};
export const hora = (f) => {
    return new Date(moment(f, "HH:mm"));
};

// FECHA RELATIVA SI LA FECHA ES HOY RETORNA "HOY" SI ES DE AYER RETORNA "AYER" SI ES HACE TIEMPO RETORNA 24 DE JULIO DEL 2024 POR EJEMPLO
export const formatNotificationDate = (dateString) => {
    const date = parseISO(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
        return "Hoy";
    } else if (date.toDateString() === yesterday.toDateString()) {
        return "Ayer";
    } else {
        return format(date, "EEEE d MMMM yyyy", { locale: es });
    }
};

// HORA RELATIVA SI LA HORA ES MENOR A 24 HORAS RETORANAR YA SEA QUE HACE UN MINUTO HACE 2 HORAS, ETC, SI NO RETORNA LA HORA
export const formatNotificationTime = (dateString) => {
    const date = parseISO(dateString);
    const now = new Date();
    const diff = now - date;

    if (diff < 24 * 60 * 60 * 1000) {
        return formatDistanceToNow(date, { addSuffix: true, locale: es });
    }

    return format(date, "p", { locale: es });
};

export const formatNotificationDateTime = (dateString) => {
    if (!dateString) return;
    const date = parseISO(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    let datePart;

    if (date.toDateString() === today.toDateString()) {
        datePart = "Hoy";
    } else if (date.toDateString() === yesterday.toDateString()) {
        datePart = "Ayer";
    } else {
        datePart = date ? format(date, "EEE, d MMMM yyyy", { locale: es }) : "";
    }

    const diff = today - date;

    if (diff < 24 * 60 * 60 * 1000) {
        const timePart = formatDistanceToNow(date, { addSuffix: true, locale: es });
        return `${datePart} ${timePart}`;
    }

    const timePart = format(date, "p", { locale: es });
    return `${datePart} ${timePart}`;
};
