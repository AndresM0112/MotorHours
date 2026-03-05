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
import { paginatePilotosAPI, deletePilotoAPI } from "@api/requests/pilotosAPI";

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
const VenPilotos = React.lazy(() => import("./components/modals/VenPilotos"));

const ACCENT = "#007e79";

// Campos de filtros para Pilotos
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
    key: "name",
    type: "input",
    label: "Nombre",
    filtro: filtros.name,
  },
  {
    key: "phone",
    type: "input",
    label: "Teléfono",
    filtro: filtros.phone,
  },
  {
    key: "email",
    type: "input",
    label: "Email",
    filtro: filtros.email,
  },
];

const Pilotos = () => {
  const venPilotos = useRef(null);

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
  const [currentPiloto, setCurrentPiloto] = useState(null);

  const initialFilters = useMemo(
    () => ({
      search: null,
      name: null,
      phone: null,
      email: null,
    }),
    []
  );

  const sortField = "name";

  const {
    reloadData,
    filtros,
    setFiltros,
    datos,
    totalRecords,
    pagination,
    setPagination,
    onCustomPage,
  } = usePaginationData(initialFilters, paginatePilotosAPI, setLoading, sortField, () => true);

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

  // Eliminar piloto
  const deleteApi = useCallback(
    async (pilotoId) => {
      try {
        await deletePilotoAPI({ id: pilotoId });
        deleteItem(pilotoId);
        showSuccess("Piloto eliminado correctamente");
      } catch (error) {
        handleApiError(error);
      }
    },
    [deleteItem, showSuccess, handleApiError]
  );

  const renderActions = (item) => {
    const { id } = item;

    const menuItems = [
      {
        label: "Editar",
        icon: "pi pi-pencil",
        command: () => venPilotos.current?.editPiloto(item),
        visible: canEdit,
      },
      {
        label: "Eliminar",
        icon: "pi pi-trash",
        command: () => {
          setCurrentPiloto(item);
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
          onClick={() => venPilotos.current?.newPiloto()}
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
      field: "name",
      header: "Nombre",
      style: { minWidth: "20rem" },
      mobile: true,
    },
    {
      field: "phone",
      header: "Teléfono",
      style: { minWidth: "15rem" },
      mobile: true,
    },
    {
      field: "email",
      header: "Email",
      style: { minWidth: "18rem" },
      mobile: false,
    },
    {
      field: "motos",
      header: "Motos",
      style: { minWidth: "15rem" },
      body: ({ motos }) => {
        if (!motos || motos.length === 0) return "—";
        return motos.map((m) => (
          <Chip key={m.id} label={m.type} style={{ marginRight: 4, marginBottom: 4 }} />
        ));
      },
      mobile: false,
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
    const name = item?.name || "Sin nombre";
    const phone = item?.phone || "—";

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
          <span style={{ fontWeight: 600, fontSize: 14 }}>{name}</span>
          <div style={{ fontSize: 12, color: "#6b7280" }}>{phone}</div>
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
        <strong>Email:</strong> {item.email || "—"}
      </div>
      <div>
        <strong>Motos:</strong>{" "}
        {item.motos && item.motos.length > 0
          ? item.motos.map((m) => m.type).join(", ")
          : "—"}
      </div>
      <div>
        <strong>Fecha registro:</strong>{" "}
        {item.createdAt ? String(item.createdAt) : "—"}
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
          currentPiloto
            ? `¿Deseas eliminar el piloto "${currentPiloto.name}"?`
            : "¿Deseas eliminar este piloto?"
        }
        accept={() => {
          deleteApi(currentPiloto.id);
          setDeleteDialogVisible(false);
        }}
        reject={() => setDeleteDialogVisible(false)}
        acceptLabel="Si"
        acceptClassName="p-button-danger"
        header="Confirmación"
        icon="pi pi-exclamation-triangle"
      />

      {/* Modal de registro/edición */}
      <Suspense fallback={<div>Cargando modal...</div>}>
        <VenPilotos ref={venPilotos} addItem={addItem} updateItem={updateItem} />
      </Suspense>

      <PageHeader
        page="Gestión"
        title="Pilotos"
        description="Gestión de pilotos y sus motos asociadas"
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
                    onClick={() => venPilotos.current?.newPiloto()}
                    disabled={!canCreate}
                    className="p-button-success"
                  />
                </div>

                {state.datos?.length <= 0 && !loading.table ? (
                  <EmptyState
                    title="No hay pilotos registrados"
                    description="Puedes registrar un nuevo piloto desde aquí."
                    buttonLabel="Registrar nuevo piloto"
                    onButtonClick={() => venPilotos.current?.newPiloto()}
                    disabled={!canCreate}
                  />
                ) : (
                  <InfiniteScrollCards
                    data={state.datos}
                    total={state.totalRecords}
                    loading={loading.table}
                    onScrollEnd={onCustomPage}
                    renderActions={renderActions}
                    onCardClick={(item) => venPilotos.current?.viewPiloto(item)}
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
                    KeyModule="module_pilotos"
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
                        title="No hay pilotos registrados"
                        description="Puedes registrar un nuevo piloto desde aquí."
                        buttonLabel="Registrar nuevo piloto"
                        onButtonClick={() => venPilotos.current?.newPiloto()}
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

export default Pilotos;
