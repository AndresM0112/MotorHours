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
import ContextMenuActions from "@components/data/ContextMenuActions";
import { ConfirmDialog } from "primereact/confirmdialog";
import usePermissions from "@context/permissions/usePermissions";
import EmptyState from "@components/data/EmptyState";
import SkeletonMasterLoader from "@components/generales/SkeletonMasterLoader";
import LoadingComponent from "@components/layout/LoadingComponent";
import { estados, propsSelect } from "@utils/converAndConst";

// APIs
import {
    deletePayrollAPI,
    paginatePayrollAPI,
    importPayrollAPI,
    getPayrollHeaderAPI,
    savePayrollHeaderAPI,
    paginatePayrollDetailAPI,
    upsertPayrollDetailAPI,
    deletePayrollDetailAPI,
    paginatePayrollBudgetAPI,
    upsertPayrollBudgetAPI,
    deletePayrollBudgetAPI,
    deleteAllPayrollDataAPI,
} from "@api/requests/payrollApi";

// Modales
import VenPayrollImport from "./components/modals/VenPayrollImport";
// Editor (nuevo)
import VenPayroll from "./components/modals/VenPayroll";

// Lazy
const LazyDataTable = React.lazy(() => import("@components/data/DataTableComponent"));
const DataTableComponentMemo = React.memo(LazyDataTable);
const LazyFilterComponent = React.lazy(() => import("@components/data/FilterOverlay"));
const FilterComponentMemo = React.memo(LazyFilterComponent);

const Payroll = () => {
    const venPayrollImportRef = useRef(null);
    const venPayrollEditorRef = useRef(null);
    const overlayFiltersRef = useRef(null);

    const { nombreusuario, idusuario } = useContext(AuthContext);
    const { showSuccess, showError, showInfo, showWarn } = useContext(ToastContext);
    const handleApiError = useHandleApiError();
    const { state, setInitialState, deleteItem } = useHandleData();

    const { hasPermission } = usePermissions();
    const canCreate = hasPermission("management", "payroll", "create") || true;
    const canEdit = hasPermission("management", "payroll", "edit") || true;
    const canDelete = hasPermission("management", "payroll", "delete") || true;

    const [loading, setLoading] = useState({ table: false });
    const [firstLoad, setFirstLoad] = useState(true);
    const initialFilters = useMemo(() => ({ nombre: null, estado: null }), []);
    const sortField = "nombre";

    const {
        filtros,
        setFiltros,
        datos,
        totalRecords,
        pagination,
        setPagination,
        onCustomPage,
    } = usePaginationData(initialFilters, paginatePayrollAPI, setLoading, sortField, () => true);

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
            { key: "nombre", type: "input", label: "Nombre", filtro: filtros.nombre },
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

    const [deleteDialogVisible, setDeleteDialogVisible] = useState(false);
    const [currentData, setCurrentData] = useState(null);

    const deleteApi = useCallback(
        async (id) => {
            try {
                await deleteAllPayrollDataAPI({ nomId: [id], usuId: idusuario });
                showSuccess("Nómina eliminada correctamente");
                void venPayrollImportRef.current?.onClose?.();
                deleteItem({ id, idField: "nomId" });
            } catch (error) {
                handleApiError(error);
            }
        },
        [nombreusuario, deleteItem, showSuccess, handleApiError]
    );

    const moneyFmt = new Intl.NumberFormat("es-CO", {
        style: "currency",
        currency: "COP",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
    const dateBody = (v) => (v ? new Date(v).toLocaleString() : "-");
    const numberBody = (v) =>
        v !== null && v !== undefined ? Number(v).toLocaleString("es-CO") : "-";

    const columnsConfig = [
        { field: "codigo", header: "Código", style: { flexGrow: 1, minWidth: "16rem" } },
        {
            field: "nomNombre",
            header: "Nombre",
            style: { flexGrow: 1, minWidth: "18rem" },
            body: (row) => row.nomNombre ?? "-",
        },
        {
            field: "anio",
            header: "Año",
            style: { maxWidth: "8rem", textAlign: "center" },
            bodyStyle: { textAlign: "center" },
        },
        {
            field: "mes",
            header: "Mes",
            style: { maxWidth: "8rem", textAlign: "center" },
            bodyStyle: { textAlign: "center" },
        },
        {
            field: "fechaRegistro",
            header: "Fecha Registro",
            style: { maxWidth: "16rem" },
            body: (row) => dateBody(row.fechaRegistro),
        },
        {
            field: "fechaActualizacion",
            header: "Fecha Actualización",
            style: { maxWidth: "16rem" },
            body: (row) => dateBody(row.fechaActualizacion),
        },
        {
            field: "totalDebito",
            header: "Σ Débito",
            style: { maxWidth: "12rem", textAlign: "right" },
            bodyStyle: { textAlign: "right" },
            body: (row) => (row.totalDebito != null ? moneyFmt.format(row.totalDebito) : "-"),
        },
        {
            field: "totalCredito",
            header: "Σ Crédito",
            style: { maxWidth: "12rem", textAlign: "right" },
            bodyStyle: { textAlign: "right" },
            body: (row) => (row.totalCredito != null ? moneyFmt.format(row.totalCredito) : "-"),
        },
        {
            field: "totalNeto",
            header: "Σ Neto (D−C)",
            style: { maxWidth: "12rem", textAlign: "right" },
            bodyStyle: { textAlign: "right" },
            body: (row) => (row.totalNeto != null ? moneyFmt.format(row.totalNeto) : "-"),
        },
        {
            field: "items",
            header: "Ítems",
            style: { maxWidth: "8rem", textAlign: "right" },
            bodyStyle: { textAlign: "right" },
            body: (row) => numberBody(row.items),
        },
    ];

    const onEditedOrSaved = useCallback(() => {
        // refrescar con la misma paginación
        setPagination((p) => ({ ...p }));
    }, [setPagination]);

    const renderActions = (item) => {
        const { nomId, nomNombre } = item;
        const menuItems = [
            {
                label: "Ver",
                icon: "pi pi-eye",
                command: () => {
                    if (!canEdit) return;
                    void venPayrollEditorRef.current?.editPayroll?.(nomId);
                },
                disabled: !canEdit,
                color: "#3a78fd",
            },
            {
                label: "Eliminar",
                icon: "pi pi-trash",
                command: () => {
                    setCurrentData({ nomId, nombre: nomNombre });
                    setDeleteDialogVisible(true);
                },
                disabled: !canDelete,
                color: "#f43f51",
            },
        ];
        return <ContextMenuActions menuItems={menuItems} itemId={nomId} />;
    };

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
                    label="Importar"
                    onClick={() => venPayrollImportRef.current?.newImport()}
                // disabled={!canCreate}
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
        if (!canEdit) return;
        const row = e?.value || e?.data || null;
        const nomId = Array.isArray(row) ? row[0]?.nomId : row?.nomId;
        if (nomId) void venPayrollEditorRef.current?.editPayroll?.(nomId);
    };

    // Facade de toast para el modal de importación
    const toastFacade = useMemo(
        () => ({
            success: showSuccess,
            error: showError,
            info: showInfo,
            warn: showWarn,
        }),
        [showSuccess, showError, showInfo, showWarn]
    );

    return firstLoad ? (
        <SkeletonMasterLoader />
    ) : (
        <div className="fade-in">
            <ConfirmDialog
                visible={deleteDialogVisible}
                onHide={() => setDeleteDialogVisible(false)}
                message={`¿Deseas eliminar la nómina ${currentData?.nombre}?`}
                accept={() => {
                    deleteApi(currentData?.nomId);
                    setDeleteDialogVisible(false);
                }}
                reject={() => setDeleteDialogVisible(false)}
                acceptClassName="p-button-danger"
                acceptLabel="Si"
                header="Confirmación"
                icon="pi pi-exclamation-triangle"
            />

            {/* Modal de importación */}
            <VenPayrollImport
                ref={venPayrollImportRef}
                importApi={importPayrollAPI}
                toast={toastFacade}
                onImported={() => {
                    setPagination((p) => ({ ...p }));
                    showSuccess("Importación completada.");
                }}
            />

            {/* Editor VenPayroll (cabecera + detalle + presupuesto + eliminar todo) */}
            <VenPayroll
                ref={venPayrollEditorRef}
                // APIs de cabecera
                getHeaderApi={getPayrollHeaderAPI}
                saveHeaderApi={savePayrollHeaderAPI}
                // APIs de detalle
                paginateDetailApi={paginatePayrollDetailAPI}
                upsertDetailApi={upsertPayrollDetailAPI}
                deleteDetailApi={deletePayrollDetailAPI}
                // APIs de presupuesto
                paginateBudgetApi={paginatePayrollBudgetAPI}
                upsertBudgetApi={upsertPayrollBudgetAPI}
                deleteBudgetApi={deletePayrollBudgetAPI}
                // eliminar todo
                deleteAllDataApi={deleteAllPayrollDataAPI}
                // permisos
                canEdit={canEdit}
                canDelete={canDelete}
                // usuario (para auditoría)
                usuarioNombre={nombreusuario}
                usuarioId={idusuario}
                // callbacks
                onSaved={onEditedOrSaved}
                onDeletedAll={() => {
                    onEditedOrSaved();
                    showWarn("Detalle y presupuesto eliminados.");
                }}
                onError={handleApiError}
            />

            <PageHeader
                page="Home"
                title="Reembolsos"
                description="Gestión de Reembolsos"
            />

            <Suspense fallback={<LoadingComponent />}>
                <FilterComponentMemo
                    overlayRef={overlayFiltersRef}
                    filters={filtersConfig}
                    initialFilters={initialFilters}
                    setFilters={setFiltros}
                />

                <div className="grid">
                    <div className="col-12">
                        <DataTableComponentMemo
                            KeyModule="module_Payroll"
                            dataKey="nomId"
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
                                    title="No hay Nóminas registradas"
                                    description="Puedes importar una nómina desde Excel para comenzar."
                                    buttonLabel="Importar nómina"
                                    onButtonClick={() => venPayrollImportRef.current?.newImport()}
                                    canCreate={canCreate}
                                />
                            }
                        />
                    </div>
                </div>
            </Suspense>
        </div>
    );
};

export default Payroll;
