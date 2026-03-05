import { useState, useEffect } from "react";
import Axios from "axios";
import { headers } from "@utils/converAndConst";
import useHandleApiError from "@hook/useHandleApiError";

const usePermisosUsuario = ({ prfId, opc, usuId, visible }) => {
    const [ventanas, setVentanas] = useState([]);
    const [permisos, setPermisos] = useState({});
    const [permisosAdd, setPermisosAdd] = useState([]);
    const [loading, setLoading] = useState(false);

    const handleApiError = useHandleApiError();

    const fetchVentanasYPermisos = async () => {
        setLoading(true);
        try {
            const { data } = await Axios.get("api/security/permissions/get_windows_profile", {
                params: { prfId, idu: usuId },
                headers: {
                    ...headers,
                    Authorization: `Bearer ${localStorage.getItem("tokenMOTORHOURS")}`,
                },
            });

            const ventanasFiltradas = data.filter(
                (ven) => ven.parent_descripcion && ven.parent_descripcion !== "Sin Grupo"
            );
            setVentanas(ventanasFiltradas);

            const venidArray = ventanasFiltradas.map((v) => v.venid);
            const ruta =
                opc === 1
                    ? "api/security/permissions/get_permissions_profile"
                    : "api/security/permissions/get_permissions_user_window";
            const { data: permisosData } = await Axios.post(
                ruta,
                opc === 1 ? { venids: venidArray, prfId } : { venids: venidArray, usuId },
                {
                    headers: {
                        ...headers,
                        Authorization: `Bearer ${localStorage.getItem("tokenMOTORHOURS")}`,
                    },
                }
            );

            const newPermisos = {};
            permisosData.forEach((p) => {
                if (!newPermisos[p.venid]) newPermisos[p.venid] = [];
                newPermisos[p.venid].push(p);
            });

            setPermisos(newPermisos);
            setPermisosAdd(permisosData.filter((p) => p.asignado));
        } catch (error) {
            handleApiError(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (visible && (prfId || usuId)) fetchVentanasYPermisos();
        // eslint-disable-next-line
    }, [visible, prfId, usuId]);

    return {
        ventanas,
        permisos,
        permisosAdd,
        setPermisosAdd,
        loading,
    };
};

export default usePermisosUsuario;
