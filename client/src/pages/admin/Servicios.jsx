import React, { useRef, useState, useMemo, useEffect, useCallback, Suspense, useContext } from "react";

// Components
import PageHeader from "@components/layout/PageHeader";
import ContextMenuActions from "@components/data/ContextMenuActions";
import SkeletonMasterLoader from "@components/generales/SkeletonMasterLoader";
import LoadingComponent from "@components/layout/LoadingComponent";
import EmptyState from "@components/ui/EmptyState";
import InfiniteScrollCards from "@components/ui/InfiniteScrollCards";

// PrimeReact
import { Button } from "primereact/button";
import { Chip } from "primereact/chip";
import { ConfirmDialog } from "primereact/confirmdialog";

// API
import { paginateServiciosAPI, deleteServicioAPI } from "@api/requests/ServiciosAPI";

// Context & Hooks
import { ToastContext } from "@context/toast/ToastContext";
import useHandleApiError from "@hook/useHandleApiError";
import useHandleData from "@hook/useHandleData";
import usePaginationData from "@hook/usePaginationData";
import { useMediaQueryContext } from "@context/mediaQuery/mediaQueryContext";

// Lazy
const LazyDataTable = React.lazy(() => import("@components/data/DataTableComponent"));
const DataTableComponentMemo = React.memo(LazyDataTable);

const LazyFilterComponent = React.lazy(() => import("@components/data/FilterGeneric"));
const FilterComponentMemo = React.memo(LazyFilterComponent);

const LazyOverlayFilters = React.lazy(() => import("@components/data/FilterOverlay"));
const OverlayFiltersMemo = React.memo(LazyOverlayFilters);

// Modal
const VenServicios = React.lazy(() => import("./components/modals/VenServicios"));

const ACCENT = "#007e79";

// Campos de filtros para Servicios
const generateFiltersConfig = ({ filtros }) => [
  // EXTERNOS
  {
    key: "search",
    type: "input",
    label: "Buscar",
    filtro: filtros.search,
    externo: true,
    className: "col-12 md:col-4 mt-2",
  },

  // INTERNOS
  {
    key: "service_type",
    type: "dropdown",
    label: "Tipo de Servicio",
    filtro: filtros.service_type,
    props: {
      options: [
        { label: "ALISTAMIENTO", value: "ALISTAMIENTO" },
        { label: "REPARACION", value: "REPARACION" },
      ],
      optionLabel: "label",
      optionValue: "value",
      placeholder: "Todos",
      showClear: true,
    },
  },
];

const Servicios = () => {
  const venServicios = useRef(null);

  const overlayFiltersRef = useRef(null);

  const { showSuccess } = useContext(ToastContext);
  const handleApiError = useHandleApiError();
  const { isMobile, isTablet } = useMediaQueryContext();
  const vistaMobil = isMobile || isTablet;

  // Permisos por defecto
  const canCreate = true;
  const canEdit = true;
  const canDelete = true;

  const { state, setInitialState, addItem, updateItem, deleteItem } = useHandleData();

  const [loading, setLoading] = useState({ table: false });
  const [firstLoad, setFirstLoad] = useState(true);
  const [deleteDialogVisible, setDeleteDialogVisible] = useState(false);
  const [currentServicio, setCurrentServicio] = useState(null);

  const initialFilters = useMemo(
    () => ({
      search: null,
      service_type: null,
    }),
    []
  );

  const sortField = "id";

  const {
    reloadData,
    filtros,
    setFiltros,
    datos,
    totalRecords,
    pagination,
    setPagination,
    onCustomPage,
  } = usePaginationData(initialFilters, paginateServiciosAPI, setLoading, sortField, () => true);

  // Skeleton inicial
  useEffect(() => {
    if (!loading.table && firstLoad) {
      setFirstLoad(false);
    }
  }, [loading.table, firstLoad]);

  useEffect(() => {
    setInitialState(datos, totalRecords);
  }, [datos, totalRecords, setInitialState]);

  const filtersBuilt = useMemo(
    () => generateFiltersConfig({ filtros }),
    [filtros]
  );

  const filtersExternos = useMemo(
    () => filtersBuilt.filter((f) => f.externo),
    [filtersBuilt]
  );

  const filtersInternos = useMemo(
    () => filtersBuilt.filter((f) => !f.externo),
    [filtersBuilt]
  );

  const getActiveFiltersCount = (filters) =>
    Object.values(filters).filter((v) => v !== null && v !== "").length;

  const activeFiltersCount = useMemo(() => getActiveFiltersCount(filtros), [filtros]);

  // Eliminar servicio
  const deleteApi = useCallback(
    async (servicioId) => {
      try {
        await deleteServicioAPI({ id: servicioId });
        showSuccess("Servicio eliminado correctamente");
        
        // Recargar datos para mantener consistencia con el servidor
        // y manejar correctamente la paginación
        await reloadData();
      } catch (error) {
        handleApiError(error);
      }
    },
    [showSuccess, handleApiError, reloadData]
  );

  const renderActions = (item) => {
    const { id } = item;

    const menuItems = [
      {
        label: "Ver",
        icon: "pi pi-eye",
        command: () => venServicios.current?.viewServicio(item),
        visible: true,
      },
      {
        label: "Editar", 
        icon: "pi pi-pencil",
        command: () => venServicios.current?.editServicio(item),
        visible: canEdit,
      },
      {
        label: "Eliminar",
        icon: "pi pi-trash",
        command: () => {
          setCurrentServicio(item);
          setDeleteDialogVisible(true);
        },
        visible: canDelete,
        color: "#f43f51",
      },
    ];

    return <ContextMenuActions menuItems={menuItems} itemId={id} />;
  };

  const actionsToolbar = useMemo(
    () => (
      <>
        {!vistaMobil && (
          <div style={{ position: "relative", display: "inline-block", marginRight: 8 }}>
            <Button
              icon="pi pi-sliders-h"
              label="Filtros"
              iconPos="left"
              className="p-button-sm p-button-rounded ml-2"
              onClick={(e) => overlayFiltersRef.current?.toggle(e)}
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
        )}
        <Button
          label="Nuevo Servicio"
          onClick={() => venServicios.current?.newServicio()}
          disabled={!canCreate}
          className="p-button-success"
        />
      </>
    ),
    [canCreate, activeFiltersCount, vistaMobil]
  );

  const headerTemplate = useMemo(
    () => <div style={{ flexShrink: 0 }}>{actionsToolbar}</div>,
    [actionsToolbar]
  );

  // Config columnas para DataTable
  const columnsConfig = [
    {
      field: "id",
      header: "#",
      style: { maxWidth: "6rem" },
      mobile: true,
    },
    {
      field: "pilotName",
      header: "Piloto",
      style: { minWidth: "15rem" },
      body: ({ pilotName }) => pilotName || "Sin piloto",
      mobile: true,
    },
    {
      field: "bikeType",
      header: "Moto",
      style: { minWidth: "15rem" },
      mobile: true,
    },
    {
      field: "serviceType",
      header: "Tipo de Servicio",
      style: { minWidth: "15rem" },
      body: ({ serviceType }) => {
        const color = serviceType === "ALISTAMIENTO" ? "#F97316" : "#ffc107";
        return (
          <Chip
            label={serviceType}
            className="text-white"
            style={{ backgroundColor: color }}
          />
        );
      },
      mobile: true,
    },
    {
      field: "hours",
      header: "Horas de Moto",
      style: { maxWidth: "12rem" },
      body: ({ hours }) => `${hours} hrs`,
      mobile: true,
    },
    {
      field: "createdAt",
      header: "Fecha Registro",
      style: { minWidth: "12rem" },
      mobile: false,
    },
  ];

  // Card header para mobile
  const headerCardTemplate = (item) => {
    const piloto = item?.pilotName || "Sin piloto";
    const moto = item?.bikeType || "Moto";
    const tipo = item?.serviceType || "—";

    return (
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <span style={{ fontWeight: 600, fontSize: 14 }}>{piloto}</span>
          <div style={{ fontSize: 12, color: "#6b7280" }}>{moto} - {tipo}</div>
        </div>
      </div>
    );
  };

  const bodyCardTemplate = (item) => (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 8,
        fontSize: 12,
        color: "#374151",
      }}
    >
      <div>
        <strong>Moto:</strong> {item.bikeType || "—"}
      </div>
      <div>
        <strong>Horas:</strong> {item.hours || "—"} hrs
      </div>
      <div>
        <strong>Tipo:</strong>{" "}
        <Chip
          label={item.serviceType}
          style={{
            backgroundColor: item.serviceType === "ALISTAMIENTO" ? "#F97316" : "#ffc107",
            color: "#fff",
            fontSize: 11,
            padding: "2px 6px",
          }}
        />
      </div>
      <div>
        <strong>Fecha:</strong> {item.createdAt ? String(item.createdAt) : "—"}
      </div>
    </div>
  );

  return firstLoad ? (
    <SkeletonMasterLoader />
  ) : (
    <div className="fade-in">
      <ConfirmDialog
        visible={deleteDialogVisible}
        onHide={() => setDeleteDialogVisible(false)}
        message={
          currentServicio
            ? `¿Deseas eliminar el servicio #${currentServicio.id}?`
            : "¿Deseas eliminar este servicio?"
        }
        accept={() => {
          deleteApi(currentServicio.id);
          setDeleteDialogVisible(false);
        }}
        reject={() => setDeleteDialogVisible(false)}
        acceptLabel="Si"
        acceptClassName="p-button-danger"
        header="Confirmación"
        icon="pi pi-exclamation-triangle"
      />

      {/* Modal de registro */}
      <Suspense fallback={<div>Cargando modal...</div>}>
        <VenServicios ref={venServicios} addItem={addItem} updateItem={updateItem} />
      </Suspense>

      <PageHeader
        page="Gestión"
        title="Servicios"
        description="Registro de servicios (alistamientos y reparaciones) de motos"
      />

      <Suspense fallback={<LoadingComponent />}>
        {/* Filtros */}
        {vistaMobil ? (
          <FilterComponentMemo
            filters={filtersBuilt}
            initialFilters={initialFilters}
            setFilters={setFiltros}
            typeFilter={1}
            isMobile={true}
          />
        ) : (
          <FilterComponentMemo
            filters={filtersExternos}
            initialFilters={initialFilters}
            setFilters={setFiltros}
            typeFilter={2}
            isMobile={false}
          />
        )}

        {/* Overlay de filtros internos */}
        {!vistaMobil && (
          <OverlayFiltersMemo
            overlayRef={overlayFiltersRef}
            initialFilters={initialFilters}
            filters={filtersInternos}
            setFilters={setFiltros}
          />
        )}

        <div className="grid">
          <div className="col-12">
            {vistaMobil ? (
              <>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "flex-end",
                    marginBottom: "1rem",
                  }}
                >
                  <Button
                    label="Nuevo Servicio"
                    onClick={() => venServicios.current?.newServicio()}
                    disabled={!canCreate}
                    className="p-button-success"
                  />
                </div>

                {state.datos?.length <= 0 && !loading.table ? (
                  <EmptyState
                    title="No hay servicios registrados"
                    description="Puedes registrar un nuevo servicio desde aquí."
                    buttonLabel="Registrar nuevo servicio"
                    onButtonClick={() => venServicios.current?.newServicio()}
                    disabled={!canCreate}
                  />
                ) : (
                  <InfiniteScrollCards
                    data={state.datos}
                    total={state.totalRecords}
                    loading={loading.table}
                    onScrollEnd={onCustomPage}
                    renderActions={renderActions}
                    onCardClick={(event) => venServicios.current?.viewServicio(event.value)}
                    headerTemplate={headerCardTemplate}
                    bodyTemplate={bodyCardTemplate}
                  />
                )}
              </>
            ) : (
              <div
                style={{
                  height: "calc(100vh - 180px)",
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                <div style={{ flex: 1, minHeight: 0 }}>
                  <DataTableComponentMemo
                    KeyModule="module_servicios"
                    dataKey="id"
                    columns={columnsConfig}
                    header={headerTemplate}
                    datos={state.datos}
                    totalRecords={state.totalRecords}
                    loading={loading.table}
                    pagination={pagination}
                    onCustomPage={onCustomPage}
                    setPagination={setPagination}
                    actionBodyTemplate={renderActions}
                    onRowClick={(item) => venServicios.current?.viewServicio(item)}
                    emptyMessage={
                      <EmptyState
                        title="No hay servicios registrados"
                        description="Puedes registrar un nuevo servicio desde aquí."
                        buttonLabel="Registrar nuevo servicio"
                        onButtonClick={() => venServicios.current?.newServicio()}
                        disabled={!canCreate}
                      />
                    }
                    rowsPerPageOptions={[10, 20, 50, 100]}
                    scrollable
                    scrollHeight={"calc(100vh - 360px)"}
                    classNameTableWrapper="dataTableFullHeight tableMinWidth"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </Suspense>
    </div>
  );
};

export default Servicios;
