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
import SkeletonMasterLoader from "@components/generales/SkeletonMasterLoader";
import LoadingComponent from "@components/layout/LoadingComponent";
import EmptyState from "@components/data/EmptyState";

import { estados, propsSelect } from "@utils/converAndConst";
import usePermissions from "@context/permissions/usePermissions";
import { useMediaQueryContext } from "@context/mediaQuery/mediaQueryContext";
import InfiniteScrollCards from "@components/ui/InfiniteScrollCards";

// APIs
import {
  deleteAreasAPI,
  paginationAreasAPI,
  getAreasManagersByIdAPI,
} from "@api/requests/areasApi";

// Modal
import VenAreas from "./components/modals/VenAreas";

// Lazy (tabla + filtros)
const LazyDataTable = React.lazy(() => import("@components/data/DataTableComponent"));
const DataTableComponentMemo = React.memo(LazyDataTable);
const LazyFilterGeneric = React.lazy(() => import("@components/data/FilterGeneric"));
const FilterGenericMemo = React.memo(LazyFilterGeneric);
const LazyOverlayFilters = React.lazy(() => import("@components/data/FilterOverlay"));
const OverlayFiltersMemo = React.memo(LazyOverlayFilters);

const ACCENT = "#007e79";

//===config de filtros =====
const generateFiltersConfig = ({ filtros }) => [
  {
    key: "search",
    type: "input",
    label: "Nombre",
    filtro: filtros.nombre,
    externo: true,
    className: "col-12 md:col-4 mt-2",
  },
  {
    key: "estado",
    type: "dropdown",
    label: "Estado",
    filtro: filtros.estado,
    props: { ...propsSelect, options: estados },
    showClear: true,
    externo: true,
    className: "col-12 md:col-3 mt-2",
  },
];

// Pill de estado (estética similar a Usuarios)
const EstadoPill = ({ estado }) => {
  const ok = String(estado).toLowerCase() === "activo";
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
      {estado ?? "-"}
    </div>
  );
};

const Areas = () => {
  const venArea = useRef(null);
  const overlayFiltersRef = useRef(null);

  const { nombreusuario } = useContext(AuthContext);
  const { showSuccess } = useContext(ToastContext);
  const handleApiError = useHandleApiError();
  const { state, setInitialState, deleteItem, addItem, updateItem } = useHandleData();

  const { hasPermission } = usePermissions();
  const canCreate = hasPermission("management", "areas", "create");
  const canEdit = hasPermission("management", "areas", "edit");
  const canDelete = hasPermission("management", "areas", "delete");

  const [loading, setLoading] = useState({ table: false });
  const [firstLoad, setFirstLoad] = useState(true);
  const initialFilters = useMemo(() => ({ nombre: null, estado: null }), []);
  const sortField = "nombre";

  const [encargadosMap, setEncargadosMap] = useState({}); // { [areId]: string[] }
  const encargadosCacheRef = useRef({}); // cache en memoria por areId
  const [loadingManagers, setLoadingManagers] = useState(false);

  // Mobile/Tablet
  const { isMobile, isTablet } = useMediaQueryContext();
  const vistaMobil = isMobile || isTablet;

  const { filtros, setFiltros, datos, totalRecords, pagination, setPagination, onCustomPage } =
    usePaginationData(initialFilters, paginationAreasAPI, setLoading, sortField, () => true);

  useEffect(() => {
    if (!loading.table && firstLoad) {
      setTimeout(() => setFirstLoad(false), 400);
    }
  }, [loading.table, firstLoad]);

  useEffect(() => {
    setInitialState(datos, totalRecords);
  }, [datos, totalRecords, setInitialState]);

  const filtersBuilt = useMemo(() => generateFiltersConfig({ filtros }), [filtros]);

  const getActiveFiltersCount = (filters) =>
    Object.values(filters).filter((v) => v !== null && v !== "").length;

  const activeFiltersCount = useMemo(() => getActiveFiltersCount(filtros), [filtros]);

  const [deleteDialogVisible, setDeleteDialogVisible] = useState(false);
  const [currentArea, setCurrentArea] = useState(null);
  const managersCacheRef = useRef({});


  const deleteApi = useCallback(
    async (id) => {
      try {
        await deleteAreasAPI({ ids: [id], usuario: nombreusuario });
        showSuccess("Área eliminada correctamente");
        venArea.current.onClose();
        deleteItem({ id, idField: "areId" });
      } catch (error) {
        handleApiError(error);
      }
    },
    [nombreusuario, deleteItem, showSuccess, handleApiError]
  );

  // === Encargados por página visible ===
  // useEffect(() => {
  //   const rows = state.datos || [];
  //   if (!rows.length) return;

  //   const pageIds = rows.map((r) => r.areId).filter(Boolean);
  //   const idsToFetch = pageIds.filter((id) => !(id in encargadosCacheRef.current));
  //   if (!idsToFetch.length) {
  //     const merged = {};
  //     for (const id of pageIds) merged[id] = encargadosCacheRef.current[id] || [];
  //     setEncargadosMap(merged);
  //     return;
  //   }

  //   let cancel = false;
  //   (async () => {
  //     try {
  //       setLoadingManagers(true);
  //       const { data } = await getAreasManagersByIdAPI(idsToFetch);
  //       const grouped = {};
  //       (Array.isArray(data) ? data : data?.datos || []).forEach((row) => {
  //         const { areaId, encargadoNombre } = row;
  //         if (!grouped[areaId]) grouped[areaId] = [];
  //         if (encargadoNombre) grouped[areaId].push(encargadoNombre);
  //       });

  //       idsToFetch.forEach((id) => {
  //         encargadosCacheRef.current[id] = grouped[id] || [];
  //       });

  //       const merged = {};
  //       for (const id of pageIds) merged[id] = encargadosCacheRef.current[id] || [];
  //       if (!cancel) setEncargadosMap(merged);
  //     } finally {
  //       if (!cancel) setLoadingManagers(false);
  //     }
  //   })();

  //   return () => {
  //     cancel = true;
  //   };
  // }, [state.datos]);

  useEffect(() => {
  const rows = state.datos || [];
  if (!rows.length) return;

  // Mapa de lo que "debería" haber (IDs) según la fila visible
  const desiredIdsByArea = {};
  const pageIds = [];

  for (const r of rows) {
    const areId = r?.areId;
    if (!areId) continue;
    pageIds.push(areId);

    // Normaliza a array de números
    const ids = Array.isArray(r.encargados)
      ? r.encargados.map(Number).filter(Boolean)
      : [];
    desiredIdsByArea[areId] = [...new Set(ids)].sort((a,b) => a-b);
  }

  // decidir qué áreas hay que (re)buscar:
  const idsToFetch = [];
  for (const areId of pageIds) {
    const cached = managersCacheRef.current[areId];
    const desiredIds = desiredIdsByArea[areId] || [];

    // sin caché => buscar
    if (!cached) { idsToFetch.push(areId); continue; }

    // si cambian los IDs => caché inválida => buscar
    const cachedIds = (cached.ids || []).slice().sort((a,b)=>a-b);
    const same =
      cachedIds.length === desiredIds.length &&
      cachedIds.every((v,i) => v === desiredIds[i]);
    if (!same) idsToFetch.push(areId);
  }

  // si no hay nada que traer, solo proyectar nombres desde la caché
  if (!idsToFetch.length) {
    const merged = {};
    for (const id of pageIds) merged[id] = (managersCacheRef.current[id]?.names) || [];
    setEncargadosMap(merged);
    return;
  }

  let cancel = false;
  (async () => {
    try {
      setLoadingManagers(true);
      // 🔁 pide solo las áreas que necesitan refresh
      const { data } = await getAreasManagersByIdAPI(idsToFetch);
      const rows = Array.isArray(data) ? data : data?.datos || [];

      // group -> { [areId]: { ids, names } }
      const grouped = {};
      for (const row of rows) {
        const areaId = Number(row.areaId);
        const name = row.encargadoNombre;
        const encId = Number(row.encargadoId);
        if (!grouped[areaId]) grouped[areaId] = { ids: [], names: [] };
        if (encId) grouped[areaId].ids.push(encId);
        if (name) grouped[areaId].names.push(name);
      }

      // actualizar caché para las áreas pedidas, usando los IDs “deseados” si existen
      for (const areId of idsToFetch) {
        const desiredIds = desiredIdsByArea[areId] || [];
        const g = grouped[areId] || { ids: [], names: [] };

        managersCacheRef.current[areId] = {
          // guarda los IDs que esperamos (los de la fila editable),
          // si por cualquier razón el endpoint no trae todos, mantenemos la coherencia
          ids: desiredIds.length ? desiredIds : g.ids,
          names: g.names || [],
        };
      }

      // merge para las áreas visibles
      const merged = {};
      for (const id of pageIds) {
        merged[id] = (managersCacheRef.current[id]?.names) || [];
      }
      if (!cancel) setEncargadosMap(merged);
    } finally {
      if (!cancel) setLoadingManagers(false);
    }
  })();

  return () => { cancel = true; };
}, [state.datos]);

  const renderActions = (item) => {
    const { areId, nombre } = item;
    const menuItems = [
      {
        label: "Editar",
        icon: "pi pi-pencil",
        command: () => venArea.current.editArea(item),
        disabled: !canEdit,
        color: "#fda53a",
      },
      {
        label: "Eliminar",
        icon: "pi pi-trash",
        command: () => {
          setCurrentArea({ areId, nombre });
          setDeleteDialogVisible(true);
        },
        disabled: !canDelete,
        color: "#f43f51",
      },
    ];
    return (
      <div onClick={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}>
        <ContextMenuActions menuItems={menuItems} itemId={areId} />
      </div>
    );
  };

  const columnsConfig = [
    {
      field: "nombre",
      header: "Nombre",
      style: { flexGrow: 1, minWidth: "20rem" },
      mobile: true,
    },
    {
      field: "encargados",
      header: "Encargados",
      style: { minWidth: "18rem" },
      body: (row) => {
        const names = encargadosMap[row.areId] || [];
        if (!names.length) return loadingManagers ? "Cargando..." : "-";
        const [a, b, ...rest] = names;
        return (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            <span className="p-tag p-tag-rounded">{a}</span>
            {b && <span className="p-tag p-tag-rounded">{b}</span>}
            {rest.length > 0 && <span className="p-tag p-tag-rounded">+{rest.length}</span>}
          </div>
        );
      },
      mobile: true,
    },
    {
      field: "cantidadEstimado",
      header: "Cantidad",
      style: { maxWidth: "8rem", textAlign: "center" },
      body: (rowData) => rowData.cantidadEstimado ?? "-",
      mobile: true,
    },

    {
      field: "frecuenciaId",
      header: "Frecuencia",
      style: { maxWidth: "10rem", textAlign: "center" },
      body: (rowData) => {
        const mapFrecuencia = {
          1: "Minuto",
          2: "Hora",
          3: "Día",
          4: "Semana",
          5: "Mes",
        };
        return mapFrecuencia[rowData.frecuenciaId] ?? "-";
      },
      mobile: true,
    },
    {
      field: "tiempoEstimadoMinutos",
      header: "Tiempo Estimado de solución (min)",
      style: { maxWidth: "10rem", textAlign: "right" },
      bodyStyle: { textAlign: "right" },
      body: (rowData) =>
        rowData.tiempoEstimadoMinutos != null ? Math.round(rowData.tiempoEstimadoMinutos) : "-",
      mobile: true,
    },
    {
      field: "nomestado",
      header: "Estado",
      style: { maxWidth: "8rem" },
      body: ({ estado }) => <ChipStatusComponent id={estado} nameStatus={estado} />,
      mobile: true,
    },
  ];

  // ==== Toolbar (Filtro + Crear) ====
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
              onClick={(e) => overlayFiltersRef.current?.toggle?.(e)}
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
        <RightToolbar label="Crear" onClick={() => venArea.current.newArea()} disabled={!canCreate} />
      </>
    ),
    [activeFiltersCount, canCreate, vistaMobil]
  );

  const headerTemplate = useMemo(
    () => <div style={{ flexShrink: 0 }}>{actionsToolbar}</div>,
    [actionsToolbar]
  );

  const handleRowSelect = (e) => {
    if (!canEdit) return;
    venArea.current.editArea(e.value);
  };

  const filtersExternos = useMemo(() => filtersBuilt.filter((f) => f.externo), [filtersBuilt]);
  const filtersInternos = useMemo(() => filtersBuilt.filter((f) => !f.externo), [filtersBuilt]);

  const handleCardClick = (payload) => {
    if (!canEdit) return;
    const item = payload?.value ?? payload?.item ?? payload;
    const areId = item?.areId ?? item?.id;
    if (!areId) return;
    const full = state.datos?.find((r) => String(r.areId) === String(areId)) || item;
    const api = venArea.current;
    if (api && typeof api.editArea === "function") {
      api.editArea(full);
    }
  };

  // ====== Plantillas MOBILE con ICONOGRAFÍA (estilo Usuarios) ======
  const headerCardTemplate = (item) => (
    <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
      <div
        className="title-main"
        style={{
          fontWeight: 600,
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
          flex: 1,
          minWidth: 0,
        }}
        title={item.nombre}
      >
        {item.nombre}
      </div>
      <EstadoPill estado={item.estado} />
    </div>
  );

  const bodyCardTemplate = (item) => {
    const names = encargadosMap[item.areId] || [];
    const [a, b, ...rest] = names;

    const mapFrecuencia = { 1: "Min", 2: "Hora", 3: "Día", 4: "Sem", 5: "Mes" };
    const qty = item.cantidadEstimado ?? "—";
    const freq = mapFrecuencia[item.frecuenciaId] ?? "—";
    const time = item.tiempoEstimadoMinutos != null ? Math.round(item.tiempoEstimadoMinutos) : "—";

    const Item = ({ icon, label, value, title }) => (
      <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }} title={title || `${label}: ${value}`}>
        <span style={{ fontSize: 14, opacity: 0.85 }}>{icon}</span>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 10, color: "#6B7280", lineHeight: "12px" }}>{label}</div>
          <div
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: "#111827",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {value}
          </div>
        </div>
      </div>
    );

    const chipStyle = {
      border: `1px solid ${ACCENT}`,
      backgroundColor: "transparent",
      color: ACCENT,
      maxWidth: 140,
      whiteSpace: "nowrap",
      textOverflow: "ellipsis",
      overflow: "hidden",
    };

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {/* Fila con 4 items (icono + label + value) apretados como en Usuarios */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 6,
            alignItems: "stretch",
          }}
        >
          <Item icon="🔢" label="Cantidad" value={qty} />
          <Item icon="⏱️" label="Frecuencia" value={freq} />
          <Item icon="⏳" label="Tiempo (min)" value={time} />
          <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
            <span style={{ fontSize: 14, opacity: 0.85 }}>👥</span>
            <div style={{ minWidth: 0, display: "flex", alignItems: "center", gap: 6, overflow: "hidden" }}>
              {names.length ? (
                <>
                  <span className="p-tag p-tag-rounded" style={chipStyle} title={a}>
                    {a}
                  </span>
                  {b && (
                    <span className="p-tag p-tag-rounded" style={chipStyle} title={b}>
                      {b}
                    </span>
                  )}
                  {rest.length > 0 && (
                    <span
                      className="p-tag p-tag-rounded"
                      style={{
                        ...chipStyle,
                        background: ACCENT,
                        color: "#fff",
                        borderColor: ACCENT,
                      }}
                    >
                      +{rest.length}
                    </span>
                  )}
                </>
              ) : (
                <span style={{ fontSize: 12, color: "#9ca3af" }}>Sin encargados</span>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ==== Render ====
  return firstLoad ? (
    <SkeletonMasterLoader />
  ) : (
    <div className="fade-in">
      <ConfirmDialog
        visible={deleteDialogVisible}
        onHide={() => setDeleteDialogVisible(false)}
        message={`¿Deseas eliminar el área ${currentArea?.nombre}?`}
        accept={() => {
          deleteApi(currentArea?.areId);
          setDeleteDialogVisible(false);
        }}
        reject={() => setDeleteDialogVisible(false)}
        acceptClassName="p-button-danger"
        acceptLabel="Si"
        header="Confirmación"
        icon="pi pi-exclamation-triangle"
      />

      <VenAreas
        ref={venArea}
        addItem={addItem}
        updateItem={updateItem}
        setDeleteDialogVisible={setDeleteDialogVisible}
        setCurrentArea={setCurrentArea}
        canDelete={canDelete}
      />

      <PageHeader page="Administración" title="Áreas" description="Gestión de áreas de atención" />

      <Suspense fallback={<LoadingComponent />}>
        {vistaMobil ? (
          <FilterGenericMemo
            filters={filtersBuilt}
            initialFilters={initialFilters}
            setFilters={setFiltros}
            typeFilter={1}
            isMobile={true}
          />
        ) : (
          <>
            <FilterGenericMemo
              filters={filtersExternos}
              initialFilters={initialFilters}
              setFilters={setFiltros}
              typeFilter={2}
              isMobile={false}
            />
            {filtersInternos.length > 0 && (
              <OverlayFiltersMemo
                overlayRef={overlayFiltersRef}
                initialFilters={initialFilters}
                filters={filtersInternos}
                setFilters={setFiltros}
              />
            )}
          </>
        )}

        <div className="grid">
          <div className="col-12">
            {vistaMobil ? (
              <>
                {/* Botonera en mobile */}
                <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "1rem" }}>
                  {headerTemplate}
                </div>

                {state.datos?.length <= 0 && !loading.table ? (
                  <EmptyState
                    title="No hay áreas registradas"
                    description="Puedes crear una nueva área para comenzar."
                    buttonLabel="Registrar nueva área"
                    onButtonClick={() => venArea.current.newArea()}
                    canCreate={canCreate}
                  />
                ) : (
                  <InfiniteScrollCards
                    data={state.datos}
                    total={state.totalRecords}
                    loading={loading.table}
                    onScrollEnd={onCustomPage}
                    renderActions={renderActions}
                    onCardClick={handleCardClick}
                    headerTemplate={headerCardTemplate}
                    bodyTemplate={bodyCardTemplate}
                  />
                )}
              </>
            ) : (
              <DataTableComponentMemo
                KeyModule="module_areas"
                dataKey="areId"
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
                    title="No hay áreas registradas"
                    description="Puedes crear una nueva área para comenzar."
                    buttonLabel="Registrar nueva área"
                    onButtonClick={() => venArea.current.newArea()}
                    canCreate={canCreate}
                  />
                }
                rowsPerPageOptions={[10, 20, 50, 100]}
              />
            )}
          </div>
        </div>
      </Suspense>
    </div>
  );
};

export default Areas;
