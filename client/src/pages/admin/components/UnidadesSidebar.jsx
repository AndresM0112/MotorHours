import React, { useState, useEffect } from "react";
import { FixedSizeList as List } from "react-window";
import { useRef, useLayoutEffect } from "react";

import { Sidebar } from "primereact/sidebar";
import { Card } from "primereact/card";
import { InputText } from "primereact/inputtext";
import { Button } from "primereact/button";
import { MultiSelect } from "primereact/multiselect";
import { getClientsApi } from "@api/requests";
import {
    getUnidadesByEtapaAPI,
    createUnidadAPI,
    updateUnidadAPI,
    deleteUnidadAPI,
} from "../../../api/requests/blocksApi";
import { useMediaQueryContext } from "@context/mediaQuery/mediaQueryContext";
import "../../../styles/ProjectDetail.css";
import { propsSelectVS } from "@utils/converAndConst";
import { TabPanel, TabView } from "primereact/tabview";
import { Badge } from "primereact/badge";

// Template para mostrar cliente en el MultiSelect
const clienteTemplate = (option) => (
    <div>
        <div style={{ fontWeight: 600 }}>
            {option?.nombre} ({option?.documento || ""})
        </div>
        <div style={{ fontSize: 12, color: "#888" }}>
            {option?.telefono || ""} | {option?.correo || ""}
        </div>
    </div>
);

const UnidadesSidebar = ({ visible, onHide, etapa, usuarioActual, etapas, setEtapas }) => {
    const disponiblesRef = useRef(null);
    const noDisponiblesRef = useRef(null);
    const [heightDisponibles, setHeightDisponibles] = useState(300);
    const [heightNoDisponibles, setHeightNoDisponibles] = useState(300);

    useLayoutEffect(() => {
        const obs1 = new ResizeObserver(([entry]) => {
            setHeightDisponibles(entry.contentRect.height);
        });
        const obs2 = new ResizeObserver(([entry]) => {
            setHeightNoDisponibles(entry.contentRect.height);
        });

        if (disponiblesRef.current) obs1.observe(disponiblesRef.current);
        if (noDisponiblesRef.current) obs2.observe(noDisponiblesRef.current);

        return () => {
            obs1.disconnect();
            obs2.disconnect();
        };
    }, []);

    const [unidades, setUnidades] = useState([]);
    const [clientes, setClientes] = useState([]);
    const [unidadesDisponibles, setUnidadesDisponibles] = useState([]);
    const [unidadesNoDisponibles, setUnidadesNoDisponibles] = useState([]);
    const [unidadFilter, setUnidadFilter] = useState("");
    const [buscarCliente, setBuscarCliente] = useState("");
    const [newUnidad, setNewUnidad] = useState(null);
    const [errorUnidad, setErrorUnidad] = useState({});
    const [editUnidad, setEditUnidad] = useState({});
    const [activeTab, setActiveTab] = useState(0);

    const { isMobile } = useMediaQueryContext();

    // Cargar clientes y unidades al abrir sidebar
    useEffect(() => {
        if (visible && etapa) {
            getClientsApi()
                .then((res) => setClientes(res.data))
                .catch(() => setClientes([]));
            getUnidadesByEtapaAPI(etapa.etaId)
                .then((res) => setUnidades(res.data))
                .catch(() => setUnidades([]));
        }
    }, [visible, etapa]);

    // Filtro de unidades por nombre y por datos de clientes
    const unidadesFiltradas = React.useMemo(() => {
        const q = unidadFilter.toLowerCase();
        return unidades.filter((u) => {
            if (u.nombre.toLowerCase().includes(q)) return true;
            return u.clientes.some(
                (c) =>
                    c.nombre.toLowerCase().includes(q) ||
                    (c.documento || "").toLowerCase().includes(q) ||
                    (c.telefono || "").toLowerCase().includes(q) ||
                    (c.correo || "").toLowerCase().includes(q)
            );
        });
    }, [unidades, unidadFilter]);

    // Validar nombre único en unidades
    const isUnidadNombreUnico = (nombre, id) =>
        !unidades.some(
            (u) => u.nombre.trim().toLowerCase() === nombre.trim().toLowerCase() && u.id !== id
        );

    // Guardar nueva unidad
    const handleSaveNewUnidad = () => {
        let msg = "";
        if (!newUnidad.nombre.trim()) msg = "El nombre no puede estar vacío";
        else if (!isUnidadNombreUnico(newUnidad.nombre)) msg = "El nombre ya existe";
        if (msg) {
            setErrorUnidad((prev) => ({ ...prev, new: msg }));
            return;
        }
        createUnidadAPI({
            etapaId: etapa.etaId,
            nombre: newUnidad.nombre.trim(),
            clientes: newUnidad.clientes ? newUnidad.clientes.map((c) => c.id) : [],
            usuarioRegistro: usuarioActual,
        }).then((res) => {
            setNewUnidad(null);
            setErrorUnidad((prev) => ({ ...prev, new: null }));
            setUnidades((prevUnidades) => [
                ...prevUnidades,
                {
                    id: res.data.data.unidadId,
                    nombre: newUnidad.nombre.trim(),
                    clientes: newUnidad.clientes || [],
                },
            ]);
            setEtapas((prev) =>
                prev.map((e) =>
                    e.etaId === etapa.etaId ? { ...e, unidades: (e.unidades || 0) + 1 } : e
                )
            );
            // getUnidadesByEtapaAPI(etapa.etaId).then((res) => {
            //     setUnidades(res.data);
            //     setEtapas((prev) =>
            //         prev.map((e) =>
            //             e.etaId === etapa.etaId ? { ...e, unidades: res.data.length } : e
            //         )
            //     );
            // });
        });
    };

    // Cancelar nueva unidad
    const handleCancelNewUnidad = () => {
        setNewUnidad(null);
        setErrorUnidad((prev) => ({ ...prev, new: null }));
    };

    // Actualizar nombre temporalmente
    const handleUnidadNombreChange = (idx, value, unidades) => {
        try {
            const unidad = unidades[idx];
            setEditUnidad((prev) => ({
                ...prev,
                [unidad.id]: { ...prev[unidad.id], nombre: value },
            }));
        } catch (error) {
            console.error(error);
        }
    };

    // Actualizar clientes temporalmente
    const handleUnidadClientesChange = (idx, value, unidades) => {
        const unidad = unidades[idx];
        setEditUnidad((prev) => ({
            ...prev,
            [unidad.id]: {
                ...prev[unidad.id],
                clientes: value ? clientes.filter((c) => value.includes(c.id)) : [],
            },
        }));
    };

    // Guardar cambios al perder foco
    const handleUnidadNombreBlur = (idx, unidades) => {
        const unidad = unidades[idx];
        const nombre = editUnidad[unidad.id]?.nombre ?? unidad.nombre;
        const clientesArr = editUnidad[unidad.id]?.clientes ?? unidad.clientes;
        if (!nombre.trim() || !isUnidadNombreUnico(nombre, unidad.id)) {
            setErrorUnidad((prev) => ({
                ...prev,
                [unidad.id]: !nombre.trim()
                    ? "El nombre no puede estar vacío"
                    : "El nombre ya existe",
            }));
            return;
        }
        setErrorUnidad((prev) => ({ ...prev, [unidad.id]: null }));
        updateUnidadAPI(unidad.id, {
            nombre: nombre.trim(),
            clientes: clientesArr.map((c) => c.id), // <-- SOLO IDs
            usuarioActualiza: usuarioActual,
            etaId: etapa.etaId,
        }).then(() => {
            setUnidades((prevUnidades) =>
                prevUnidades.map((item, i) =>
                    i === idx
                        ? {
                              ...item,
                              nombre: nombre.trim(),
                              clientes: clientesArr,
                          }
                        : item
                )
            );
            // getUnidadesByEtapaAPI(etapa.etaId).then((res) => setUnidades(res.data));
        });
    };

    const handleUnidadClientesBlur = (idx, unidades) => {
        const unidad = unidades[idx];
        const clientesArr = editUnidad[unidad.id]?.clientes ?? unidad.clientes;
        setErrorUnidad((prev) => ({ ...prev, [unidad.id]: null }));
        updateUnidadAPI(unidad.id, {
            nombre: (editUnidad[unidad.id]?.nombre ?? unidad.nombre).trim(),
            clientes: clientesArr.map((c) => c.id),
            usuarioActualiza: usuarioActual,
            etaId: etapa.etaId,
        })
            .then(() => {
                setUnidades((prevUnidades) =>
                    prevUnidades.map((item) =>
                        item.id === unidad.id
                            ? {
                                  ...item,
                                  clientes: clientesArr,
                              }
                            : item
                    )
                );
                // getUnidadesByEtapaAPI(etapa.etaId).then((res) => setUnidades(res.data));
            })
            .catch((error) => {
                console.error(error);
            });
    };

    // Eliminar unidad
    const handleDeleteUnidadRow = (idx, unidades) => {
        deleteUnidadAPI(unidades[idx].id).then(() => {
            setUnidades((prevUnidades) => prevUnidades.filter((_, i) => i !== idx));
            // getUnidadesByEtapaAPI(etapa.etaId).then((res) => {
            //     setUnidades(res.data);
            //     setEtapas((prev) =>
            //         prev.map((e) =>
            //             e.etaId === etapa.etaId ? { ...e, unidades: res.data.length } : e
            //         )
            //     );
            // });
        });
    };

    // Estilos responsivos
    const sidebarStyle = isMobile
        ? { width: "100vw", maxWidth: "100vw", left: 0 }
        : { width: "100%", maxWidth: 800 };

    const unidadRowStyle = isMobile
        ? {
              display: "flex",
              flexDirection: "column",
              gap: 8,
              marginBottom: 16,
              background: "#f8f9fa",
              borderRadius: 8,
              padding: 12,
          }
        : {
              display: "flex",
              alignItems: "center",
              gap: 12,
              marginBottom: 12,
              background: "#f8f9fa",
              borderRadius: 8,
              padding: 10,
          };

    useEffect(() => {
        const timeoutId = setTimeout(() => {
            setUnidadesDisponibles(
                unidadesFiltradas.filter((u) => !u.clientes || u.clientes.length === 0)
            );
            setUnidadesNoDisponibles(
                unidadesFiltradas.filter((u) => u.clientes && u.clientes.length > 0)
            );
        }, 800); // Espera 800ms antes de actualizar

        return () => clearTimeout(timeoutId); // Limpiar si cambia antes de tiempo
    }, [unidadesFiltradas]);

    return (
        <Sidebar
            visible={visible}
            position="right"
            style={sidebarStyle}
            onHide={onHide}
            className="sidebar-unidades"
            blockScroll={isMobile}
        >
            <Card title={etapa?.nombre || "Etapa"}>
                <div className="sidebar-unidades-panel">
                    <div
                        className="unidades-filter-row"
                        style={{ marginBottom: isMobile ? 18 : 12 }}
                    >
                        <InputText
                            value={unidadFilter}
                            onChange={(e) => setUnidadFilter(e.target.value)}
                            placeholder="Buscar unidad o cliente"
                            style={{
                                width: "100%",
                                marginBottom: isMobile ? 8 : 16,
                                fontSize: isMobile ? 18 : 15,
                                padding: isMobile ? "12px" : "8px",
                            }}
                        />
                    </div>
                    <TabView activeIndex={activeTab} onTabChange={(e) => setActiveTab(e.index)}>
                        <TabPanel
                            header={
                                <span>
                                    Disponibles{" "}
                                    <Badge value={unidadesDisponibles.length} severity="info" />
                                </span>
                            }
                        >
                            {/* <div className="unidades-list">
                                {unidadesDisponibles.map((u, idx) => (
                                    <div key={u.id} className="unidad-row" style={unidadRowStyle}>
                                        <InputText
                                            value={editUnidad[u.id]?.nombre ?? u.nombre}
                                            onChange={(e) =>
                                                handleUnidadNombreChange(
                                                    idx,
                                                    e.target.value,
                                                    unidadesDisponibles
                                                )
                                            }
                                            onBlur={() =>
                                                handleUnidadNombreBlur(idx, unidadesDisponibles)
                                            }
                                            style={{
                                                flex: 2,
                                                fontWeight: 600,
                                                fontSize: isMobile ? 18 : 15,
                                                background: "#fff",
                                            }}
                                            className={errorUnidad[u.id] ? "p-invalid" : ""}
                                            placeholder="Nombre de unidad"
                                        />
                                        <MultiSelect
                                            {...propsSelectVS}
                                            value={
                                                editUnidad[u.id]?.clientes?.map((c) => c.id) ??
                                                u.clientes?.map((c) => c.id)
                                            }
                                            options={clientes}
                                            optionLabel="nombre"
                                            filter={false}
                                            onChange={(e) =>
                                                handleUnidadClientesChange(
                                                    idx,
                                                    e.value,
                                                    unidadesDisponibles
                                                )
                                            }
                                            onBlur={() =>
                                                handleUnidadClientesBlur(idx, unidadesDisponibles)
                                            }
                                            placeholder="Seleccionar clientes"
                                            itemTemplate={clienteTemplate}
                                            selectedItemsLabel=" {0} Clientes seleccionados"
                                            maxSelectedLabels={1}
                                            style={{
                                                flex: 3,
                                                background: "#fff",
                                                fontSize: isMobile ? 17 : 15,
                                            }}
                                        />
                                        <div className="etapa-actions">
                                            <Button
                                                icon="pi pi-trash"
                                                className="p-button-rounded p-button-text p-button-danger"
                                                tooltip="Eliminar"
                                                onClick={() =>
                                                    handleDeleteUnidadRow(idx, unidadesDisponibles)
                                                }
                                                aria-label="Eliminar"
                                            />
                                        </div>
                                        {errorUnidad[u.id] && (
                                            <small className="p-error" style={{ marginTop: 8 }}>
                                                {errorUnidad[u.id]}
                                            </small>
                                        )}
                                    </div>
                                ))}
                            </div> */}
                            <div className="unidades-list" ref={disponiblesRef}>
                                <List
                                    height={heightDisponibles}
                                    itemCount={unidadesDisponibles.length}
                                    itemSize={isMobile ? 170 : 140}
                                    width="100%"
                                >
                                    {({ index, style }) => {
                                        const u = unidadesDisponibles[index];
                                        return (
                                            <div
                                                key={u.id}
                                                className="unidad-row"
                                                style={{ ...unidadRowStyle, ...style }}
                                            >
                                                <InputText
                                                    value={editUnidad[u.id]?.nombre ?? u.nombre}
                                                    onChange={(e) =>
                                                        handleUnidadNombreChange(
                                                            index,
                                                            e.target.value,
                                                            unidadesDisponibles
                                                        )
                                                    }
                                                    onBlur={() =>
                                                        handleUnidadNombreBlur(
                                                            index,
                                                            unidadesDisponibles
                                                        )
                                                    }
                                                    style={{
                                                        flex: 2,
                                                        fontWeight: 600,
                                                        fontSize: isMobile ? 18 : 15,
                                                        background: "#fff",
                                                    }}
                                                    className={errorUnidad[u.id] ? "p-invalid" : ""}
                                                    placeholder="Nombre de unidad"
                                                />
                                                <MultiSelect
                                                    {...propsSelectVS}
                                                    value={
                                                        editUnidad[u.id]?.clientes?.map(
                                                            (c) => c.id
                                                        ) ?? u.clientes?.map((c) => c.id)
                                                    }
                                                    options={clientes}
                                                    optionLabel="nombre"
                                                    filter={false}
                                                    onChange={(e) =>
                                                        handleUnidadClientesChange(
                                                            index,
                                                            e.value,
                                                            unidadesDisponibles
                                                        )
                                                    }
                                                    onBlur={() =>
                                                        handleUnidadClientesBlur(
                                                            index,
                                                            unidadesDisponibles
                                                        )
                                                    }
                                                    placeholder="Seleccionar clientes"
                                                    itemTemplate={clienteTemplate}
                                                    selectedItemsLabel=" {0} Clientes seleccionados"
                                                    maxSelectedLabels={1}
                                                    style={{
                                                        flex: 3,
                                                        background: "#fff",
                                                        fontSize: isMobile ? 17 : 15,
                                                    }}
                                                />
                                                <div className="etapa-actions">
                                                    <Button
                                                        icon="pi pi-trash"
                                                        className="p-button-rounded p-button-text p-button-danger"
                                                        tooltip="Eliminar"
                                                        onClick={() =>
                                                            handleDeleteUnidadRow(
                                                                index,
                                                                unidadesDisponibles
                                                            )
                                                        }
                                                        aria-label="Eliminar"
                                                    />
                                                </div>
                                                {errorUnidad[u.id] && (
                                                    <small
                                                        className="p-error"
                                                        style={{ marginTop: 8 }}
                                                    >
                                                        {errorUnidad[u.id]}
                                                    </small>
                                                )}
                                            </div>
                                        );
                                    }}
                                </List>
                            </div>

                            {newUnidad && (
                                <div className="unidad-row" style={unidadRowStyle}>
                                    <InputText
                                        autoFocus
                                        value={newUnidad.nombre}
                                        onChange={(e) =>
                                            setNewUnidad((prev) => ({
                                                ...prev,
                                                nombre: e.target.value,
                                            }))
                                        }
                                        style={{
                                            flex: 2,
                                            fontWeight: 600,
                                            fontSize: isMobile ? 18 : 15,
                                            background: "#fff",
                                        }}
                                        className={errorUnidad.new ? "p-invalid" : ""}
                                        placeholder="Nombre del propietario"
                                    />
                                    <MultiSelect
                                        {...propsSelectVS}
                                        value={newUnidad.clientes?.map((c) => c.id)}
                                        options={clientes}
                                        filter={false}
                                        onChange={(e) =>
                                            setNewUnidad((prev) => ({
                                                ...prev,
                                                clientes: e.value
                                                    ? clientes.filter((c) => e.value.includes(c.id))
                                                    : [],
                                            }))
                                        }
                                        selectedItemsLabel=" {0} Clientes seleccionados"
                                        maxSelectedLabels={1}
                                        placeholder="Seleccionar clientes"
                                        itemTemplate={clienteTemplate}
                                        style={{
                                            flex: 3,
                                            background: "#fff",
                                            fontSize: isMobile ? 17 : 15,
                                        }}
                                    />
                                    <div
                                        style={{
                                            display: "flex",
                                            gap: 8,
                                            marginTop: isMobile ? 8 : 0,
                                        }}
                                    >
                                        <Button
                                            icon="pi pi-check"
                                            className="p-button-success p-button-rounded"
                                            style={{
                                                width: isMobile ? 36 : 36,
                                                fontSize: isMobile ? 18 : 15,
                                                height: isMobile ? 36 : 36,
                                            }}
                                            onClick={handleSaveNewUnidad}
                                            disabled={!newUnidad.nombre.trim()}
                                        />
                                        <Button
                                            icon="pi pi-times"
                                            className="p-button-secondary p-button-rounded"
                                            style={{
                                                width: isMobile ? 36 : 36,
                                                fontSize: isMobile ? 18 : 15,
                                                height: isMobile ? 36 : 36,
                                            }}
                                            onClick={handleCancelNewUnidad}
                                        />
                                    </div>
                                    {errorUnidad.new && (
                                        <small className="p-error" style={{ marginTop: 8 }}>
                                            {errorUnidad.new}
                                        </small>
                                    )}
                                </div>
                            )}
                        </TabPanel>
                        <TabPanel
                            header={
                                <span>
                                    No disponibles{" "}
                                    <Badge value={unidadesNoDisponibles.length} severity="info" />
                                </span>
                            }
                        >
                            {/* <div className="unidades-list">
                                {unidadesNoDisponibles.map((u, idx) => (
                                    <div key={u.id} className="unidad-row" style={unidadRowStyle}>
                                        <InputText
                                            value={editUnidad[u.id]?.nombre ?? u.nombre}
                                            onChange={(e) =>
                                                handleUnidadNombreChange(
                                                    idx,
                                                    e.target.value,
                                                    unidadesNoDisponibles
                                                )
                                            }
                                            onBlur={() =>
                                                handleUnidadNombreBlur(idx, unidadesNoDisponibles)
                                            }
                                            style={{
                                                flex: 2,
                                                fontWeight: 600,
                                                fontSize: isMobile ? 18 : 15,
                                                background: "#fff",
                                            }}
                                            className={errorUnidad[u.id] ? "p-invalid" : ""}
                                            placeholder="Nombre de unidad"
                                        />
                                        <MultiSelect
                                            {...propsSelectVS}
                                            value={
                                                editUnidad[u.id]?.clientes?.map((c) => c.id) ??
                                                u.clientes?.map((c) => c.id)
                                            }
                                            options={clientes}
                                            optionLabel="nombre"
                                            filter={false}
                                            onChange={(e) =>
                                                handleUnidadClientesChange(
                                                    idx,
                                                    e.value,
                                                    unidadesNoDisponibles
                                                )
                                            }
                                            onBlur={() =>
                                                handleUnidadClientesBlur(idx, unidadesNoDisponibles)
                                            }
                                            placeholder="Seleccionar clientes"
                                            itemTemplate={clienteTemplate}
                                            selectedItemsLabel=" {0} Clientes seleccionados"
                                            maxSelectedLabels={1}
                                            style={{
                                                flex: 3,
                                                background: "#fff",
                                                fontSize: isMobile ? 17 : 15,
                                            }}
                                        />
                                        <div className="etapa-actions">
                                            <Button
                                                icon="pi pi-trash"
                                                className="p-button-rounded p-button-text p-button-danger"
                                                tooltip="Eliminar"
                                                onClick={() =>
                                                    handleDeleteUnidadRow(
                                                        idx,
                                                        unidadesNoDisponibles
                                                    )
                                                }
                                                aria-label="Eliminar"
                                            />
                                        </div>
                                        {errorUnidad[u.id] && (
                                            <small className="p-error" style={{ marginTop: 8 }}>
                                                {errorUnidad[u.id]}
                                            </small>
                                        )}
                                    </div>
                                ))}
                            </div> */}
                            <div className="unidades-list" ref={noDisponiblesRef}>
                                <List
                                    height={heightNoDisponibles}
                                    itemCount={unidadesNoDisponibles.length}
                                    itemSize={isMobile ? 170 : 140}
                                    width="100%"
                                >
                                    {({ index, style }) => {
                                        const u = unidadesNoDisponibles[index];
                                        return (
                                            <div
                                                key={u.id}
                                                className="unidad-row"
                                                style={{ ...unidadRowStyle, ...style }}
                                            >
                                                <InputText
                                                    value={editUnidad[u.id]?.nombre ?? u.nombre}
                                                    onChange={(e) =>
                                                        handleUnidadNombreChange(
                                                            index,
                                                            e.target.value,
                                                            unidadesNoDisponibles
                                                        )
                                                    }
                                                    onBlur={() =>
                                                        handleUnidadNombreBlur(
                                                            index,
                                                            unidadesNoDisponibles
                                                        )
                                                    }
                                                    style={{
                                                        flex: 2,
                                                        fontWeight: 600,
                                                        fontSize: isMobile ? 18 : 15,
                                                        background: "#fff",
                                                    }}
                                                    className={errorUnidad[u.id] ? "p-invalid" : ""}
                                                    placeholder="Nombre de unidad"
                                                />
                                                <MultiSelect
                                                    {...propsSelectVS}
                                                    value={
                                                        editUnidad[u.id]?.clientes?.map(
                                                            (c) => c.id
                                                        ) ?? u.clientes?.map((c) => c.id)
                                                    }
                                                    options={clientes}
                                                    optionLabel="nombre"
                                                    filter={false}
                                                    onChange={(e) =>
                                                        handleUnidadClientesChange(
                                                            index,
                                                            e.value,
                                                            unidadesNoDisponibles
                                                        )
                                                    }
                                                    onBlur={() =>
                                                        handleUnidadClientesBlur(
                                                            index,
                                                            unidadesNoDisponibles
                                                        )
                                                    }
                                                    placeholder="Seleccionar clientes"
                                                    itemTemplate={clienteTemplate}
                                                    selectedItemsLabel=" {0} Clientes seleccionados"
                                                    maxSelectedLabels={1}
                                                    style={{
                                                        flex: 3,
                                                        background: "#fff",
                                                        fontSize: isMobile ? 17 : 15,
                                                    }}
                                                />
                                                <div className="etapa-actions">
                                                    <Button
                                                        icon="pi pi-trash"
                                                        className="p-button-rounded p-button-text p-button-danger"
                                                        tooltip="Eliminar"
                                                        onClick={() =>
                                                            handleDeleteUnidadRow(
                                                                index,
                                                                unidadesNoDisponibles
                                                            )
                                                        }
                                                        aria-label="Eliminar"
                                                    />
                                                </div>
                                                {errorUnidad[u.id] && (
                                                    <small
                                                        className="p-error"
                                                        style={{ marginTop: 8 }}
                                                    >
                                                        {errorUnidad[u.id]}
                                                    </small>
                                                )}
                                            </div>
                                        );
                                    }}
                                </List>
                            </div>

                            {newUnidad && (
                                <div className="unidad-row" style={unidadRowStyle}>
                                    <InputText
                                        autoFocus
                                        value={newUnidad.nombre}
                                        onChange={(e) =>
                                            setNewUnidad((prev) => ({
                                                ...prev,
                                                nombre: e.target.value,
                                            }))
                                        }
                                        style={{
                                            flex: 2,
                                            fontWeight: 600,
                                            fontSize: isMobile ? 18 : 15,
                                            background: "#fff",
                                        }}
                                        className={errorUnidad.new ? "p-invalid" : ""}
                                        placeholder="Nombre de unidad"
                                    />
                                    <MultiSelect
                                        {...propsSelectVS}
                                        value={newUnidad.clientes?.map((c) => c.id)}
                                        options={clientes}
                                        filter={false}
                                        onChange={(e) =>
                                            setNewUnidad((prev) => ({
                                                ...prev,
                                                clientes: e.value
                                                    ? clientes.filter((c) => e.value.includes(c.id))
                                                    : [],
                                            }))
                                        }
                                        selectedItemsLabel=" {0} Clientes seleccionados"
                                        maxSelectedLabels={1}
                                        placeholder="Seleccionar clientes"
                                        itemTemplate={clienteTemplate}
                                        style={{
                                            flex: 3,
                                            background: "#fff",
                                            fontSize: isMobile ? 17 : 15,
                                        }}
                                    />
                                    <div
                                        style={{
                                            display: "flex",
                                            gap: 8,
                                            marginTop: isMobile ? 8 : 0,
                                        }}
                                    >
                                        <Button
                                            icon="pi pi-check"
                                            className="p-button-success p-button-rounded"
                                            style={{
                                                width: isMobile ? 36 : 36,
                                                fontSize: isMobile ? 18 : 15,
                                                height: isMobile ? 36 : 36,
                                            }}
                                            onClick={handleSaveNewUnidad}
                                            disabled={!newUnidad.nombre.trim()}
                                        />
                                        <Button
                                            icon="pi pi-times"
                                            className="p-button-secondary p-button-rounded"
                                            style={{
                                                width: isMobile ? 36 : 36,
                                                fontSize: isMobile ? 18 : 15,
                                                height: isMobile ? 36 : 36,
                                            }}
                                            onClick={handleCancelNewUnidad}
                                        />
                                    </div>
                                    {errorUnidad.new && (
                                        <small className="p-error" style={{ marginTop: 8 }}>
                                            {errorUnidad.new}
                                        </small>
                                    )}
                                </div>
                            )}
                        </TabPanel>
                    </TabView>
                    <div className="etapas-add-row">
                        {!newUnidad && activeTab === 0 && (
                            <Button
                                icon="pi pi-plus"
                                aria-label={isMobile ? "Agregar unidad" : ""}
                                className="p-button-rounded p-button-success"
                                style={{ width: 160, height: 40 }}
                                onClick={() => setNewUnidad({ nombre: "", clientes: [] })}
                                label="Agregar unidad"
                            />
                        )}
                    </div>
                </div>
            </Card>
        </Sidebar>
    );
};

export default UnidadesSidebar;
