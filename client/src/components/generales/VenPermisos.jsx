import React, { useContext, useEffect, useState } from "react";
import Axios from "axios";
import { useMediaQueryContext } from "@context/mediaQuery/mediaQueryContext";
import useHandleApiError from "@hook/useHandleApiError";
import { Sidebar } from "primereact/sidebar";
import { Dropdown } from "primereact/dropdown";
import { InputSwitch } from "primereact/inputswitch";
import { Checkbox } from "primereact/checkbox";
import { Button } from "primereact/button";
import { headers, propsSelect } from "@utils/converAndConst";
import { ToastContext } from "@context/toast/ToastContext";
import "@styles/venpermisos.css";

export const VenPermisos = ({ visible, setVisible, title, prfId, opc, usuId }) => {
    const { showSuccess } = useContext(ToastContext);
    const { isMobile, isTablet, isDesktop } = useMediaQueryContext();
    const [ventanas, setVentanas] = useState([]);
    const [loading, setLoading] = useState(false);
    const [permisos, setPermisos] = useState({});
    const [permisosAdd, setPermisosAdd] = useState([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedGroup, setSelectedGroup] = useState(null);
    const handleApiError = useHandleApiError();

    const getPermissions = async (venidArray, initialPermisos) => {
        try {
            const ruta =
                opc === 1
                    ? "api/security/permissions/get_permissions_profile"
                    : "api/security/permissions/get_permissions_user_window";
            const params =
                opc === 1 ? { venids: venidArray, prfId } : { venids: venidArray, usuId };

            const { data } = await Axios.post(ruta, params, {
                headers: {
                    ...headers,
                    Authorization: `Bearer ${localStorage.getItem("tokenMOTORHOURS")}`,
                },
            });

            data.forEach((permission) => {
                if (!initialPermisos[permission.venid]) {
                    initialPermisos[permission.venid] = [];
                }
                initialPermisos[permission.venid].push(permission);
            });

            setPermisos(initialPermisos);

            // Obtener permisos asignados para el usuario o perfil
            const permisosAsignados = data.filter((permiso) => permiso.asignado);
            setPermisosAdd(permisosAsignados);
        } catch (error) {
            handleApiError(error);
        }
    };

    const fetchVentanas = async () => {
        setLoading(true);

        try {
            const { data } = await Axios.get("api/security/permissions/get_windows_profile", {
                params: { prfId, idu: usuId },
                headers: {
                    ...headers,
                    Authorization: `Bearer ${localStorage.getItem("tokenMOTORHOURS")}`,
                },
            });

            if (!data.length > 0) return;

            const ventanasFiltradas = data.filter(
                (ven) => ven.parent_descripcion && ven.parent_descripcion !== "Sin Grupo"
            );

            setVentanas(ventanasFiltradas);
            const initialPermisos = {};

            // Crear un array de IDs de ventanas
            const venidArray = ventanasFiltradas.map((ven) => ven.venid);

            // Hacer una sola petición para obtener los permisos por ventana
            await getPermissions(venidArray, initialPermisos);
        } catch (error) {
            handleApiError(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (visible) {
            fetchVentanas();
        }
        // eslint-disable-next-line
    }, [visible, prfId, opc, usuId]);

    // Agrupar ventanas y mantener el orden
    const groupedVentanas = ventanas.reduce((acc, ven) => {
        const groupKey = ven.parent_descripcion;

        if (!acc[groupKey]) {
            acc[groupKey] = [];
        }
        acc[groupKey].push(ven);

        return acc;
    }, {});

    useEffect(() => {
        // Establecer el primer grupo como selección predeterminada cuando las ventanas están disponibles
        if (Object.keys(groupedVentanas).length > 0 && !selectedGroup) {
            setSelectedGroup(Object.keys(groupedVentanas)[0]);
        }
    }, [groupedVentanas, selectedGroup]);

    const handleSave = async () => {
        try {
            const ruta =
                opc === 1
                    ? "api/security/permissions/update_permissions_profile"
                    : "api/security/permissions/update_permissions_user";

            const params =
                opc === 1
                    ? { permissions: permisosAdd.map((p) => p.perId), prfId }
                    : { permissions: permisosAdd.map((p) => p.perId), usuId };

            const { data } = await Axios.post(ruta, params, {
                headers: {
                    ...headers,
                    Authorization: `Bearer ${localStorage.getItem("tokenMOTORHOURS")}`,
                },
            });

            showSuccess(data.message);
            // setVisible(false);
        } catch (error) {
            handleApiError(error);
        }
    };

    const updatePermissions = (perId) => {
        setPermisosAdd((prev) => {
            const isAdded = prev.some((perm) => perm.perId === perId);
            if (isAdded) {
                return prev.filter((perm) => perm.perId !== perId);
            } else {
                return [...prev, { perId }];
            }
        });
    };

    const handleAccessAll = (venid) => {
        const permissions = permisos[venid];
        const allChecked = isAccessAllChecked(venid);
        if (allChecked) {
            setPermisosAdd((prev) =>
                prev.filter((perm) => !permissions.some((p) => p.perId === perm.perId))
            );
        } else {
            setPermisosAdd((prev) => [
                ...prev,
                ...permissions.filter((p) => !prev.some((perm) => perm.perId === p.perId)),
            ]);
        }
    };

    const isAccessAllChecked = (venid) => {
        if (permisos[venid] && permisos[venid].length > 0) {
            return permisos[venid].every(({ perId }) =>
                permisosAdd.some((permiso) => permiso.perId === perId)
            );
        }
        return false;
    };

    return (
        <Sidebar
            visible={visible}
            onHide={() => {
                setVisible(false);
            }}
            dismissable={true}
            position="right"
            style={{ width: isMobile ? 320 : isTablet ? 500 : isDesktop ? 450 : 450 }}
        >
            <p style={{ fontSize: "16px", fontWeight: 600 }}>{title}</p>
            {loading ? (
                <div className="loader-container">
                    <span className="loader-5"></span>
                    <strong>Obteniendo datos ...</strong>
                </div>
            ) : (
                <>
                    {ventanas.length > 0 ? (
                        <>
                            <div
                                className="p-fluid mb-2 sidebar-content"
                                style={{ marginBottom: "3px" }}
                            >
                                <div
                                    style={{
                                        position: "sticky",
                                        top: "0",
                                        zIndex: "10",
                                        backgroundColor: "white",
                                        paddingBottom: "5px", // Espaciado adicional si es necesario
                                    }}
                                >
                                    <Dropdown
                                        {...propsSelect}
                                        value={selectedGroup}
                                        options={Object.keys(groupedVentanas)
                                            .map((key) => ({
                                                id: key,
                                                nombre: key,
                                                orden: groupedVentanas[key][0]?.orden || 0, // Usar el valor 'orden' del primer elemento del grupo
                                            }))
                                            .sort((a, b) => a.orden - b.orden)} // Ordenar las opciones por 'orden'
                                        onChange={(e) => setSelectedGroup(e.value)}
                                        placeholder="Seleccione un grupo"
                                        className="mb-2"
                                        style={{ width: "100%" }} // Asegura que ocupe el espacio completo
                                    />

                                    {selectedGroup && (
                                        <div
                                            className="p-inputgroup"
                                            style={{
                                                marginBottom: "3px",
                                                backgroundColor: "white",
                                            }}
                                        >
                                            <span className="p-inputgroup-addon">
                                                <i className="pi pi-search"></i>
                                            </span>
                                            <input
                                                type="text"
                                                placeholder="Buscar módulo"
                                                value={searchTerm}
                                                onChange={(e) => setSearchTerm(e.target.value)}
                                                className="p-inputtext p-component"
                                            />
                                        </div>
                                    )}
                                </div>
                                {selectedGroup && (
                                    <>
                                        {selectedGroup && groupedVentanas[selectedGroup] ? (
                                            groupedVentanas[selectedGroup]
                                                .filter(({ venid }) =>
                                                    permisos[venid]?.some(({ nombre }) =>
                                                        nombre
                                                            ?.toLowerCase()
                                                            .includes(searchTerm.toLowerCase())
                                                    )
                                                )
                                                .map(({ venid, descripcion }) => (
                                                    <div key={venid} className="mb-3">
                                                        <h4
                                                            style={{
                                                                fontSize: "14px",
                                                                fontWeight: 600,
                                                            }}
                                                        >
                                                            {descripcion}
                                                            <span className="access-all">
                                                                <Checkbox
                                                                    inputId={`acceso-${venid}`}
                                                                    checked={isAccessAllChecked(
                                                                        venid
                                                                    )}
                                                                    onChange={() =>
                                                                        handleAccessAll(venid)
                                                                    }
                                                                />
                                                                <label
                                                                    htmlFor={`acceso-${venid}`}
                                                                    className="access-label"
                                                                >
                                                                    Acceso a todos
                                                                </label>
                                                            </span>
                                                        </h4>
                                                        {permisos[venid] &&
                                                        permisos[venid].length > 0 ? (
                                                            permisos[venid].map(
                                                                ({ perId, nombre }) => (
                                                                    <div
                                                                        key={perId}
                                                                        className="permission-item p-d-flex p-ai-center p-jc-between"
                                                                    >
                                                                        <div className="permission-info p-d-flex p-ai-center">
                                                                            <i className="pi pi-shield permission-icon"></i>
                                                                            <div className="p-ml-2">
                                                                                <span className="permission-name">
                                                                                    {nombre}
                                                                                </span>
                                                                            </div>
                                                                        </div>
                                                                        <InputSwitch
                                                                            checked={permisosAdd.some(
                                                                                (per) =>
                                                                                    per.perId ===
                                                                                    perId
                                                                            )}
                                                                            onChange={() =>
                                                                                updatePermissions(
                                                                                    perId
                                                                                )
                                                                            }
                                                                        />
                                                                    </div>
                                                                )
                                                            )
                                                        ) : (
                                                            <div className="no-permissions">
                                                                <p>No hay permisos disponibles.</p>
                                                            </div>
                                                        )}
                                                    </div>
                                                ))
                                        ) : (
                                            <p>
                                                No se encontraron módulos o no hay un grupo
                                                seleccionado.
                                            </p>
                                        )}
                                    </>
                                )}
                            </div>
                            <div className="sidebar-footer">
                                <Button label="Guardar" icon="pi pi-save" onClick={handleSave} />
                            </div>
                        </>
                    ) : (
                        <>
                            <img
                                src={`${process.env.PUBLIC_URL}/images/nodata.svg`}
                                alt="No data"
                            />
                            <h4 className="text-center">
                                Lo siento! Al parecer no hay ventanas para asignar los permisos.
                            </h4>
                        </>
                    )}
                </>
            )}
        </Sidebar>
    );
};
