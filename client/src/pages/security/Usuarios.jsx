import React, {
    useContext,
    useEffect,
    useState,
    useRef,
    useCallback,
    useMemo,
    Suspense,
} from "react";
import { useLocation } from "react-router-dom";

// Contexts
import { AuthContext } from "@context/auth/AuthContext";
import { ToastContext } from "@context/toast/ToastContext";

// Hooks
import useHandleApiError from "@hook/useHandleApiError";
import useHandleData from "@hook/useHandleData";
import usePaginationData from "@hook/usePaginationData";

// Components
import VenUsuario from "./components/VenUsuario";
import { RightToolbar } from "@components/generales";
import ChipStatusComponent from "@components/fields/ChipStatusComponent";

// PrimeReact
import { Button } from "primereact/button";

// APIs
import {
    deleteUserAPI,
    countUsersAPI,
    paginationUsersAPI,
    getProfilesAPI,
    importEmployeesAPI,
} from "@api/requests";

// import { importPropertiesAPI } from "@api/blocks.Api";
// import { importPropertiesAPI } from "@api/requests/blocksApi";  // Eliminado para taller

// Utilities
import { estados, getInitials, propsSelect } from "@utils/converAndConst";
import { formatNotificationDateTime } from "@utils/formatTime";
import PageHeader from "@components/layout/PageHeader";
import LoadingComponent from "@components/layout/LoadingComponent";
import SkeletonMasterLoader from "@components/generales/SkeletonMasterLoader";
import ContextMenuActions from "@components/data/ContextMenuActions";
import usePermissions from "@context/permissions/usePermissions";
import { useMediaQueryContext } from "@context/mediaQuery/mediaQueryContext";
import { ConfirmDialog } from "primereact/confirmdialog";
import { TabPanel, TabView } from "primereact/tabview";
import EmptyState from "@components/data/EmptyState";
import { Avatar } from "primereact/avatar";
import PreImportEmpleados from "./components/PreImportEmpleados";
import InfiniteScrollCards from "@components/ui/InfiniteScrollCards";

// Lazy Loaded Components
const LazyDataTable = React.lazy(() => import("@components/data/DataTableComponent"));
const DataTableComponentMemo = React.memo(LazyDataTable);

const LazyFilterComponent = React.lazy(() => import("@components/data/FilterOverlay"));
const FilterComponentMemo = React.memo(LazyFilterComponent);

const ACCENT = "#007e79";

const generateFiltersConfig = ({ filtros }) => [
    { key: "nombre", type: "input", label: "Nombre", filtro: filtros.nombre },
    { key: "apellido", type: "input", label: "Apellido", filtro: filtros.apellido },
    { key: "documento", type: "input", label: "Nit/CC", filtro: filtros.documento },
    { key: "correo", type: "input", label: "Correo", filtro: filtros.correo },
    { key: "telefono", type: "input", label: "Teléfono", filtro: filtros.telefono },
    { key: "direccion", type: "input", label: "dirección", filtro: filtros.direccion },
    { key: "usuario", type: "input", label: "Usuario", filtro: filtros.usuario },
    {
        key: "estado",
        type: "dropdown",
        props: { ...propsSelect, options: estados },
        label: "Estado",
        showClear: true,
        filtro: filtros.estado,
    },
];

const EstadoPill = ({ estid, nomestado }) => {
    const ok = Number(estid) === 1;
    return (
        <div
            style={{
                fontSize: 11,
                lineHeight: "18px",
                padding: "0 8px",
                borderRadius: 999,
                background: ok ? "#00a19b22" : "#f59e0b22",
                color: ok ? "#007e79" : "#a96f08",
                border: `1px solid ${ok ? "#00a19b55" : "#f59e0b55"}`,
                flexShrink: 0,
            }}
        >
            {nomestado ?? "-"}
        </div>
    );
};

const Label = ({ children }) => (
    <div
        style={{
            fontSize: 10,
            letterSpacing: 0.3,
            textTransform: "uppercase",
            color: ACCENT,
            lineHeight: "12px",
            marginBottom: 2,
        }}
    >
        {children}
    </div>
);

const Value = ({ children }) => (
    <div
        style={{
            fontSize: 13,
            fontWeight: 700,
            color: "#111827",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
        }}
    >
        {children ?? "—"}
    </div>
);

const Field = ({ label, value, title }) => (
    <div
        style={{
            flex: 1,
            minWidth: 0,
            padding: "10px 12px",
            borderRadius: 12,
            background: `rgba(0,126,121,0.08)`,
            border: `1px solid rgba(0,126,121,0.2)`,
        }}
        title={title || String(value || "")}
    >
        <Label>{label}</Label>
        <Value>{value}</Value>
    </div>
);

const Dot = () => (
    <span
        style={{
            width: 4,
            height: 4,
            borderRadius: 999,
            background: "#CBD5E1",
            display: "inline-block",
            margin: "0 6px",
            transform: "translateY(-1px)",
        }}
    />
);

const Usuarios = () => {
    const location = useLocation();
    const pathname = location.pathname;

    const venUsuario = useRef();
    const { idusuario, nombreusuario } = useContext(AuthContext);
    const { isDesktop } = useMediaQueryContext();

    const { hasPermission } = usePermissions();

    const canCreate = hasPermission(
        "security",
        pathname.includes("clients") ? "clients" : pathname.includes("employees") ? "employees" : "users",
        "create"
    );
    const canAssignPermission = hasPermission("security", "users", "assignPermission");
    const canEdit = hasPermission(
        "security",
        pathname.includes("clients") ? "clients" : pathname.includes("employees") ? "employees" : "users",
        "edit"
    );
    const canDelete = hasPermission(
        "security",
        pathname.includes("clients") ? "clients" : pathname.includes("employees") ? "employees" : "users",
        "delete"
    );

    const { showSuccess } = useContext(ToastContext);
    const handleApiError = useHandleApiError();
    const [loading, setLoading] = useState({ table: true });
    const [conprf, setConprf] = useState([]);
    const overlayFiltersRef = useRef(null);
    const [firstLoad, setFirstLoad] = useState(true);
    const [listperfiles, setListperfiles] = useState([]);
    const [isClient, setIsClient] = useState(false);
    const [isEmployee, setIsEmployee] = useState(false);

    const [importVisible, setImportVisible] = useState(false);
    const [importBlocksVisible, setImportBlocksVisible] = useState(false);
    

    const showOverlayFilters = (event) => {
        overlayFiltersRef.current.toggle(event);
    };

    const { state, setInitialState, deleteItem, addItem, updateItem } = useHandleData();

    // ESTAR ACTUALIZANDO FECHA DE MODIFICACION
    const [, setCurrentTime] = useState(new Date());
    const getLists = async () => {
        try {
            const { data } = await getProfilesAPI();
            setListperfiles(data);
        } catch (error) {
            handleApiError(error);
        }
    };

    useEffect(() => {
        if (pathname.includes("clients")) {
            setIsEmployee(false);
            setIsClient(true);
            setFiltros((prev) => ({
                ...prev,
                prfId: 3,
            }));
        } else if (pathname.includes("employees")) {
            setIsClient(false);
            setIsEmployee(true);
            setFiltros((prev) => ({
                ...prev,
                prfId: 14,
            }));
        } else {
            setIsEmployee(false);
            setIsClient(false);
            setFiltros((prev) => ({
                ...prev,
                prfId: null,
            }));
        }
    }, [location]);

    useEffect(() => {
        getLists();
    }, []); // eslint-disable-line

    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentTime(new Date());
        }, 60000);
        return () => clearInterval(interval);
    }, []);

    const initialFilters = useMemo(
        () => ({
            idusuario,
            prfId: null,
            nombre: "",
            apellido: "",
            documento: "",
            correo: "",
            usuario: "",
            estado: null,
        }),
        [idusuario, isClient, isEmployee]
    );

    const columnsConfig = [
        {
            field: "usuFoto",
            sortable: false,
            style: { flexGrow: 0, flexBasis: "3rem", width: "3rem", textAlign: "center" },
            body: ({ usuFoto, nombre, apellido }) => (
                <span>
                    <Avatar
                        image={usuFoto}
                        label={!usuFoto ? getInitials(`${nombre ? nombre : ""} ${apellido ? apellido : ""}`) : null}
                        shape="circle"
                        size="normal"
                        style={{
                            border: "2px solid #fff",
                            boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
                            cursor: "pointer",
                            marginRight: 10,
                        }}
                    />
                </span>
            ),
            mobile: true,
        },
        {
            field: "documento",
            header: "Nit/CC",
            style: { flexGrow: 1, flexBasis: "8rem", width: "8rem" },
            mobile: true,
        },
        {
            field: "nombre,apellido",
            header: "Nombre",
            style: { flexGrow: 1, flexBasis: "20rem", width: "20rem", wordBreak: "break-word" },
            body: ({ nombre, apellido }) => `${nombre ? nombre : ""} ${apellido ? apellido : ""}`,
            mobile: true,
        },
        {
            field: "usuario",
            header: "Usuario",
            style: { flexGrow: 1, flexBasis: "10rem", width: "10rem" },
        },
        {
            field: "correo",
            header: "Correo",
            style: { flexGrow: 1, flexBasis: "20rem", width: "20rem", wordBreak: "break-word" },
        },
        {
            field: "telefono",
            header: "Teléfono",
            style: { flexGrow: 1, flexBasis: "15rem", width: "15rem" },
        },
        {
            field: "direccion",
            header: "Dirección",
            style: { flexGrow: 1, flexBasis: "15rem", width: "15rem" },
        },
        {
            field: "nomperfil",
            header: "Perfil",
            style: { flexGrow: 1, flexBasis: "10rem", width: "10rem" },
        },
        {
            field: "usuact,fecact",
            header: "Actualizado Por",
            style: { flexGrow: 1, flexBasis: "20rem", width: "20rem" },
            body: ({ usuact, fecact }) => (
                <div>
                    <div>
                        <span style={{ fontWeight: 600 }}>{usuact}</span>
                    </div>
                    <div>{formatNotificationDateTime(fecact)}</div>
                </div>
            ),
        },
        {
            field: "nomestado",
            header: "Estado",
            style: { flexGrow: 1, flexBasis: "8rem", width: "8rem" },
            frozen: isDesktop,
            body: ({ estid, nomestado }) => <ChipStatusComponent id={estid} nameStatus={nomestado} />,
        },
    ];

    const sortField = "nombre";

    const {
        reloadData,
        filtros,
        setFiltros,
        datos,
        totalRecords,
        pagination,
        setPagination,
        onCustomPage,
    } = usePaginationData(initialFilters, paginationUsersAPI, setLoading, sortField, () => true);

    useEffect(() => {
        if (!loading.table && firstLoad) {
            setTimeout(() => setFirstLoad(false), [400]);
        }
    }, [loading.table, firstLoad]);

    useEffect(() => {
        setFiltros((prevFilters) => ({
            ...prevFilters,
            idusuario,
        }));
    }, [idusuario, setFiltros]);

    useEffect(() => {
        setInitialState(datos, totalRecords);
    }, [datos, totalRecords, setInitialState]); // eslint-disable-line

    const filtersConfig = useMemo(() => generateFiltersConfig({ filtros }), [filtros]);

    const getActiveFiltersCount = (filters) => {
        return Object.entries(filters).filter(([key, value]) => {
            if (key === "prfId" && value) return false;
            if (key === "idusuario" && value) return false;
            return value !== null && value !== undefined && value !== "";
        }).length;
    };

    const activeFiltersCount = useMemo(() => getActiveFiltersCount(filtros), [filtros]);

    const contarUsuarios = async () => {
        try {
            const { data } = await countUsersAPI({ idusuario });
            setConprf(data);
        } catch (error) {
            handleApiError(error);
        }
    };
    useEffect(() => {
        if (idusuario) contarUsuarios();
    }, [idusuario, handleApiError]); // eslint-disable-line

    const deleteApi = useCallback(
        async (usuId) => {
            try {
                const params = {
                    usuId,
                    usuario: nombreusuario,
                };
                const { data } = await deleteUserAPI(params);
                deleteItem({ id: usuId, idField: "usuId" });
                contarUsuarios();
                venUsuario.current.onClose();
                showSuccess(data.message);
            } catch (error) {
                handleApiError(error);
            }
        },
        [deleteItem, handleApiError, nombreusuario, showSuccess]
    );

    const [deleteDialogVisible, setDeleteDialogVisible] = useState(false);
    const [currentUser, setCurrentUser] = useState(null);

    const { showSuccess: _s } = useContext(ToastContext); // evitar warning

    const renderActions = (item) => {
        const { usuId, perfil } = item;
        const menuItems = [
            {
                label: `Editar`,
                icon: "pi pi-pencil",
                command: () => {
                    venUsuario.current.editUser(item, 0);
                },
                disabled: !canEdit,
                color: "#fda53a",
            },
            !pathname.includes("clients", "employees") && {
                label: `Asignar Permisos`,
                icon: "pi pi-lock",
                command: () => {
                    venUsuario.current.editUser(item, 1);
                },
                disabled: !canAssignPermission,
                color: "#0eb0e9",
            },
        ].filter(Boolean);

        if (![1, 2, 3].includes(perfil)) {
            menuItems.push({
                label: `Eliminar`,
                icon: "pi pi-trash",
                command: () => {
                    setCurrentUser(item);
                    setDeleteDialogVisible(true);
                },
                disabled: !canDelete,
                color: "#f44336",
            });
        }

        return <ContextMenuActions menuItems={menuItems} itemId={usuId} />;
    };

    const renderTabs = useMemo(() => {
        return [
            <TabPanel
                key="all"
                header={
                    <>
                        TODOS{" "}
                        <span className="p-badge p-component p-badge-primary">
                            {conprf.reduce((acc, curr) => acc + curr.cant, 0)}
                        </span>
                    </>
                }
            />,
            ...conprf.map((perf) => (
                <TabPanel
                    key={perf.prfId}
                    header={
                        <>
                            {perf.nombre}{" "}
                            <span className="p-badge p-component p-badge-primary">{perf.cant}</span>
                        </>
                    }
                />
            )),
        ];
    }, [conprf]);

    const actionsToolbar = useMemo(
        () => (
            <>
                <div style={{ position: "relative", display: "inline-block" }}>
                    <Button
                        icon="pi pi-sliders-h"
                        label="Filtros"
                        iconPos="left"
                        className="p-button-sm p-button-rounded ml-2"
                        onClick={showOverlayFilters}
                    />
                    {activeFiltersCount > 0 && (
                        <span
                            className="fade-in"
                            style={{
                                position: "absolute",
                                top: -8,
                                right: -8,
                                backgroundColor: "#f44336",
                                color: "#fff",
                                borderRadius: "50%",
                                padding: "4px 8px",
                                fontSize: 10,
                                fontWeight: "bold",
                                zIndex: 1,
                            }}
                        >
                            {activeFiltersCount}
                        </span>
                    )}
                </div>

                <RightToolbar
                    label="Crear"
                    onClick={() => venUsuario.current.newUser()}
                    disabled={!canCreate}
                />

                {/* <Button
                    icon="pi pi-upload"
                    label="Importar"
                    className="p-button-sm p-button-rounded ml-2 p-button-help"
                    onClick={() => setImportVisible(true)}
                /> */}
                <Button
                    icon="pi pi-upload"
                    label="Importar Propiedades"
                    className="p-button-sm p-button-rounded ml-2 p-button-help"
                    onClick={() => setImportBlocksVisible(true)}
                />
            </>
        ),
        [activeFiltersCount, canCreate]
    );

    const headerTemplateToolbar = useMemo(
        () => (
            <>
                <div style={{ flexShrink: 0 }}>{actionsToolbar}</div>
            </>
        ),
        [actionsToolbar]
    );

    const handleRowSelect = (e) => {
        const target = e.originalEvent.target;
        if (!canEdit) return;
        if (
            target.closest(".p-dropdown") ||
            target.closest(".p-multiselect") ||
            target.closest(".p-dropdown-item") ||
            target.closest(".p-multiselect-item") ||
            target.closest("input") ||
            target.closest("button") ||
            target.closest(".p-checkbox") ||
            target.closest(".p-radiobutton") ||
            target.closest(".p-inputtext")
        ) {
            return;
        }
        venUsuario.current.editUser(e.value);
    };

    // Helpers visuales para mobile
    const headerCardTemplate = (item) => {
        const nombre = `${item?.nombre ?? ""} ${item?.apellido ?? ""}`.trim() || "-";
        return (
            <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
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
                    title={nombre}
                >
                    {item?.usuFoto ? (
                        <img src={item.usuFoto} alt={nombre} style={{ width: "100%", height: "100%" }} />
                    ) : (
                        (nombre.match(/\b\w/g) || []).slice(0, 2).join("").toUpperCase()
                    )}
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0, flex: 1 }}>
                    <div
                        className="title-main"
                        style={{
                            fontWeight: 600,
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            minWidth: 0,
                            flex: 1,
                        }}
                        title={nombre}
                    >
                        {nombre}
                    </div>
                    <EstadoPill estid={item?.estid} nomestado={item?.nomestado} />
                </div>
            </div>
        );
    };

    // const bodyCardTemplate = (item) => (
    //     <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
    //         {/* Fila superior: 3 ítems clave */}
    //         <div
    //             style={{
    //                 display: "grid",
    //                 gridTemplateColumns: "1fr 1fr 1fr",
    //                 gap: 10,
    //                 alignItems: "stretch",
    //             }}
    //         >
    //             <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
    //                 <span style={{ fontSize: 14, opacity: 0.8 }}>👤</span>
    //                 <div style={{ minWidth: 0 }}>
    //                     <div style={{ fontSize: 11, color: "#6B7280" }}>Usuario</div>
    //                     <div
    //                         style={{
    //                             fontSize: 13,
    //                             fontWeight: 600,
    //                             color: "#111827",
    //                             whiteSpace: "nowrap",
    //                             overflow: "hidden",
    //                             textOverflow: "ellipsis",
    //                         }}
    //                         title={String(item.usuario || "")}
    //                     >
    //                         {item.usuario ?? "—"}
    //                     </div>
    //                 </div>
    //             </div>

    //             <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
    //                 <span style={{ fontSize: 14, opacity: 0.8 }}>🧩</span>
    //                 <div style={{ minWidth: 0 }}>
    //                     <div style={{ fontSize: 11, color: "#6B7280" }}>Perfil</div>
    //                     <div
    //                         style={{
    //                             fontSize: 13,
    //                             fontWeight: 600,
    //                             color: "#111827",
    //                             whiteSpace: "nowrap",
    //                             overflow: "hidden",
    //                             textOverflow: "ellipsis",
    //                         }}
    //                         title={String(item.nomperfil || "")}
    //                     >
    //                         {item.nomperfil ?? "—"}
    //                     </div>
    //                 </div>
    //             </div>

    //             {/* Solo Documento visible */}
    //             <div
    //                 style={{
    //                     display: "inline-flex",
    //                     alignItems: "center",
    //                     gap: 6,
    //                     padding: "4px 8px",
    //                     borderRadius: 6,
    //                     border: `1px dashed  #007e79`,
    //                     fontSize: 12,
    //                     fontWeight: 500,
    //                     color: "#007e79",
    //                     maxWidth: "fit-content",
    //                 }}
    //             >
    //                 <span style={{ fontWeight: 600 }}>CC:</span>{" "}
    //                 <span>{item.documento ?? "—"}</span>
    //             </div>
    //         </div>
    //     </div>
    // );

    // const handleCardClick = (payload) => {
    //     if (!canEdit) return;

    //     // Soporta { item }, { value } o el item directo
    //     const item = payload?.item ?? payload?.value ?? payload;
    //     const id = item?.usuId ?? item?.id;
    //     if (!id) return;

    //     const api = venUsuario.current;
    //     if (api && typeof api.editUser === "function") {
    //         api.editUser(item, 0); // abrir en editar
    //     }
    // };

    return (
        <>
            {firstLoad ? (
                <SkeletonMasterLoader />
            ) : (
                <div className={`fade-in`}>
                    <ConfirmDialog
                        visible={deleteDialogVisible}
                        onHide={() => setDeleteDialogVisible(false)}
                        message={`¿Realmente desea eliminar al usuario ${currentUser?.nombre}?`}
                        header="Confirmar Eliminación"
                        icon="pi pi-exclamation-triangle"
                        acceptLabel="Sí"
                        accept={() => {
                            deleteApi(currentUser?.usuId);
                            setDeleteDialogVisible(false);
                        }}
                        reject={() => setDeleteDialogVisible(false)}
                        acceptClassName="p-button-danger"
                    />

                    <PageHeader
                        page={
                            pathname.includes("clients") ? "Home" : pathname.includes("employees") ? "Home" : "Seguridad"
                        }
                        title={
                            pathname.includes("clients")
                                ? "Clientes"
                                : pathname.includes("employees")
                                    ? "Empleados"
                                    : "Usuarios"
                        }
                        description="Administra los usuarios del sistema, asigna perfiles, permisos y gestiona su acceso."
                    />

                    <VenUsuario
                        ref={venUsuario}
                        addItem={(item) => {
                            addItem(item);
                            contarUsuarios();
                        }}
                        updateItem={updateItem}
                        deleteItem={deleteItem}
                        setCurrentUser={setCurrentUser}
                        setDeleteDialogVisible={setDeleteDialogVisible}
                        canAssignPermission={canAssignPermission}
                        canDelete={canDelete}
                        listperfiles={listperfiles}
                        isClientUrl={isClient}
                        isEmployeeUrl={isEmployee}
                        contarUsuarios={contarUsuarios}
                    />

                    <Suspense fallback={<LoadingComponent />}>
                        <FilterComponentMemo
                            overlayRef={overlayFiltersRef}
                            initialFilters={initialFilters}
                            filters={filtersConfig}
                            setFilters={setFiltros}
                        />

                        <div className="grid">
                            <div className="col-12 md:col-12">
                                {isDesktop ? (
                                    <>
                                        <TabView

                                            activeIndex={
                                                filtros.prfId === null
                                                    ? 0
                                                    : conprf.findIndex((perf) => perf.prfId === filtros.prfId) + 1
                                            }
                                            onTabChange={(e) => {
                                                const selectedTab = e.index === 0 ? null : conprf[e.index - 1].prfId;
                                                setFiltros({ ...filtros, prfId: selectedTab });
                                            }}
                                            scrollable={true}

                                        >
                                            {!isClient && !isEmployee && renderTabs}
                                        </TabView>

                                        {/* <DataTableComponentMemo
                                            KeyModule={"module_users"}
                                            dataKey={"usuId"}
                                            columns={columnsConfig}
                                            header={
                                                <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "1rem" }}>
                                                    {headerTemplateToolbar}
                                                </div>
                                            }
                                            emptyMessage={
                                                <EmptyState
                                                    title="No hay usuarios registrados"
                                                    description="Puedes crear un nuevo usuario para comenzar."
                                                    buttonLabel="Registrar nuevo usuario"
                                                    onButtonClick={() => venUsuario.current.newUser()}
                                                    canCreate={canCreate}
                                                />
                                            }
                                            datos={state.datos}
                                            loading={loading.table}
                                            totalRecords={state.totalRecords}
                                            pagination={pagination}
                                            onCustomPage={onCustomPage}
                                            setPagination={setPagination}
                                            actionBodyTemplate={renderActions}
                                            isRowSelectable={true}
                                            onSelectionChange={handleRowSelect}
                                        /> */}
                                        {/* === CONTENEDOR DE ALTO CONTROLADO + WRAPPER FLEX === */}
                                        <div style={{ height: 'calc(100vh - 180px)', display: 'flex', flexDirection: 'column' }}>
                                            {/* <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '0.75rem', flexShrink: 0 }}>
                                                {headerTemplateToolbar}
                                            </div> */}
                                            <div style={{ flex: 1, minHeight: 0 }}>
                                                <DataTableComponentMemo
                                                    KeyModule={"module_users"}
                                                    dataKey={"usuId"}
                                                    columns={columnsConfig}
                                                     header={headerTemplateToolbar}
                                                    emptyMessage={
                                                        <EmptyState
                                                            title="No hay usuarios registrados"
                                                            description="Puedes crear un nuevo usuario para comenzar."
                                                            buttonLabel="Registrar nuevo usuario"
                                                            onButtonClick={() => venUsuario.current.newUser()}
                                                            canCreate={canCreate}
                                                        />
                                                    }
                                                    datos={state.datos}
                                                    loading={loading.table}
                                                    totalRecords={state.totalRecords}
                                                    pagination={pagination}
                                                    onCustomPage={onCustomPage}
                                                    setPagination={setPagination}
                                                    actionBodyTemplate={renderActions}
                                                    isRowSelectable={true}
                                                    onSelectionChange={handleRowSelect}
                                                    /* === claves para que el body scrollee y el paginator quede abajo === */
                                                    scrollable
                                                    scrollHeight={'calc(100vh - 360px)'}   // ajusta si tu header es más alto/bajo
                                                    classNameTableWrapper="dataTableFullHeight tableMinWidth"
                                                    // fullHeight
                                                />
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        {/* Toolbar arriba en mobile */}
                                        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "0.5rem" }}>
                                            {headerTemplateToolbar}
                                        </div>


                                        <TabView
                                            scrollable={true}
                                            activeIndex={
                                                filtros.prfId === null
                                                    ? 0
                                                    : conprf.findIndex((perf) => perf.prfId === filtros.prfId) + 1
                                            }
                                            onTabChange={(e) => {
                                                const selectedTab = e.index === 0 ? null : conprf[e.index - 1].prfId;
                                                setFiltros({ ...filtros, prfId: selectedTab });
                                            }}
                                        >
                                            {!isClient && !isEmployee && renderTabs}
                                        </TabView>

                                        {state.datos?.length <= 0 && !loading.table ? (
                                            <EmptyState
                                                title="No hay usuarios registrados"
                                                description="Puedes crear un nuevo usuario para comenzar."
                                                buttonLabel="Registrar nuevo usuario"
                                                onButtonClick={() => venUsuario.current.newUser()}
                                                canCreate={canCreate}
                                            />
                                        ) : (
                                            <InfiniteScrollCards
                                                data={state.datos}
                                                total={state.totalRecords}
                                                loading={loading.table}
                                                onScrollEnd={onCustomPage}
                                                renderActions={(row) => (
                                                    <div onClick={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}>
                                                        {renderActions(row)}
                                                    </div>
                                                )}
                                                onCardClick={(payload) => {
                                                    if (!canEdit) return;

                                                    const item = payload?.item ?? payload?.value ?? payload;
                                                    const id = item?.usuId ?? item?.id;
                                                    if (!id) return;

                                                    const api = venUsuario.current;
                                                    if (api && typeof api.editUser === "function") {
                                                        api.editUser(item, 0);
                                                    }
                                                }}

                                                headerTemplate={(item) => {
                                                    const nombre = `${item?.nombre ?? ""} ${item?.apellido ?? ""}`.trim() || "-";
                                                    return (
                                                        <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
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
                                                                title={nombre}
                                                            >
                                                                {item?.usuFoto ? (
                                                                    <img src={item.usuFoto} alt={nombre} style={{ width: "100%", height: "100%" }} />
                                                                ) : (
                                                                    (nombre.match(/\b\w/g) || []).slice(0, 2).join("").toUpperCase()
                                                                )}
                                                            </div>

                                                            <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0, flex: 1 }}>
                                                                <div
                                                                    className="title-main"
                                                                    style={{
                                                                        fontWeight: 600,
                                                                        whiteSpace: "nowrap",
                                                                        overflow: "hidden",
                                                                        textOverflow: "ellipsis",
                                                                        minWidth: 0,
                                                                        flex: 1,
                                                                    }}
                                                                    title={nombre}
                                                                >
                                                                    {nombre}
                                                                </div>
                                                                <EstadoPill estid={item?.estid} nomestado={item?.nomestado} />
                                                            </div>
                                                        </div>
                                                    );
                                                }}
                                                bodyTemplate={(item) => (
                                                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                                                        <div
                                                            style={{
                                                                display: "grid",
                                                                gridTemplateColumns: "1fr 1fr 1fr",
                                                                gap: 10,
                                                                alignItems: "stretch",
                                                            }}
                                                        >
                                                            <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                                                                <span style={{ fontSize: 14, opacity: 0.8 }}>👤</span>
                                                                <div style={{ minWidth: 0 }}>
                                                                    <div style={{ fontSize: 11, color: "#6B7280" }}>Usuario</div>
                                                                    <div
                                                                        style={{
                                                                            fontSize: 13,
                                                                            fontWeight: 600,
                                                                            color: "#111827",
                                                                            whiteSpace: "nowrap",
                                                                            overflow: "hidden",
                                                                            textOverflow: "ellipsis",
                                                                        }}
                                                                        title={String(item.usuario || "")}
                                                                    >
                                                                        {item.usuario ?? "—"}
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                                                                <span style={{ fontSize: 14, opacity: 0.8 }}>🧩</span>
                                                                <div style={{ minWidth: 0 }}>
                                                                    <div style={{ fontSize: 11, color: "#6B7280" }}>Perfil</div>
                                                                    <div
                                                                        style={{
                                                                            fontSize: 13,
                                                                            fontWeight: 600,
                                                                            color: "#111827",
                                                                            whiteSpace: "nowrap",
                                                                            overflow: "hidden",
                                                                            textOverflow: "ellipsis",
                                                                        }}
                                                                        title={String(item.nomperfil || "")}
                                                                    >
                                                                        {item.nomperfil ?? "—"}
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            <div
                                                                style={{
                                                                    display: "inline-flex",
                                                                    alignItems: "center",
                                                                    gap: 6,
                                                                    padding: "4px 8px",
                                                                    borderRadius: 6,
                                                                    border: `1px dashed  #007e79`,
                                                                    fontSize: 12,
                                                                    fontWeight: 500,
                                                                    color: "#007e79",
                                                                    maxWidth: "fit-content",
                                                                }}
                                                            >
                                                                <span style={{ fontWeight: 600 }}>CC:</span>{" "}
                                                                <span>{item.documento ?? "—"}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            />
                                        )}
                                    </>
                                )}
                            </div>
                        </div>
                    </Suspense>

                    <PreImportEmpleados
                        visible={importVisible}
                        onHide={() => setImportVisible(false)}
                        onImported={() => {
                            reloadData();
                            contarUsuarios();
                        }}
                        importApi={importEmployeesAPI}
                        toast={{ success: showSuccess, error: (m) => handleApiError({ message: m }) }}
                    />

                {/* TODO: Componente de importación eliminado para taller
                    <PreImportBloquesLocalesOwners
                        visible={importBlocksVisible}
                        onHide={() => setImportBlocksVisible(false)}
                        onImported={() => {
                            setImportBlocksVisible(false);
                        }}
                        importApi={importPropertiesAPI}
                        toast={{
                            success: (m) => showSuccess(m),
                            error: (m) => handleApiError({ message: m }),
                            warn: (m) => showSuccess(m),
                            info: (m) => showSuccess(m),
                        }}
                    />
                */}
                </div>
            )}
        </>
    );
};

export default Usuarios;
