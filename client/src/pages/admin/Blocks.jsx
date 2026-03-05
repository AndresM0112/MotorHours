import React, {
    useRef,
    useContext,
    useState,
    useEffect,
    useMemo,
    useCallback,
    Suspense,
} from "react";
import { AuthContext } from "@context/auth/AuthContext";
import { ToastContext } from "@context/toast/ToastContext";
import useHandleApiError from "@hook/useHandleApiError";
import useHandleData from "@hook/useHandleData";
import usePaginationData from "@hook/usePaginationData";
import { Button } from "primereact/button";
import PageHeader from "@components/layout/PageHeader";
import { RightToolbar } from "@components/generales";
import ChipStatusComponent from "@components/fields/ChipStatusComponent";
import ContextMenuActions from "@components/data/ContextMenuActions";
import { ConfirmDialog } from "primereact/confirmdialog";
import usePermissions from "@context/permissions/usePermissions";
import EmptyState from "@components/data/EmptyState";
import SkeletonMasterLoader from "@components/generales/SkeletonMasterLoader";
import LoadingComponent from "@components/layout/LoadingComponent";
import { estados, propsSelect } from "@utils/converAndConst";


// APIs
import { deleteBlocksAPI, paginateBlocksAPI, importPropertiesAPI} from "@api/requests/blocksApi";

// Modales
import VenProjects from "./components/modals/VenProjects";
import VenAsignProjectsAreas from "./components/modals/VenAsignProjectsAreas";
import VenPerfil from "../security/components/VenPerfil";
import BlocksDetailTabs from "./components/BlocksDetail";
import { useMediaQueryContext } from "@context/mediaQuery/mediaQueryContext";
import PreImportBloquesLocalesOwners from "@pages/security/components/PreImportBloquesLocalesOwners";

// Lazy
const LazyDataTable = React.lazy(() => import("@components/data/DataTableComponent"));
const DataTableComponentMemo = React.memo(LazyDataTable);
const LazyFilterComponent = React.lazy(() => import("@components/data/FilterOverlay"));
const FilterComponentMemo = React.memo(LazyFilterComponent);
const VenPerfilMemo = React.memo(VenPerfil);
const VenAsignProjectsAreaMemo = React.memo(VenAsignProjectsAreas);

const Blocks = () => {
    const VenProject = useRef(null);
    const venPerfilRef = useRef();
    const VenAsignProjectsAreaRef = useRef();
    const overlayFiltersRef = useRef(null);


    const { isMobile, isTablet } = useMediaQueryContext();

    const [projectSidebar, setProjectSidebar] = useState(false);
    const { nombreusuario } = useContext(AuthContext);
    const { showSuccess } = useContext(ToastContext);
    const handleApiError = useHandleApiError();
    const { state, setInitialState, deleteItem, addItem, updateItem } = useHandleData();

    const { hasPermission } = usePermissions();
    const [currentProfile, setCurrentProfile] = useState(null);
    const [selectedProject, setSelectedProject] = useState(() => {
        const storedId = localStorage.getItem("selectedProjectId");
        if (storedId && state && state.datos) {
            return state.datos.find((p) => String(p.proId) === String(storedId));
        }
        return undefined;
    });

    useEffect(() => {
        const storedId = localStorage.getItem("selectedProjectId");
        if (storedId && state && state.datos) {
            const found = state.datos.find((p) => String(p.proId) === String(storedId));
            if (found) setSelectedProject(found);
        }
    }, [state.datos]);

    const canAssignPermission = hasPermission("security", "profiles", "assignPermission");
    const canCreate = hasPermission("management", "projects", "create");
    const canEdit = hasPermission("management", "projects", "edit");
    const canDelete = hasPermission("management", "projects", "delete");
    const [importBlocksVisible, setImportBlocksVisible] = useState(false);

    const [loading, setLoading] = useState({ table: false });
    const [firstLoad, setFirstLoad] = useState(true);
    const initialFilters = useMemo(() => ({
        nombre: null,
        estado: null,
        bloCodigo: null,
        locCodigo: null,
        locNombre: null,
        propietario: null,
    }), []);
    const sortField = "nombre";

    const { filtros, setFiltros, datos, totalRecords, pagination, setPagination, onCustomPage } =
        usePaginationData(initialFilters, paginateBlocksAPI, setLoading, sortField, () => true);

    useEffect(() => {
        if (!loading.table && firstLoad) {
            setTimeout(() => setFirstLoad(false), 400);
        }
    }, [loading.table, firstLoad]);

    useEffect(() => {
        setInitialState(datos, totalRecords);
    }, [datos, totalRecords, setInitialState]);

    const filtersConfig = useMemo(
        () => [
            { key: "nombre", type: "input", label: "Nombre", filtro: filtros.nombre },
            {
                key: "estado",
                type: "dropdown",
                label: "Estado",
                filtro: filtros.estado,
                props: { ...propsSelect, options: estados },
            },
            { key: "bloCodigo", type: "input", label: "Código de bloque", filtro: filtros.bloCodigo },
            { key: "locCodigo", type: "input", label: "Código de local", filtro: filtros.locCodigo },
            { key: "locNombre", type: "input", label: "Nombre de local", filtro: filtros.locNombre },
            { key: "propietario", type: "input", label: "Propietario", filtro: filtros.propietario },

        ],
        [filtros]
    );

    const activeFiltersCount = useMemo(() => {
        return Object.values(filtros).filter((v) => v !== null && v !== "").length;
    }, [filtros]);

    const [deleteDialogVisible, setDeleteDialogVisible] = useState(false);
    const [currentProject, setCurrentProject] = useState(null);

    const deleteApi = useCallback(
        async (id) => {
            try {
                await deleteBlocksAPI({ ids: [id], usuario: nombreusuario });
                showSuccess("Bloque eliminado correctamente");
                VenProject.current.onClose();
                deleteItem({ id, idField: "proId" });
            } catch (error) {
                handleApiError(error);
            }
        },
        [nombreusuario, deleteItem, showSuccess, handleApiError]
    );

    const renderActions = (item) => {
        const { proId, nombre } = item;
        const menuItems = [
            {
                label: "Editar",
                icon: "pi pi-pencil",
                command: () => VenProject.current.editProject(item),
                disabled: !canEdit,
                color: "#fda53a",
            },
            {
                label: "Eliminar",
                icon: "pi pi-trash",
                command: () => {
                    setCurrentProject({ proId, nombre });
                    setDeleteDialogVisible(true);
                },
                disabled: !canDelete,
                color: "#f43f51",
            },
        ];
        return <ContextMenuActions menuItems={menuItems} itemId={proId} />;
    };

    // const [expandedRows, setExpandedRows] = useState({}); 

    const rowExpansionTemplate = (row) => (
        <div style={{ padding: '0.5rem 0.75rem' }}>
            <BlocksDetailTabs
                project={{ proId: row.proId, nombre: row.nombre }}
                usuarioActual={nombreusuario}
                inlineOnly
                // 👇 nuevo: le pasamos los filtros de local usados en la grilla de bloques
                focusLocal={{
                    codigo: filtros?.locCodigo || null,
                    nombre: filtros?.locNombre || null,
                }}
            />
        </div>
    );


    // Estado
    const [expandedRows, setExpandedRows] = useState({}); // {} mejor que null

    // Toggle en modo acordeón: una sola fila expandida a la vez
    const onRowToggleAccordion = (e) => {
        const prev = expandedRows || {};
        const next = e.data || {};

        const prevKeys = new Set(Object.keys(prev));
        const nextKeys = Object.keys(next);

        // Si disminuyó la cantidad de keys, es colapso: aceptar tal cual
        if (nextKeys.length < prevKeys.size) {
            setExpandedRows(next);
            return;
        }

        // Si aumentó (expansión), detecta la key agregada y deja solo esa abierta
        const added = nextKeys.find((k) => !prevKeys.has(k));
        setExpandedRows(added ? { [added]: true } : {});
    };

    // (Opcional) handlers explícitos; no son necesarios con lo de arriba
    const handleRowExpand = (e) => {
        const id = e.data.proId;
        setExpandedRows({ [id]: true });
    };
    const handleRowCollapse = () => setExpandedRows({});


    const columnsConfig = [
        { expander: true, style: { width: '4rem', minWidth: '4rem', maxWidth: '4rem' } }, // PRIMERO

        {
            field: "codigo",
            header: "Código",
            style: { flexGrow: 1, width: "10rem", minWidth: "10rem", maxWidth: "10rem" },
            mobile: true,
        },
        {
            field: "nombre",
            header: "Nombre",
            style: { flexGrow: 1, minWidth: "20rem" },
            mobile: true,
        },
        {
            field: "estado",
            header: "Estado",
            style: { width: "8rem", minWidth: "8rem", maxWidth: "8rem" },
            body: ({ estado }) => (
                <ChipStatusComponent
                    id={estado}
                    nameStatus={estado}
                    background={estado === "activo" ? "#00a19b" : "#f59e0b"}
                />
            ),
            mobile: true,
        },
    ];

    const actionsToolbar = useMemo(
        () => (
            <>
                <div style={{ position: "relative", display: "inline-block" }}>
                    <Button
                        icon="pi pi-sliders-h"
                        label="Filtros"
                        iconPos="left"
                        className="p-button-sm p-button-rounded ml-2"
                        onClick={(e) => overlayFiltersRef.current.toggle(e)}
                    />
                    {activeFiltersCount > 0 && (
                        <span
                            className="fade-in"
                            style={{
                                position: "absolute",
                                top: "-8px",
                                right: "-8px",
                                backgroundColor: "#f44336",
                                color: "#fff",
                                borderRadius: "50%",
                                padding: "4px 8px",
                                fontSize: "8px",
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
                    onClick={() => VenProject.current.newProject()}
                    disabled={!canCreate}
                />

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

    const headerTemplate = useMemo(
        () => <div style={{ flexShrink: 0 }}>{actionsToolbar}</div>,
        [actionsToolbar]
    );

    const handleRowSelect = (e) => {
        setSelectedProject(e.value);
        if (e.value && e.value.proId) {
            localStorage.setItem("selectedProjectId", e.value.proId);
        }
        if (isMobile || isTablet) {
            setProjectSidebar(true);
        }
    };

    return firstLoad ? (
        <SkeletonMasterLoader />
    ) : (
        <div className="fade-in">
            <ConfirmDialog
                visible={deleteDialogVisible}
                onHide={() => setDeleteDialogVisible(false)}
                message={`¿Deseas eliminar el bloque ${currentProject?.nombre}?`}
                accept={() => {
                    deleteApi(currentProject?.proId);
                    setDeleteDialogVisible(false);
                }}
                reject={() => setDeleteDialogVisible(false)}
                acceptClassName="p-button-danger"
                acceptLabel="Si"
                header="Confirmación"
                icon="pi pi-exclamation-triangle"
            />

            <VenPerfilMemo
                ref={venPerfilRef}
                addItem={addItem}
                updateItem={updateItem}
                setCurrentProfile={setCurrentProfile}
                setDeleteDialogVisible={setDeleteDialogVisible}
                canAssignPermission={canAssignPermission}
                canDelete={canDelete}
            />
            <VenAsignProjectsAreaMemo
                ref={VenAsignProjectsAreaRef}
                addItem={addItem}
                updateItem={updateItem}
                setCurrentProfile={setCurrentProfile}
                setDeleteDialogVisible={setDeleteDialogVisible}
                canAssignPermission={canAssignPermission}
                canDelete={canDelete}
            />

            <VenProjects
                ref={VenProject}
                addItem={addItem}
                updateItem={updateItem}
                setDeleteDialogVisible={setDeleteDialogVisible}
                setCurrentProject={setCurrentProject}
                canDelete={canDelete}
            />

            <PageHeader
                page="Administración"
                title="Bloques"
                description="Gestión de bloques"
            />

            <Suspense fallback={<LoadingComponent />}>
                <FilterComponentMemo
                    overlayRef={overlayFiltersRef}
                    filters={filtersConfig}
                    initialFilters={initialFilters}
                    setFilters={setFiltros}
                />

                {/* CONTENEDOR ALTO TOTAL (ajusta 200-240px si tu header es más alto o más bajo) */}
                {/* <div style={{ height: 'calc(100vh - 220px)', display: 'flex', flexDirection: 'column' }}> */}
                <div style={{ height: 'calc(100vh - 180px)', display: 'flex', flexDirection: 'column' }}>
                    <div className="grid" style={{ flex: 1, minHeight: 0 }}>
                        {/* SIEMPRE col-12 para ocupar el ancho completo */}
                        <div className="col-12" style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                            <div style={{ flex: 1, minHeight: 0 }}>
                                <DataTableComponentMemo
                                    KeyModule="module_projects"
                                    dataKey="proId"
                                    columns={columnsConfig}
                                    header={headerTemplate}
                                    datos={state.datos}
                                    totalRecords={state.totalRecords}
                                    loading={loading.table}
                                    pagination={pagination}
                                    onCustomPage={onCustomPage}
                                    setPagination={setPagination}
                                    actionBodyTemplate={renderActions}
                                    isRowSelectable
                                    onSelectionChange={handleRowSelect}
                                    emptyMessage={
                                        <EmptyState
                                            title="No hay bloques registrados"
                                            description="Puedes crear un nuevo bloque para comenzar."
                                            buttonLabel="Registrar nuevo bloque"
                                            onButtonClick={() => VenProject.current.newProject()}
                                            canCreate={canCreate}
                                        />
                                    }
                                    selection={selectedProject}
                                    selectionMode="single"
                                    rowClassName={(rowData) =>
                                        selectedProject && rowData.proId === selectedProject.proId ? "selected-row" : ""
                                    }

                                    /* EXPANSIÓN */
                                    expandedRows={expandedRows}
                                    onRowToggle={onRowToggleAccordion}   // << usa el acordeón

                                    onRowExpand={handleRowExpand}                  // <<< NUEVO
                                    onRowCollapse={handleRowCollapse}
                                    rowExpansionTemplate={rowExpansionTemplate}

                                    /* >>> NUEVO: que el wrapper use flex-height */

                                    scrollable
                                    scrollHeight={isMobile || isTablet ? "64vh" : "calc(100vh - 360px)"}
                                    classNameTableWrapper="dataTableFullHeight tableMinWidth"  /* ver nota abajo */
                                    fullHeight
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <PreImportBloquesLocalesOwners
                    visible={importBlocksVisible}
                    onHide={() => setImportBlocksVisible(false)}
                    onImported={() => {
                        // Si necesitas refrescar algo tras importar, hazlo aquí.
                        // Por ahora cerramos y listo.
                        setImportBlocksVisible(false);
                    }}
                    importApi={importPropertiesAPI}
                    toast={{
                        success: (m) => showSuccess(m),
                        error: (m) => handleApiError({ message: m }),
                        warn: (m) => showSuccess(m),  // si tienes toast.warn úsalo aquí
                        info: (m) => showSuccess(m),
                    }}
                />
            </Suspense>
        </div>
    );
};

export default Blocks;
