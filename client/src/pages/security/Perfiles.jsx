// import React, {
//     useContext,
//     useState,
//     useRef,
//     useMemo,
//     useEffect,
//     Suspense,
//     useCallback,
// } from "react";

// // Contexts
// import { AuthContext } from "@context/auth/AuthContext";
// import { ToastContext } from "@context/toast/ToastContext";

// // Hooks
// import useHandleData from "@hook/useHandleData";
// import useHandleApiError from "@hook/useHandleApiError";
// import usePaginationData from "@hook/usePaginationData";

// // PrimeReact Components
// import { Button } from "primereact/button";

// // Utils
// import { estados, propsSelect } from "@utils/converAndConst";
// import { formatNotificationDateTime } from "@utils/formatTime";

// // Custom Components
// import ChipStatusComponent from "@components/fields/ChipStatusComponent";
// import { RightToolbar } from "@components/generales";
// import VenPerfil from "./components/VenPerfil";

// // Services
// import { deleteProfileAPI, paginationProfilesAPI } from "@api/requests";
// import PageHeader from "@components/layout/PageHeader";
// import LoadingComponent from "@components/layout/LoadingComponent";
// import SkeletonMasterLoader from "@components/generales/SkeletonMasterLoader";
// import ContextMenuActions from "@components/data/ContextMenuActions";
// import usePermissions from "@context/permissions/usePermissions";
// import { ConfirmDialog } from "primereact/confirmdialog";
// import EmptyState from "@components/data/EmptyState";

// // Lazy Loaded Components
// const LazyDataTable = React.lazy(() => import("@components/data/DataTableComponent"));
// const DataTableComponentMemo = React.memo(LazyDataTable);
// const LazyFilterComponent = React.lazy(() => import("@components/data/FilterOverlay"));
// const FilterComponentMemo = React.memo(LazyFilterComponent);
// const VenPerfilMemo = React.memo(VenPerfil);

// const generateFiltersConfig = ({ filtros }) => [
//     { key: "nombre", type: "input", label: "Nombre", filtro: filtros.nombre },
//     {
//         key: "estado",
//         type: "dropdown",
//         props: { ...propsSelect, options: estados },
//         label: "Estado",
//         showClear: true,
//         filtro: filtros.estado,
//     },
// ];

// const columnsConfig = [
//     {
//         field: "nombre",
//         header: "Nombre",
//         style: { flexGrow: 1, flexBasis: "12rem", minWidth: "12rem" },
//         mobile: true,
//     },

//     {
//         field: "usuact,fecact",
//         header: "Actualizado Por",
//         style: { flexGrow: 1, flexBasis: "12rem", minWidth: "12rem" },
//         body: ({ usuact, fecact }) => (
//             <div>
//                 <div>
//                     <span style={{ fontWeight: 600 }}>{usuact}</span>
//                 </div>
//                 <div>{formatNotificationDateTime(fecact)}</div>
//             </div>
//         ),
//     },
//     {
//         field: "nomestado",
//         header: "Estado",
//         style: { maxWidth: "8rem" },
//         body: ({ estid, nomestado }) => <ChipStatusComponent id={estid} nameStatus={nomestado} />,
//     },
// ];

// const Perfiles = () => {
//     const venPerfil = useRef();
//     const { idusuario, nombreusuario } = useContext(AuthContext);

//     const { hasPermission } = usePermissions();
//     const canCreate = hasPermission("security", "profiles", "create");
//     const canAssignPermission = hasPermission("security", "profiles", "assignPermission");
//     const canEdit = hasPermission("security", "profiles", "edit");
//     const canDelete = hasPermission("security", "profiles", "delete");

//     const { showSuccess } = useContext(ToastContext);
//     const handleApiError = useHandleApiError();
//     const { state, setInitialState, deleteItem, addItem, updateItem } = useHandleData();
//     const [loading, setLoading] = useState({ table: false });
//     const [, setCurrentTime] = useState(new Date());
//     const overlayFiltersRef = useRef(null);
//     const [firstLoad, setFirstLoad] = useState(true);

//     useEffect(() => {
//         const interval = setInterval(() => {
//             setCurrentTime(new Date());
//         }, 60000); // Actualiza cada 60 segundos

//         return () => clearInterval(interval);
//     }, []);

//     const initialFilters = useMemo(
//         () => ({
//             idusuario,
//             nombre: "",
//             estado: null,
//         }),
//         [idusuario]
//     );

//     const sortField = "nombre";

//     const { filtros, setFiltros, datos, totalRecords, pagination, setPagination, onCustomPage } =
//         usePaginationData(initialFilters, paginationProfilesAPI, setLoading, sortField, () => true);

//     useEffect(() => {
//         if (!loading.table && firstLoad) {
//             setTimeout(() => setFirstLoad(false), [400]);
//         }
//     }, [loading.table, firstLoad]);

//     useEffect(() => {
//         setFiltros((prevFilters) => ({
//             ...prevFilters,
//             idusuario,
//         }));
//     }, [idusuario, setFiltros]);

//     useEffect(() => {
//         setInitialState(datos, totalRecords);
//         // eslint-disable-next-line
//     }, [datos, totalRecords, setInitialState]);

//     const filtersConfig = useMemo(() => generateFiltersConfig({ filtros }), [filtros]);

//     const getActiveFiltersCount = (filters) => {
//         return Object.entries(filters).filter(([key, value]) => {
//             if (key === "idusuario" && value) return false;
//             return value !== null && value !== undefined && value !== "";
//         }).length;
//     };

//     const activeFiltersCount = useMemo(() => getActiveFiltersCount(filtros), [filtros]);

//     const deleteProfile = useCallback(
//         async (prfId) => {
//             try {
//                 const params = {
//                     prfId,
//                     usuario: nombreusuario,
//                 };
//                 const { data } = await deleteProfileAPI(params);

//                 showSuccess(data.message);
//                 venPerfil.current.onClose();
//                 deleteItem({ id: prfId, idField: "prfId" });
//             } catch (error) {
//                 handleApiError(error);
//             }
//         },
//         [deleteItem, handleApiError, nombreusuario, showSuccess]
//     );

//     const [deleteDialogVisible, setDeleteDialogVisible] = useState(false);
//     const [currentProfile, setCurrentProfile] = useState(null);

//     const renderActions = (item) => {
//         const { prfId, nombre } = item;
//         const menuItems = [
//             {
//                 label: `Editar`,
//                 icon: "pi pi-pencil",
//                 command: () => venPerfil.current.editProfile(item, 0),
//                 disabled: !canEdit || prfId === 3,
//                 color: "#fda53a", // Color naranja para editar
//             },
//             {
//                 label: `Asignar permisos`,
//                 icon: "pi pi-lock",
//                 command: () => venPerfil.current.editProfile(item, 1),
//                 disabled: !canAssignPermission || prfId === 3 || prfId === 14,
//                 color: "#0eb0e9", // Color azul para permisos
//             },
//             {
//                 label: `Eliminar`,
//                 icon: "pi pi-trash",
//                 command: () => {
//                     setCurrentProfile({ prfId, nombre });
//                     setDeleteDialogVisible(true);
//                 },
//                 disabled: !canDelete || prfId === 3 || prfId === 14,
//                 color: "#f43f51",
//             },
//         ];

//         return <ContextMenuActions menuItems={menuItems} itemId={prfId} />;
//     };

//     const showOverlayFilters = (event) => {
//         overlayFiltersRef.current.toggle(event);
//     };

//     const actionsToolbar = useMemo(
//         () => (
//             <>
//                 <div style={{ position: "relative", display: "inline-block" }}>
//                     <Button
//                         icon="pi pi-sliders-h"
//                         label="Filtros"
//                         iconPos="left"
//                         className="p-button-sm p-button-rounded ml-2"
//                         onClick={showOverlayFilters}
//                     />
//                     {activeFiltersCount > 0 && (
//                         <span
//                             className="fade-in"
//                             style={{
//                                 position: "absolute",
//                                 top: "-8px",
//                                 right: "-8px",
//                                 backgroundColor: "#f44336", // Color rojo
//                                 color: "#fff", // Color de texto blanco
//                                 borderRadius: "50%",
//                                 padding: "4px 8px",
//                                 fontSize: "8px",
//                                 fontWeight: "bold",
//                                 zIndex: 1,
//                             }}
//                         >
//                             {activeFiltersCount}
//                         </span>
//                     )}
//                 </div>
//                 <RightToolbar
//                     label="Crear"
//                     onClick={() => venPerfil.current.newProfile()}
//                     disabled={!canCreate}
//                 />
//             </>
//         ),
//         [canCreate, activeFiltersCount]
//     );

//     const headerTemplate = useMemo(
//         () => <div style={{ flexShrink: 0 }}>{actionsToolbar}</div>,
//         [actionsToolbar]
//     );

//     const handleRowSelect = (e) => {
//         const target = e.originalEvent.target;

//         if (!canEdit || e.value?.prfId === 3) return; // bloquear para no permitir editar el perfil PACIENTE ya que con este se valida internamente la navegación en el login

//         // Evitar la navegación si el clic ocurre dentro de elementos interactivos
//         if (
//             target.closest(".p-dropdown") || // Dropdown de PrimeReact
//             target.closest(".p-multiselect") || // MultiSelect de PrimeReact
//             target.closest(".p-dropdown-item") || // Opción dentro del dropdown
//             target.closest(".p-multiselect-item") || // Opción dentro del multiselect
//             target.closest("input") || // Inputs de cualquier tipo
//             target.closest("button") || // Botones de cualquier tipo
//             target.closest(".p-checkbox") || // Checkboxes de PrimeReact
//             target.closest(".p-radiobutton") || // Radio buttons de PrimeReact
//             target.closest(".p-inputtext") // Cualquier otro input de texto de PrimeReact
//         ) {
//             return;
//         }

//         // Si no hizo clic en un elemento interactivo, redirigir
//         // console.log(e.value);

//         venPerfil.current.editProfile(e.value); // todo
//     };

//     return (
//         <>
//             {firstLoad ? (
//                 <SkeletonMasterLoader />
//             ) : (
//                 <div className="fade-in">
//                     <ConfirmDialog
//                         visible={deleteDialogVisible}
//                         onHide={() => setDeleteDialogVisible(false)}
//                         message={`¿Realmente desea eliminar el perfil ${currentProfile?.nombre}?`}
//                         header="Confirmar Eliminación"
//                         icon="pi pi-exclamation-triangle"
//                         acceptLabel="Sí"
//                         accept={() => {
//                             deleteProfile(currentProfile?.prfId);
//                             setDeleteDialogVisible(false);
//                         }}
//                         reject={() => setDeleteDialogVisible(false)}
//                         acceptClassName="p-button-danger"
//                     />
//                     <PageHeader
//                         page="Seguridad"
//                         title="Perfiles"
//                         description="Configura y gestiona los perfiles del sistema, define permisos y controla los niveles de acceso para garantizar la seguridad."
//                     />
//                     <VenPerfilMemo
//                         ref={venPerfil}
//                         addItem={addItem}
//                         updateItem={updateItem}
//                         setCurrentProfile={setCurrentProfile}
//                         setDeleteDialogVisible={setDeleteDialogVisible}
//                         canAssignPermission={canAssignPermission}
//                         canDelete={canDelete}
//                     />

//                     <Suspense fallback={<LoadingComponent />}>
//                         <FilterComponentMemo
//                             overlayRef={overlayFiltersRef}
//                             initialFilters={initialFilters}
//                             filters={filtersConfig}
//                             setFilters={setFiltros}
//                         />

//                         <div className="grid">
//                             <div className="col-12 md:col-12">
//                                 <DataTableComponentMemo
//                                     KeyModule={"module_profiles"}
//                                     dataKey={"prfId"}
//                                     columns={columnsConfig}
//                                     header={headerTemplate}
//                                     datos={state.datos}
//                                     loading={loading.table}
//                                     totalRecords={state.totalRecords}
//                                     pagination={pagination}
//                                     onCustomPage={onCustomPage}
//                                     setPagination={setPagination}
//                                     actionBodyTemplate={renderActions}
//                                     isRowSelectable={true}
//                                     onSelectionChange={handleRowSelect}
//                                     emptyMessage={
//                                         <EmptyState
//                                             title="No hay perfiles registrados"
//                                             description="Puedes crear un nuevo perfil para comenzar."
//                                             buttonLabel="Registrar nuevo perfil"
//                                             onButtonClick={() => venPerfil.current.newProfile()}
//                                             canCreate={canCreate}
//                                         />
//                                     }
//                                 />
//                             </div>
//                         </div>
//                     </Suspense>
//                 </div>
//             )}
//         </>
//     );
// };

// export default Perfiles;

import React, {
  useContext,
  useState,
  useRef,
  useMemo,
  useEffect,
  Suspense,
  useCallback,
} from "react";

// Contexts
import { AuthContext } from "@context/auth/AuthContext";
import { ToastContext } from "@context/toast/ToastContext";
import usePermissions from "@context/permissions/usePermissions";
import { useMediaQueryContext } from "@context/mediaQuery/mediaQueryContext";

// Hooks
import useHandleData from "@hook/useHandleData";
import useHandleApiError from "@hook/useHandleApiError";
import usePaginationData from "@hook/usePaginationData";

// PrimeReact
import { Button } from "primereact/button";
import { ConfirmDialog } from "primereact/confirmdialog";

// Utils
import { estados, propsSelect } from "@utils/converAndConst";
import { formatNotificationDateTime } from "@utils/formatTime";

// Components
import PageHeader from "@components/layout/PageHeader";
import LoadingComponent from "@components/layout/LoadingComponent";
import SkeletonMasterLoader from "@components/generales/SkeletonMasterLoader";
import ContextMenuActions from "@components/data/ContextMenuActions";
import ChipStatusComponent from "@components/fields/ChipStatusComponent";
import { RightToolbar } from "@components/generales";
import EmptyState from "@components/data/EmptyState";
import InfiniteScrollCards from "@components/ui/InfiniteScrollCards";

import VenPerfil from "./components/VenPerfil";

// Services
import { deleteProfileAPI, paginationProfilesAPI } from "@api/requests";

// Lazy
const LazyDataTable = React.lazy(() => import("@components/data/DataTableComponent"));
const DataTableComponentMemo = React.memo(LazyDataTable);
const LazyFilterComponent = React.lazy(() => import("@components/data/FilterOverlay"));
const FilterComponentMemo = React.memo(LazyFilterComponent);
const VenPerfilMemo = React.memo(VenPerfil);

const ACCENT = "#007e79";

/* ================= Filtros ================= */
const generateFiltersConfig = ({ filtros }) => [
  { key: "nombre", type: "input", label: "Nombre", filtro: filtros.nombre },
  {
    key: "estado",
    type: "dropdown",
    props: { ...propsSelect, options: estados },
    label: "Estado",
    showClear: true,
    filtro: filtros.estado,
  },
];

/* ================= Estado pill (mismo look & feel) ================= */
const EstadoPill = ({ id, name }) => {
  const ok = Number(id) === 1 || String(name).toLowerCase() === "activo";
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
      title={name}
    >
      {name ?? "-"}
    </div>
  );
};

/* ================= Toolbar Mobile: solo Filtros ================= */
const MobileToolbar = ({ onOpenFilters }) => (
  <div
    style={{
      display: "flex",
      justifyContent: "flex-end",
      alignItems: "center",
      gap: 8,
      marginBottom: "0.75rem",
      position: "relative",
      zIndex: 1,
    }}
  >
    <Button
      icon="pi pi-sliders-h"
      label="Filtros"
      className="p-button-sm p-button-rounded p-button-text"
      onClick={onOpenFilters}
    />
  </div>
);

/* ================= Columnas Desktop ================= */
const columnsConfig = [
  {
    field: "nombre",
    header: "Nombre",
    style: { flexGrow: 1, flexBasis: "12rem", minWidth: "12rem" },
    mobile: true,
  },
  {
    field: "usuact,fecact",
    header: "Actualizado Por",
    style: { flexGrow: 1, flexBasis: "12rem", minWidth: "12rem" },
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
    body: ({ estid, nomestado }) => <ChipStatusComponent id={estid} nameStatus={nomestado} />,
  },
];

const Perfiles = () => {
  const venPerfil = useRef();
  const overlayFiltersRef = useRef(null);

  const { idusuario, nombreusuario } = useContext(AuthContext);
  const { showSuccess } = useContext(ToastContext);
  const handleApiError = useHandleApiError();
  const { state, setInitialState, deleteItem, addItem, updateItem } = useHandleData();

  const { hasPermission } = usePermissions();
  const canCreate = hasPermission("security", "profiles", "create");
  const canAssignPermission = hasPermission("security", "profiles", "assignPermission");
  const canEdit = hasPermission("security", "profiles", "edit");
  const canDelete = hasPermission("security", "profiles", "delete");

  const [loading, setLoading] = useState({ table: false });
  const [firstLoad, setFirstLoad] = useState(true);

  const { isMobile, isTablet } = useMediaQueryContext();
  const isMobileView = isMobile || isTablet;

  useEffect(() => {
    const timer = setTimeout(() => setFirstLoad(false), 400);
    return () => clearTimeout(timer);
  }, []);

  const initialFilters = useMemo(
    () => ({
      idusuario,
      nombre: "",
      estado: null,
    }),
    [idusuario]
  );

  const sortField = "nombre";

  const { filtros, setFiltros, datos, totalRecords, pagination, setPagination, onCustomPage } =
    usePaginationData(initialFilters, paginationProfilesAPI, setLoading, sortField, () => true);

  useEffect(() => {
    setFiltros((prev) => ({ ...prev, idusuario }));
  }, [idusuario, setFiltros]);

  useEffect(() => {
    setInitialState(datos, totalRecords);
    // eslint-disable-next-line
  }, [datos, totalRecords, setInitialState]);

  const filtersConfig = useMemo(() => generateFiltersConfig({ filtros }), [filtros]);

  const getActiveFiltersCount = (filters) =>
    Object.entries(filters).filter(([key, value]) => {
      if (key === "idusuario" && value) return false;
      return value !== null && value !== undefined && value !== "";
    }).length;

  const activeFiltersCount = useMemo(() => getActiveFiltersCount(filtros), [filtros]);

  const deleteProfile = useCallback(
    async (prfId) => {
      try {
        const params = { prfId, usuario: nombreusuario };
        const { data } = await deleteProfileAPI(params);
        showSuccess(data.message);
        venPerfil.current.onClose();
        deleteItem({ id: prfId, idField: "prfId" });
      } catch (error) {
        handleApiError(error);
      }
    },
    [deleteItem, handleApiError, nombreusuario, showSuccess]
  );

  const [deleteDialogVisible, setDeleteDialogVisible] = useState(false);
  const [currentProfile, setCurrentProfile] = useState(null);

  const renderActions = (item) => {
    const { prfId, nombre } = item;
    const menuItems = [
      {
        label: "Editar",
        icon: "pi pi-pencil",
        command: () => venPerfil.current.editProfile(item, 0),
        disabled: !canEdit || prfId === 3,
        color: "#fda53a",
      },
      {
        label: "Asignar permisos",
        icon: "pi pi-lock",
        command: () => venPerfil.current.editProfile(item, 1),
        disabled: !canAssignPermission || prfId === 3 || prfId === 14,
        color: "#0eb0e9",
      },
      {
        label: "Eliminar",
        icon: "pi pi-trash",
        command: () => {
          setCurrentProfile({ prfId, nombre });
          setDeleteDialogVisible(true);
        },
        disabled: !canDelete || prfId === 3 || prfId === 14,
        color: "#f43f51",
      },
    ];
    return (
      <div onClick={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}>
        <ContextMenuActions menuItems={menuItems} itemId={prfId} />
      </div>
    );
  };

 const showOverlayFilters = (event) => {
  if (overlayFiltersRef.current && typeof overlayFiltersRef.current.toggle === "function") {
    overlayFiltersRef.current.toggle(event);
  }
};
  /* ====== Toolbar Desktop (Filtros + Crear). En mobile solo Filtros arriba ====== */
  const actionsToolbar = useMemo(
    () =>
      !isMobileView ? (
        <>
          <div style={{ position: "relative", display: "inline-block" }}>
            <Button
              icon="pi pi-sliders-h"
              label="Filtros"
              iconPos="left"
              className="p-button-sm p-button-rounded ml-2"
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
          <RightToolbar label="Crear" onClick={() => venPerfil.current.newProfile()} disabled={!canCreate} />
        </>
      ) : null,
    [isMobileView, activeFiltersCount, canCreate]
  );

  const headerTemplate = useMemo(
    () => <div style={{ flexShrink: 0 }}>{actionsToolbar}</div>,
    [actionsToolbar]
  );

  const handleRowSelect = (e) => {
    const target = e.originalEvent?.target;
    // if (!canEdit || e.value?.prfId === 3) return;

    if (
      target?.closest(".p-dropdown") ||
      target?.closest(".p-multiselect") ||
      target?.closest(".p-dropdown-item") ||
      target?.closest(".p-multiselect-item") ||
      target?.closest("input") ||
      target?.closest("button") ||
      target?.closest(".p-checkbox") ||
      target?.closest(".p-radiobutton") ||
      target?.closest(".p-inputtext")
    ) {
      return;
    }

    venPerfil.current.editProfile(e.value);
  };

  /* ==================== TEMPLATES MOBILE ==================== */

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
      {/* <EstadoPill id={item.estid} name={item.nomestado} /> */}
    </div>
  );

  const bodyCardTemplate = (item) => {
    const Item = ({ icon, label, value }) => (
      <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
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
            title={String(value || "-")}
          >
            {value || "—"}
          </div>
        </div>
      </div>
    );

    return (
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6 }}>
        {/* <Item icon="👤" label="Actualizado por" value={item.usuact} /> */}
        {/* <Item icon="🕒" label="Fecha" value={formatNotificationDateTime(item.fecact)} /> */}
        <Item icon="🔐" label="Perfil ID" value={item.prfId} />
        <Item icon="✅" label="Estado" value={item.nomestado} />
      </div>
    );
  };

  const handleCardClick = (payload) => {
    if (!canEdit) return;
    const item = payload?.item ?? payload?.value ?? payload;
    // if (item?.prfId === 3) return;
    venPerfil.current.editProfile(item);
  };

  /* ==================== RENDER ==================== */
  return firstLoad ? (
    <SkeletonMasterLoader />
  ) : (
    <div className="fade-in">
      <ConfirmDialog
        visible={deleteDialogVisible}
        onHide={() => setDeleteDialogVisible(false)}
        message={`¿Realmente desea eliminar el perfil ${currentProfile?.nombre}?`}
        header="Confirmar Eliminación"
        icon="pi pi-exclamation-triangle"
        acceptLabel="Sí"
        accept={() => {
          deleteProfile(currentProfile?.prfId);
          setDeleteDialogVisible(false);
        }}
        reject={() => setDeleteDialogVisible(false)}
        acceptClassName="p-button-danger"
      />

      <PageHeader
        page="Seguridad"
        title="Perfiles"
        description="Configura y gestiona los perfiles del sistema, define permisos y controla los niveles de acceso para garantizar la seguridad."
      />

      <VenPerfilMemo
        ref={venPerfil}
        addItem={addItem}
        updateItem={updateItem}
        setCurrentProfile={setCurrentProfile}
        setDeleteDialogVisible={setDeleteDialogVisible}
        canAssignPermission={canAssignPermission}
        canDelete={canDelete}
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
            {isMobileView ? (
              <>
                <MobileToolbar onOpenFilters={(e) => overlayFiltersRef.current?.toggle?.(e)} />
                {state.datos?.length <= 0 && !loading.table ? (
                  <EmptyState
                    title="No hay perfiles registrados"
                    description="Puedes crear un nuevo perfil para comenzar."
                    buttonLabel="Registrar nuevo perfil"
                    onButtonClick={() => venPerfil.current.newProfile()}
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
            ) : (
              <DataTableComponentMemo
                KeyModule={"module_profiles"}
                dataKey={"prfId"}
                columns={columnsConfig}
                header={headerTemplate}
                datos={state.datos}
                loading={loading.table}
                totalRecords={state.totalRecords}
                pagination={pagination}
                onCustomPage={onCustomPage}
                setPagination={setPagination}
                actionBodyTemplate={renderActions}
                isRowSelectable={true}
                onSelectionChange={handleRowSelect}
                emptyMessage={
                  <EmptyState
                    title="No hay perfiles registrados"
                    description="Puedes crear un nuevo perfil para comenzar."
                    buttonLabel="Registrar nuevo perfil"
                    onButtonClick={() => venPerfil.current.newProfile()}
                    canCreate={canCreate}
                  />
                }
              />
            )}
          </div>
        </div>
      </Suspense>
    </div>
  );
};

export default Perfiles;

