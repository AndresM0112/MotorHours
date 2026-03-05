import React, {
  useState,
  useMemo,
  useRef,
  useContext,
  useEffect,
  Suspense,
  useCallback,
} from "react";

import { Button } from "primereact/button";
import { ConfirmDialog } from "primereact/confirmdialog";
import { Chip } from "primereact/chip";

import PageHeader from "@components/layout/PageHeader";
import { RightToolbar } from "@components/generales";
import ContextMenuActions from "@components/data/ContextMenuActions";
import SkeletonMasterLoader from "@components/generales/SkeletonMasterLoader";
import LoadingComponent from "@components/layout/LoadingComponent";
import EmptyState from "@components/ui/EmptyState";
import InfiniteScrollCards from "@components/ui/InfiniteScrollCards";
import { useMediaQueryContext } from "@context/mediaQuery/mediaQueryContext";

import { ToastContext } from "@context/toast/ToastContext";
import useHandleApiError from "@hook/useHandleApiError";
import useHandleData from "@hook/useHandleData";
import usePaginationData from "@hook/usePaginationData";
import usePermissions from "@context/permissions/usePermissions";
import VenLocation from "./components/modals/VenLocation";

// API
import {
  paginateLocationAPI,
  deleteLocationAPI,
} from "@api/requests/locationApi"; // <-- ajusta la ruta si es distinta

// Lazy
const LazyDataTable = React.lazy(() => import("@components/data/DataTableComponent"));
const DataTableComponentMemo = React.memo(LazyDataTable);

const LazyFilterComponent = React.lazy(() => import("@components/data/FilterGeneric"));
const FilterComponentMemo = React.memo(LazyFilterComponent);

const LazyOverlayFilters = React.lazy(() => import("@components/data/FilterOverlay"));
const OverlayFiltersMemo = React.memo(LazyOverlayFilters);

// Color helper para estado
const colorMap = {
  activo: "#28a745",
  inactivo: "#dc3545",
  default: "#6c757d",
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

// Campos de filtros para Location
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
    key: "nombre",
    type: "input",
    label: "Nombre localización",
    filtro: filtros.nombre,
  },
  {
    key: "bloqueNombre",
    type: "input",
    label: "Bloque",
    filtro: filtros.bloqueNombre,
  },
  {
    key: "localNombre",
    type: "input",
    label: "Local asociado",
    filtro: filtros.localNombre,
  },
  {
    key: "estado",
    type: "dropdown",
    label: "Estado",
    filtro: filtros.estado,
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

const Location = () => {
  const venLocation = useRef(null); // aquí luego enganchamos el modal VenLocation

  const overlayFiltersRef = useRef(null);

  const { showSuccess } = useContext(ToastContext);
  const handleApiError = useHandleApiError();
  const { isMobile, isTablet } = useMediaQueryContext();
  const vistaMobil = isMobile || isTablet;

  const { hasPermission } = usePermissions();
  // Ajusta estos módulos/acciones según tu esquema real de permisos
  const canCreate = hasPermission("management", "location", "create");
  const canEdit = hasPermission("management", "location", "edit");
  const canDelete = hasPermission("management", "location", "delete");

  const { state, setInitialState, addItem, updateItem, deleteItem } = useHandleData();

  const [loading, setLoading] = useState({ table: false });
  const [firstLoad, setFirstLoad] = useState(true);
  const [deleteDialogVisible, setDeleteDialogVisible] = useState(false);
  const [currentLocation, setCurrentLocation] = useState(null);

  const initialFilters = useMemo(
    () => ({
      search: null,
      nombre: null,
      bloqueNombre: null,
      localNombre: null,
      estado: null,
    }),
    []
  );

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
  } = usePaginationData(initialFilters, paginateLocationAPI, setLoading, sortField, () => true);

  // Skeleton inicial
  useEffect(() => {
    if (!loading.table && firstLoad) {
      setTimeout(() => setFirstLoad(false), 400);
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

  // Eliminar localización
  const deleteApi = useCallback(
    async (lcaId) => {
      try {
        await deleteLocationAPI({ id: lcaId });
        showSuccess("Localización eliminada correctamente");
        deleteItem({ id: lcaId, idField: "lcaId" });
      } catch (error) {
        handleApiError(error);
      }
    },
    [deleteItem, showSuccess, handleApiError]
  );

  const renderActions = (item) => {
    const { lcaId } = item;

    const menuItems = [
      {
        label: "Editar",
        icon: "pi pi-pencil",
        command: () => venLocation.current?.editLocation(item),
        // disabled: !canEdit,
      },
      {
        label: "Eliminar",
        icon: "pi pi-trash",
        command: () => {
          setCurrentLocation(item);
          setDeleteDialogVisible(true);
        },
        // disabled: !canDelete,
        color: "#f43f51",
      },
    ];

    return <ContextMenuActions menuItems={menuItems} itemId={lcaId} />;
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
        <RightToolbar
          label="Nuevo"
          onClick={() => venLocation.current?.newLocation()}
        // disabled={!canCreate}
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
      field: "lcaId",
      header: "#",
      style: { maxWidth: "6rem" },
      mobile: true,
    },
    {
      field: "nombre",
      header: "Localización",
      style: { minWidth: "14rem" },
      mobile: true,
    },
    {
      field: "bloqueId",
      header: "Bloque",
      style: { minWidth: "10rem" },
      mobile: true,
      body: ({ bloqueId }) => {
        const aplica = Number(bloqueId) === 1;
        return (
          <div className="flex align-items-center gap-2">
            <i
              className={`pi ${aplica ? "pi-check-circle text-green-500" : "pi-times-circle text-gray-400"}`}
            />
            <span>{aplica ? "Aplica" : "No aplica"}</span>
          </div>
        );
      },
    },
    {
      field: "localId",
      header: "Local",
      style: { minWidth: "10rem" },
      mobile: true,
      body: ({ localId }) => {
        const aplica = Number(localId) === 1;
        return (
          <div className="flex align-items-center gap-2">
            <i
              className={`pi ${aplica ? "pi-check-circle text-green-500" : "pi-times-circle text-gray-400"}`}
            />
            <span>{aplica ? "Aplica" : "No aplica"}</span>
          </div>
        );
      },
    },
    {
      field: "estId",
      header: "Estado",
      style: { maxWidth: "10rem" },
      body: ({ estId }) => {
        const label = Number(estId) === 1 ? "Activo" : "Inactivo";
        const color = Number(estId) === 1 ? colorMap.activo : colorMap.inactivo;
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
      field: "fechaRegistro",
      header: "Fecha Registro",
      style: { minWidth: "12rem" },
      mobile: true,
    },
  ];

  // Card header para mobile
  const headerCardTemplate = (item) => {
    const nombre = item?.nombre || "Sin nombre";
    const initials = (nombre.match(/\b\w/g) || [])
      .slice(0, 2)
      .join("")
      .toUpperCase();

    const estActivo = Number(item.estId) === 1;
    const estadoLabel = estActivo ? "Activo" : "Inactivo";
    const estadoColor = estActivo ? colorMap.activo : colorMap.inactivo;

    const aplicaBloque = Number(item.bloqueId) === 1;

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
          }}
          title={nombre}
        >
          {initials}
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            minWidth: 0,
            flex: 1,
            paddingRight: 90,
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
            Localización
          </div>
          <div
            style={{
              fontWeight: 700,
              fontSize: 13,
              marginBottom: 2,
            }}
          >
            {nombre}
          </div>
          <div
            style={{
              fontSize: 12,
              color: "#111827",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
            title={aplicaBloque ? "Aplica para bloque" : "No aplica para bloque"}
          >
            {aplicaBloque ? "Aplica para bloque" : "No aplica para bloque"}
          </div>
        </div>

        <div
          style={{
            position: "absolute",
            top: 0,
            right: 0,
            textAlign: "right",
          }}
        >
          <MiniChip label={estadoLabel} bg={estadoColor} />
        </div>
      </div>
    );
  };

  // const bodyCardTemplate = (item) => (
  //   <div
  //     style={{
  //       display: "flex",
  //       flexDirection: "column",
  //       gap: 8,
  //       fontSize: 12,
  //       color: "#374151",
  //     }}
  //   >
  //     <div>
  //       <strong>Bloque:</strong> {item.bloqueNombre || "—"}
  //     </div>
  //     <div>
  //       <strong>Local asociado:</strong> {item.localNombre || "—"}
  //     </div>
  //     <div>
  //       <strong>Fecha registro:</strong>{" "}
  //       {item.fechaRegistro ? String(item.fechaRegistro) : "—"}
  //     </div>
  //   </div>
  // );

  const bodyCardTemplate = (item) => {
    const aplicaBloque = Number(item.bloqueId) === 1;
    const aplicaLocal = Number(item.localId) === 1;

    return (
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
          <strong>Bloque:</strong> {aplicaBloque ? "Aplica" : "No aplica"}
        </div>
        <div>
          <strong>Local asociado:</strong> {aplicaLocal ? "Aplica" : "No aplica"}
        </div>
        <div>
          <strong>Fecha registro:</strong>{" "}
          {item.fechaRegistro ? String(item.fechaRegistro) : "—"}
        </div>
      </div>
    );
  };
  return firstLoad ? (
    <SkeletonMasterLoader />
  ) : (
    <div className="fade-in">
      <ConfirmDialog
        visible={deleteDialogVisible}
        onHide={() => setDeleteDialogVisible(false)}
        message={
          currentLocation
            ? `¿Deseas eliminar la localización "${currentLocation.nombre}"?`
            : "¿Deseas eliminar esta localización?"
        }
        accept={() => {
          deleteApi(currentLocation?.lcaId);
          setDeleteDialogVisible(false);
        }}
        reject={() => setDeleteDialogVisible(false)}
        acceptLabel="Si"
        acceptClassName="p-button-danger"
        header="Confirmación"
        icon="pi pi-exclamation-triangle"
      />

      {/* Cuando tengas el modal, lo montas aquí */}
      <VenLocation ref={venLocation} addItem={addItem} updateItem={updateItem} />

      <PageHeader
        page="Gestión"
        title="Localizaciones"
        description="Maestra de localizaciones generales (infraestructura, porterías, ascensores, etc.)"
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

        {/* Overlay (filtros internos) solo desktop/tablet */}
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
                  <RightToolbar
                    label="Nuevo"
                    onClick={() => venLocation.current?.newLocation()}
                  // disabled={!canCreate}
                  />
                </div>

                {state.datos?.length <= 0 && !loading.table ? (
                  <EmptyState
                    title="No hay localizaciones registradas"
                    description="Puedes registrar una nueva localización desde aquí."
                    buttonLabel="Registrar nueva localización"
                    onButtonClick={() => venLocation.current?.newLocation()}
                  // canCreate={canCreate}
                  />
                ) : (
                  <InfiniteScrollCards
                    data={state.datos}
                    total={state.totalRecords}
                    loading={loading.table}
                    onScrollEnd={onCustomPage}
                    renderActions={renderActions}
                    onCardClick={(item) => venLocation.current?.viewLocation(item)}
                    headerTemplate={headerCardTemplate}
                    bodyTemplate={bodyCardTemplate}
                  />
                )}
              </>
            ) : (
              <div
                style={{
                  height: "calc(100vh - 180px)", // igual que Usuarios; ajusta si tu header es más alto/bajo
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                <div style={{ flex: 1, minHeight: 0 }}>

                  <DataTableComponentMemo
                    KeyModule="module_locations"
                    dataKey="lcaId"
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
                        title="No hay localizaciones registradas"
                        description="Puedes registrar una nueva localización desde aquí."
                        buttonLabel="Registrar nueva localización"
                        onButtonClick={() => venLocation.current?.newLocation()}
                      // canCreate={canCreate}
                      />
                    }
                    rowsPerPageOptions={[10, 20, 50, 100]}
                    scrollable
                    scrollHeight={"calc(100vh - 360px)"} // mismo patrón que Usuarios
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

export default Location;
