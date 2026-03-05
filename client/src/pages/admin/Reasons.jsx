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

// PrimeReact
import { Button } from "primereact/button";
import { MultiSelect } from "primereact/multiselect";
import VenReasons from "./components/modals/VenReasons";
// APIs
import { deleteReasonApi, paginationReasonsApi, saveReasonApi } from "@api/requests/reasonsAPI";
import { getModulesApi } from "@api/requests";
// Utilities
import { estados, propsSelect } from "@utils/converAndConst";
import { formatNotificationDateTime } from "@utils/formatTime";
import LoadingComponent from "@components/layout/LoadingComponent";
import SkeletonMasterLoader from "@components/generales/SkeletonMasterLoader";
import moment from "moment";
import ContextMenuActions from "@components/data/ContextMenuActions";
import usePermissions from "@context/permissions/usePermissions";
import { ConfirmDialog } from "primereact/confirmdialog";
import EmptyState from "@components/data/EmptyState";

// Detectar mobile/desktop
import { useMediaQueryContext } from "@context/mediaQuery/mediaQueryContext";
// Cards infinitas en mobile
import InfiniteScrollCards from "@components/ui/InfiniteScrollCards";

// Lazy Loaded Components
const LazyDataTable = React.lazy(() => import("@components/data/DataTableComponent"));
const DataTableComponentMemo = React.memo(LazyDataTable);
const LazyFilterComponent = React.lazy(() => import("@components/data/FilterOverlay"));
const FilterComponentMemo = React.memo(LazyFilterComponent);

const ACCENT = "#007e79";

/* ===== util de filtros ===== */
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

/* ===== pill de estado como en usuarios ===== */
const EstadoPill = ({ id, name }) => {
  const ok = Number(id) === 1;
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
      {name ?? "-"}
    </div>
  );
};

/* ===== etiquetas y valores como en usuarios ===== */
const Label = ({ children }) => (
  <div
    style={{
      fontSize: 11,
      color: "#6B7280",
      letterSpacing: 0.3,
      textTransform: "uppercase",
      lineHeight: "12px",
    }}
  >
    {children}
  </div>
);

const Value = ({ children }) => (
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
    {children ?? "—"}
  </div>
);

const Reasons = () => {
  const venReason = useRef(null); // MODAL
  const overlayFiltersRef = useRef(null);
  const { isDesktop } = useMediaQueryContext();

  const showOverlayFilters = (event) => {
    overlayFiltersRef.current.toggle(event);
  };

  const { nombreusuario } = useContext(AuthContext);
  const { showSuccess } = useContext(ToastContext);

  const { hasPermission } = usePermissions();
  const canCreate = hasPermission("management", "reasons", "create");
  const canEdit = hasPermission("management", "reasons", "edit");
  const canDelete = hasPermission("management", "reasons", "delete");

  const handleApiError = useHandleApiError();
  const { state, setInitialState, deleteItem, addItem, updateItem } = useHandleData();

  const [loading, setLoading] = useState({ table: false });
  const [listModules, setListModules] = useState([]);
  const [firstLoad, setFirstLoad] = useState(true);

  // Config
  const initialFilters = useMemo(() => ({ nombre: null, estado: null }), []);
  const sortField = "nombre";

  // Pagination
  const { filtros, setFiltros, datos, totalRecords, pagination, setPagination, onCustomPage } =
    usePaginationData(initialFilters, paginationReasonsApi, setLoading, sortField, () => true);

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

  useEffect(() => {
    getModulesApi()
      .then(({ data }) => {
        setListModules(data);
      })
      .catch((error) => {
        handleApiError(error);
      });
  }, [handleApiError]);

  const filtersConfig = useMemo(() => generateFiltersConfig({ filtros }), [filtros]);

  const getActiveFiltersCount = (filters) => {
    return Object.entries(filters).filter(([_, value]) => {
      return value !== null && value !== undefined && value !== "";
    }).length;
  };

  const activeFiltersCount = useMemo(() => getActiveFiltersCount(filtros), [filtros]);

  const deleteApi = useCallback(
    async (motId) => {
      try {
        const params = { motId, usuact: nombreusuario };
        const { data } = await deleteReasonApi(params);
        showSuccess(data.message);
        venReason.current.onClose();
        deleteItem({ id: motId, idField: "motId" });
      } catch (error) {
        handleApiError(error);
      }
    },
    [deleteItem, handleApiError, nombreusuario, showSuccess]
  );

  const updateData = async ({ campo = "", rowData, newValue }) => {
    try {
      const params = {
        ...rowData,
        usuact: nombreusuario,
        fecact: moment().format("YYYY-MM-DD HH:mm:ss"),
        [campo]: campo === "modulos" ? newValue.join(",") : newValue,
      };
      await saveReasonApi(params);
      updateItem({ idField: "motId", ...params });
    } catch (error) {
      handleApiError(error);
    }
  };

  // Tabla (desktop)
  const columnsConfig = [
    {
      field: "nombre",
      header: "Nombre",
      style: { flexGrow: 1, flexBasis: "20rem", minWidth: "20rem" },
      mobile: true,
    },
    {
      field: "modulos",
      header: "Módulos",
      style: { flexGrow: 1, flexBasis: "15rem", minWidth: "15rem" },
      mobile: true,
      body: (rowData) => {
        const value = rowData.modulos ? rowData.modulos.split(",").map(Number) : [];
        return (
          <MultiSelect
            {...propsSelect}
            value={value}
            options={listModules}
            style={{ width: "100%" }}
            onChange={(e) => updateData({ campo: "modulos", rowData, newValue: e.value })}
          />
        );
      },
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

  const [deleteDialogVisible, setDeleteDialogVisible] = useState(false);
  const [currentReason, setCurrentReason] = useState(null);

  const renderActions = (item) => {
    const { motId, nombre } = item;
    const menuItems = [
      {
        label: "Editar",
        icon: "pi pi-pencil",
        command: () => venReason.current.editReason(item),
        disabled: !canEdit,
        color: "#fda53a",
      },
      {
        label: "Eliminar",
        icon: "pi pi-trash",
        command: () => {
          setCurrentReason({ motId, nombre });
          setDeleteDialogVisible(true);
        },
        disabled: !canDelete,
        color: "#f43f51",
      },
    ];
    return <ContextMenuActions menuItems={menuItems} itemId={motId} />;
  };

  const actionsToolbar = useMemo(
    () => (
      <>
        <div style={{ position: "relative", display: "inline-block" }}>
          <Button
            icon="pi pi-sliders-h"
            label="Filtros"
            iconPos="left"
            className="p-button-rounded p-button-sm ml-2"
            onClick={showOverlayFilters}
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
          label="Nuevo"
          onClick={() => venReason.current.newReason()}
          disabled={!canCreate}
        />
      </>
    ),
    [canCreate, activeFiltersCount]
  );

  const headerTemplate = useMemo(
    () => <div style={{ flexShrink: 0 }}>{actionsToolbar}</div>,
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
    venReason.current.editReason(e.value);
  };

  /* ================= MOBILE (Cards) – mismo formato de iconos que Usuarios ================ */

  // Map de módulos por id para resolver nombres
  const moduleNameMap = useMemo(() => {
    const entries = (listModules || []).map((m) => [
      Number(m.id ?? m.modId ?? m.value),
      m.nombre ?? m.label,
    ]);
    return new Map(entries);
  }, [listModules]);

  const getModuleNames = (csv) => {
    const ids = (csv ? String(csv) : "")
      .split(",")
      .map((n) => Number(n))
      .filter(Boolean);
    return ids.map((id) => moduleNameMap.get(id)).filter(Boolean);
  };

  // Header de card: título + estado (igual patrón que usuarios)
  const headerCardTemplate = (item) => (
    <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
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
        title={item?.nombre || "-"}
      >
        {item?.nombre || "-"}
      </div>
      <EstadoPill id={item?.estado} name={item?.nomestado} />
    </div>
  );

  // Body de card: 3 ítems (icono + label + value), emulando Usuarios:
  //   1) 🧩 Primer módulo
  //   2) 🧩 Segundo módulo
  //   3) Chip compacto "+N" si hay más (mismo estilo que tu "CC" chip)
const bodyCardTemplate = (item) => {
  const mods = getModuleNames(item.modulos);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)", // ahora 4 columnas
          gap: 6, // menos espacio entre columnas
          alignItems: "stretch",
        }}
      >
        {mods.length ? (
          mods.map((n, idx) => (
            <div
              key={idx}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 4, // más compacto entre icono y texto
                minWidth: 0,
              }}
            >
              <span style={{ fontSize: 12, opacity: 0.8 }}>🧩</span>
              <div style={{ minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 10,
                    color: "#6B7280",
                    lineHeight: "12px",
                  }}
                >
                  Módulo {idx + 1}
                </div>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: "#111827",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                  title={n}
                >
                  {n}
                </div>
              </div>
            </div>
          ))
        ) : (
          <span style={{ fontSize: 12, color: "#9ca3af" }}>Sin módulos</span>
        )}
      </div>
    </div>
  );
};


  const handleCardClick = (payload) => {
        if (!canEdit) return;

        // Soporta { item }, { value } o el item directo
        const item = payload?.item ?? payload?.value ?? payload;
        const id = item?.motId  ?? item?.id;
        if (!id) return;

        const api = venReason.current;
        if (api && typeof api.editReason === "function") {
            api.editReason(item, 0); // abrir en editar
        }

    // if (!canEdit) return;
    // const item = payload?.item ?? payload?.value ?? payload;
    // const id = item?.motId ?? item?.id;
    // if (!id) return;
    // venReason.current?.editReason?.(item);
  };

  /* ================= FIN MOBILE ================= */

  return (
    <>
      {firstLoad ? (
        <SkeletonMasterLoader />
      ) : (
        <div className="fade-in">
          <ConfirmDialog
            visible={deleteDialogVisible}
            onHide={() => setDeleteDialogVisible(false)}
            message={`Realmente desea eliminar el motivo ${currentReason?.nombre}?`}
            header="Confirmar Eliminación"
            icon="pi pi-exclamation-triangle"
            acceptLabel="Sí"
            accept={() => {
              deleteApi(currentReason?.motId);
              setDeleteDialogVisible(false);
            }}
            reject={() => setDeleteDialogVisible(false)}
            acceptClassName="p-button-danger"
          />

          <VenReasons
            ref={venReason}
            addItem={addItem}
            updateItem={updateItem}
            setCurrentReason={setCurrentReason}
            setDeleteDialogVisible={setDeleteDialogVisible}
            canDelete={canDelete}
          />

          <PageHeader
            page="Administración"
            title="Motivos"
            description="Gestiona la creación y asignación de motivos, ya sean razones de rechazo u otras causas."
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
                {isDesktop ? (
                  <DataTableComponentMemo
                    KeyModule={"module_reasons"}
                    dataKey="motId"
                    columns={columnsConfig}
                    header={headerTemplate}
                    datos={state.datos}
                    totalRecords={state.totalRecords}
                    loading={loading.table}
                    pagination={pagination}
                    onCustomPage={onCustomPage}
                    setPagination={setPagination}
                    actionBodyTemplate={renderActions}
                    isRowSelectable={true}
                    onSelectionChange={handleRowSelect}
                    emptyMessage={
                      <EmptyState
                        title="No hay motivos registrados"
                        description="Puedes crear un nueva motivo para comenzar."
                        buttonLabel="Registrar nuevo motivo"
                        onButtonClick={() => venReason.current.newReason()}
                        canCreate={canCreate}
                      />
                    }
                  />
                ) : (
                  <>
                    {/* Toolbar arriba en mobile */}
                    <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "1rem" }}>
                      {headerTemplate}
                    </div>

                    {state.datos?.length <= 0 && !loading.table ? (
                      <EmptyState
                        title="No hay motivos registrados"
                        description="Puedes crear un nueva motivo para comenzar."
                        buttonLabel="Registrar nuevo motivo"
                        onButtonClick={() => venReason.current.newReason()}
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
                        onCardClick={handleCardClick}
                        headerTemplate={headerCardTemplate}
                        bodyTemplate={bodyCardTemplate}
                      />
                    )}
                  </>
                )}
              </div>
            </div>
          </Suspense>
        </div>
      )}
    </>
  );
};

export default Reasons;
