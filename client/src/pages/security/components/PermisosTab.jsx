import React, { useEffect, useState, useMemo } from "react";
import { Dropdown } from "primereact/dropdown";
import { InputSwitch } from "primereact/inputswitch";
import { Checkbox } from "primereact/checkbox";
import usePermisosUsuario from "@hook/usePermisosUsuario";
import { propsSelect } from "@utils/converAndConst";
import "@styles/venpermisos.css";

const PermisosTab = ({ prfId, opc = 2, usuId, visible, onPermisosChange }) => {
    const {
        ventanas,
        permisos,
        permisosAdd,
        setPermisosAdd,
        loading: loadingPermisos,
    } = usePermisosUsuario({ prfId, opc, usuId, visible });

    const [searchTerm, setSearchTerm] = useState("");
    const [selectedGroup, setSelectedGroup] = useState(null);

    const groupedVentanas = useMemo(() => {
        const grouped = {};
        ventanas.forEach((ven) => {
            if (!grouped[ven.parent_descripcion]) {
                grouped[ven.parent_descripcion] = [];
            }
            grouped[ven.parent_descripcion].push(ven);
        });
        return grouped;
    }, [ventanas]);

    useEffect(() => {
        if (Object.keys(groupedVentanas).length > 0 && !selectedGroup) {
            setSelectedGroup(Object.keys(groupedVentanas)[0]);
        }
    }, [groupedVentanas, selectedGroup]);

    useEffect(() => {
        onPermisosChange(permisosAdd); // notifica cambios al padre
    }, [permisosAdd, onPermisosChange]);

    const updatePermissions = (perId) => {
        setPermisosAdd((prev) => {
            const isAdded = prev.some((perm) => perm.perId === perId);
            return isAdded ? prev.filter((perm) => perm.perId !== perId) : [...prev, { perId }];
        });
    };

    const handleAccessAll = (venid) => {
        const venPerms = permisos[venid] || [];
        const allChecked = isAccessAllChecked(venid);
        setPermisosAdd((prev) =>
            allChecked
                ? prev.filter((perm) => !venPerms.some((p) => p.perId === perm.perId))
                : [...prev, ...venPerms.filter((p) => !prev.some((perm) => perm.perId === p.perId))]
        );
    };

    const isAccessAllChecked = (venid) =>
        (permisos[venid] || []).every(({ perId }) =>
            permisosAdd.some((permiso) => permiso.perId === perId)
        );

    return (
        <div className="permisos-tab" style={{ width: "100%", marginBottom: "60px" }}>
            {loadingPermisos ? (
                <div className="loader-container">
                    <span className="loader-5"></span>
                    <strong>Obteniendo datos ...</strong>
                </div>
            ) : ventanas.length === 0 ? (
                <div className="text-center">
                    <img src={`${process.env.PUBLIC_URL}/images/nodata.svg`} alt="nodata" />
                    <h4>No hay ventanas disponibles para este perfil</h4>
                </div>
            ) : (
                <>
                    <div
                        className="mb-2"
                        style={{ background: "white", position: "sticky", top: 0, zIndex: 10 }}
                    >
                        <Dropdown
                            {...propsSelect}
                            value={selectedGroup}
                            options={Object.keys(groupedVentanas)
                                .map((key) => ({
                                    id: key,
                                    nombre: key,
                                    orden: groupedVentanas[key][0]?.orden || 0,
                                }))
                                .sort((a, b) => a.orden - b.orden)}
                            onChange={(e) => setSelectedGroup(e.value)}
                            placeholder="Seleccione un grupo"
                            className="mb-2"
                            style={{ width: "100%" }}
                        />

                        {selectedGroup && (
                            <div className="p-inputgroup mb-2">
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

                    {selectedGroup &&
                        groupedVentanas[selectedGroup]
                            .filter(({ venid }) =>
                                permisos[venid]?.some(({ nombre }) =>
                                    nombre.toLowerCase().includes(searchTerm.toLowerCase())
                                )
                            )
                            .map(({ venid, descripcion }) => (
                                <div key={venid} className="mb-3">
                                    <h4 className="permisos-header">
                                        {descripcion}
                                        <span className="access-all">
                                            <Checkbox
                                                inputId={`acceso-${venid}`}
                                                checked={isAccessAllChecked(venid)}
                                                onChange={() => handleAccessAll(venid)}
                                            />
                                            <label
                                                htmlFor={`acceso-${venid}`}
                                                className="access-label"
                                            >
                                                Acceso a todos
                                            </label>
                                        </span>
                                    </h4>
                                    {permisos[venid]?.map(({ perId, nombre }) => (
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
                                                checked={permisosAdd.some((p) => p.perId === perId)}
                                                onChange={() => updatePermissions(perId)}
                                            />
                                        </div>
                                    ))}
                                </div>
                            ))}
                </>
            )}
        </div>
    );
};

export default PermisosTab;
