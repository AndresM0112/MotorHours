import { useContext, useMemo } from "react";
import { AuthContext } from "@context/auth/AuthContext";
import { config } from "./permissionsConfig";

// Hook personalizado para manejar permisos
const usePermissions = () => {
    const { permisos } = useContext(AuthContext);

    // console.log(permisos);

    // Optimización: useMemo para crear el Set solo cuando 'permisos' cambie
    const setPermissions = useMemo(() => new Set(permisos.map(({ perId }) => perId)), [permisos]);
    // console.log(setPermissions);

    /**
     * Verifica si el usuario tiene un permiso específico
     * @param {string} parent - El sistema principal (ejemplo: "cashierManagement", "branchManagement").
     * @param {string} module - El módulo dentro del sistema (ejemplo: "cashiers", "realestate").
     * @param {string} action - El tipo de acción que se desea realizar (ejemplo: "viewAll", "create", "edit", "delete").
     * @returns {boolean} - Retorna `true` si el usuario tiene el permiso, de lo contrario `false`.
     */
    const hasPermission = (parent, module, action) => {
        if (!permisos || permisos.length === 0) {
            // console.error(
            //     "No hay permisos disponibles para el usuario o aún no han sido cargados."
            // );
            return false;
        }

        if (!config[parent]) {
            // console.error(
            //     `El sistema principal '${parent}' no está definido en la configuración de permisos.`
            // );
            return false;
        }

        if (!config[parent][module]) {
            // console.error(`El módulo '${module}' no está definido en el sistema '${parent}'.`);
            return false;
        }

        const permissionId = config[parent][module][action];
        if (permissionId === null || permissionId === undefined) {
            // console.error(
            //     `El permiso para la acción '${action}' no está definido en el módulo '${module}' dentro del sistema '${parent}'.`
            // );
            return false;
        }

        return setPermissions.has(permissionId);
    };

    return { hasPermission };
};

export default usePermissions;
