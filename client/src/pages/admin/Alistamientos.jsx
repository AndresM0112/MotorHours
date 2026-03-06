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
import { ConfirmDialog } from "primereact/confirmdialog";
import { Chip } from "primereact/chip";

// API
import { paginateAlistamientosAPI, deleteAlistamientoAPI } from "@api/requests/AlistamientoAPI";

// Context & Hooks
import { ToastContext } from "@context/toast/ToastContext";
import { useMediaQueryContext } from "@context/mediaQuery/mediaQueryContext";
import useHandleApiError from "@hook/useHandleApiError";
import useHandleData from "@hook/useHandleData";
import usePaginationData from "@hook/usePaginationData";
import VenAlistamiento from "./components/modals/VenAlistamiento";

// Lazy
const LazyDataTable = React.lazy(() => import("@components/data/DataTableComponent"));
const DataTableComponentMemo = React.memo(LazyDataTable);

const LazyFilterComponent = React.lazy(() => import("@components/data/FilterGeneric"));
const FilterComponentMemo = React.memo(LazyFilterComponent);

const LazyOverlayFilters = React.lazy(() => import("@components/data/FilterOverlay"));
const OverlayFiltersMemo = React.memo(LazyOverlayFilters);

// Color helper para estado
const colorMap = {
  activo: "#F97316",
  inactivo: "#dc3545",
  default: "#6c757d",
};

const ACCENT = "#007e79";

// Campos de filtros para Alistamientos
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
    key: "description",
    type: "input",
    label: "Descripción",
    filtro: filtros.description,
  },
  {
    key: "active",
    type: "dropdown",
    label: "Estado",
    filtro: filtros.active,
    props: {
      options: [
        { label: "Activo", value: 1 },
        { label: "Inactivo", value: 0 },
      ],
      optionLabel: "label",
      optionValue: "value",
      placeholder: "Todos",
      showClear: true,
    },
  },
];

const Alistamientos = () => {
  const venAlistamiento = useRef(null);

  const overlayFiltersRef = useRef(null);

  const { showSuccess } = useContext(ToastContext);
  const handleApiError = useHandleApiError();
  const { isMobile, isTablet } = useMediaQueryContext();
  const vistaMobil = isMobile || isTablet;

  // Permisos por defecto (ajusta según tu esquema real de permisos)
  const canCreate = true;
  const canEdit = true;
  const canDelete = true;

  const { state, setInitialState, addItem, updateItem, deleteItem } = useHandleData();

  const [loading, setLoading] = useState({ table: false });
  const [firstLoad, setFirstLoad] = useState(true);
  const [deleteDialogVisible, setDeleteDialogVisible] = useState(false);
  const [currentAlistamiento, setCurrentAlistamiento] = useState(null);

  const initialFilters = useMemo(
    () => ({
      search: null,
      description: null,
      active: null,
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
  } = usePaginationData(initialFilters, paginateAlistamientosAPI, setLoading, sortField, () => true);


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

  // Eliminar alistamiento
  const deleteApi = useCallback(
    async (alistamientoId) => {
      try {
        await deleteAlistamientoAPI({ id: alistamientoId });
        showSuccess("Alistamiento eliminado correctamente");
        
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
        command: () => venAlistamiento.current?.viewAlistamiento(item),
        visible: true,
      },
      {
        label: "Editar",
        icon: "pi pi-pencil",
        command: () => venAlistamiento.current?.editAlistamiento(item),
        visible: canEdit,
      },
      {
        label: "Eliminar",
        icon: "pi pi-trash",
        command: () => {
          setCurrentAlistamiento(item);
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
          label="Nuevo"
          onClick={() => venAlistamiento.current?.newAlistamiento()}
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
      field: "description",
      header: "Descripción",
      style: { minWidth: "20rem" },
      mobile: true,
    },
    {
      field: "active",
      header: "Estado",
      style: { maxWidth: "10rem" },
      body: ({ active }) => {
        const label = Number(active) === 1 ? "Activo" : "Inactivo";
        const color = Number(active) === 1 ? colorMap.activo : colorMap.inactivo;
        return (
          <Chip
            label={label}
            className="text-white"
            style={{ backgroundColor: color || colorMap.default }}
          />
        );
      },
      mobile: true,
    },
    {
      field: "createdAt",
      header: "Fecha Registro",
      style: { minWidth: "12rem" },
      mobile: true,
    },
  ];

  // Card header para mobile
  const headerCardTemplate = (item) => {
    const description = item?.description || "Sin descripción";
    const estActivo = Number(item.active) === 1;
    const estadoLabel = estActivo ? "Activo" : "Inactivo";
    const estadoColor = estActivo ? colorMap.activo : colorMap.inactivo;
    const estadoBg = estActivo ? "#fff7ed" : "#fff1f2";
    const estadoBorder = estActivo ? "#fed7aa" : "#fecdd3";
    const estadoText = estActivo ? "#c2410c" : "#be123c";

    return (
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, width: "100%" }}>
        {/* Ícono + descripción */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0, flex: 1 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10, flexShrink: 0,
            background: "#f0fdf4", border: "1px solid #bbf7d0",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 16
          }}>
            🔧
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 13, color: "#111827", lineHeight: 1.3 }}>
              {description}
            </div>
            <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}>#{item.id}</div>
          </div>
        </div>
        {/* Badge estado */}
        <div style={{
          flexShrink: 0, padding: "3px 10px", borderRadius: 20,
          backgroundColor: estadoBg, border: `1px solid ${estadoBorder}`,
          color: estadoText, fontSize: 10, fontWeight: 700
        }}>
          {estadoLabel}
        </div>
      </div>
    );
  };

  const bodyCardTemplate = (item) => (
    <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
      {/* Separador */}
      <div style={{ height: 1, background: "#f3f4f6", margin: "6px 0 10px" }} />

      {/* Fecha */}
      <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
        <i className="pi pi-calendar" style={{ fontSize: 11, color: "#9ca3af" }}></i>
        <span style={{ fontSize: 12, color: "#6b7280" }}>
          {item.createdAt ? String(item.createdAt) : "—"}
        </span>
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
          currentAlistamiento
            ? `¿Deseas eliminar el alistamiento "${currentAlistamiento.description}"?`
            : "¿Deseas eliminar este alistamiento?"
        }
        accept={() => {
          deleteApi(currentAlistamiento.id);
          setDeleteDialogVisible(false);
        }}
        reject={() => setDeleteDialogVisible(false)}
        acceptLabel="Si"
        acceptClassName="p-button-danger"
        header="Confirmación"
        icon="pi pi-exclamation-triangle"
      />

      {/* Modal de registro/edición */}
      <VenAlistamiento ref={venAlistamiento} addItem={addItem} updateItem={updateItem} />

      <PageHeader
        page="Gestión"
        title="Alistamientos"
        description="Tareas de alistamiento para los pilotos"
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
                    label="Nuevo"
                    onClick={() => venAlistamiento.current?.newAlistamiento()}
                    disabled={!canCreate}
                    className="p-button-success"
                  />
                </div>

                {state.datos?.length <= 0 && !loading.table ? (
                  <EmptyState
                    title="No hay alistamientos registrados"
                    description="Puedes registrar un nuevo alistamiento desde aquí."
                    buttonLabel="Registrar nuevo alistamiento"
                    onButtonClick={() => venAlistamiento.current?.newAlistamiento()}
                    disabled={!canCreate}
                  />
                ) : (
                  <InfiniteScrollCards
                    data={state.datos}
                    total={state.totalRecords}
                    loading={loading.table}
                    onScrollEnd={onCustomPage}
                    renderActions={renderActions}
                    onCardClick={(event) => venAlistamiento.current?.viewAlistamiento(event.value)}
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
                    KeyModule="module_alistamientos"
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
                    emptyMessage={
                      <EmptyState
                        title="No hay alistamientos registrados"
                        description="Puedes registrar un nuevo alistamiento desde aquí."
                        buttonLabel="Registrar nuevo alistamiento"
                        onButtonClick={() => venAlistamiento.current?.newAlistamiento()}
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

export default Alistamientos;
