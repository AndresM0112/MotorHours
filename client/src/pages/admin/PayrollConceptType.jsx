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
// import moment from "moment";

// APIs
import { deleteAPI, paginationAPI } from "@api/requests/payrollConceptTypeApi";

// Modal
import VenPayrollConceptType from "./components/modals/VenPayrollConceptType";

// Lazy
const LazyDataTable = React.lazy(() => import("@components/data/DataTableComponent"));
const DataTableComponentMemo = React.memo(LazyDataTable);
const LazyFilterComponent = React.lazy(() => import("@components/data/FilterOverlay"));
const FilterComponentMemo = React.memo(LazyFilterComponent);

const PayrollConceptType = () => {
    const VenPayrollConceptTypeRef = useRef(null);
    const overlayFiltersRef = useRef(null);

    const { nombreusuario } = useContext(AuthContext);
    const { showSuccess } = useContext(ToastContext);
    const handleApiError = useHandleApiError();
    const { state, setInitialState, deleteItem, addItem, updateItem } = useHandleData();

    const { hasPermission } = usePermissions();
    const canCreate = hasPermission("managementRefunds", "payrollConceptType", "create");
    const canEdit = hasPermission("managementRefunds", "payrollConceptType", "edit");
    const canDelete = hasPermission("managementRefunds", "payrollConceptType", "delete");

    const [loading, setLoading] = useState({ table: false });
    const [firstLoad, setFirstLoad] = useState(true);
    const initialFilters = useMemo(() => ({ nombre: null, estado: null }), []);
    const sortField = "nombre";

    const { filtros, setFiltros, datos, totalRecords, pagination, setPagination, onCustomPage } =
        usePaginationData(initialFilters, paginationAPI, setLoading, sortField, () => true);

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
    const [currentPayrollConceptType, setCurrentPayrollConceptType] = useState(null);

    const deleteItemApi = useCallback(
        async (id) => {
            try {
                await deleteAPI({ tcnIds: [id], usuario: nombreusuario });
                showSuccess("tipo concepto de nomina eliminada correctamente");
                VenPayrollConceptTypeRef.current.onClose();
                deleteItem({ id, idField: "tcnId" });
            } catch (error) {
                handleApiError(error);
            }
        },
        [nombreusuario, deleteItem, showSuccess, handleApiError]
    );

    const renderActions = (item) => {
        const { tcnId, nombre } = item;
        const menuItems = [
            {
                label: "Editar",
                icon: "pi pi-pencil",
                command: () => VenPayrollConceptTypeRef.current.editPayrollConceptType(item),
                disabled: !canEdit,
                color: "#fda53a",
            },
            {
                label: "Eliminar",
                icon: "pi pi-trash",
                command: () => {
                    setCurrentPayrollConceptType({ tcnId, nombre });
                    setDeleteDialogVisible(true);
                },
                disabled: !canDelete,
                color: "#f43f51",
            },
        ];
        return <ContextMenuActions menuItems={menuItems} itemId={tcnId} />;
    };

    const columnsConfig = [
        {
            field: "nombre",
            header: "Nombre",
            style: { flexGrow: 1, minWidth: "20rem" },
        },
        {
            field: "nomestado",
            header: "Estado",
            style: { maxWidth: "8rem" },
            body: ({ estId, nombreEstado }) => (
                <ChipStatusComponent
                    id={estId}
                    nameStatus={nombreEstado}
                    background={estId === 1 ? "#00a19b" : "#f59e0b"}
                />
            ),
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
                                backgroundColor: "#f44336", // Rojo
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
                    onClick={() => VenPayrollConceptTypeRef.current.newPayrollConceptType()}
                    disabled={!canCreate}
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
        const target = e.originalEvent.target;

        if (!canEdit) return;

        // Evitar la navegación si el clic ocurre dentro de elementos interactivos
        if (
            target.closest(".p-dropdown") || // Dropdown de PrimeReact
            target.closest(".p-multiselect") || // MultiSelect de PrimeReact
            target.closest(".p-dropdown-item") || // Opción dentro del dropdown
            target.closest(".p-multiselect-item") || // Opción dentro del multiselect
            target.closest("input") || // Inputs de cualquier tipo
            target.closest("button") || // Botones de cualquier tipo
            target.closest(".p-checkbox") || // Checkboxes de PrimeReact
            target.closest(".p-radiobutton") || // Radio buttons de PrimeReact
            target.closest(".p-inputtext") // Cualquier otro input de texto de PrimeReact
        ) {
            return;
        }

        // Si no hizo clic en un elemento interactivo, redirigir
        // console.log(e.value);

        VenPayrollConceptTypeRef.current.editPayrollConceptType(e.value);
    };

    return firstLoad ? (
        <SkeletonMasterLoader />
    ) : (
        <div className="fade-in">
            <ConfirmDialog
                visible={deleteDialogVisible}
                onHide={() => setDeleteDialogVisible(false)}
                message={`¿Deseas eliminar la tipo concepto de nomina ${currentPayrollConceptType?.nombre}?`}
                accept={() => {
                    deleteItemApi(currentPayrollConceptType?.tcnId);
                    setDeleteDialogVisible(false);
                }}
                acceptLabel="Si"
                reject={() => setDeleteDialogVisible(false)}
                acceptClassName="p-button-danger"
                header="Confirmación"
                icon="pi pi-exclamation-triangle"
            />

            <VenPayrollConceptType
                ref={VenPayrollConceptTypeRef}
                addItem={addItem}
                updateItem={updateItem}
                setDeleteDialogVisible={setDeleteDialogVisible}
                setCurrentPayrollConceptType={setCurrentPayrollConceptType}
                canDelete={canDelete}
            />

            <PageHeader
                page="Administración Reembolso"
                title="tipo concepto de nomina"
                description=""
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
                            KeyModule="module_payroll_concept_type"
                            dataKey="tcnId"
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
                                    title="No hay tipo concepto de nomina registradas"
                                    description="Puedes crear una nueva tipo concepto de nomina para comenzar."
                                    buttonLabel="Registrar nueva tipo concepto de nomina"
                                    onButtonClick={() =>
                                        VenPayrollConceptTypeRef.current.newPayrollConceptType()
                                    }
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

export default PayrollConceptType;
