// Normaliza: lowercase + sin tildes + trim
const normalize = (str) =>
    (str || "")
        .toString()
        .trim()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");

/**
 * Devuelve una regla especial para locales de INFRAESTRUCTURA,
 * o null si el local se comporta normal.
 *
 * Por ahora NO tocamos:
 *  - ZONAS COMUNES (ZC)
 *  - BAÑOS PÚBLICOS (BP)
 */
export const getInfraRuleForLocal = (local) => {
    if (!local) return null;

    const name = normalize(local.nombre);
    const code = normalize(local.codigo);

    // ❌ De momento NO aplicar reglas especiales a estos:
    if (code === "zc" || name === "zonas comunes") return null;
    if (code === "bp" || name === "banos publicos") return null;

    // --------- PORTERÍAS 1–6 ---------
    if (code === "pt1" || name === "porteria 1") {
        return {
            type: "PORTERIA_1",
            hideBlock: true,
            hideOwner: true,
            autoAssignMaintenance: false,
        };
    }
    if (code === "pt2" || name === "porteria 2") {
        return {
            type: "PORTERIA_2",
            hideBlock: true,
            hideOwner: true,
            autoAssignMaintenance: false,
        };
    }
    if (code === "pt3" || name === "porteria 3") {
        return {
            type: "PORTERIA_3",
            hideBlock: true,
            hideOwner: true,
            autoAssignMaintenance: false,
        };
    }
    if (code === "pt4" || name === "porteria 4") {
        return {
            type: "PORTERIA_4",
            hideBlock: true,
            hideOwner: true,
            autoAssignMaintenance: false,
        };
    }
    if (code === "pt5" || name === "porteria 5") {
        return {
            type: "PORTERIA_5",
            hideBlock: true,
            hideOwner: true,
            autoAssignMaintenance: false,
        };
    }
    if (code === "pt6" || name === "porteria 6") {
        return {
            type: "PORTERIA_6",
            hideBlock: true,
            hideOwner: true,
            autoAssignMaintenance: false,
        };
    }

    // --------- CENTRO DEPORTIVO ---------
    if (code === "cd" || name === "centro deportivo") {
        return {
            type: "CENTRO_DEPORTIVO",
            hideBlock: true,
            hideOwner: true,
            autoAssignMaintenance: false,
        };
    }

    // --------- ASCENSORES ---------
    if (code === "asc" || name === "ascensores") {
        return {
            type: "ASCENSORES",
            hideBlock: true,
            hideOwner: true,
            autoAssignMaintenance: true,
        };
    }

    // --------- RAMPAS ELÉCTRICAS ---------
    if (code === "rae" || name === "rampas electricas" || name === "rampa electrica") {
        return {
            type: "RAMPAS_ELECTRICAS",
            hideBlock: true,
            hideOwner: true,
            autoAssignMaintenance: true,
        };
    }

    // --------- ESCALERAS ELÉCTRICAS ---------
    if (code === "esc" || name === "escaleras electricas" || name === "escalera electrica") {
        return {
            type: "ESCALERAS_ELECTRICAS",
            hideBlock: true,
            hideOwner: true,
            autoAssignMaintenance: true,
        };
    }

    // --------- FUNDACIÓN ---------
    if (code === "fd" || name === "fundacion") {
        return {
            type: "FUNDACION",
            hideBlock: true,
            hideOwner: true,
            autoAssignMaintenance: false,
        };
    }

    // --------- ESTACIÓN AMBIENTAL ---------
    if (code === "eam" || name === "estacion ambiental") {
        return {
            type: "ESTACION_AMBIENTAL",
            hideBlock: true,
            hideOwner: true,
            autoAssignMaintenance: false,
        };
    }

    // --------- CAPILLA ---------
    if (code === "cap" || name === "capilla") {
        return { type: "CAPILLA", hideBlock: true, hideOwner: true, autoAssignMaintenance: false };
    }

    // Todo lo demás se comporta normal
    return null;
};
