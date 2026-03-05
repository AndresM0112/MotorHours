import React, {
    useRef,
    useContext,
    useState,
    useEffect,
    useMemo,
    useCallback,
    Suspense,
} from "react";
// import { useParams } from "react-router-dom";
import { useParams, useLocation } from "react-router-dom";

import { AuthContext } from "@context/auth/AuthContext";
import { ToastContext } from "@context/toast/ToastContext";
import useHandleApiError from "@hook/useHandleApiError";
import useHandleData from "@hook/useHandleData";
import usePaginationData from "@hook/usePaginationData";

// UI
import { Button } from "primereact/button";
import PageHeader from "@components/layout/PageHeader";
import { RightToolbar } from "@components/generales";
import ChipStatusComponent from "@components/fields/ChipStatusComponent";
import ContextMenuActions from "@components/data/ContextMenuActions";
import { ConfirmDialog } from "primereact/confirmdialog";
import { formatNotificationDateTime } from "@utils/formatTime";
// import EmptyState from "@components/data/EmptyState";
import SkeletonMasterLoader from "@components/generales/SkeletonMasterLoader";
import LoadingComponent from "@components/layout/LoadingComponent";
import { useMediaQueryContext } from "@context/mediaQuery/mediaQueryContext";
import InfiniteScrollCards from "@components/ui/InfiniteScrollCards";
import EmptyState from "@components/ui/EmptyState"; // si cambiaste a /ui
import { useSocket } from "@context/socket/SocketContext";



// Data
import { estados, propsSelect } from "@utils/converAndConst";
import usePermissions from "@context/permissions/usePermissions";

// API
import {
    deleteTicketsAPI,
    paginationTicketsAPI,
    countTicketsByEstadoAPI,
} from "@api/requests/ticketsApi";

// Modal
import VenTickets from "./components/modals/VenTickets";
import { TabPanel, TabView } from "primereact/tabview";
import { Badge } from "primereact/badge";
import { Chip } from "primereact/chip";
import { ticketEvents } from "@utils/observables/ticketEvents";

// Lazy
const LazyDataTable = React.lazy(() => import("@components/data/DataTableComponent"));
const DataTableComponentMemo = React.memo(LazyDataTable);
const LazyFilterComponent = React.lazy(() => import("@components/data/FilterGeneric"));
const FilterComponentMemo = React.memo(LazyFilterComponent);
const LazyOverlayFilters = React.lazy(() => import("@components/data/FilterOverlay"));
const OverlayFiltersMemo = React.memo(LazyOverlayFilters);

const useQueryParam = (key) => {
    const { search } = useLocation();
    return useMemo(() => new URLSearchParams(search).get(key), [search, key]);
};

const estadosParams = [
    { label: "Abierto", value: 1, slug: "abierto" },
    { label: "En proceso", value: 2, slug: "en_proceso" },
    { label: "En espera", value: 3, slug: "en_espera" },
    { label: "Cerrado", value: 4, slug: "cerrado" },
    { label: "Reabierto", value: 5, slug: "reabierto" },
    { label: "Anulado", value: 6, slug: "anulado" },
];

const isFiniteNumber = (value) => {
    const n = Number(value);
    // fallback por si Number.isFinite no existe
    if (typeof Number.isFinite === "function") {
        return Number.isFinite(n);
    }
    // navegadores viejos -> usa el global isFinite
    return typeof n === "number" && isFinite(n);
};


const colorMap = {
    info: "#17a2b8",
    warning: "#ffc107",
    danger: "#dc3545",
    success: "#28a745",
    primary: "#007bff",
    secondary: "#6c757d",
    light: "#f8f9fa",
    dark: "#343a40",
};

const ACCENT = "#007e79";

const MiniChip = ({ label, bg }) => (
    <span
        className="p-tag p-tag-rounded"
        style={{
            border: `1px solid ${bg || ACCENT}`,
            background: bg || "transparent",
            color: bg ? "#fff" : ACCENT,
            fontSize: 11,
            lineHeight: "18px",
            padding: "0 8px",
            maxWidth: 140,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
        }}
        title={label}
    >
        {label}
    </span>
);

const Item = ({ icon, label, value, title }) => (
    <div
        style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}
        title={title || `${label}: ${value ?? "—"}`}
    >
        <span style={{ fontSize: 14, opacity: 0.85 }}>{icon}</span>
        <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 13, color: "#111827", lineHeight: "12px", fontWeight: 600, }}>{label}</div>
            <div
                style={{
                    fontSize: 11,
                    // fontWeight: 600,
                    color: "#6B7280",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                }}
            >
                {value ?? "—"}
            </div>
        </div>
    </div>
);


//FILTROS

// Puedes ponerla arriba del componente o dentro (antes del return)
const generateFiltersConfig = ({ filtros, setFiltros, estadosOptions }) => [
    // EXTERNOS (línea visible)
    {
        key: "search",
        type: "input",
        label: "Buscar",
        filtro: filtros.search,
        externo: true,
        className: "col-12 md:col-3 mt-2",
    },
    // {
    //     key: "estado",
    //     type: "dropdown",
    //     label: "Estado",
    //     filtro: filtros.estado,
    //     props: { ...propsSelect, options: estadosOptions },
    //     showClear: true,
    //     externo: true,
    //     className: "col-12 md:col-3 mt-2",
    // },

    // INTERNOS (van al sidebar)
    {
        key: "clienteId",
        type: "input",
        label: "Cliente ",
        filtro: filtros.clienteId,
    },
    {
        key: "bloqueId",
        type: "input",
        label: "Bloque",
        filtro: filtros.bloqueId,
    },
    {
        key: "localId",
        type: "input",
        label: "Local",
        filtro: filtros.localId,
    },
    {
        key: "areaId",
        type: "input",
        label: "Área",
        filtro: filtros.areaId,
    },
    {
        key: "asignado",
        type: "input",
        label: "Asignado",
        filtro: filtros.asignado,
    },
    {
        key: "prioridadId",
        type: "dropdown",
        label: "Prioridad",
        filtro: filtros.prioridadId,
        props: {
            ...propsSelect, options: [
                { label: "Baja", value: 1 },
                { label: "Media", value: 2 },
                { label: "Alta", value: 3 },
            ]
        },
        showClear: true,
    },
    {
        key: "fecha",
        type: "calendar-range",
        label: "Fecha Registro",
        filtro: filtros.fecha,
        props: { showIcon: true, dateFormat: "yy-mm-dd" },
        className: "col-12",
    },
];


const Tickets = () => {
    const { estadoId } = useParams();

    // const estadoFromURL = useMemo(() => {
    //     return estadosParams.find((e) => e.slug === estadoId) || null;
    // }, [estadoId]);

    const estadoFromURL = useMemo(() => {
        if (!estadoId) return null;
        // si es número, no es slug de estado
        // if (Number.isFinite(Number(estadoId))) return null;
        if (isFiniteNumber(estadoId)) return null;
        // return estadosParams.find((e) => e.slug === estadoId) || null;
        return estadosParams.find((e) => e.slug === estadoId) || null;
    }, [estadoId]);

    const venTicket = useRef(null);


    const overlayFiltersRef = useRef(null);

    const { idusuario } = useContext(AuthContext);
    const { showSuccess } = useContext(ToastContext);
    const handleApiError = useHandleApiError();

    const { hasPermission } = usePermissions();
    const canCreate = hasPermission("home", "tickets", "create");
    const canEdit = hasPermission("home", "tickets", "edit");
    const canDelete = hasPermission("home", "tickets", "delete");

    const { state, setInitialState, deleteItem, addItem, updateItem } = useHandleData();

    const [loading, setLoading] = useState({ table: false });
    const [firstLoad, setFirstLoad] = useState(true);
    const [deleteDialogVisible, setDeleteDialogVisible] = useState(false);
    const [currentTicket, setCurrentTicket] = useState(null);
    const [estadosConConteo, setEstadosConConteo] = useState([]);
    const [activeIndex, setActiveIndex] = useState(0);

    //Mobile
    const { isMobile, isTablet } = useMediaQueryContext();
    const vistaMobil = isMobile || isTablet;



    const initialFilters = useMemo(
        () => ({
            search: null,
            estado: estadoFromURL?.value ?? null,
            areaId: null,
            bloqueId: null,
            localId: null,
            clienteId: null,
            prioridadId: null,
            asignado: null,
            fecha: null,
        }),
        [estadoFromURL]
    );

    const sortField = "fechaRegistro";



    const {
        reloadData,
        filtros,
        setFiltros,
        datos,
        totalRecords,
        pagination,
        setPagination,
        onCustomPage,
    } = usePaginationData(initialFilters, paginationTicketsAPI, setLoading, sortField, () => true);

    useEffect(() => {
        if (!loading.table && firstLoad) {
            setTimeout(() => setFirstLoad(false), [400]);
        }
    }, [loading.table, firstLoad]);

    useEffect(() => {
        setInitialState(datos, totalRecords);
    }, [datos, totalRecords, setInitialState]);

    const filtersConfig = useMemo(
        () => [
            { key: "search", type: "input", label: "Buscar", filtro: filtros.search },
            {
                key: "estado",
                type: "dropdown",
                label: "Estado",
                filtro: filtros.estado,
                props: { ...propsSelect, options: estados },
            },
        ],
        [filtros]
    );

    const getActiveFiltersCount = (filters) =>
        Object.values(filters).filter((v) => v !== null && v !== "").length;

    const activeFiltersCount = useMemo(() => getActiveFiltersCount(filtros), [filtros]);


    const contarTickets = async () => {
        try {
            const { data } = await countTicketsByEstadoAPI();
            setEstadosConConteo(data);
        } catch (error) {
            handleApiError(error);
        }
    };

    useEffect(() => {
        contarTickets();
    }, []);

    //     useEffect(() => {
    //     // Cada vez que se agrega, actualiza o elimina un ticket desde cualquier parte
    //     // (modal VenTickets, etc.) refrescamos contadores + página actual
    //     contarTickets();
    //     reloadData();
    // }, [state.ADD_ITEM, state.UPDATE_ITEM, state.DELETE_ITEM]);

    const socket = useSocket();

    useEffect(() => {
        if (!socket) return;

        const updateTickets = () => {
            // Igual que en Suppliers: recarga contadores + data
            contarTickets();
            reloadData();
        };

        socket.on("upsertTickets", updateTickets);
        socket.on("deleteTickets", updateTickets); // si usas evento aparte

        return () => {
            socket.off("upsertTickets", updateTickets);
            socket.off("deleteTickets", updateTickets);
        };
    }, [socket]);


    const deleteApi = useCallback(
        async (tktId) => {
            try {
                await deleteTicketsAPI({ ticketIds: tktId, usuarioId: idusuario });
                showSuccess("Ticket eliminado correctamente");
                venTicket.current.onClose();
                deleteItem({ id: tktId, idField: "tktId" });
                contarTickets();
            } catch (error) {
                handleApiError(error);
            }
        },
        [idusuario, deleteItem, showSuccess]
    );

    const renderActions = (item) => {
        const { tktId } = item;

        const menuItems = [
            {
                label: "Editar",
                icon: "pi pi-pencil",
                command: () => venTicket.current.editTicket(item),
                disabled: !canEdit,
            },
            {
                label: "Eliminar",
                icon: "pi pi-trash",
                command: () => {
                    setCurrentTicket(item);
                    setDeleteDialogVisible(true);
                },
                disabled: !canDelete,
                color: "#f43f51",
            },
        ];
        return <ContextMenuActions menuItems={menuItems} itemId={tktId} />;
    };

    const buildTabs = useCallback(() => {
        const tabs = [
            {
                key: "todos",
                header: (
                    <span>
                        TODOS{" "}
                        <Badge
                            value={estadosConConteo.reduce((acc, curr) => acc + curr.total, 0)}
                            severity="primary"
                        />
                    </span>
                ),
                estadoId: null, // para filtros
            },
            ...estadosConConteo.map((estado) => ({
                key: estado.estadoId,
                header: (
                    <span>
                        {estado.estadoNombre}{" "}
                        <Badge value={estado.total} severity={estado.estadoColor} />
                    </span>
                ),
                estadoId: estado.estadoId,
            })),
        ];

        return tabs;
    }, [estadosConConteo]);

    const idFromQuery = useQueryParam("id"); // lee ?id=14

    // si el param de la ruta es numérico => es un tktId (/tickets/14)
    const tktIdFromParam = useMemo(() => {
        // const n = Number(estadoId);
        // return Number.isFinite(n) && n > 0 ? n : null;
        const n = Number(estadoId);
        return isFiniteNumber(n) && n > 0 ? n : null;
    }, [estadoId]);

    // prioriza ?id=14; si no hay, usa /tickets/14
    const tktId = useMemo(() => {
        const q = Number(idFromQuery);
        // if (Number.isFinite(q) && q > 0) return q;
        if (isFiniteNumber(q) && q > 0) return q;
        return tktIdFromParam;
    }, [idFromQuery, tktIdFromParam]);


    useEffect(() => {
        if (!estadoFromURL) return;

        if (estadosConConteo.length === 0) return;

        const idx = buildTabs().findIndex((tab) => tab.estadoId === estadoFromURL.value);

        if (idx !== -1) setActiveIndex(idx);
    }, [estadoFromURL, estadosConConteo, buildTabs]);


    // Abre el ticket si llega por URL (?id=14 o /tickets/14)
    // Abre el ticket si llega por URL (?id=14 o /tickets/14)
    useEffect(() => {
        if (!tktId) return;
        if (firstLoad) return; // espera a que deje de renderizar el Skeleton

        const open = () => venTicket.current?.viewTicket?.({ tktId });

        // intento inmediato + 1 reintento corto
        open();
        const t = setTimeout(open, 100);

        return () => clearTimeout(t);
    }, [tktId, firstLoad]);


    const columnsConfig = [
        {
            field: "tktId",
            header: "#",
            style: { maxWidth: "8rem" },
            mobile: true,
        },
        {
            field: "clienteNombre",
            header: "Cliente",
            style: { minWidth: "14rem" },
            mobile: true,
            body: ({ clienteNombre, localizacionNombre, lcaAplicaLocal }) => {
                // si hay cliente → lo mostramos normal
                if (clienteNombre) return <span>{clienteNombre}</span>;

                // si NO aplica cliente/local (ascensores, porterías, etc.)
                const aplicaLocal = lcaAplicaLocal == null ? true : Number(lcaAplicaLocal) === 1;

                if (!aplicaLocal && localizacionNombre) {
                    return (
                        <div className="flex align-items-center gap-2">
                            <i className="pi pi-times-circle text-gray-400" />
                            <span>Sin cliente</span>
                        </div>
                    );
                }

                // caso genérico: no sabemos, lo dejamos vacío o guion
                return <span>—</span>;
            },
        },
        {
            field: "bloqueNombre",
            header: "Bloque",
            style: { minWidth: "12rem" },
            mobile: true,
            body: ({ bloqueNombre, localizacionNombre, lcaAplicaBloque }) => {
                if (bloqueNombre) return <span>{bloqueNombre}</span>;

                const aplicaBloque = lcaAplicaBloque == null ? true : Number(lcaAplicaBloque) === 1;

                if (!aplicaBloque && localizacionNombre) {
                    return (
                        <div className="flex align-items-center gap-2">
                            <i className="pi pi-times-circle text-gray-400" />
                            <span>Sin bloque</span>
                        </div>
                    );
                }

                return <span>—</span>;
            },
        },
        {
            field: "localNombre",
            header: "Localizacíon/Local",
            style: { minWidth: "12rem" },
            mobile: true,
            body: ({ localNombre, localizacionNombre }) => (
                <span>
                    {localNombre || localizacionNombre || "—"}
                </span>
            ),
        },
        {
            field: "areaNombre",
            header: "Área",
            style: { minWidth: "12rem" },
            mobile: true,
        },
        {
            field: "asignadoNombre",
            header: "Asignado a",
            style: { minWidth: "14rem" },
            mobile: true,
        },
        {
            field: "prioridadNombre",
            header: "Prioridad",
            style: { maxWidth: "10rem" },
            body: ({ prioridadNombre, prioridadColor }) => (
                <Chip
                    label={prioridadNombre}
                    className="text-white"
                    style={{ backgroundColor: colorMap[prioridadColor] || "#6c757d" }}
                />
            ),
            mobile: true,
        },
        {
            field: "estadoNombre",
            header: "Estado",
            style: { maxWidth: "12rem" },
            body: ({ estadoNombre, estadoColor }) => (
                <Chip
                    label={estadoNombre}
                    className="text-white"
                    style={{ backgroundColor: colorMap[estadoColor] || "#6c757d" }}
                />
            ),
            mobile: true,
        },
        {
            field: "fechaRegistro",
            header: "Fecha de Registro",
            style: { maxWidth: "14rem" },
            mobile: true,
        },
        // === Igual que en Reasons: muestra usuario + fecha formateada (usuact/fecact) ===
        {
            field: "usuact, fecact",
            header: "Actualizado Por",
            style: { minWidth: "16rem" },
            mobile: true,
            body: ({ usuact, fecact }) => (
                <div>
                    <div><span style={{ fontWeight: 600 }}>{usuact}</span></div>
                    <div>{formatNotificationDateTime(fecact)}</div>
                </div>
            ),
        },
    ];

    // const actionsToolbar = useMemo(
    //     () => (
    //         <>
    //             <div style={{ position: "relative", display: "inline-block" }}>
    //                 <Button
    //                     icon="pi pi-sliders-h"
    //                     label="Filtros"
    //                     iconPos="left"
    //                     className="p-button-sm p-button-rounded ml-2"
    //                     onClick={(e) => overlayFiltersRef.current.toggle(e)}
    //                 />
    //                 {activeFiltersCount > 0 && (
    //                     <span
    //                         className="fade-in"
    //                         style={{
    //                             position: "absolute",
    //                             top: "-8px",
    //                             right: "-8px",
    //                             backgroundColor: "#f44336",
    //                             color: "#fff",
    //                             borderRadius: "50%",
    //                             padding: "4px 8px",
    //                             fontSize: "8px",
    //                             fontWeight: "bold",
    //                             zIndex: 1,
    //                         }}
    //                     >
    //                         {activeFiltersCount}
    //                     </span>
    //                 )}
    //             </div>
    //             <RightToolbar
    //                 label="Nuevo"
    //                 onClick={() => venTicket.current.newTicket()}
    //                 disabled={!canCreate}
    //             />
    //         </>
    //     ),
    //     [canCreate, activeFiltersCount]
    // );

    const actionsToolbar = useMemo(
        () => (
            <>
                {/* botón sidebar de FilterGeneric eliminado aquí */}
                {!vistaMobil && (
                    <div style={{ position: "relative", display: "inline-block", marginRight: 8 }}>
                        <Button
                            icon="pi pi-sliders-h"
                            label="Filtros"
                            iconPos="left"
                            className="p-button-sm p-button-rounded ml-2"
                            onClick={(e) => overlayFiltersRef.current?.toggle(e)}
                        />
                    </div>
                )}
                <RightToolbar
                    label="Nuevo"
                    onClick={() => venTicket.current.newTicket()}
                    disabled={!canCreate}
                />
            </>
        ),

        [canCreate, activeFiltersCount, vistaMobil]
    );

    const headerTemplate = useMemo(
        () => <div style={{ flexShrink: 0 }}>{actionsToolbar}</div>,
        [actionsToolbar]
    );

    // const handleRowSelect = (e) => {
    //     if (!canEdit) return;
    //     venTicket.current.editTicket(e.value);
    // };

    const openViewTicket = (rowOrEvent) => {
        // Normaliza: si viene de DataTable trae { value }, si viene de Card trae el item
        const item = rowOrEvent?.value ?? rowOrEvent;
        if (!item || !item.tktId) return; // seguridad
        venTicket.current.viewTicket({ tktId: item.tktId });
    };



    // const onRefresh = async () => {
    //     try {
    //         await contarTickets();
    //         await reloadData();
    //     } catch (error) {
    //         handleApiError(error);
    //     }
    // };

    // useEffect(() => {
    //     const subscription = ticketEvents.on().subscribe((action) => {
    //         if (action === "refresh") {
    //             onRefresh();
    //         }
    //     });

    //     return () => subscription.unsubscribe();
    // }, []);

    // Construcción de filtros
    const filtersBuilt = useMemo(
        () => generateFiltersConfig({ filtros, setFiltros, estadosOptions: estados }),
        [filtros, setFiltros]
    )
    // separa externos e internos una sola vez por render
    const filtersExternos = useMemo(
        () => filtersBuilt.filter((f) => f.externo),
        [filtersBuilt]
    );
    const filtersInternos = useMemo(
        () => filtersBuilt.filter((f) => !f.externo),
        [filtersBuilt]
    );

    return firstLoad ? (
        <SkeletonMasterLoader />
    ) : (
        <div className="fade-in">
            <ConfirmDialog
                visible={deleteDialogVisible}
                onHide={() => setDeleteDialogVisible(false)}
                message={`¿Deseas eliminar el ticket #00${currentTicket?.tktId}?`}
                accept={() => {
                    deleteApi(currentTicket?.tktId);
                    setDeleteDialogVisible(false);
                }}
                reject={() => setDeleteDialogVisible(false)}
                acceptLabel="Si"
                acceptClassName="p-button-danger"
                header="Confirmación"
                icon="pi pi-exclamation-triangle"
            />

            {/* <VenTickets ref={venTicket} onRefresh={onRefresh} /> */}

            <VenTickets
                ref={venTicket}
                addItem={addItem}
                updateItem={updateItem}
            />


            <PageHeader
                page="Gestión"
                title="Tickets"
                description="Listado y gestión de tickets de clientes"
            />

            <Suspense fallback={<LoadingComponent />}>
                {/* <FilterComponentMemo
                    filters={filtersBuilt}
                    initialFilters={initialFilters}
                    setFilters={setFiltros}
                    typeFilter={1}
                    isMobile={vistaMobil}
                // overlayRef={overlayFiltersRef}
                // filters={filtersConfig}
                // initialFilters={initialFilters}
                // setFilters={setFiltros}
                /> */}
                {vistaMobil ? (
                    // MOBILE: todos los filtros con sidebar interno
                    <FilterComponentMemo
                        filters={filtersBuilt}              // externos  internos
                        initialFilters={initialFilters}
                        setFilters={setFiltros}
                        typeFilter={1}                      // externos inline  botón (sidebar)
                        isMobile={true}                     // fuerza sidebar
                    // style = {{display: "flex", position :"absolute", top :"10px"}}
                    />
                ) : (
                    // DESKTOP/TABLET: solo externos inline; sin botón interno
                    <FilterComponentMemo
                        filters={filtersExternos}           // SOLO externos
                        initialFilters={initialFilters}
                        setFilters={setFiltros}
                        typeFilter={2}                      // render directo, sin botón
                        isMobile={false}
                    />
                )}

                {/* Overlay con INTERNOS solo en desktop/tablet */}
                {!vistaMobil && (
                    <OverlayFiltersMemo
                        overlayRef={overlayFiltersRef}
                        initialFilters={initialFilters}
                        filters={filtersInternos}           // SOLO internos
                        setFilters={setFiltros}
                    />
                )}

                <div className="grid">
                    <div className="col-12">
                        <TabView
                            scrollable={true}
                            activeIndex={activeIndex}
                            onTabChange={(e) => {
                                const selectedTab = buildTabs()[e.index];
                                setActiveIndex(e.index);
                                setFiltros((prev) => ({
                                    ...prev,
                                    estado: selectedTab.estadoId,
                                }));
                            }}
                        >
                            {buildTabs().map((tab) => (
                                <TabPanel key={tab.key} header={tab.header}>
                                    <>
                                        {vistaMobil ? (
                                            <>
                                                {/* Botonera arriba en mobile (Excel/Filtros/Nuevo) si la quieres visible como en Orders */}
                                                <div
                                                    style={{
                                                        display: "flex",
                                                        justifyContent: "flex-end",
                                                        marginBottom: "1rem",
                                                    }}
                                                >

                                                </div>

                                                {state.datos?.length <= 0 && !loading.table ? (
                                                    <EmptyState
                                                        title="No hay tickets registrados"
                                                        description="Puedes registrar uno nuevo desde aquí."
                                                        buttonLabel="Registrar nuevo ticket"
                                                        onButtonClick={() => venTicket.current.newTicket()}
                                                        canCreate={canCreate}
                                                    />
                                                ) : (
                                                    <InfiniteScrollCards
                                                        data={state.datos}
                                                        total={state.totalRecords}
                                                        loading={loading.table}
                                                        onScrollEnd={onCustomPage}          // ← llama al paginador
                                                        renderActions={renderActions}       // ←  menú contextual por tarjeta
                                                        onCardClick={openViewTicket}       // ← abre modal al tocar tarjeta
                                                        /* ===== HEADER: 2 líneas ===== */
                                                        /* ===== HEADER: chip de estado pegado a la esquina sup. derecha ===== */
                                                        headerTemplate={(item) => {
                                                            const nombreCliente = item?.clienteNombre || "Sin cliente";
                                                            const initials = (nombreCliente.match(/\b\w/g) || [])
                                                                .slice(0, 2)
                                                                .join("")
                                                                .toUpperCase();

                                                            return (
                                                                <div
                                                                    style={{
                                                                        display: "flex",
                                                                        alignItems: "center",
                                                                        gap: 10,
                                                                        minWidth: 0,
                                                                        position: "relative",
                                                                    }}
                                                                >
                                                                    {/* Avatar estilo usuarios */}
                                                                    <div
                                                                        style={{
                                                                            width: 36,
                                                                            height: 36,
                                                                            borderRadius: "50%",
                                                                            background: "#E5E7EB",
                                                                            color: "#111827",
                                                                            display: "flex",
                                                                            alignItems: "center",
                                                                            justifyContent: "center",
                                                                            fontWeight: 700,
                                                                            fontSize: 13,
                                                                            flexShrink: 0,
                                                                            overflow: "hidden",
                                                                        }}
                                                                        title={nombreCliente}
                                                                    >
                                                                        {initials}
                                                                    </div>

                                                                    {/* # Ticket + Nombre cliente */}
                                                                    <div
                                                                        style={{
                                                                            display: "flex",
                                                                            flexDirection: "column",
                                                                            minWidth: 0,
                                                                            flex: 1,
                                                                            paddingRight: 90, // espacio para el chip de estado
                                                                        }}
                                                                    >
                                                                        <div
                                                                            style={{
                                                                                fontSize: 11,
                                                                                color: "#6B7280",
                                                                                textTransform: "uppercase",
                                                                                letterSpacing: 0.3,
                                                                                marginBottom: 2,
                                                                            }}
                                                                        >
                                                                            Ticket
                                                                        </div>
                                                                        <div
                                                                            style={{
                                                                                fontWeight: 700,
                                                                                fontSize: 13,
                                                                                marginBottom: 2,
                                                                            }}
                                                                        >
                                                                            #{item.tktId}
                                                                        </div>
                                                                        <div
                                                                            style={{
                                                                                fontSize: 12,
                                                                                color: "#111827",
                                                                                whiteSpace: "nowrap",
                                                                                overflow: "hidden",
                                                                                textOverflow: "ellipsis",
                                                                            }}
                                                                            title={nombreCliente}
                                                                        >
                                                                            {nombreCliente}
                                                                        </div>
                                                                    </div>

                                                                    {/* Estado arriba a la derecha */}
                                                                    <div
                                                                        style={{
                                                                            position: "absolute",
                                                                            top: 0,
                                                                            right: 0,
                                                                            textAlign: "right",
                                                                        }}
                                                                    >
                                                                        <MiniChip
                                                                            label={item.estadoNombre}
                                                                            bg={colorMap[item.estadoColor] || "#6c757d"}
                                                                        />
                                                                    </div>
                                                                </div>
                                                            );
                                                        }}


                                                        // bodyTemplate={(item) => (
                                                        //     <div
                                                        //         style={{
                                                        //             position: "relative",
                                                        //             paddingRight: 100, // deja espacio a la derecha para el chip de prioridad
                                                        //             // paddingBottom: 30, // deja espacio abajo para el chip de prioridad
                                                        //         }}
                                                        //     >
                                                        //         {/* Fila horizontal (con wrap si no cabe) */}
                                                        //         <div
                                                        //             style={{
                                                        //                 display: "grid",
                                                        //                 gridTemplateColumns: "1fr 1fr", // 2 columnas iguales
                                                        //                 gap: 12, // espacio entre items
                                                        //                 rowGap: 8, // espacio vertical entre filas
                                                        //                 alignItems: "start",
                                                        //             }}
                                                        //         >
                                                        //             <Item label="Bloque" value={item.bloqueNombre} />
                                                        //             {/* <Item icon="🧩" label="Área" value={item.areaNombre} /> */}
                                                        //             <Item label="Local" value={item.localNombre} />
                                                        //             <Item label="Asignado" value={item.asignadoNombre} />
                                                        //             <Item label="Descripcion " value={item.descripcion} />
                                                        //             {/*<Item icon="🧱" label="Bloque" value={item.bloqueNombre} />
                                                        //              <Item icon="🧩" label="Área" value={item.areaNombre} /> 
                                                        //             <Item icon="🏪" label="Local" value={item.localNombre} />
                                                        //             <Item icon="👤" label="Asignado" value={item.asignadoNombre} />
                                                        //             <Item icon="📝" label="Descripcion " value={item.descripcion} />*/}
                                                        //         </div>



                                                        //         {/* Prioridad fija en esquina inferior derecha */}
                                                        //         <div style={{ position: "absolute", right: 0, bottom: 0, textAlign: "right" }}>
                                                        //             <div style={{ fontSize: 10, color: "#6B7280", lineHeight: "12px" }}>Prioridad</div>
                                                        //             <MiniChip
                                                        //                 label={item.prioridadNombre}
                                                        //                 bg={colorMap[item.prioridadColor] || "#6c757d"}
                                                        //             />
                                                        //         </div>

                                                        //         {/* Derecha (fijo en esquina superior derecha): Estado */}
                                                        //         {/* <div style={{ position: "absolute", left: 0, bottom: 0, textAlign: "left" }}>
                                                        //             <MiniChip
                                                        //                 label={item.estadoNombre}
                                                        //                 bg={colorMap[item.estadoColor] || "#6c757d"}
                                                        //             />
                                                        //         </div> */}

                                                        //     </div>
                                                        // )}
                                                        bodyTemplate={(item) => {

                                                            const priorityColors = {
                                                                baja: { bg: "rgba(16, 185, 129, 0.12)", color: "#10B981" },   // verde
                                                                media: { bg: "rgba(255, 202, 40, 0.12)", color: "#FFCA28" },  // amarillo
                                                                alta: { bg: "rgba(239, 68, 68, 0.12)", color: "#EF4444" },    // rojo
                                                            };

                                                            const prioridadKey = (item.prioridadNombre || "").toLowerCase();
                                                            const { bg, color } = priorityColors[prioridadKey] || {
                                                                bg: "rgba(107, 114, 128, 0.12)",
                                                                color: "#6B7280",
                                                            };

                                                            // 👇 si no hay bloque, mostramos "Sin bloque"
                                                            const bloqueValue = item.bloqueNombre || "Sin bloque";

                                                            // // 👇 texto para local/localización
                                                            // const localOrLoc =
                                                            //     item.localNombre || item.localizacionNombre || "—";

                                                            return (

                                                                <div
                                                                    style={{
                                                                        position: "relative",
                                                                        paddingTop: 6,
                                                                        display: "flex",
                                                                        flexDirection: "column",
                                                                        gap: 10,
                                                                    }}
                                                                >
                                                                    {/* Sección: Bloque / Local / Asignado */}
                                                                    <div
                                                                        style={{
                                                                            display: "grid",
                                                                            gridTemplateColumns: "1.1fr 1.4fr 1fr",
                                                                            gap: 16,
                                                                            alignItems: "start",
                                                                        }}
                                                                    >
                                                                        <Item label="Bloque" value={bloqueValue} />
                                                                        <Item label="Localizacíon/Local" value={item.localNombre || item.localizacionNombre} />
                                                                        <Item label="Asignado" value={item.asignadoNombre} />
                                                                    </div>

                                                                    {/* Sección: Descripción + Prioridad (misma línea) */}
                                                                    <div
                                                                        style={{
                                                                            padding: "6px 8px 8px 8px",
                                                                            borderRadius: 8,
                                                                            background: "#F9FAFB",
                                                                            border: "1px dashed #D1D5DB",
                                                                            fontSize: 12,
                                                                            color: "#374151",
                                                                            overflow: "hidden",
                                                                        }}
                                                                    >
                                                                        {/* Encabezado: Descripción + banderita de prioridad */}
                                                                        <div
                                                                            style={{
                                                                                display: "flex",
                                                                                alignItems: "center",
                                                                                justifyContent: "space-between",
                                                                                marginBottom: 4,
                                                                                gap: 8,
                                                                            }}
                                                                        >
                                                                            <div
                                                                                style={{
                                                                                    fontSize: 10,
                                                                                    textTransform: "uppercase",
                                                                                    letterSpacing: 0.3,
                                                                                    color: "#6B7280",
                                                                                }}
                                                                            >
                                                                                Descripción
                                                                            </div>

                                                                            {/* Banderita de prioridad */}
                                                                            <div
                                                                                style={{
                                                                                    display: "inline-flex",
                                                                                    alignItems: "center",
                                                                                    gap: 4,
                                                                                    padding: "2px 6px",
                                                                                    borderRadius: 999,
                                                                                    background: bg,
                                                                                    color: color,
                                                                                    fontSize: 10,
                                                                                    marginTop: 2,
                                                                                }}
                                                                                title={`Prioridad: ${item.prioridadNombre || "Sin prioridad"}`}
                                                                            >
                                                                                <svg
                                                                                    stroke="currentColor"
                                                                                    fill="currentColor"
                                                                                    strokeWidth="0"
                                                                                    viewBox="0 0 16 16"
                                                                                    height="12"
                                                                                    width="12"
                                                                                    xmlns="http://www.w3.org/2000/svg"
                                                                                    style={{ color }}
                                                                                >
                                                                                    <path d="M14.778.085A.5.5 0 0 1 15 .5V8a.5.5 0 0 1-.314.464L14.5 8l.186.464-.003.001-.006.003-.023.009a12 12 0 0 1-.397.15c-.264.095-.631.223-1.047.35-.816.252-1.879.523-2.71.523-.847 0-1.548-.28-2.158-.525l-.028-.01C7.68 8.71 7.14 8.5 6.5 8.5c-.7 0-1.638.23-2.437.477A20 20 0 0 0 3 9.342V15.5a.5.5 0 0 1-1 0V.5a.5.5 0 0 1 1 0v.282c.226-.079.496-.17.79-.26C4.606.272 5.67 0 6.5 0c.84 0 1.524.277 2.121.519l.043.018C9.286.788 9.828 1 10.5 1c.7 0 1.638-.23 2.437-.477a20 20 0 0 0 1.349-.476l.019-.007.004-.002h.001" />
                                                                                </svg>
                                                                                <span>{item.prioridadNombre || "Sin prioridad"}</span>
                                                                            </div>
                                                                        </div>

                                                                        {/* Texto de descripción */}
                                                                        <div
                                                                            style={{
                                                                                whiteSpace: "normal",
                                                                                overflow: "hidden",
                                                                                textOverflow: "ellipsis",
                                                                                display: "-webkit-box",
                                                                                WebkitLineClamp: 2,
                                                                                WebkitBoxOrient: "vertical",
                                                                            }}
                                                                        >
                                                                            {item.descripcion || "Sin descripción"}
                                                                        </div>
                                                                    </div>



                                                                </div>
                                                            );
                                                        }

                                                        }


                                                    />
                                                )}
                                            </>
                                        ) : (
                                            //     <DataTableComponentMemo
                                            //         KeyModule="module_tickets"
                                            //         dataKey="tktId"
                                            //         columns={columnsConfig}
                                            //         header={headerTemplate}
                                            //         datos={state.datos}
                                            //         totalRecords={state.totalRecords}
                                            //         loading={loading.table}
                                            //         pagination={pagination}
                                            //         onCustomPage={onCustomPage}
                                            //         setPagination={setPagination}
                                            //         actionBodyTemplate={renderActions}
                                            //         isRowSelectable
                                            //         onSelectionChange={openViewTicket}
                                            //         emptyMessage={
                                            //             <EmptyState
                                            //                 title="No hay tickets registrados"
                                            //                 description="Puedes registrar uno nuevo desde aquí."
                                            //                 buttonLabel="Registrar nuevo ticket"
                                            //                 onButtonClick={() => venTicket.current.newTicket()}
                                            //                 canCreate={canCreate}
                                            //             />
                                            //         }
                                            //         rowsPerPageOptions={[10, 20, 50, 100]}
                                            //     />
                                            // )}

                                            // === DESKTOP / TABLET ===
                                            <div
                                                style={{
                                                    height: "calc(100vh - 250px)",  // limita el alto total del área de la tabla
                                                    display: "flex",
                                                    flexDirection: "column",
                                                }}
                                            >
                                                {/* Header / toolbar arriba */}
                                                <div
                                                    style={{
                                                        display: "flex",
                                                        justifyContent: "flex-end",
                                                        marginBottom: "0.75rem",
                                                        flexShrink: 0,
                                                    }}
                                                >
                                                    {headerTemplate}
                                                </div>

                                                {/* Contenedor que scrollea la tabla */}
                                                <div style={{ flex: 1, minHeight: 0 }}>
                                                    <DataTableComponentMemo
                                                        KeyModule="module_tickets"
                                                        dataKey="tktId"
                                                        columns={columnsConfig}
                                                        datos={state.datos}
                                                        totalRecords={state.totalRecords}
                                                        loading={loading.table}
                                                        pagination={pagination}
                                                        onCustomPage={onCustomPage}
                                                        setPagination={setPagination}
                                                        actionBodyTemplate={renderActions}
                                                        isRowSelectable
                                                        onSelectionChange={openViewTicket}
                                                        emptyMessage={
                                                            <EmptyState
                                                                title="No hay tickets registrados"
                                                                description="Puedes registrar uno nuevo desde aquí."
                                                                buttonLabel="Registrar nuevo ticket"
                                                                onButtonClick={() => venTicket.current.newTicket()}
                                                                canCreate={canCreate}
                                                            />
                                                        }
                                                        rowsPerPageOptions={[10, 20, 50, 100]}
                                                        scrollable
                                                        scrollHeight={"calc(100vh - 450px)"}
                                                        classNameTableWrapper="dataTableFullHeight tableMinWidth"
                                                        fullHeight
                                                    />
                                                </div>
                                            </div>
                                        )}
                                    </>
                                </TabPanel>
                            ))}
                        </TabView>
                    </div>
                </div>
            </Suspense>
        </div>
    );
};

export default Tickets;
