import React, { useState, useEffect, useMemo, useRef } from "react";
import { TabView, TabPanel } from "primereact/tabview";
import {
  getLocalesByBlockAPI,
  createLocalAPI,
  updateLocalAPI,
  deleteLocalAPI,
  getClientsAPI,
  getPropietariosAPI,
  setPropietariosAPI,
} from "../../../api/requests/blocksApi";
import "../../../styles/ProjectDetail.css";
import { InputText } from "primereact/inputtext";
import { Button } from "primereact/button";
import { Dropdown } from "primereact/dropdown";
import { MultiSelect } from "primereact/multiselect";
import { OverlayPanel } from "primereact/overlaypanel"; // ⬅️ NUEVO
import { useMediaQueryContext } from "@context/mediaQuery/mediaQueryContext";
import { Sidebar } from "primereact/sidebar";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { Dialog } from "primereact/dialog";
import '../../../styles/ProjectDetail.css';


const norm = (v) => (v == null ? "" : String(v).trim().toLowerCase());



const scoreLocal = (row, { codigo, nombre }) => {
  // menor = más relevante (0,1,2…)
  let s = 1000;
  const rc = norm(row?.codigo);
  const rn = norm(row?.nombre);
  const fc = norm(codigo);
  const fn = norm(nombre);

  // prioridad por código
  if (fc) {
    if (rc === fc) s = Math.min(s, 0);
    else if (rc.startsWith(fc)) s = Math.min(s, 1);
    else if (rc.includes(fc)) s = Math.min(s, 2);
  }
  // prioridad por nombre
  if (fn) {
    if (rn === fn) s = Math.min(s, 3);
    else if (rn.startsWith(fn)) s = Math.min(s, 4);
    else if (rn.includes(fn)) s = Math.min(s, 5);
  }
  return s;
};

const matchesFocus = (row, { codigo, nombre }) => {
  const rc = norm(row?.codigo);
  const rn = norm(row?.nombre);
  const fc = norm(codigo);
  const fn = norm(nombre);
  // match si coincide código o nombre (contains/startsWith/exact)
  const mCode = fc ? (rc === fc || rc.startsWith(fc) || rc.includes(fc)) : false;
  const mName = fn ? (rn === fn || rn.startsWith(fn) || rn.includes(fn)) : false;
  return mCode || mName;
};


const BlocksDetailTabs = ({
  project,
  usuarioActual,
  projectSidebar = false,
  setProjectSidebar = () => null,
  inlineOnly = false,
  focusLocal = null,
}) => {
  const { isMobile, isTablet } = useMediaQueryContext();

  // Locales
  const [locales, setLocales] = useState([]);
  const [filter, setFilter] = useState("");
  const [newLocal, setNewLocal] = useState(null); // { nombre: "", codigo: ""}
  const [errorLocal, setErrorLocal] = useState({});
  const [loading, setLoading] = useState(false);

  // Clientes (para dropdown)
  const [clients, setClients] = useState([]);
  const [clientsLoading, setClientsLoading] = useState(false);

  // Múltiples propietarios por local (persistidos)
  const [selectedOwners, setSelectedOwners] = useState({});      // { [etaId]: number[] }
  const [selectedPrincipal, setSelectedPrincipal] = useState({}); // { [etaId]: number|null }

  // Borradores (para mostrar botones Guardar/Revertir)
  const [draftOwners, setDraftOwners] = useState({});            // { [etaId]: number[] }
  const [draftPrincipal, setDraftPrincipal] = useState({});      // { [etaId]: number|null }

  const [savingOwner, setSavingOwner] = useState({});     // { [etaId]: true }

  // ===== Editor (Dialog) =====
  const [localEditorOpen, setLocalEditorOpen] = useState(false);
  const [localEditorRow, setLocalEditorRow] = useState(null);
  const [localEditorCodigo, setLocalEditorCodigo] = useState("");
  const [localEditorNombre, setLocalEditorNombre] = useState("");
  const [localEditorOwners, setLocalEditorOwners] = useState(null);
  const [localEditorPrincipal, setLocalEditorPrincipal] = useState(null);
  const [localEditorSaving, setLocalEditorSaving] = useState(false);

  const isCompactInline = inlineOnly && (isMobile || isTablet);
  const isMobileLike = isMobile || isTablet;

  // Refs de OverlayPanel para "principal" (uno por fila)
  const principalOPRefs = useRef({});
  const getOPRef = (etaId) => {
    if (!principalOPRefs.current[etaId]) {
      principalOPRefs.current[etaId] = React.createRef();
    }
    return principalOPRefs.current[etaId];
  };

  const openLocalEditor = (row) => {
    setLocalEditorRow(row);
    setLocalEditorCodigo(row?.codigo ?? "")
    setLocalEditorNombre(row?.nombre ?? "");
    const ownersArr = row?.isNew ? [] : (selectedOwners?.[row.etaId] ?? []);
    const principalId = row?.isNew ? null : (selectedPrincipal?.[row.etaId] ?? null);
    setLocalEditorOwners(ownersArr);
    setLocalEditorPrincipal(principalId);
    setLocalEditorOpen(true);
  };

  const closeLocalEditor = () => {
    setLocalEditorOpen(false);
    setLocalEditorRow(null);
    setLocalEditorCodigo("")
    setLocalEditorNombre("");
    setLocalEditorOwners(null);
    setLocalEditorPrincipal(null);
  };

  const handleEditLocalCodigo = (id, value) => {
    setLocales((prev) => prev.map((e) => (e.etaId === id ? { ...e, codigo: value } : e)));
  };

  const handleBlurLocalCodigo = async (id, value) => {
    const v = (value ?? "").trim(); // código puede ser opcional
    try {
      await updateLocalAPI(id, {
        codigo: v || null, // manda null si queda vacío
        usuarioActualiza: usuarioActual,
      });
      setErrorLocal((prev) => { const c = { ...prev }; delete c[`cod-${id}`]; return c; });
    } catch (err) {
      setErrorLocal((prev) => ({
        ...prev,
        [`cod-${id}`]: err?.response?.data?.message || "Error al actualizar código",
      }));
    }
  };

  const persistOwners = async (etaId) => {
    const ids = draftOwners[etaId] ?? [];
    const principalId = draftPrincipal[etaId] ?? null;

    setSavingOwner(p => ({ ...p, [etaId]: true }));
    try {
      await setPropietariosAPI(etaId, {
        propietariosIds: ids,
        usuario: usuarioActual,
        principalUsuId: principalId,
      });
      // Actualiza el “persistido”
      setSelectedOwners(p => ({ ...p, [etaId]: ids }));
      setSelectedPrincipal(p => ({ ...p, [etaId]: principalId }));

      // (Opcional) puedes reflejarlo también en locales si lo usas en otro lado
      setLocales(prev => prev.map(l =>
        l.etaId === etaId
          ? { ...l, propietariosIds: ids, principalUsuId: principalId }
          : l
      ));
    } finally {
      setSavingOwner(p => {
        const c = { ...p };
        delete c[etaId];
        return c;
      });
    }
  };

  // Cargar locales al cambiar de bloque
  // useEffect(() => {
  //   const fetch = async () => {
  //     if (!project?.proId) { setLocales([]); return; }
  //     setLoading(true);
  //     try {
  //       const r = await getLocalesByBlockAPI(project.proId);
  //       setLocales(r.data || []);
  //     } catch {
  //       setLocales([]);
  //     } finally {
  //       setLoading(false);
  //     }
  //   };
  //   fetch();
  // }, [project]);

  // Cargar locales + owners + principal en una sola petición
  useEffect(() => {
    let cancelled = false;

    const fetch = async () => {
      if (!project?.proId) {
        setLocales([]);
        setSelectedOwners({}); setDraftOwners({});
        setSelectedPrincipal({}); setDraftPrincipal({});
        return;
      }
      setLoading(true);
      try {
        const r = await getLocalesByBlockAPI(project.proId);
        const rows = r.data || [];

        // Normaliza por si algún local viene sin arrays
        const accOwners = {};
        const accPrincipal = {};

        for (const it of rows) {
          const ids = Array.isArray(it.propietariosIds)
            ? it.propietariosIds
            : (typeof it.propietariosCsv === 'string'
              ? it.propietariosCsv.split(',').map(n => Number(n)).filter(Boolean)
              : []);
          const principal = (it.principalUsuId != null) ? Number(it.principalUsuId) : null;

          accOwners[it.etaId] = ids;
          accPrincipal[it.etaId] = principal;
        }

        if (!cancelled) {
          setLocales(rows);
          setSelectedOwners(accOwners);
          setDraftOwners(accOwners);
          setSelectedPrincipal(accPrincipal);
          setDraftPrincipal(accPrincipal);
        }
      } catch {
        if (!cancelled) {
          setLocales([]);
          setSelectedOwners({}); setDraftOwners({});
          setSelectedPrincipal({}); setDraftPrincipal({});
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetch();
    return () => { cancelled = true; };
  }, [project]);


  // Cargar clientes una vez
  useEffect(() => {
    const fetchClients = async () => {
      setClientsLoading(true);
      try {
        const r = await getClientsAPI({ limit: 500 });
        setClients(r?.data || []);
      } catch {
        setClients([]);
      } finally {
        setClientsLoading(false);
      }
    };
    fetchClients();
  }, []);


  //   useEffect(() => {
  //   let cancelled = false;

  //   const loadOwners = async () => {
  //     const results = await Promise.all(
  //       (locales || []).map(async (loc) => {
  //         try {
  //           const r = await getPropietariosAPI(loc.etaId);
  //           const rows = r?.data || [];
  //           const ids = rows.map(x => x.id).filter(Boolean);
  //           const principal = rows.find(x => x.principal === 1 || x.isPrincipal === 1)?.id ?? null;
  //           return { etaId: loc.etaId, ids, principal };
  //         } catch {
  //           return { etaId: loc.etaId, ids: [], principal: null };
  //         }
  //       })
  //     );

  //     if (!cancelled) {
  //       const accOwners = {};
  //       const accPrincipal = {};
  //       for (const { etaId, ids, principal } of results) {
  //         accOwners[etaId] = ids;
  //         accPrincipal[etaId] = principal;
  //       }
  //       setSelectedOwners(accOwners);
  //       setDraftOwners(accOwners);
  //       setSelectedPrincipal(accPrincipal);
  //       setDraftPrincipal(accPrincipal);
  //     }
  //   };

  //   if (locales?.length) loadOwners();
  //   else {
  //     setSelectedOwners({});
  //     setDraftOwners({});
  //     setSelectedPrincipal({});
  //     setDraftPrincipal({});
  //   }
  //   return () => { cancelled = true; };
  // }, [locales]);


  // Opciones clientes para Dropdown/MultiSelect
  // const clientOptions = useMemo(() => {
  //   return (clients || []).map((c) => ({
  //     label: c.nombre ?? c.usu_nombre ?? `${c.nombres ?? ""} ${c.apellidos ?? ""}`.trim(),
  //     value: c.id ?? c.usu_id ?? c.usuId,
  //   }));
  // }, [clients]);
  const clientOptions = useMemo(() => (clients || []).map(c => ({
    label: c.nombre ?? c.usu_nombre ?? `${c.nombres ?? ""} ${c.apellidos ?? ""}`.trim(),
    value: c.id ?? c.usu_id ?? c.usuId,
  })), [clients]);

  const labelById = useMemo(() => {
    const m = new Map();
    for (const o of clientOptions) m.set(o.value, o.label);
    return m;
  }, [clientOptions]);


  // Filtrado de locales
  // const localesFiltrados = useMemo(() => {
  //   const f = (filter ?? "").trim().toLowerCase();
  //   if (!f) return locales;
  //   return (locales || []).filter((e) => (e?.nombre ?? "").toLowerCase().includes(f));
  // }, [filter, locales]);

  // Filtrado de locales
  const localesFiltrados = useMemo(() => {
    const text = norm(filter);
    const hasText = !!text;
    const hasFocus = !!(focusLocal?.codigo || focusLocal?.nombre);

    let base = locales || [];

    // 1) si viene focusLocal desde arriba → filtra por ese criterio
    if (hasFocus) {
      base = base.filter((row) => matchesFocus(row, focusLocal));
    }

    // 2) si además el usuario escribió en el buscador interno, apílalo
    if (hasText) {
      base = base.filter((e) =>
        norm(e?.nombre).includes(text) || norm(e?.codigo).includes(text)
      );
    }

    // 3) si hay focusLocal → ordena por relevancia (exact > startsWith > contains)
    if (hasFocus) {
      base = [...base].sort((a, b) => {
        const sa = scoreLocal(a, focusLocal);
        const sb = scoreLocal(b, focusLocal);
        if (sa !== sb) return sa - sb;
        // desempate por nombre
        return norm(a?.nombre).localeCompare(norm(b?.nombre));
      });
    } else {
      // comportamiento anterior: solo orden natural por nombre
      base = [...base];
    }

    return base;
  }, [locales, filter, focusLocal]);


  // Helpers de validación / edición
  const isNombreUnico = (nombre, id) =>
    !locales.some(
      (e) =>
        (e?.nombre ?? "").trim().toLowerCase() === (nombre ?? "").trim().toLowerCase() &&
        e.etaId !== id
    );

  const handleEditLocalNombre = (id, value) => {
    setLocales((prev) => prev.map((e) => (e.etaId === id ? { ...e, nombre: value } : e)));
  };

  const handleBlurLocalNombre = async (id, value) => {
    const v = (value ?? "").trim();
    let msg = "";
    if (!v) msg = "El nombre no puede estar vacío";
    else if (!isNombreUnico(v, id)) msg = "El nombre ya existe";
    setErrorLocal((prev) => ({ ...prev, [id]: msg }));
    if (msg) return;

    const localRow = locales.find((e) => e.etaId === id);
    try {
      await updateLocalAPI(id, {
        nombre: v,
        descripcion: localRow?.descripcion ?? null,
        estado: localRow?.estado ?? "activo",
        usuarioActualiza: usuarioActual,
      });
      setErrorLocal((prev) => { const c = { ...prev }; delete c[id]; return c; });
    } catch (err) {
      setErrorLocal((prev) => ({
        ...prev,
        [id]: err?.response?.data?.message || "Error al actualizar",
      }));
    }
  };

  // (compatibilidad; ya no se usa directamente)
  const handleChangeOwners = async (etaId, newIds = []) => {
    setSavingOwner((p) => ({ ...p, [etaId]: true }));
    try {
      await setPropietariosAPI(etaId, {
        propietariosIds: newIds,
        usuario: usuarioActual,
      });
      setSelectedOwners((p) => ({ ...p, [etaId]: newIds }));
      setDraftOwners((p) => ({ ...p, [etaId]: newIds }));
      setErrorLocal((prev) => { const c = { ...prev }; delete c[etaId]; return c; });
    } catch (err) {
      setErrorLocal((prev) => ({
        ...prev,
        [etaId]: err?.response?.data?.message || "Error al guardar propietarios",
      }));
    } finally {
      setSavingOwner((p) => { const c = { ...p }; delete c[etaId]; return c; });
    }
  };

  const handleDeleteLocal = async (id) => {
    try {
      await deleteLocalAPI(id, { usuarioActualiza: usuarioActual });
      setLocales((prev) => prev.filter((e) => e.etaId !== id));
    } catch {
      // noop
    }
  };

  // Crear nuevo
  const handleAddLocal = () => {
    if (isCompactInline) {
      openLocalEditor({ etaId: "__new__", isNew: true, nombre: "", proId: project.proId });
      return;
    }
    if (!newLocal) setNewLocal({ nombre: "", codigo: "" });
  };

  const handleSaveNewLocal = async () => {
    let msg = "";
    const c = (newLocal?.codigo ?? "").trim();
    const v = (newLocal?.nombre ?? "").trim();
    if (!v) msg = "El nombre no puede estar vacío";
    else if (!isNombreUnico(v)) msg = "El nombre ya existe";

    if (msg) {
      setErrorLocal(prev => ({ ...prev, new: msg }));
      return;
    }

    try {
      const resp = await createLocalAPI({
        codigo: c || null,
        nombre: v,
        descripcion: null,
        estado: "activo",
        proId: project.proId,
        usuarioRegistro: usuarioActual,
      });

      const locId = resp?.data?.locId;

      // Inyecta el local arriba sin volver a pedir todo
      setLocales(prev => [
        {
          etaId: locId,
          codigo: c || null,
          nombre: v,
          descripcion: null,
          estado: "activo",
          proId: project.proId,
          propietariosIds: [],
          principalUsuId: null,
        },
        ...prev,
      ]);

      // Inicializa mapas
      setSelectedOwners(p => ({ ...p, [locId]: [] }));
      setSelectedPrincipal(p => ({ ...p, [locId]: null }));
      setDraftOwners(p => ({ ...p, [locId]: [] }));
      setDraftPrincipal(p => ({ ...p, [locId]: null }));

      setNewLocal(null);
      setErrorLocal(prev => {
        const cpy = { ...prev };
        delete cpy.new;
        return cpy;
      });
    } catch (err) {
      setErrorLocal(prev => ({
        ...prev,
        new: err?.response?.data?.message || "Error al crear",
      }));
    }
  };


  const handleCancelNewLocal = () => {
    setNewLocal(null);
    setErrorLocal((prev) => { const c = { ...prev }; delete c.new; return c; });
  };

  // Guardar desde Dialog
  // const handleSaveFromEditor = async () => {
  //   const v = (localEditorNombre ?? "").trim();
  //   const c = (localEditorCodigo ?? "").trim();
  //   if (!v) return;
  //   if (!localEditorRow?.etaId || localEditorRow?.isNew) {
  //     if (!isNombreUnico(v)) return;
  //   } else {
  //     if (!isNombreUnico(v, localEditorRow.etaId)) return;
  //   }

  //   setLocalEditorSaving(true);
  //   try {
  //     if (localEditorRow?.isNew) {
  //       const resp = await createLocalAPI({
  //         codigo: c || null,
  //         nombre: v,
  //         descripcion: null,
  //         estado: "activo",
  //         proId: project.proId,
  //         usuarioRegistro: usuarioActual,
  //       });
  //       const locId = resp?.data?.locId;
  //       if (locId && (localEditorOwners?.length ?? 0) > 0) {
  //         await setPropietariosAPI(locId, {
  //           propietariosIds: localEditorOwners,
  //           usuario: usuarioActual,
  //           principalUsuId: localEditorPrincipal ?? null,
  //         });
  //       }
  //     } else {
  //       await updateLocalAPI(localEditorRow.etaId, {
  //         codigo: c || null,
  //         nombre: v,
  //         descripcion: localEditorRow?.descripcion ?? null,
  //         estado: localEditorRow?.estado ?? "activo",
  //         usuarioActualiza: usuarioActual,
  //       });
  //       await setPropietariosAPI(localEditorRow.etaId, {
  //         propietariosIds: localEditorOwners || [],
  //         usuario: usuarioActual,
  //         principalUsuId: localEditorPrincipal ?? null,
  //       });
  //       setSelectedOwners((p) => ({
  //         ...p,
  //         [localEditorRow.etaId]: localEditorOwners || [],
  //       }));
  //       setDraftOwners((p) => ({
  //         ...p,
  //         [localEditorRow.etaId]: localEditorOwners || [],
  //       }));
  //       setSelectedPrincipal((p) => ({
  //         ...p,
  //         [localEditorRow.etaId]: localEditorPrincipal ?? null,
  //       }));
  //       setDraftPrincipal((p) => ({
  //         ...p,
  //         [localEditorRow.etaId]: localEditorPrincipal ?? null,
  //       }));
  //     }

  //     const r = await getLocalesByBlockAPI(project.proId);
  //     setLocales(r.data || []);
  //     closeLocalEditor();
  //   } catch {
  //     setLocalEditorSaving(false);
  //     return;
  //   }
  //   setLocalEditorSaving(false);
  // };

  const handleSaveFromEditor = async () => {
    const v = (localEditorNombre ?? "").trim();
    const c = (localEditorCodigo ?? "").trim();
    if (!v) return;

    // Validaciones de unicidad
    if (!localEditorRow?.etaId || localEditorRow?.isNew) {
      if (!isNombreUnico(v)) return;
    } else {
      if (!isNombreUnico(v, localEditorRow.etaId)) return;
    }

    setLocalEditorSaving(true);
    try {
      if (localEditorRow?.isNew) {
        // CREATE
        const resp = await createLocalAPI({
          codigo: c || null,
          nombre: v,
          descripcion: null,
          estado: "activo",
          proId: project.proId,
          usuarioRegistro: usuarioActual,
        });
        const locId = resp?.data?.locId;

        // inyectar local
        setLocales(prev => [
          {
            etaId: locId,
            codigo: c || null,
            nombre: v,
            descripcion: null,
            estado: "activo",
            proId: project.proId,
            propietariosIds: localEditorOwners || [],
            principalUsuId: localEditorPrincipal ?? null,
          },
          ...prev,
        ]);

        // inicializar mapas
        setSelectedOwners(p => ({ ...p, [locId]: localEditorOwners || [] }));
        setDraftOwners(p => ({ ...p, [locId]: localEditorOwners || [] }));
        setSelectedPrincipal(p => ({ ...p, [locId]: localEditorPrincipal ?? null }));
        setDraftPrincipal(p => ({ ...p, [locId]: localEditorPrincipal ?? null }));

        // si hay propietarios, persiste relación
        if ((localEditorOwners?.length ?? 0) > 0) {
          await persistOwners(locId, localEditorOwners || [], localEditorPrincipal ?? null);
        }
      } else {
        // UPDATE
        const etaId = localEditorRow.etaId;

        // 1) actualiza datos básicos del local
        await updateLocalAPI(etaId, {
          codigo: c || null,
          nombre: v,
          descripcion: localEditorRow?.descripcion ?? null,
          estado: localEditorRow?.estado ?? "activo",
          usuarioActualiza: usuarioActual,
        });

        // 2) refleja cambios en memoria (nombre/codigo)
        setLocales(prev =>
          prev.map(l =>
            l.etaId === etaId
              ? {
                ...l,
                codigo: c || null,
                nombre: v,
              }
              : l
          )
        );

        // 3) persiste owners/principal y actualiza memoria
        await persistOwners(etaId, localEditorOwners || [], localEditorPrincipal ?? null);

        // 4) sincroniza drafts/selected
        setSelectedOwners(p => ({ ...p, [etaId]: localEditorOwners || [] }));
        setSelectedPrincipal(p => ({ ...p, [etaId]: localEditorPrincipal ?? null }));
        setDraftOwners(p => ({ ...p, [etaId]: localEditorOwners || [] }));
        setDraftPrincipal(p => ({ ...p, [etaId]: localEditorPrincipal ?? null }));
      }

      closeLocalEditor();
    } catch (e) {
      // puedes mostrar toast aquí si quieres
      setLocalEditorSaving(false);
      return;
    }
    setLocalEditorSaving(false);
  };


  // Cambios en fila
  const hasDraftChanges = (etaId) => {
    const a = selectedOwners[etaId] ?? [];
    const b = draftOwners[etaId] ?? [];
    const pa = selectedPrincipal[etaId] ?? null;
    const pb = draftPrincipal[etaId] ?? null;
    const sameLen = a.length === b.length;
    const sameItemsSameOrder = sameLen && a.every((v, i) => v === b[i]);
    return !(sameItemsSameOrder && pa === pb);
  };

  {/* ========= props comunes para no duplicar ========= */ }
  const commonProps = {
    className: "p-datatable-sm compactTable",
    size: "small",
    value: isCompactInline
      ? localesFiltrados
      : (newLocal
        ? [{ etaId: "__new__", isNew: true, nombre: newLocal?.nombre ?? "", codigo: newLocal?.codigo ?? "" }, ...localesFiltrados]
        : localesFiltrados),
    loading,
    responsiveLayout: "scroll",
    tableStyle: { tableLayout: "fixed", width: "100%" },
    emptyMessage: "Sin locales",
    onRowClick: (e) => {
      if (isCompactInline && e?.data && !e.data.isNew) openLocalEditor(e.data);
    },
  };


  // === Subtabla
  const SubTable = (
    <div className="project-detail-tabs">
      <div className="flex justify-content-between align-items-center mb-2">
        <Button
          icon="pi pi-plus"
          label="Agregar local"
          className="p-button-success p-button-rounded"
          onClick={handleAddLocal}
          disabled={!!newLocal && !isCompactInline}
        />
        <span className="p-input-icon-left">
          {/* filtro opcional */}
          {/* <Button
          icon="pi pi-plus"
          label="Agregar local"
          className="p-button-success p-button-rounded"
          onClick={handleAddLocal}
          disabled={!!newLocal && !isCompactInline}
        /> */}
        </span>
      </div>


      {/* =========================
      MOBILE / TABLET
    ========================= */}
      {isMobileLike ? (
        <DataTable {...commonProps} key="mobile">
          {/* ===== Local (código + nombre en grid) ===== */}
          <Column
            header="Local"
            body={(row) => {
              if (isCompactInline) {
                return (
                  <div className="flex align-items-center gap-2">
                    <span className="text-900 truncate" title={row.nombre}>
                      {row.nombre ?? "—"}
                    </span>
                  </div>
                );
              }

              if (row.isNew) {
                return (
                  <div style={{ display: "grid", gridTemplateColumns: "120px 1fr", gap: 8, width: "100%", maxWidth: 440 }}>
                    <InputText
                      value={newLocal?.codigo ?? ""}
                      onChange={(e) => setNewLocal((p) => ({ ...(p || {}), codigo: e.target.value }))}
                      placeholder="Código"
                    />
                    <InputText
                      autoFocus
                      value={newLocal?.nombre ?? ""}
                      onChange={(e) => setNewLocal((p) => ({ ...(p || {}), nombre: e.target.value }))}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleSaveNewLocal();
                        if (e.key === "Escape") handleCancelNewLocal();
                      }}
                      className={errorLocal.new ? "p-invalid" : ""}
                      placeholder="Nombre del local"
                      style={{ width: "100%", minWidth: 0 }}
                    />
                  </div>
                );
              }

              return (
                <>
                  <div style={{ display: "grid", gridTemplateColumns: "120px 1fr", gap: 8, width: "100%", maxWidth: 440 }}>
                    <InputText
                      value={row.codigo ?? ""}
                      onChange={(e) => handleEditLocalCodigo(row.etaId, e.target.value)}
                      onBlur={(e) => handleBlurLocalCodigo(row.etaId, e.target.value)}
                      className={errorLocal[`cod-${row.etaId}`] ? "p-invalid" : ""}
                      placeholder="Código"
                    />
                    <InputText
                      value={row.nombre ?? ""}
                      onChange={(e) => handleEditLocalNombre(row.etaId, e.target.value)}
                      onBlur={(e) => handleBlurLocalNombre(row.etaId, e.target.value)}
                      className={errorLocal[row.etaId] ? "p-invalid" : ""}
                      placeholder="Nombre del local"
                      style={{ width: "100%", minWidth: 0 }}
                    />
                  </div>
                  {errorLocal[row.etaId] && (
                    <small className="p-error mt-1 block">{errorLocal[row.etaId]}</small>
                  )}
                </>
              );
            }}
            headerStyle={{ width: "45%" }}
            bodyStyle={{ width: "45%" }}
          />

          {/* ===== Propietarios - Arrendatarios ===== */}
          <Column
            header="Propietarios - Arrendatarios"
            body={(row) => {
              if (isCompactInline) {
                const ownersIds = selectedOwners?.[row.etaId] ?? [];
                const labels = (ownersIds || [])
                  .map((id, idx) => {
                    const name = labelById.get(id);
                    return name ? `${idx + 1}. ${name}` : null;
                  })
                  .filter(Boolean)
                  .join(", ");
                return <span className="text-700">{labels || "—"}</span>;
              }

              if (row.isNew) {
                return <small className="text-600">Asigna propietarios después de crear</small>;
              }

              const draftList = draftOwners[row.etaId] ?? [];
              const draftMain = draftPrincipal[row.etaId] ?? null;
              const opRef = getOPRef(row.etaId);

              return (
                <div style={{ maxWidth: 360, width: "100%" }}>
                  <MultiSelect
                    value={draftList}
                    options={clientOptions}
                    onChange={(e) => {
                      const arr = e.value || [];
                      setDraftOwners((p) => ({ ...p, [row.etaId]: arr }));
                      const currPrincipal = draftPrincipal[row.etaId] ?? null;
                      if (currPrincipal != null && !arr.includes(currPrincipal)) {
                        setDraftPrincipal((p) => ({ ...p, [row.etaId]: null }));
                      }
                    }}
                    placeholder="Propietarios"
                    display="chip"
                    filter
                    disabled={clientsLoading}
                    loading={clientsLoading || !!savingOwner[row.etaId]}
                    appendTo={typeof window !== "undefined" ? document.body : null}
                    panelStyle={{ maxWidth: "min(92vw, 560px)" }}
                  />

                  {(draftList || []).length > 0 && !isCompactInline && (
                    <div className="mt-2">
                      {(() => {
                        const hasMain = !!draftMain;
                        const mainName = labelById.get(draftMain) ?? "—";
                        const labelText = hasMain ? `Principal: ${mainName}` : "propietario principal";
                        return (
                          <Button
                            type="button"
                            label={labelText}
                            icon={hasMain ? "pi pi-star-fill" : "pi pi-user"}
                            iconPos="left"
                            className={`p-button-sm p-button-text text-left p-2 border-1 surface-border ${hasMain ? "surface-100 text-green-700 border-green-300" : "surface-0 text-700 border-300"}`}
                            style={{ borderRadius: "6px", height: "36px", justifyContent: "flex-start", fontWeight: 500, display: "inline-flex" }}
                            onClick={(e) => { if (opRef.current) opRef.current.toggle(e); }}
                          />
                        );
                      })()}

                      <OverlayPanel ref={opRef} dismissable showCloseIcon>
                        <div style={{ minWidth: 260 }}>
                          <small className="text-600 block mb-2">Selecciona el propietario principal</small>
                          {(draftList || []).map((uid, idx) => {
                            const label = clientOptions.find(o => o.value === uid)?.label ?? `ID ${uid}`;
                            return (
                              <label key={uid} className="flex align-items-center gap-2 mb-1">
                                <input
                                  type="radio"
                                  name={`principal-${row.etaId}`}
                                  checked={draftMain === uid}
                                  onChange={() => setDraftPrincipal((p) => ({ ...p, [row.etaId]: uid }))}
                                />
                                <span>{`${idx + 1}. ${label}`}</span>
                              </label>
                            );
                          })}
                          <label className="flex align-items-center gap-2 mt-1">
                            <input
                              type="radio"
                              name={`principal-${row.etaId}`}
                              checked={draftMain == null}
                              onChange={() => setDraftPrincipal((p) => ({ ...p, [row.etaId]: null }))}
                            />
                            <span>Sin principal</span>
                          </label>
                        </div>
                      </OverlayPanel>
                    </div>
                  )}
                </div>
              );
            }}
            headerStyle={{ width: "40%" }}
            bodyStyle={{ width: "40%" }}
          />

          {/* ===== Acciones ===== */}
          <Column
            header="Acciones"
            body={(row) => {
              if (isCompactInline) {
                return (
                  <div className="flex gap-2 justify-content-end">
                    <Button
                      icon="pi pi-pencil"
                      className="p-button-rounded p-button-text"
                      onClick={(ev) => { ev.stopPropagation(); openLocalEditor(row); }}
                      tooltip="Editar"
                    />
                    <Button
                      icon="pi pi-trash"
                      className="p-button-rounded p-button-text p-button-danger"
                      onClick={(ev) => { ev.stopPropagation(); handleDeleteLocal(row.etaId); }}
                      tooltip="Eliminar"
                    />
                  </div>
                );
              }

              if (row.isNew) {
                return (
                  <div className="flex gap-2 justify-content-end">
                    <Button icon="pi pi-check" className="p-button-rounded p-button-success p-button-sm" onClick={handleSaveNewLocal} tooltip="Guardar" />
                    <Button icon="pi pi-times" className="p-button-rounded p-button-secondary p-button-sm" onClick={handleCancelNewLocal} tooltip="Cancelar" />
                  </div>
                );
              }

              const dirty = hasDraftChanges(row.etaId);
              return (
                <div className="flex gap-2 justify-content-end">
                  {dirty && (
                    <>
                      <Button
                        icon="pi pi-check"
                        className="p-button-rounded p-button-success p-button-sm"
                        onClick={async () => {
                          await persistOwners(row.etaId);
                        }}
                        tooltip="Guardar propietarios"
                      />
                      <Button
                        icon="pi pi-refresh"
                        className="p-button-rounded p-button-secondary p-button-sm"
                        onClick={() => {
                          setDraftOwners((p) => ({ ...p, [row.etaId]: selectedOwners[row.etaId] ?? [] }));
                          setDraftPrincipal((p) => ({ ...p, [row.etaId]: selectedPrincipal[row.etaId] ?? null }));
                        }}
                        tooltip="Revertir cambios"
                      />
                    </>
                  )}
                  <Button
                    icon="pi pi-trash"
                    className="p-button-rounded p-button-text p-button-danger"
                    onClick={() => handleDeleteLocal(row.etaId)}
                    tooltip="Eliminar"
                  />
                </div>
              );
            }}
            headerStyle={{ width: "15%" }}
            bodyStyle={{ width: "15%" }}
          />
        </DataTable>
      ) : (
        /* =========================
              DESKTOP / WIDE
           ========================= */
        <DataTable {...commonProps} key="desktop"
          scrollable
          scrollHeight="56vh"
        >
          {/* CÓDIGO */}
          <Column
            header="Código"
            body={(row) => {
              if (row.isNew) {
                return (
                  <div className="cell-codigo">
                    <InputText
                      value={newLocal?.codigo ?? ""}
                      onChange={(e) => setNewLocal((p) => ({ ...(p || {}), codigo: e.target.value }))}
                      placeholder="Código"
                    />
                  </div>
                );
              }
              return (
                <div className="cell-codigo">
                  <InputText
                    value={row.codigo ?? ""}
                    onChange={(e) => handleEditLocalCodigo(row.etaId, e.target.value)}
                    onBlur={(e) => handleBlurLocalCodigo(row.etaId, e.target.value)}
                    className={errorLocal[`cod-${row.etaId}`] ? "p-invalid" : ""}
                    placeholder="Código"
                  />
                  {errorLocal[`cod-${row.etaId}`] && (
                    <small className="p-error block mt-1">{errorLocal[`cod-${row.etaId}`]}</small>
                  )}
                </div>
              );
            }}
            headerStyle={{ width: "12%" }}
            bodyStyle={{ width: "12%" }}
          />

          {/* NOMBRE */}
          <Column
            header="Nombre"
            body={(row) => {
              if (row.isNew) {
                return (
                  <div className="cell-nombre">
                    <InputText
                      autoFocus
                      value={newLocal?.nombre ?? ""}
                      onChange={(e) => setNewLocal((p) => ({ ...(p || {}), nombre: e.target.value }))}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleSaveNewLocal();
                        if (e.key === "Escape") handleCancelNewLocal();
                      }}
                      className={errorLocal.new ? "p-invalid" : ""}
                      placeholder="Nombre del local"
                    />
                    {errorLocal.new && <small className="p-error block mt-1">{errorLocal.new}</small>}
                  </div>
                );
              }
              return (
                <div className="cell-nombre">
                  <InputText
                    value={row.nombre ?? ""}
                    onChange={(e) => handleEditLocalNombre(row.etaId, e.target.value)}
                    onBlur={(e) => handleBlurLocalNombre(row.etaId, e.target.value)}
                    className={errorLocal[row.etaId] ? "p-invalid" : ""}
                    placeholder="Nombre del local"
                  />
                  {errorLocal[row.etaId] && <small className="p-error block mt-1">{errorLocal[row.etaId]}</small>}
                </div>
              );
            }}
            headerStyle={{ width: "22%" }}
            bodyStyle={{ width: "22%" }}
          />

          {/* PROPIETARIOS (compacto: 1 + +n) */}
          <Column
            header="Propietarios"
            body={(row) => {
              if (row.isNew) return <small className="text-600">Después de crear</small>;

              const draftList = draftOwners[row.etaId] ?? [];
              const valueTemplate = (selected) => {
                if (!selected || selected.length === 0) return "Propietarios";
                const first = selected[0];
                const firstLabel = first?.label ?? clientOptions.find(o => o.value === first?.value)?.label;
                const extra = selected.length > 1 ? ` (+${selected.length - 1})` : "";
                return `${firstLabel || "Propietarios"}${extra}`;
              };

              return (
                <div className="ms-one" style={{ maxWidth: 260 }}>
                  <MultiSelect
                    value={draftList}
                    options={clientOptions}
                    onChange={(e) => {
                      const arr = e.value || [];
                      setDraftOwners((p) => ({ ...p, [row.etaId]: arr }));
                      const currPrincipal = draftPrincipal[row.etaId] ?? null;
                      if (currPrincipal != null && !arr.includes(currPrincipal)) {
                        setDraftPrincipal((p) => ({ ...p, [row.etaId]: null }));
                      }
                    }}
                    placeholder="Propietarios"
                    filter
                    display="chip"
                    maxSelectedLabels={1}
                    selectedItemsLabel=""
                    valueTemplate={valueTemplate}
                    disabled={clientsLoading}
                    loading={clientsLoading || !!savingOwner[row.etaId]}
                    appendTo={typeof window !== "undefined" ? document.body : null}
                    panelStyle={{ maxWidth: "min(92vw, 560px)" }}
                  />
                </div>
              );
            }}
            headerStyle={{ width: "28%" }}
            bodyStyle={{ width: "28%" }}
          />

          {/* PRINCIPAL (overlay button) */}
          <Column
            header="Principal"
            body={(row) => {
              if (row.isNew) return <span className="text-500">—</span>;

              const draftList = draftOwners[row.etaId] ?? [];
              const draftMain = draftPrincipal[row.etaId] ?? null;
              const opRef = getOPRef(row.etaId);
              const hasMain = !!draftMain;
              const mainName = clientOptions.find(o => o.value === draftMain)?.label ?? "—";
              const labelText = hasMain ? `Principal: ${mainName}` : "Seleccionar";

              return (
                <div>
                  <Button
                    type="button"
                    label={labelText}
                    icon={hasMain ? "pi pi-star-fill" : "pi pi-user"}
                    iconPos="left"
                    className={`p-button-sm p-button-text text-left p-2 border-1 surface-border ${hasMain ? "surface-100 text-green-700 border-green-300" : "surface-0 text-700 border-300"}`}
                    style={{ borderRadius: 6, height: 32, justifyContent: "flex-start", fontWeight: 500, display: "inline-flex", maxWidth: 260, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                    onClick={(e) => { if (opRef.current) opRef.current.toggle(e); }}
                  />
                  <OverlayPanel ref={opRef} dismissable showCloseIcon>
                    <div style={{ minWidth: 260 }}>
                      <small className="text-600 block mb-2">Selecciona el propietario principal</small>
                      {(draftList || []).map((uid, idx) => {
                        const label = clientOptions.find(o => o.value === uid)?.label ?? `ID ${uid}`;
                        return (
                          <label key={uid} className="flex align-items-center gap-2 mb-1">
                            <input
                              type="radio"
                              name={`principal-${row.etaId}`}
                              checked={draftMain === uid}
                              onChange={() => setDraftPrincipal((p) => ({ ...p, [row.etaId]: uid }))}
                            />
                            <span>{`${idx + 1}. ${label}`}</span>
                          </label>
                        );
                      })}
                      <label className="flex align-items-center gap-2 mt-1">
                        <input
                          type="radio"
                          name={`principal-${row.etaId}`}
                          checked={draftMain == null}
                          onChange={() => setDraftPrincipal((p) => ({ ...p, [row.etaId]: null }))}
                        />
                        <span>Sin principal</span>
                      </label>
                    </div>
                  </OverlayPanel>
                </div>
              );
            }}
            headerStyle={{ width: "16%" }}
            bodyStyle={{ width: "16%" }}
          />

          {/* ACCIONES (derecha) */}
          <Column
            header="Acciones"
            body={(row) => {
              if (row.isNew) {
                return (
                  <div className="actions-cell">
                    <Button icon="pi pi-check" className="p-button-rounded p-button-success p-button-sm" onClick={handleSaveNewLocal} tooltip="Guardar" />
                    <Button icon="pi pi-times" className="p-button-rounded p-button-secondary p-button-sm" onClick={handleCancelNewLocal} tooltip="Cancelar" />
                  </div>
                );
              }
              const dirty = hasDraftChanges(row.etaId);
              return (
                <div className="actions-cell">
                  {dirty && (
                    <>
                      <Button
                        icon="pi pi-check"
                        className="p-button-rounded p-button-success p-button-sm"
                        onClick={async () => {
                          const ids = draftOwners[row.etaId] ?? [];
                          const principalId = draftPrincipal[row.etaId] ?? null;
                          setSavingOwner((p) => ({ ...p, [row.etaId]: true }));
                          try {
                            await setPropietariosAPI(row.etaId, {
                              propietariosIds: ids,
                              usuario: usuarioActual,
                              principalUsuId: principalId,
                            });
                            setSelectedOwners((p) => ({ ...p, [row.etaId]: ids }));
                            setSelectedPrincipal((p) => ({ ...p, [row.etaId]: principalId }));
                          } finally {
                            setSavingOwner((p) => { const c = { ...p }; delete c[row.etaId]; return c; });
                          }
                        }}
                        tooltip="Guardar propietarios"
                      />
                      <Button
                        icon="pi pi-refresh"
                        className="p-button-rounded p-button-secondary p-button-sm"
                        onClick={() => {
                          setDraftOwners((p) => ({ ...p, [row.etaId]: selectedOwners[row.etaId] ?? [] }));
                          setDraftPrincipal((p) => ({ ...p, [row.etaId]: selectedPrincipal[row.etaId] ?? null }));
                        }}
                        tooltip="Revertir cambios"
                      />
                    </>
                  )}
                  <Button
                    icon="pi pi-trash"
                    className="p-button-rounded p-button-text p-button-danger"
                    onClick={() => handleDeleteLocal(row.etaId)}
                    tooltip="Eliminar"
                  />
                </div>
              );
            }}
            headerStyle={{ width: "22%", textAlign: "right" }}
            bodyStyle={{ width: "22%", textAlign: "right" }}
          />
        </DataTable>
      )}
      {/* ===== Dialog de edición/creación ===== */}
      < Dialog
        header={localEditorRow?.isNew ? "Nuevo local" : "Editar local"}
        visible={localEditorOpen}
        style={{ width: isMobile ? "95vw" : "520px" }}
        modal
        onHide={closeLocalEditor}
        draggable={false}
      >
        <div className="p-fluid grid">
          <div className="col-12 md:col-4">
            <label className="block mb-1">Código</label>
            <InputText
              value={localEditorCodigo}
              onChange={(e) => setLocalEditorCodigo(e.target.value)}
              placeholder="Código"
            />
          </div>

          <div className="col-12">
            <label className="block mb-1">Nombre del local</label>
            <InputText
              value={localEditorNombre}
              onChange={(e) => setLocalEditorNombre(e.target.value)}
              placeholder="Nombre"
            />
          </div>

          <div className="col-12">
            <label className="block mb-1">Propietarios (opcional)</label>
            <MultiSelect
              value={localEditorOwners || []}
              options={clientOptions}
              onChange={(e) => {
                const arr = e.value || [];
                setLocalEditorOwners(arr);
                if (localEditorPrincipal != null && !arr.includes(localEditorPrincipal)) {
                  setLocalEditorPrincipal(null);
                }
              }}
              placeholder="Propietarios"
              display="chip"
              filter
              disabled={clientsLoading}
              loading={clientsLoading}
              appendTo={typeof window !== "undefined" ? document.body : null}
            />
          </div>

          {(localEditorOwners || []).length > 0 && (
            <div className="col-12">
              <small className="text-600 block mb-1">Propietario principal</small>
              {(localEditorOwners || []).map((uid, idx) => {
                const label = clientOptions.find(o => o.value === uid)?.label ?? `ID ${uid}`;
                return (
                  <div key={uid} className="flex align-items-center gap-2 mb-1">
                    <input
                      type="radio"
                      name="principal-dialog"
                      checked={localEditorPrincipal === uid}
                      onChange={() => setLocalEditorPrincipal(uid)}
                    />
                    <span>{`${idx + 1}. ${label}`}</span>
                  </div>
                );
              })}
              <div className="flex align-items-center gap-2 mt-1">
                <input
                  type="radio"
                  name="principal-dialog"
                  checked={localEditorPrincipal == null}
                  onChange={() => setLocalEditorPrincipal(null)}
                />
                <span>Sin principal</span>
              </div>
            </div>
          )}

          <div className="col-12 flex justify-content-end gap-2 mt-2">
            <Button
              label="Cancelar"
              className="p-button-text"
              onClick={closeLocalEditor}
              disabled={localEditorSaving}
            />
            <Button
              label={localEditorRow?.isNew ? "Crear" : "Guardar"}
              icon="pi pi-save"
              onClick={handleSaveFromEditor}
              loading={localEditorSaving}
              disabled={!localEditorNombre?.trim()}
            />
          </div>
        </div>
      </Dialog >
    </div >
  );

  // ===== RETURN con modos =====
  if (inlineOnly) {
    return SubTable;
  }

  const content = (
    <div className="project-detail-tabs">
      <TabView>
        <TabPanel header="Locales">{SubTable}</TabPanel>
      </TabView>
    </div>
  );

  if (isMobile || isTablet) {
    return (
      <Sidebar
        visible={projectSidebar}
        onHide={() => setProjectSidebar(false)}
        position="right"
        style={{ width: isMobile ? "100%" : 500 }}
        className="p-sidebar-sm"
      >
        {content}
      </Sidebar>
    );
  }

  return content;
};

export default BlocksDetailTabs;
