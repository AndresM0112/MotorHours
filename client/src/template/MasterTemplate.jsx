import React, {
    useRef,
    useContext,
    useState,
    useEffect,
    useMemo,
    useCallback,
    Suspense,
} from "react";
// Contexts
import { AuthContext } from "@context/auth/AuthContext";
import { ToastContext } from "@context/toast/ToastContext";
// Hooks
import useHandleApiError from "@hook/useHandleApiError";
import useHandleData from "@hook/useHandleData";
import usePaginationData from "@hook/usePaginationData";
// Components
import PageHeader from "@components/layout/PageHeader";
import { RightToolbar } from "@components/generales";
import ChipStatusComponent from "@components/fields/ChipStatusComponent";
import VenMasterTemplate from "./VenMasterTemplate";
// PrimeReact
import { Button } from "primereact/button";
import { confirmPopup } from "primereact/confirmpopup";
// APIs
import { deleteMasterTemplateApi, paginationMasterTemplateApi } from "./masterAPI";
// Utilities
import { estados, propsSelect } from "@utils/converAndConst";
import { formatNotificationDateTime } from "@utils/formatTime";
import LoadingComponent from "@components/layout/LoadingComponent";
import SkeletonMasterLoader from "@components/generales/SkeletonMasterLoader";

// Lazy Loaded Components
const LazyDataTable = React.lazy(() => import("@components/data/DataTableComponent"));
const DataTableComponentMemo = React.memo(LazyDataTable);

const LazyFilterComponent = React.lazy(() => import("@components/data/FilterOverlay"));
const FilterComponentMemo = React.memo(LazyFilterComponent);

const generateFiltersConfig = ({ filtros }) => [
    { key: "nombre", type: "input", label: "Nombre", filtro: filtros.nombre },
    {
        key: "estado",
        type: "dropdown",
        label: "Estado",
        filtro: filtros.estado,
        props: { ...propsSelect, options: estados },
    },
];

const columnsConfig = [
    {
        field: "nombre",
        header: "Nombre",
        style: { flexGrow: 1, flexBasis: "15rem", minWidth: "15rem" },
    },
    {
        field: "usuact, fecact",
        header: "Actualizado Por",
        style: { flexGrow: 1, flexBasis: "20rem", minWidth: "20rem" },
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
        style: { maxWidth: "8rem" },
        body: ({ estado, nomestado }) => <ChipStatusComponent id={estado} nameStatus={nomestado} />,
    },
];

const MasterTemplate = () => {
    const venMasterTemplate = useRef(null); // MODAL
    const overlayFiltersRef = useRef(null);

    const showOverlayFilters = (event) => {
        overlayFiltersRef.current.toggle(event);
    };

    const { permisos, nombreusuario } = useContext(AuthContext);
    const { showSuccess } = useContext(ToastContext);

    const handleApiError = useHandleApiError();
    const { state, setInitialState, deleteItem, addItem, updateItem } = useHandleData();

    const [loading, setLoading] = useState({ table: false });
    const [firstLoad, setFirstLoad] = useState(true);

    // Configuration
    const initialFilters = useMemo(() => ({ nombre: null, estado: null }), []);
    const sortField = "nombre";

    // Pagination
    const { filtros, setFiltros, datos, totalRecords, pagination, setPagination, onCustomPage } =
        usePaginationData(
            initialFilters,
            paginationMasterTemplateApi,
            setLoading,
            sortField,
            () => true
        );

    useEffect(() => {
        if (!loading.table && firstLoad) {
            setTimeout(() => setFirstLoad(false), [400]);
        }
    }, [loading.table, firstLoad]);

    // Loading data
    useEffect(() => {
        setInitialState(datos, totalRecords);
        // eslint-disable-next-line
    }, [datos, totalRecords, setInitialState]);

    const filtersConfig = useMemo(() => generateFiltersConfig({ filtros }), [filtros]);

    const deleteApi = useCallback(
        async (masId) => {
            try {
                const params = { masId, usuact: nombreusuario };
                const { data } = await deleteMasterTemplateApi(params);
                showSuccess(data.message);
                deleteItem({ id: masId, idField: "masId" });
            } catch (error) {
                handleApiError(error);
            }
        },
        [deleteItem, handleApiError, nombreusuario, showSuccess]
    );

    // Renders
    const renderActions = useCallback(
        (item) => {
            const { masId, nombre } = item;

            return (
                <div className="actions">
                    <Button
                        onClick={() => venMasterTemplate.current.editMasterTemplate(item)}
                        className="p-button-rounded p-button-warning p-button-xs mr-1"
                        title={`Editar Maestra Template ${nombre}`}
                        icon="pi pi-pencil"
                        disabled={!permisos.some(({ perId }) => perId === 31)}
                    />
                    <Button
                        className="p-button-rounded p-button-danger p-button-xs mr-1"
                        icon="pi pi-trash"
                        title={`Eliminar Maestra Template ${nombre}`}
                        onClick={(e) =>
                            confirmPopup({
                                target: e.currentTarget,
                                acceptLabel: "Si",
                                message: `Realmente desea eliminar la maestra template ${nombre}?`,
                                icon: "pi pi-exclamation-triangle",
                                acceptClassName: "p-button-danger",
                                accept: () => deleteApi(masId),
                            })
                        }
                        disabled={!permisos.some(({ perId }) => perId === 32)}
                    />
                </div>
            );
        },
        [deleteApi, permisos]
    );

    const actionsToolbar = useMemo(
        () => (
            <div>
                <Button
                    icon="pi pi-sliders-h"
                    label="Filtros"
                    iconPos="left"
                    className="p-button-sm p-button-rounded ml-2"
                    onClick={showOverlayFilters}
                />
                <RightToolbar
                    label="Nueva"
                    onClick={() => venMasterTemplate.current.newMasterTemplate()}
                    disabled={!permisos.some(({ perId }) => perId === 30)}
                />
            </div>
        ),
        [permisos]
    );

    const headerTemplate = useMemo(
        () => (
            <div className="col-12" style={{ display: "flex", justifyContent: "flex-end" }}>
                <div style={{ flexShrink: 0 }}>{actionsToolbar}</div>
            </div>
        ),
        [actionsToolbar]
    );

    return (
        <>
            {firstLoad ? (
                <SkeletonMasterLoader />
            ) : (
                <div className="fade-in">
                    <VenMasterTemplate
                        ref={venMasterTemplate}
                        addItem={addItem}
                        updateItem={updateItem}
                    />
                    <PageHeader
                        page="Administración"
                        title="Maestra template"
                        description="Copiar, pegar y editar."
                    />
                    <Suspense fallback={<LoadingComponent />}>
                        <FilterComponentMemo
                            overlayRef={overlayFiltersRef}
                            initialFilters={initialFilters}
                            filters={filtersConfig}
                            setFilters={setFiltros}
                        />
                        <div className="grid">
                            <div className="col-12">
                                <DataTableComponentMemo
                                    dataKey="masId"
                                    columns={columnsConfig}
                                    header={headerTemplate}
                                    datos={state.datos}
                                    totalRecords={state.totalRecords}
                                    loading={loading.table}
                                    pagination={pagination}
                                    onCustomPage={onCustomPage}
                                    setPagination={setPagination}
                                    actionBodyTemplate={renderActions}
                                />
                            </div>
                        </div>
                    </Suspense>
                </div>
            )}
        </>
    );
};

export default MasterTemplate;
