import React, {
    forwardRef,
    useImperativeHandle,
    useState,
    useContext,
    useEffect,
    useRef,
    useMemo,
} from "react";

import { Dialog } from "primereact/dialog";
import { Button } from "primereact/button";
import { FormProvider, useForm } from "react-hook-form";
import { InputTextarea } from "primereact/inputtextarea";
import { Dropdown } from "primereact/dropdown";
import { FiMessageSquare } from "react-icons/fi";
import { ConfirmDialog } from "primereact/confirmdialog";

import { AuthContext } from "@context/auth/AuthContext";
import { ToastContext } from "@context/toast/ToastContext";
import useHandleApiError from "@hook/useHandleApiError";
import { useMediaQueryContext } from "@context/mediaQuery/mediaQueryContext";

import GenericFormSection from "@components/data/GenericFormSection";
import { ticketsForm } from "../../configForms";
// import '../styles/Tickets.css';
import UploadNativo from "@components/generales/uploadNativo";
import { Accordion, AccordionTab } from "primereact/accordion";
import { ProgressBar } from "primereact/progressbar";
import { VerFileSharePoint } from "@components/generales/verFileSharepoint";
import { ticketPreviewURL } from "@utils/converAndConst";
import {VerFileBuffer} from "@components/generales/VerFileBuffer";
// import { tituloCambioEstado, iconoCambioEstado, acceptClassCambioEstado, textoMotivo, placeholderMotivo } from "@utils/helpers/ConfirmdialogsUtils";

import {
    saveTicketAPI,
    getTicketByIdAPI,
    updateTicketEstadoAPI,
    getPrioridadesTicketsAPI,
    getEstadosTicketsAPI,
    getHistorialByTicketAPI,
    uploadTicketEvidenceAPI,
    deleteTicketEvidenceAPI,
    downloadTicketEvidenceAPI,
    getPreviewForm,
} from "@api/requests/ticketsApi";

import { getClientsApi, getProfilesAPI } from "@api/requests";
import { getBlocksByClientAPI, getLocalesAPI, getPropietariosAPI } from "@api/requests/blocksApi";
import { getAllAreasAPI, getAreasManagersByIdAPI } from "@api/requests/areasApi";
import { getUbicacionesAPI } from "@api/requests/locationApi";
import { TabPanel, TabView } from "primereact/tabview";
import usePermissions from "@context/permissions/usePermissions";
import VenUsuario from "@pages/security/components/VenUsuario";
import { useSocket } from "@context/socket/SocketContext";

const defaultValues = {
    clienteId: null,
    descripcion: "",
    localId: null,
    bloqueId: null,
    prioridadId: 2,
    areaId: null,
    asignado: null,
    estadoId: 1,
    localizacionId: null,
};

const ESTADOS = {
    ABIERTO: 1,
    EN_PROCESO: 2,
    // EN_ESPERA: 3,
    CERRADO: 4,
    REABIERTO: 5,
    ANULADO: 6,
};

const getIconByAccion = (accion) => {
    if (accion) return;
    switch (accion?.toLowerCase()) {
        case "registro":
            return "pi pi-plus-circle";
        case "reasignación":
            return "pi pi-user-edit";
        case "cambio de estado":
            return "pi pi-refresh";
        case "cambio de prioridad":
            return "pi pi-flag";
        case "cambio de área":
            return "pi pi-sitemap";
        default:
            return "pi pi-info-circle";
    }
};

const getEstadosPermitidos = (estadoActual) => {
    switch (estadoActual) {
        case ESTADOS.ABIERTO:
            return [ESTADOS.EN_PROCESO];
        // return [ESTADOS.EN_ESPERA, ESTADOS.CERRADO, ESTADOS.ANULADO];
        // case ESTADOS.EN_PROCESO:
        case ESTADOS.EN_PROCESO:
            return [ESTADOS.CERRADO, ESTADOS.ANULADO];
        case ESTADOS.CERRADO:
        case ESTADOS.ANULADO:
            return [ESTADOS.REABIERTO];
        case ESTADOS.REABIERTO:
            return [ESTADOS.EN_PROCESO, ESTADOS.ANULADO];
        default:
            return [];
    }
};

const motivosLabels = {
    [ESTADOS.EN_PROCESO]: "Indica por qué el ticket debe pasar a 'En Proceso':",
    // [ESTADOS.EN_ESPERA]: "Describe por qué el ticket debe quedar en 'Espera':",
    [ESTADOS.CERRADO]: "Explica por qué estás cerrando este ticket:",
    [ESTADOS.ANULADO]: "Justifica por qué estás anulando el ticket:",
    [ESTADOS.REABIERTO]: "¿Por qué estás reabriendo este ticket?",
};




const VenTickets = forwardRef(({ addItem, updateItem }, ref) => {
    // const venUsuarioRef = useRef();
    const [mode, setMode] = useState("new"); // "new" | "view" | "edit"
    const readOnly = mode === "view";
    const venUsuarioRef = useRef(null);
    const [showClientePanel, setShowClientePanel] = useState(false);
    const [listperfiles, setListperfiles] = useState([]);

    const getLists = async () => {
        try {
            const { data } = await getProfilesAPI();
            setListperfiles(data);
        } catch (error) {
            handleApiError(error);
        }
    };

    useEffect(() => {
        getLists();
        // eslint-disable-next-line
    }, []);

    const { hasPermission } = usePermissions();
    const canVoid = hasPermission("home", "tickets", "void");
    const canReopen = hasPermission("home", "tickets", "reopen");
    const canVoidAll = hasPermission("home", "tickets", "voidAll");
    const canReopenAll = hasPermission("home", "tickets", "reopenAll");
    const canAutoAssign = hasPermission("home", "tickets", "autoAssign");
    const canEdit = hasPermission("home", "tickets", "edit");

    const [historial, setHistorial] = useState([]);
    const [cargandoHistorial, setCargandoHistorial] = useState(false);

    const { idusuario, nombreusuario } = useContext(AuthContext);
    const { showSuccess, showError } = useContext(ToastContext);
    const { isMobile, isTablet } = useMediaQueryContext();
    const handleApiError = useHandleApiError();

    const [clientes, setClientes] = useState([]);
    const [ownersByLocal, setOwnersByLocal] = useState({});
    const [prioridades, setPrioridades] = useState([]);
    const [estados, setEstados] = useState([]);
    const [bloques, setBloques] = useState([]);
    const [locales, setLocales] = useState([]);
    const [areas, setAreas] = useState([]);
    const [encargados, setEncargados] = useState([]);

    const [visible, setVisible] = useState(false);
    const [tktId, setTktId] = useState(null);
    const [originalData, setOriginalData] = useState(null);
    const [loading, setLoading] = useState(false);

    const [estadoDialogVisible, setEstadoDialogVisible] = useState(false);
    const [nuevoEstado, setNuevoEstado] = useState(null);
    const [comentario, setComentario] = useState("");

    const methods = useForm({ defaultValues });
    const { handleSubmit, reset, setValue, getValues, watch } = methods;

    const clienteId = watch("clienteId");
    const bloqueId = watch("bloqueId");
    const areaId = watch("areaId");
    const localId = methods.watch("localId");
    const localizacionId = methods.watch("localizacionId");

    const isEditing = !!tktId;
    const isDesktop = !isMobile && !isTablet;

    //EVIDENCIAS
    const [initialFileList, setInitialFileList] = useState([]); // tipo=1
    const [processFileList, setProcessFileList] = useState([]); // tipo=2  👈 NUEVO
    const [finalFileList, setFinalFileList] = useState([]); // tipo=3 (antes 2)
    const [isUpload, setIsUpload] = useState(false);
    const [uploadPct, setUploadPct] = useState(0);
    const [showFilePreview, setShowFilePreview] = useState(false);
    const [filePreviewId, setFilePreviewId] = useState(null);

    const [initialUploadPct, setInitialUploadPct] = useState(0);
    const [processUploadPct, setProcessUploadPct] = useState(0);
    const [finalUploadPct, setFinalUploadPct] = useState(0);

    const [isInitialUpload, setIsInitialUpload] = useState(false);
    const [isProcessUpload, setIsProcessUpload] = useState(false);
    const [isFinalUpload, setIsFinalUpload] = useState(false);

    //PDF
    const [showReportPreview, setShowReportPreview] = useState(false);
    const [reportPreviewUrl, setReportPreviewUrl] = useState(null);

    //localizacion
    const [locations, setLocations] = useState([]);

    //ESTADOS
    const [confirmDialogVisible, setConfirmDialogVisible] = useState(false);
    const [descripcionCambio, setDescripcionCambio] = useState("");
    const [estadoSeleccionado, setEstadoSeleccionado] = useState(null);
    const [showConfirmDialog, setShowConfirmDialog] = useState(false);



    // const mapEvidenceRowToFile = (row) => ({
    //     uid: row.evidenciaId?.toString(),
    //     name: row.nombre,
    //     status: "done",
    //     url: row.urllocal, // 👈 ruta real para mostrar imagen
    //     thumbUrl: row.urllocal, // 👈 usada por <Image> en UploadNativo
    //     mimetype: row.mimetype,
    //     type: row.mimetype,
    //     size: row.size,
    //     evidenciaId: row.evidenciaId,
    //     ticketId: row.ticketId,
    //     tipo: row.tipo,
    //     fileId: row.fileId,        // 👈 IMPORTANTE
    //     urlpublica: row.urlpublica
    // });

    // const mapEvidenceRowToFile = (row) => {
    //     // const thumbFromFileId = row.fileId
    //     //     ? `${ticketPreviewURL}${encodeURIComponent(row.fileId)}?size=small&inline=1`
    //     //     : null;

    //     const thumbFromFileId = row.fileId
    //         ? `${ticketPreviewURL}${encodeURIComponent(row.fileId)}?size=medium&inline=1`
    //         : null;

    //     const urlBase = row.urllocal || row.urlpublica || thumbFromFileId;

    //     return {
    //         uid: row.evidenciaId?.toString(),
    //         name: row.nombre,
    //         status: "done",
    //         url: urlBase,             // sirve de fallback para descargar/preview de Image
    //         thumbUrl: thumbFromFileId // 👈 aquí está la magia para el cuadrito
    //             || row.urllocal
    //             || row.urlpublica,
    //         mimetype: row.mimetype,
    //         type: row.mimetype,
    //         size: row.size,
    //         evidenciaId: row.evidenciaId,
    //         ticketId: row.ticketId,
    //         tipo: row.tipo,
    //         fileId: row.fileId,
    //         urlpublica: row.urlpublica,
    //     };
    // };

    const mapEvidenceRowToFile = (row) => {
        const mime = (row.mimetype || "").toLowerCase();
        const nombre = (row.nombre || "").toLowerCase();

        const isImage = mime.startsWith("image/");
        const isPdf = mime === "application/pdf" || nombre.endsWith(".pdf");

        // Solo generamos thumbnail por fileId si ES imagen
        const thumbFromFileId =
            isImage && row.fileId
                ? `${ticketPreviewURL}${encodeURIComponent(row.fileId)}?size=medium&inline=1`
                : null;

        // URL real del archivo (pdf, imagen, etc.)
        const urlReal = row.urllocal || row.urlpublica || null;

        return {
            uid: row.evidenciaId?.toString(),
            name: row.nombre,
            status: "done",

            // 👉 Para PDFs u otros, NUNCA usamos /api/tickets/thumb como url principal
            //    Solo si no hay nada más, usamos el thumb como fallback extremo.
            url: urlReal || thumbFromFileId,

            // 👉 Para imágenes, thumbFromFileId va primero como thumbnail.
            //    Para PDFs, thumb será la URL real (si hay), así el viewer apunta al PDF.
            thumbUrl: thumbFromFileId || urlReal,

            mimetype: row.mimetype,
            type: row.mimetype,
            size: row.size,
            evidenciaId: row.evidenciaId,
            ticketId: row.ticketId,
            tipo: row.tipo,
            fileId: row.fileId,
            urlpublica: row.urlpublica,
        };
    };

    const cargarEvidenciasTicket = async (ticketId) => {
        try {
            const { data } = await getTicketByIdAPI(ticketId);

            // Aquí asignas los campos normales del ticket (ya existentes)
            // setValue("clienteId", data.clienteId);
            // setValue("descripcion", data.descripcion);
            // ... demás campos que ya tengas

            // 👇 Nueva lógica: cargar evidencias desde la misma respuesta
            if (Array.isArray(data.evidencias)) {
                const ini = data.evidencias.filter((e) => Number(e.tipo) === 1).map(mapEvidenceRowToFile);
                const pro = data.evidencias.filter((e) => Number(e.tipo) === 2).map(mapEvidenceRowToFile);
                const fin = data.evidencias.filter((e) => Number(e.tipo) === 3).map(mapEvidenceRowToFile);

                setInitialFileList(ini);
                setProcessFileList(pro);
                setFinalFileList(fin);
            } else {
                // si el back las devuelve separadas (evidenciasIniciales y evidenciasFinales)
                const ini = (data.evidenciasIniciales || []).map(mapEvidenceRowToFile);
                const pro = (data.evidenciasProceso || []).map(mapEvidenceRowToFile);
                const fin = (data.evidenciasFinales || []).map(mapEvidenceRowToFile);

                setInitialFileList(ini);
                setProcessFileList(pro);
                setFinalFileList(fin);
            }
        } catch (e) {
            handleApiError(e);
            setInitialFileList([]);
            setProcessFileList([]);
            setFinalFileList([]);
        }
    };

    useEffect(() => {
        if (visible) {
            Promise.all([
                getClientsApi(),
                getPrioridadesTicketsAPI(),
                getEstadosTicketsAPI(),
                getAllAreasAPI(),
                getUbicacionesAPI(),
            ])
                .then(([cli, pri, est, ars, locs]) => {
                    setClientes(cli.data || []);
                    setPrioridades(pri.data || []);
                    setEstados(est.data || []);
                    setAreas(ars.data || []);

                    const mappedLocs = (locs.data || []).map((r) => ({
                        uid: r.uid ?? `${r.tipo === "LOCAL" ? "LOC" : "LCA"}-${r.id}`,
                        id: Number(r.id),
                        tipo: r.tipo, // "LOCAL" o "LOCALIZACION"
                        nombre: r.nombre,
                        codigo: r.codigo ?? "",
                        aplicaBloque: !!r.aplicaBloque,
                        aplicaLocal: !!r.aplicaLocal,
                        aplicaPropietario: !!r.aplicaPropietario,
                        bloId: r.bloId ? Number(r.bloId) : null,
                        bloId: r.bloId ? Number(r.bloId) : null,
                        bloqueNombre: r.bloqueNombre ?? null,
                        lcaAreaId: r.lcaAreaId ? Number(r.lcaAreaId) : null,
                    }));
                    setLocations(mappedLocs);

                    // si solo hay 1 área y es ticket nuevo, autoselecciona
                    if (!tktId && ars.data?.length === 1) setValue("areaId", ars.data[0].id);
                })
                .catch(handleApiError);
        }
    }, [visible]);

    const socket = useSocket();
    useEffect(() => {
        const handler = (payload) => {
            if (!visible) return;
            if (!payload?.ok) return;
            if (Number(payload.tktId) !== Number(tktId)) return;

            console.log("[VenTickets] Evidencias procesadas para ticket:", payload.tktId);
            cargarEvidenciasTicket(payload.tktId);
        };

        socket.on("tickets_evidencias_procesadas", handler);

        return () => {
            socket.off("tickets_evidencias_procesadas", handler);
        };
    }, [visible, tktId]); // 👈 depende del ticket actual y si el modal está abierto

    const allBlocksFromLocales = useMemo(() => {
        const map = new Map();

        (locales || []).forEach((l) => {
            if (!l.bloId) return;
            if (!map.has(l.bloId)) {
                map.set(l.bloId, {
                    id: l.bloId,
                    nombre: l.bloqueNombre || `Bloque ${l.bloId}`,
                });
            }
        });

        return Array.from(map.values());
    }, [locales]);

    useEffect(() => {
        if (!visible || !clienteId) return;
        let cancelled = false;

        setBloques([]);

        setEncargados([]);

        getBlocksByClientAPI(clienteId)
            .then(({ data }) => {
                if (cancelled) return;
                const mapped = (data || []).map((r) => ({ id: r.proId, nombre: r.nombre }));
                setBloques(mapped);
                if (!tktId && mapped.length === 1) setValue("bloqueId", mapped[0].id);
            })
            .catch(handleApiError);

        return () => {
            cancelled = true;
        };
    }, [visible, clienteId]);

    // useEffect(() => {
    //     console.log("", bloques);
    // }, [bloques]);

    useEffect(() => {
        if (!visible) return;
        if (!localizacionId) {
            // Si quitaron la localización manualmente, ahí sí limpiamos todo
            setValue("bloqueId", null);
            setValue("localId", null);
            return;
        }

        const sel = locations.find((l) => l.uid === localizacionId);
        if (!sel) return;

        const { aplicaBloque, aplicaLocal, tipo, bloId, lcaAreaId, bloqueNombre, tieneBloquePorDefecto } = sel;

        // 🔹 Si la ubicación es un LOCAL, amarramos el localId al id real
        if (tipo === "LOCAL") {
            setValue("localId", sel.id);
        } else {
            // Si es una LOCALIZACION “general”, el localId no aplica
            setValue("localId", null);
        }

        // // 🔹 Bloque: si no aplica, lo limpiamos; si aplica y viene en el registro, lo seteamos
        // if (!aplicaBloque) {
        //     setValue("bloqueId", null);
        // } else if (bloId) {
        //     setValue("bloqueId", bloId);
        // }

        // BLOQUE
        if (!aplicaBloque) {
            setValue("bloqueId", null);
        } else if (bloId) {
            // Asegurar que el bloque por defecto exista en la lista visible
            setBloques((prev) => {
                const exists = prev.some((b) => Number(b.id) === Number(bloId));
                return exists ? prev : [...prev, { id: bloId, nombre: bloqueNombre || `Bloque ${bloId}` }];
            });
            setValue("bloqueId", bloId); // fija el bloque por defecto (p.ej. 31)
        } else {
            setValue("bloqueId", null);
        }

        // 🔹 Si no aplicaLocal, nos aseguramos de que localId quede en null
        if (!aplicaLocal) {
            setValue("localId", null);
        }

        // 🔹 Área por defecto (MANTENIMIENTO u otra)
        if (lcaAreaId) {
            const currentAreaId = getValues("areaId");

            // 👉 comportamiento recomendado:
            // - si el ticket es nuevo (no tktId) o no hay área seleccionada aún, pon el default
            if (!tktId || !currentAreaId) {
                setValue("areaId", lcaAreaId);
            }
            // si quieres forzarlo SIEMPRE, podrías simplemente:
            // setValue("areaId", areaDefaultId);
        }
    }, [localizacionId, locations, visible, setValue]);

    // useEffect(() => {
    //     if (!visible || !bloqueId) return;
    //     let cancelled = false;

    //     setLocales([]);
    //     setEncargados([]);

    //     // locales del bloque filtrados opcionalmente por cliente
    //     getLocalesByBlockAndClientAPI({ bloId: bloqueId, clientId: clienteId })
    //         .then(({ data }) => {
    //             if (cancelled) return;
    //             const mapped = (data || []).map(r => ({ id: r.etaId, nombre: r.nombre }));
    //             setLocales(mapped);
    //             if (!tktId && mapped.length === 1) setValue("localId", mapped[0].id);
    //         })
    //         .catch(handleApiError);

    //     return () => { cancelled = true; };
    // }, [visible, bloqueId, clienteId]);

    const handleChangeEstado = (nuevoEstadoId) => {
        setEstadoSeleccionado(nuevoEstadoId);
        setConfirmDialogVisible(true);
    };

    const handleConfirmChange = () => {
        if (!comentario.trim()) return;
        setNuevoEstado(estadoSeleccionado);
        setComentario("");
        setConfirmDialogVisible(false);
        setEstadoDialogVisible(true); // 👈 mantiene tu flujo actual de guardado
    };

    // const handleConfirmChangeEstado = async () => {
    //     try {
    //         setLoading(true);

    //         if (!tktId) {
    //             showError("No se puede cambiar el estado: el ticket aún no ha sido creado.");
    //             return;
    //         }

    //         if (!nuevoEstado) {
    //             showError("No se ha definido el nuevo estado.");
    //             return;
    //         }

    //         // Validación de comentario obligatoria (igual que en handleSave)
    //         if (nuevoEstado !== ESTADOS.ABIERTO && !comentario.trim()) {
    //             showError("Debes escribir un comentario para cambiar el estado.");
    //             return;
    //         }

    //         // === Validaciones de permisos ===
    //         const esAnulado = nuevoEstado === ESTADOS.ANULADO;
    //         const esReabierto = nuevoEstado === ESTADOS.REABIERTO;
    //         const esAsignadoActual = originalData?.asignado === idusuario;

    //         if (esAnulado && !canVoidAll && (!canVoid || !esAsignadoActual)) {
    //             showError("No tienes permiso para anular este ticket.");
    //             return;
    //         }

    //         if (esReabierto && !canReopenAll && (!canReopen || !esAsignadoActual)) {
    //             showError("No tienes permiso para reabrir este ticket.");
    //             return;
    //         }

    //         // === Llamar API para actualizar estado ===
    //         await updateTicketEstadoAPI({
    //             tktId,
    //             nuevoEstado,
    //             usuarioId: idusuario,
    //             comentario: comentario.trim(),
    //         });

    //         showSuccess("Estado actualizado correctamente.");
    //         setComentario("");

    //         // === Actualizar estado localmente ===
    //         setValue("estadoId", nuevoEstado);

    //         const estadoMeta = estados.find((e) => Number(e.id) === nuevoEstado) || {};
    //         const resolvedEstadoNombre = estadoMeta.nombre || null;
    //         const resolvedEstadoColor = estadoMeta.color || "secondary";

    //         // Actualiza la fila en la tabla (optimista)
    //         updateItem({
    //             idField: "tktId",
    //             tktId,
    //             estadoId: nuevoEstado,
    //             estadoNombre: resolvedEstadoNombre,
    //             estadoColor: resolvedEstadoColor,
    //             usuact: nombreusuario,
    //             fecact: new Date().toISOString(),
    //         });

    //         closeForm();
    //     } catch (error) {
    //         console.error("Error al cambiar el estado:", error);
    //         handleApiError(error);
    //     } finally {
    //         setLoading(false);
    //         setConfirmDialogVisible(false);
    //     }
    // };

    const handleConfirmChangeEstado = async () => {
        try {
            setLoading(true);

            if (!tktId) {
                showError("No se puede cambiar el estado: el ticket aún no ha sido creado.");
                return;
            }
            if (!nuevoEstado) {
                showError("No se ha definido el nuevo estado.");
                return;
            }
            if (nuevoEstado !== ESTADOS.ABIERTO && !comentario.trim()) {
                showError("Debes escribir un comentario para cambiar el estado.");
                return;
            }

            // === Validaciones de permisos (igual que ya tenías) ===
            const esAnulado = nuevoEstado === ESTADOS.ANULADO;
            const esReabierto = nuevoEstado === ESTADOS.REABIERTO;
            const esAsignadoActual = originalData?.asignado === idusuario;

            if (esAnulado && !canVoidAll && (!canVoid || !esAsignadoActual)) {
                showError("No tienes permiso para anular este ticket.");
                return;
            }
            if (esReabierto && !canReopenAll && (!canReopen || !esAsignadoActual)) {
                showError("No tienes permiso para reabrir este ticket.");
                return;
            }

            // === NUEVO: si es CERRAR y el usuario adjuntó evidencias en el dialog, súbelas primero ===
            if (nuevoEstado === ESTADOS.CERRADO && closeDialogFiles.length > 0) {
                if (!tktId) {
                    showError("Debes guardar el ticket antes de adjuntar evidencias finales.");
                    return;
                }

                const filesToSend = closeDialogFiles.filter((f) => f._localFile).map((f) => f._localFile);
                if (filesToSend.length > 0) {
                    setCloseDialogUploading(true);
                    setCloseDialogPct(0);

                    const fd = new FormData();
                    filesToSend.forEach((f) => fd.append("files[]", f));
                    fd.append("tipo", "3");

                    await uploadTicketEvidenceAPI(tktId, fd, (e) => {
                        if (e?.total) setCloseDialogPct(Math.round((e.loaded * 100) / e.total));
                    });

                    // Reflejo inmediato en la UI (opcional)
                    setFinalFileList((prev) => [
                        ...prev,
                        ...closeDialogFiles.map((f) => ({
                            ...f,
                            _pendingUpload: true, // el worker completará y el socket refrescará
                        })),
                    ]);

                    // Limpia selección del dialog
                    setCloseDialogFiles([]);
                    setCloseDialogUploading(false);
                    setCloseDialogPct(0);
                }
            }

            // === Ahora sí: cambiar estado en backend ===
            await updateTicketEstadoAPI({
                tktId,
                nuevoEstado,
                usuarioId: idusuario,
                comentario: comentario.trim(),
            });

            showSuccess("Estado actualizado correctamente.");
            setComentario("");

            // === Actualizar form/tabla como ya hacías ===
            setValue("estadoId", nuevoEstado);
            const estadoMeta = estados.find((e) => Number(e.id) === nuevoEstado) || {};
            const resolvedEstadoNombre = estadoMeta.nombre || null;
            const resolvedEstadoColor = estadoMeta.color || "secondary";

            updateItem({
                idField: "tktId",
                tktId,
                estadoId: nuevoEstado,
                estadoNombre: resolvedEstadoNombre,
                estadoColor: resolvedEstadoColor,
                usuact: nombreusuario,
                fecact: new Date().toISOString(),
            });

            closeForm();
        } catch (error) {
            console.error("Error al cambiar el estado:", error);
            handleApiError(error);
        } finally {
            setLoading(false);
            setConfirmDialogVisible(false);
        }
    };


    useEffect(() => {
        if (!visible) return;
        let cancelled = false;

        getLocalesAPI()
            .then(({ data }) => {
                if (cancelled) return;
                const mapped = (data || []).map((r) => ({
                    id: Number(r.etaId),
                    codigo: r.codigo ?? "",
                    nombre: r.nombre ?? "",
                    bloId: Number(r.bloId),
                    bloqueNombre: r.bloqueNombre ?? null,
                    propietarioId: r.ownerUsuId ?? null,
                    propietarioNombre: r.propietarioNombre ?? null,
                }));
                setLocales(mapped);
            })
            .catch(handleApiError);

        return () => {
            cancelled = true;
        };
    }, [visible]);

    const warnedNoOwnerRef = useRef(new Set()); // para no repetir alerta por localId

    useEffect(() => {
        if (!localId) {
            // Si no hay local, NO tocamos el bloque.
            // Si quieres, aquí podrías solo limpiar cliente:
            // setValue("clienteId", null);
            return;
        }

        const sel = locales.find((l) => l.id === Number(localId));
        if (!sel) return;

        // Setear bloque (readonly en UI)
        setValue("bloqueId", sel.bloId ?? null);

        // Asegurar opción visible en dropdown de bloques
        setBloques((prev) => {
            const exists = prev.some((b) => Number(b.id) === Number(sel.bloId));
            return exists
                ? prev
                : [...prev, { id: sel.bloId, nombre: sel.bloqueNombre || `Bloque ${sel.bloId}` }];
        });

        const applyOwners = (rows) => {
            const owners = (rows || []).map((o) => ({
                id: Number(o.usu_id ?? o.id ?? o.usuId),
                nombre:
                    o.nombre ?? o.usu_nombre ?? `${o.nombres ?? ""} ${o.apellidos ?? ""}`.trim(),
                documento: o.documento ?? o.usu_documento ?? "",
                telefono: o.telefono ?? o.usu_telefono ?? "",
                correo: o.correo ?? o.usu_correo ?? "",
                principal: !!(o.lcl_principal ?? o.principal),
            }));

            setClientes(owners);

            const esNuevo = mode === "new" || !tktId;
            const clienteActual = methods.getValues("clienteId");
            const principal = owners.find((o) => o.principal);

            if (esNuevo || !clienteActual) {
                if (principal) {
                    setValue("clienteId", principal.id);
                } else if (owners[0]) {
                    // 👈 fallback: primer propietario de la lista (ya viene ordenada desde back)
                    setValue("clienteId", owners[0].id);
                } else if (sel.propietarioId) {
                    // (opcional) fallback si el listado vino vacío pero getAllLocales tenía owner
                    setValue("clienteId", Number(sel.propietarioId));
                } else {
                    // sin propietarios — aquí sí informamos
                    setValue("clienteId", null);
                    if (!warnedNoOwnerRef.current.has(localId)) {
                        warnedNoOwnerRef.current.add(localId);
                        showError("Este local no tiene copropietarios registrados.");
                    }
                }
            } else {
                // clienteActual existe pero podría no estar en owners
                const stillExists = owners.some((o) => o.id === Number(clienteActual));
                if (!stillExists) {
                    if (principal) setValue("clienteId", principal.id);
                    else if (owners[0]) setValue("clienteId", owners[0].id);
                    else setValue("clienteId", null);
                }
            }
        };

        // 1) Usa cache si existe y corta
        const cached = ownersByLocal[localId];
        if (cached !== undefined) {
            applyOwners(cached);
            return;
        }

        // 2) Si no hay cache, pide a la API y guarda
        getPropietariosAPI(localId)
            .then(({ data }) => {
                const rows = data || [];
                setOwnersByLocal((prev) => ({ ...prev, [localId]: rows }));
                applyOwners(rows);
            })
            .catch((err) => {
                handleApiError(err);
                setClientes([]);
                setValue("clienteId", null);
            });

        // ⚠️ Dependencias mínimas: evita ownersByLocal, setBloques, setValue
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [localId, locales, mode, tktId]);

    useEffect(() => {
        if (!visible || !areaId) return;
        let cancelled = false;

        setEncargados([]);
        // setValue("asignado", null);

        getAreasManagersByIdAPI([Number(areaId)])
            .then(({ data }) => {
                if (cancelled) return;

                // Soportar múltiples formatos de respuesta
                let rawList = [];

                if (Array.isArray(data)) {
                    // Caso 1: array de filas (tu caso actual)
                    // [{ idRelacion, areaId, encargadoId, encargadoNombre }, ...]
                    if (data.length && (data[0]?.encargadoId || data[0]?.encargadoNombre)) {
                        rawList = data.map((x) => ({
                            id: Number(x.encargadoId),
                            nombre: x.encargadoNombre,
                            correo: null,
                        }));
                    } else {
                        // Caso 2: array de objetos usuario/encargado
                        rawList = data.map((u) => ({
                            id: Number(u.id ?? u.usu_id),
                            nombre: u.nombre ?? u.usu_nombre,
                            correo: u.correo ?? u.usu_correo ?? null,
                        }));
                    }
                } else if (data) {
                    // Caso 3: objeto indexado por areaId o con "encargados"
                    const list = data[areaId] || data[String(areaId)] || data.encargados || [];
                    rawList = (list || []).map((u) => ({
                        id: Number(u.id ?? u.usu_id ?? u.encargadoId),
                        nombre: u.nombre ?? u.usu_nombre ?? u.encargadoNombre,
                        correo: u.correo ?? u.usu_correo ?? null,
                    }));
                }

                // Dedupe por id por si vinieran repetidos
                const dedup = Array.from(new Map(rawList.map((u) => [u.id, u])).values());

                setEncargados(dedup);

                // Autoselección si hay uno solo y es ticket nuevo
                if (!tktId && dedup.length === 1) {
                    setValue("asignado", dedup[0].id);
                }

                // Si el asignado actual ya no pertenece al área, lo limpiamos
                const asignadoActual = getValues("asignado");
                if (asignadoActual && !dedup.some((u) => u.id === Number(asignadoActual))) {
                    setValue("asignado", null);
                }
            })
            .catch(handleApiError);

        return () => {
            cancelled = true;
        };
    }, [visible, areaId, tktId, setValue, getValues, handleApiError]);

    const buildLocalizacionUidFromTicket = (data) => {
        // Si el ticket tiene local clásico
        if (data.localId ?? data.unidadId) {
            return `LOC-${Number(data.localId ?? data.unidadId)}`;
        }

        // Si tiene localización genérica
        if (data.localizacionId ?? data.lcaId) {
            return `LCA-${Number(data.localizacionId ?? data.lcaId)}`;
        }

        // Nada seleccionado
        return null;
    };

    useImperativeHandle(ref, () => ({
        newTicket: () => {
            reset(defaultValues);
            setTktId(null);
            setOriginalData(null);
            setMode("new");
            setVisible(true);
            setHistorial([]);
            setCargandoHistorial(false);
            setComentario("");
            setNuevoEstado(null);
            setInitialFileList([]);
            setProcessFileList([]);
            setFinalFileList([]);
            setIsUpload(false);
            setUploadPct(0);
        },
        viewTicket: async ({ tktId }) => {
            try {
                setHistorial([]);
                setCargandoHistorial(true);
                const { data } = await getTicketByIdAPI(tktId);
                setOriginalData(data);
                setTktId(tktId);
                // setValues:
                setValue("clienteId", Number(data.clienteId));
                setValue("bloqueId", Number(data.bloqueId ?? data.projectId));
                const resolvedLocalId = data.localId ?? data.unidadId;
                setValue("localId", resolvedLocalId != null ? Number(resolvedLocalId) : null);
                const localizacionUid = buildLocalizacionUidFromTicket(data);
                setValue("localizacionId", localizacionUid);

                setValue("areaId", Number(data.areaId));
                setValue("asignado", Number(data.asignado));
                setValue("prioridadId", Number(data.prioridadId));
                setValue("descripcion", data.descripcion);
                setValue("estadoId", Number(data.estadoId));

                if (Array.isArray(data.evidencias)) {
                    const ini = data.evidencias.filter((e) => Number(e.tipo) === 1).map(mapEvidenceRowToFile);
                    const pro = data.evidencias.filter((e) => Number(e.tipo) === 2).map(mapEvidenceRowToFile);
                    const fin = data.evidencias.filter((e) => Number(e.tipo) === 3).map(mapEvidenceRowToFile);


                    setInitialFileList(ini);
                    setProcessFileList(pro);
                    setFinalFileList(fin);
                }

                await cargarEvidenciasTicket(tktId);

                getHistorialByTicketAPI(tktId)
                    .then((res) => setHistorial(res.data || []))
                    .catch(() => setHistorial([]))
                    .finally(() => setCargandoHistorial(false));
                setMode("view");
                setVisible(true);
            } catch (err) {
                handleApiError(err);
            }
        },
        editTicket: async ({ tktId }) => {
            try {
                setHistorial([]); // ← previene “parpadeo” con datos previos
                setCargandoHistorial(true); // ← muestra spinner mientras carga
                const { data } = await getTicketByIdAPI(tktId);
                setOriginalData(data);
                setTktId(tktId);

                console.log(data);

                setValue("clienteId", Number(data.clienteId));
                setValue("bloqueId", Number(data.bloqueId ?? data.projectId));
                const resolvedLocalId = data.localId ?? data.unidadId;
                setValue("localId", resolvedLocalId != null ? Number(resolvedLocalId) : null);

                const localizacionUid = buildLocalizacionUidFromTicket(data);
                setValue("localizacionId", localizacionUid);

                setValue("areaId", Number(data.areaId));
                setValue("asignado", Number(data.asignado));
                setValue("prioridadId", Number(data.prioridadId));
                setValue("descripcion", data.descripcion);
                setValue("estadoId", Number(data.estadoId));

                await cargarEvidenciasTicket(tktId);

                // setCargandoHistorial(true);
                getHistorialByTicketAPI(tktId)
                    .then((res) => setHistorial(res.data || []))
                    .catch(() => setHistorial([]))
                    .finally(() => setCargandoHistorial(false));
                setMode("edit");
                setVisible(true);
            } catch (err) {
                handleApiError(err);
            }
        },
        onClose: () => {
            closeForm();
        },
    }));

    // SUBIR evidencias (uno por selección) — reutiliza UploadNativo.onUpload(file)
    // const agregarFotoInicial = async (file) => {

    //     try {
    //         if (!tktId) {
    //             const url = URL.createObjectURL(file);
    //             setInitialFileList((prev) => [
    //                 ...prev,
    //                 {
    //                     uid: `${Date.now()}-ini`,
    //                     url,
    //                     thumbUrl: url,
    //                     name: file.name,
    //                     tipo: 1,
    //                     _localFile: file,
    //                     mimetype: file.type,
    //                     type: file.type,
    //                     size: file.size,
    //                 },
    //             ]);
    //             return;
    //         }
    //         setIsUpload(true);
    //         setUploadPct(0);

    //         const fd = new FormData();
    //         fd.append("files[]", file); // 👈 coincide con multer.array("files[]", 20)
    //         fd.append("tipo", "1");

    //         await uploadTicketEvidenceAPI(tktId, fd, (e) => {
    //             if (!e.total) return;
    //             setUploadPct(Math.round((e.loaded * 100) / e.total));
    //         });

    //         await cargarEvidenciasTicket(tktId);
    //     } catch (err) {
    //         handleApiError(err);
    //     } finally {
    //         setIsUpload(false);
    //     }
    // };

    const agregarFotoInicial = async (file) => {
        // Siempre creamos una URL local para que se vea al toque
        const url = URL.createObjectURL(file);
        const tempUid = `${Date.now()}-ini`;

        // 1) Agregar preview local (ticket nuevo o existente)
        setInitialFileList((prev) => [
            ...prev,
            {
                uid: tempUid,
                url,
                thumbUrl: url,
                name: file.name,
                tipo: 1,
                _localFile: file,
                _pendingUpload: !!tktId, // 👈 si hay ticket, marco que es subida pendiente
                mimetype: file.type,
                type: file.type,
                size: file.size,
            },
        ]);

        // Si el ticket aún no existe, solo mostramos la preview local
        if (!tktId) return;

        try {
            setIsInitialUpload(true);
            setInitialUploadPct(0);

            const fd = new FormData();
            fd.append("files[]", file); // 👈 coincide con multer.array("files[]", 20)
            fd.append("tipo", "1");

            await uploadTicketEvidenceAPI(tktId, fd, (e) => {
                if (!e.total) return;
                setInitialUploadPct(Math.round((e.loaded * 100) / e.total));
            });

            // 👇 Importante: ya NO llamamos a cargarEvidenciasTicket aquí
            // El worker del backend terminará en segundo plano, y la próxima vez
            // que abras el ticket vendrá desde BD con fileId, etc.
        } catch (err) {
            // Si falla, quitamos la imagen temporal y liberamos el blob
            setInitialFileList((prev) => {
                const next = prev.filter((f) => f.uid !== tempUid);
                if (url.startsWith("blob:")) URL.revokeObjectURL(url);
                return next;
            });
            handleApiError(err);
        } finally {
            setIsInitialUpload(false);
        }
    };

    const agregarFotoProceso = async (file) => {
        if (!tktId) {
            showError("Primero guarda el ticket.");
            return;
        }

        const url = URL.createObjectURL(file);
        const tempUid = `${Date.now()}-proc`;

        setProcessFileList(prev => ([
            ...prev,
            {
                uid: tempUid,
                url,
                thumbUrl: url,
                name: file.name,
                tipo: 2,                 // 👈 proceso
                _localFile: file,
                _pendingUpload: true,
                mimetype: file.type,
                type: file.type,
                size: file.size,
            },
        ]));

        try {
            setIsProcessUpload(true);
            setProcessUploadPct(0);

            const fd = new FormData();
            fd.append("files[]", file);
            fd.append("tipo", "2"); // 👈 PROCESO

            await uploadTicketEvidenceAPI(tktId, fd, (e) => {
                if (!e.total) return;
                setProcessUploadPct(Math.round((e.loaded * 100) / e.total));
            });
        } catch (err) {
            setProcessFileList(prev => {
                const next = prev.filter(f => f.uid !== tempUid);
                if (url.startsWith("blob:")) URL.revokeObjectURL(url);
                return next;
            });
            handleApiError(err);
        } finally {
            setIsProcessUpload(false);
        }
    };


    // const agregarFotoFinal = async (file) => {
    //     try {
    //         if (!tktId) {
    //             showError("Primero guarda el ticket.");
    //             return;
    //         }
    //         setIsUpload(true);
    //         setUploadPct(0);

    //         const fd = new FormData();
    //         fd.append("files[]", file);
    //         fd.append("tipo", "2");

    //            console.log("👀 FRONT (FINAL) FormData.tipo =", fd.get("tipo"));

    //         await uploadTicketEvidenceAPI(tktId, fd, (e) => {
    //             if (!e.total) return;
    //             setUploadPct(Math.round((e.loaded * 100) / e.total));
    //         });

    //         await cargarEvidenciasTicket(tktId);
    //     } catch (err) {
    //         handleApiError(err);
    //     } finally {
    //         setIsUpload(false);
    //     }
    // };

    const agregarFotoFinal = async (file) => {
        if (!tktId) {
            showError("Primero guarda el ticket.");
            return;
        }

        const url = URL.createObjectURL(file);
        const tempUid = `${Date.now()}-fin`;

        // 1) Agregar preview local inmediata
        setFinalFileList((prev) => [
            ...prev,
            {
                uid: tempUid,
                url,
                thumbUrl: url,
                name: file.name,
                tipo: 3,
                _localFile: file,
                _pendingUpload: true,
                mimetype: file.type,
                type: file.type,
                size: file.size,
            },
        ]);

        try {
            setIsFinalUpload(true);
            setFinalUploadPct(0);

            const fd = new FormData();
            fd.append("files[]", file);
            fd.append("tipo", "3");

            console.log("👀 FRONT (FINAL) FormData.tipo =", fd.get("tipo"));

            await uploadTicketEvidenceAPI(tktId, fd, (e) => {
                if (!e.total) return;
                setFinalUploadPct(Math.round((e.loaded * 100) / e.total));
            });

            // 👇 Igual que en iniciales: NO llamamos a cargarEvidenciasTicket aquí
        } catch (err) {
            // Si falla, quitamos la imagen temporal y liberamos el blob
            setFinalFileList((prev) => {
                const next = prev.filter((f) => f.uid !== tempUid);
                if (url.startsWith("blob:")) URL.revokeObjectURL(url);
                return next;
            });
            handleApiError(err);
        } finally {
            setIsFinalUpload(false);
        }
    };

    // ELIMINAR una evidencia
    // const eliminarFotoInicial = async (file) => {
    //     try {
    //         if (!tktId) {
    //             // Si era local (nuevo ticket), sólo remuévela del array
    //             if (file._localFile) {
    //                 setInitialFileList((prev) => prev.filter((f) => f.uid !== file.uid));
    //                 if (file.url?.startsWith("blob:")) URL.revokeObjectURL(file.url);
    //                 return;
    //             }
    //             return;
    //         }

    //         // Si tienes fileId: elimínalo por fileId, si no por tipo (el back ya maneja reemplazo)
    //         const payload = file.fileId ? { fileIds: [file.fileId] } : { tipos: [1] };
    //         await deleteTicketEvidenceAPI(tktId, payload);
    //         await cargarEvidenciasTicket(tktId);
    //     } catch (err) {
    //         handleApiError(err);
    //     }
    // };

    const eliminarFotoInicial = async (file) => {
        // 1) Siempre lo quitamos de la UI al toque
        setInitialFileList((prev) => prev.filter((f) => f.uid !== file.uid));
        if (file.url?.startsWith("blob:")) {
            URL.revokeObjectURL(file.url);
        }

        // 2) Si no hay ticket, o es un archivo solo local/pending, hasta aquí llegamos
        if (!tktId || file._localFile || file._pendingUpload) {
            return;
        }

        // 3) Si ya existe en el backend, llamamos al API
        try {
            const payload = file.fileId ? { fileIds: [file.fileId] } : { tipos: [1] };
            await deleteTicketEvidenceAPI(tktId, payload);

            // La próxima vez que abras el ticket, las evidencias vendrán limpias desde BD.
        } catch (err) {
            // Opcional: rollback si quieres volver a mostrarlo en UI al fallar
            setInitialFileList((prev) => [...prev, file]);
            handleApiError(err);
        }
    };

    const eliminarFotoProceso = async (file) => {
        setProcessFileList(prev => prev.filter(f => f.uid !== file.uid));
        if (file.url?.startsWith("blob:")) URL.revokeObjectURL(file.url);

        if (!tktId || file._localFile || file._pendingUpload) return;

        try {
            const payload = file.fileId ? { fileIds: [file.fileId] } : { tipos: [2] }; // 👈 proceso = 2
            await deleteTicketEvidenceAPI(tktId, payload);
        } catch (err) {
            setProcessFileList(prev => [...prev, file]); // rollback opcional
            handleApiError(err);
        }
    };

    // const eliminarFotoFinal = async (file) => {
    //     try {
    //         if (!tktId) return;
    //         const payload = file.fileId ? { fileIds: [file.fileId] } : { tipos: [2] };
    //         await deleteTicketEvidenceAPI(tktId, payload);
    //         await cargarEvidenciasTicket(tktId);
    //     } catch (err) {
    //         handleApiError(err);
    //     }
    // };

    const eliminarFotoFinal = async (file) => {
        // 1) Lo quitamos inmediatamente de la UI
        setFinalFileList((prev) => prev.filter((f) => f.uid !== file.uid));
        if (file.url?.startsWith("blob:")) {
            URL.revokeObjectURL(file.url);
        }

        // 2) Si no hay ticket, o es solo local/pending, no llamamos a backend
        if (!tktId || file._localFile || file._pendingUpload) {
            return;
        }

        // 3) Si ya existe en back, llamamos al API
        try {
            const payload = file.fileId ? { fileIds: [file.fileId] } : { tipos: [3] };
            await deleteTicketEvidenceAPI(tktId, payload);

            // Igual: NO recargamos evidencias desde el back aquí.
        } catch (err) {
            // Opcional rollback
            setFinalFileList((prev) => [...prev, file]);
            handleApiError(err);
        }
    };

    // const openInNewTab = (url) => {
    //     if (!url) return;
    //     const w = window.open(url, "_blank", "noopener,noreferrer");
    //     if (w) w.opener = null;
    // };

    // const previewEvidence = async (file) => {
    //     try {
    //         if (!file?.fileId) {
    //             showError("No se encontró el identificador del archivo.");
    //             return;
    //         }
    //         const { data } = await previewTicketEvidenceAPI(file.fileId); // { preview }
    //         openInNewTab(data?.preview);
    //     } catch (err) {
    //         handleApiError(err);
    //     }
    // };

    const previewEvidence = async (file) => {
        try {
            // 1) Caso: archivo local / sin fileId (ticket nuevo)
            if (!file?.fileId) {
                const src = file.url || file.thumbUrl || file.urllocal || file.urlpublica;

                if (!src) {
                    showError("No hay vista previa disponible para este archivo.");
                    return;
                }

                // Abrimos la imagen/PDF/archivo en una nueva pestaña
                const w = window.open(src, "_blank", "noopener,noreferrer");
                if (w) w.opener = null;
                return;
            }
            // 2) Caso normal: archivo ya en SharePoint / con fileId
            setFilePreviewId(file.fileId);
            setShowFilePreview(true);
        } catch (err) {
            handleApiError(err);
        }
    };

    const downloadEvidence = async (file) => {
        try {
            if (!file?.fileId) {
                showError("No se encontró el identificador del archivo.");
                return;
            }
            const { data } = await downloadTicketEvidenceAPI(file.fileId); // { downloadUrl, name }
            // descarga directa con <a download>
            const a = document.createElement("a");
            a.href = data?.downloadUrl;
            a.download = data?.name || file.name || "evidencia";
            document.body.appendChild(a);
            a.click();
            a.remove();
        } catch (err) {
            handleApiError(err);
        }
    };

    //Evidencias confirmDialog
    // Agregar archivos finales dentro del ConfirmDialog (no sube aún; solo UI local)
    const onConfirmAddFinalFile = (file) => {
        const url = URL.createObjectURL(file);
        const tempUid = `${Date.now()}-finCD`;
        setCloseDialogFiles((prev) => [
            ...prev,
            {
                uid: tempUid,
                url,
                thumbUrl: url,
                name: file.name,
                tipo: 3,
                _localFile: file,
                mimetype: file.type,
                type: file.type,
                size: file.size,
            },
        ]);
    };

    // Quitar archivo de la UI del ConfirmDialog
    const onConfirmRemoveFinalFile = (file) => {
        setCloseDialogFiles((prev) => prev.filter((f) => f.uid !== file.uid));
        if (file.url?.startsWith("blob:")) URL.revokeObjectURL(file.url);
    };


    //PDF

    const handleGenerarPDF = async () => {
        if (!tktId) {
            showError("Debes guardar el ticket antes de generar el PDF");
            return;
        }

        try {
            setLoading(true);

            // Llama a tu API ya existente
            const response = await getPreviewForm({ ticketId: tktId });

            // Crea una URL temporal con el blob recibido
            const file = new Blob([response.data], { type: "application/pdf" });
            const fileURL = window.URL.createObjectURL(file);

            // // Abre el PDF en nueva pestaña
            // const newWindow = window.open(fileURL, "_blank");
            // if (!newWindow)
            //     showError(
            //         "No se pudo abrir la vista previa del PDF (bloqueador de ventanas activo)."
            //     );
            // Guardamos la URL para verla en el visor
            setReportPreviewUrl(fileURL);
            setShowReportPreview(true);
        } catch (error) {
            console.error(error);
            showError("Error generando el PDF del ticket");
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        const values = getValues();
        const etapaId = null;

        const payload = {
            tktId: tktId || 0,
            ...values,
            etapaId,
            // nombres nuevos
            bloqueId: values.bloqueId,
            localId: values.localId,
            proyectoId: values.bloqueId,
            unidadId: values.localId,
            asignadoId: values.asignado,
            usuarioReg: idusuario, // ID del creador (como ya lo tienes)
            usuarioAct: nombreusuario, // NOMBRE del que modifica (para tkt_usu_act VARCHAR)
            usuarioActId: idusuario,
        };

        setLoading(true);
        try {
            // Autoasignación si aplica
            const esCambioDeEstado = nuevoEstado && nuevoEstado !== originalData?.estadoId;
            const sinAsignado = !values.asignado || values.asignado === "";

            if (originalData?.estadoId === ESTADOS.ABIERTO && esCambioDeEstado && sinAsignado) {
                if (!canAutoAssign) {
                    showError("No tienes permiso para autoasignarte un ticket sin responsable.");
                    setLoading(false);
                    return;
                }

                setValue("asignado", idusuario);
                values.asignado = idusuario;
                payload.asignadoId = idusuario;
            }

            const { data } = await saveTicketAPI(payload);

            // Si fue creación y hay evidencias iniciales locales, súbelas ahora
            // if (!tktId && Array.isArray(initialFileList) && initialFileList.length > 0) {
            //     const files = initialFileList.filter(f => f._localFile).map(f => f._localFile);
            //     if (files.length) {
            //         await uploadTicketEvidenceAPI(
            //             data.tktId || data.id,                   // id nuevo
            //             { tipo: 1, files },                      // 👈 multiple
            //             (evt) => { if (evt.total) setUploadPct(Math.round((evt.loaded * 100) / evt.total)); }
            //         );
            //         // refresca galería desde el back
            //         await cargarEvidenciasTicket(data.tktId || data.id);
            //         // limpia previews locales (opcional)
            //         setInitialFileList([]);
            //     }
            // }

            if (!tktId && initialFileList.some((f) => f._localFile)) {
                const fd = new FormData();
                initialFileList
                    .filter((f) => f._localFile)
                    .forEach((f) => fd.append("files[]", f._localFile));
                fd.append("tipo", "1");

                await uploadTicketEvidenceAPI(data.tktId || data.id, fd, (evt) => {
                    if (evt.total) setUploadPct(Math.round((evt.loaded * 100) / evt.total));
                });

                await cargarEvidenciasTicket(data.tktId || data.id);
                setInitialFileList([]);
            }

            showSuccess(data.message);

            // Cambio de estado (anulado / reabierto / otros)
            if (esCambioDeEstado) {
                const esAnulado = nuevoEstado === ESTADOS.ANULADO;
                const esReabierto = nuevoEstado === ESTADOS.REABIERTO;
                const esAsignadoActual = originalData?.asignado === idusuario;

                if (esAnulado) {
                    if (!canVoidAll && (!canVoid || !esAsignadoActual)) {
                        showError("No tienes permiso para anular este ticket.");
                        setLoading(false);
                        return;
                    }
                }

                if (esReabierto) {
                    if (!canReopenAll && (!canReopen || !esAsignadoActual)) {
                        showError("No tienes permiso para reabrir este ticket.");
                        setLoading(false);
                        return;
                    }
                }

                if (nuevoEstado !== ESTADOS.ABIERTO && !comentario.trim()) {
                    showError("Debes escribir un comentario para cambiar el estado.");
                    setLoading(false);
                    return;
                }

                await updateTicketEstadoAPI({
                    tktId,
                    nuevoEstado,
                    usuarioId: idusuario,
                    comentario: comentario.trim(),
                });

                showSuccess("Estado actualizado");
            }

            // ticketEvents.emit("refresh");
            // onRefresh();

            // === Resolver estado final después del posible cambio ===
            let resolvedEstadoId = Number(values.estadoId);

            // Si se cambió de estado en este guardado, usamos el nuevo
            if (esCambioDeEstado && nuevoEstado) {
                resolvedEstadoId = Number(nuevoEstado);
                // opcional: actualiza también el form si quieres dejarlo coherente
                setValue("estadoId", resolvedEstadoId);
            }

            // Buscar meta del estado (nombre, color) desde catálogo de estados
            const estadoMeta = estados.find((e) => Number(e.id) === resolvedEstadoId) || {};
            const resolvedEstadoNombre = estadoMeta.nombre || data.estadoNombre || null;
            const resolvedEstadoColor = estadoMeta.color || data.estadoColor || "secondary";

            // === construir la fila para el paginador (mismo shape de columns) ===
            const row = {
                tktId: tktId || data.tktId || data.id,
                clienteId: Number(values.clienteId),
                clienteNombre:
                    data.clienteNombre ??
                    clientes.find((c) => Number(c.id) === Number(values.clienteId))?.nombre ??
                    null,
                bloqueId: Number(values.bloqueId),
                bloqueNombre:
                    data.bloqueNombre ??
                    bloques.find((b) => Number(b.id) === Number(values.bloqueId))?.nombre ??
                    null,
                localId: Number(values.localId),
                localNombre:
                    data.localNombre ??
                    locales.find((l) => Number(l.id) === Number(values.localId))?.nombre ??
                    null,
                areaId: Number(values.areaId),
                areaNombre:
                    data.areaNombre ??
                    areas.find((a) => Number(a.id) === Number(values.areaId))?.nombre ??
                    null,
                asignado: Number(values.asignado),
                asignadoNombre:
                    data.asignadoNombre ??
                    encargados.find((u) => Number(u.id) === Number(values.asignado))?.nombre ??
                    null,
                prioridadId: Number(values.prioridadId),
                prioridadNombre:
                    data.prioridadNombre ??
                    prioridades.find((p) => Number(p.id) === Number(values.prioridadId))?.nombre ??
                    null,
                prioridadColor:
                    data.prioridadColor ??
                    prioridades.find((p) => Number(p.id) === Number(values.prioridadId))?.color ??
                    "secondary",
                estadoId: Number(values.estadoId),
                estadoId: resolvedEstadoId,
                estadoNombre: resolvedEstadoNombre,
                estadoColor: resolvedEstadoColor,

                descripcion: values.descripcion ?? "",
                fechaRegistro: data.fechaRegistro ?? new Date().toISOString(),
                usuact: nombreusuario,
                fecact: new Date().toISOString(),
            };

            console.log("", row);

            if (tktId) {
                // UPDATE optimista
                updateItem({ idField: "tktId", ...row });
            } else {
                // ADD optimista (agrega al principio si estás en la primera página; tu hook lo maneja)
                addItem(row);
            }

            closeForm();
        } catch (error) {
            handleApiError(error);
        } finally {
            setLoading(false);
        }
    };

    const closeForm = () => {
        setVisible(false);
        setTktId(null);
        setOriginalData(null);
        setComentario("");
        setNuevoEstado(null);
        setEstadoDialogVisible(false);
        reset(defaultValues);
        setInitialFileList([]);
        setProcessFileList([]);
        setFinalFileList([]);
        setIsUpload(false);
        setUploadPct(0);
        setCloseDialogFiles([]);
        setCloseDialogUploading(false);
        setCloseDialogPct(0);
    };

    const ticketEstado = originalData?.estadoId || ESTADOS.ABIERTO;

    const estadoActual = Number(ticketEstado);

    const showInitialEvidence = true;                               // siempre
    const showProcessEvidence = estadoActual >= ESTADOS.EN_PROCESO; // desde “En Proceso”

    // Mostrar evidencias finales solo desde EN_PROCESO hacia arriba
    const showFinalEvidence = estadoActual >= ESTADOS.EN_PROCESO;

    // Inicial: permitir subir solo si NO está cerrado/anulado
    // y NO está "En Proceso" (en proceso es solo lectura).

    const isClosedOrVoid = (st) => [ESTADOS.CERRADO, ESTADOS.ANULADO].includes(Number(st));


    // Permisos de edición



    const canUploadInitialEvidence =
        !isClosedOrVoid(estadoActual) && estadoActual !== ESTADOS.EN_PROCESO;

    // Inicial: permitir antes de cerrar/anular
    const canEditInitialEvidence = !isClosedOrVoid(estadoActual);

    const canEditProcessEvidence = !isClosedOrVoid(estadoActual) && estadoActual >= ESTADOS.EN_PROCESO;
    // Final: permitir desde “En Proceso” (2), pero si está cerrado/anulado, solo ver
    const canEditFinalEvidence =
        !isClosedOrVoid(originalData?.estadoId || ESTADOS.ABIERTO) &&
        Number(originalData?.estadoId || ESTADOS.ABIERTO) >= ESTADOS.EN_PROCESO;

    const camposBloqueados = {
        clienteId: false,
        localizacionId: [ESTADOS.CERRADO, ESTADOS.ANULADO].includes(ticketEstado),
        bloqueId: [ESTADOS.CERRADO, ESTADOS.ANULADO].includes(ticketEstado),
        localId: [ESTADOS.CERRADO, ESTADOS.ANULADO].includes(ticketEstado),
        areaId: [ESTADOS.CERRADO, ESTADOS.ANULADO].includes(ticketEstado),
        descripcion: [ESTADOS.CERRADO, ESTADOS.ANULADO].includes(ticketEstado),
        asignado: [ESTADOS.CERRADO, ESTADOS.ANULADO].includes(ticketEstado),
        prioridadId: [ESTADOS.CERRADO, ESTADOS.ANULADO].includes(ticketEstado),
    };

    const estadosPermitidos = getEstadosPermitidos(ticketEstado);

    const puedeCerrar = estadosPermitidos.includes(ESTADOS.CERRADO);
    const puedeEnProceso = estadosPermitidos.includes(ESTADOS.EN_PROCESO);
    const puedeAnular = estadosPermitidos.includes(ESTADOS.ANULADO);

    const handleCreateCliente = () => {
        // if (venUsuarioRef.current?.newUser) {
        //     venUsuarioRef.current.newUser();
        // }
        setShowClientePanel(true);
        // damos un tiny delay para que el panel monte antes de newUser
        setTimeout(() => venUsuarioRef.current?.newUser?.(), 0);
    };

    // const handleEditCliente = (cliente) => {
    //     if (!cliente || !cliente.id) {
    //         console.warn("Cliente inválido");
    //         return;
    //     }

    //     const clienteMapped = {
    //         ...cliente,
    //         usuId: cliente.id,
    //     };

    //     if (venUsuarioRef.current?.editUser) {
    //         venUsuarioRef.current.editUser(clienteMapped, 0);
    //     }
    // };
    const handleEditCliente = (cliente) => {
        if (!cliente || !cliente.id) return;
        setShowClientePanel(true);
        const mapped = { ...cliente, usuId: cliente.id };
        setTimeout(() => venUsuarioRef.current?.editUser?.(mapped, 0), 0);
    };

    const closeClientePanel = () => {
        setShowClientePanel(false);
        const api = venUsuarioRef.current;
        if (api && typeof api.onClose === "function") {
            api.onClose();
        }
    };

    const handleAddCliente = (item) => {
        const nuevoCliente = {
            ...item,
            id: item.usuId,
            nombre: `${item.nombre} ${item.apellido}`.trim(),
        };

        setClientes((prev) => [...prev, nuevoCliente]);
        setValue("clienteId", nuevoCliente.id);
    };

    const handleUpdateCliente = (item) => {
        const clienteActualizado = {
            ...item,
            id: item.usuId,
            nombre: `${item.nombre} ${item.apellido}`.trim(),
        };

        setClientes((prev) =>
            prev.map((cli) => (cli.id === clienteActualizado.id ? clienteActualizado : cli))
        );

        // Forzar recarga de proyectos si el cliente actualizado es el seleccionado actualmente
        if (clienteId === item.usuId) {
            // Resetear campos dependientes
            setValue("bloqueId", null);
            setValue("localId", null);
            setValue("areaId", null);
            setValue("asignado", null);

            // Volver a consultar proyectos y limpiar dependencias
            getBlocksByClientAPI(item.usuId)
                .then(({ data }) => {
                    const mapped = (data || []).map((r) => ({ id: r.proId, nombre: r.nombre }));
                    setBloques(mapped);
                    setLocales([]);
                    setEncargados([]);

                    if (mapped.length === 1) {
                        setValue("bloqueId", mapped[0].id);
                    }
                })
                .catch(handleApiError);
        }
    };

    // =========================
    //  RENDER HELPERS (UI)
    // =========================

    // const HeaderTitle = (
    //     <h4 className="my-0" style={{ fontWeight: 600 }}>
    //         {tktId ? "Editar Ticket" : "Nuevo Ticket"}
    //     </h4>
    // );

    const HeaderTitle = (
        <h4 className="my-0" style={{ fontWeight: 600 }}>
            {mode === "new"
                ? "Nuevo Ticket"
                : mode === "view"
                    ? ` Ticket #${tktId}`
                    : ` Ticket #${tktId}`}
        </h4>
    );

    const estadoForm = watch("estadoId");
    const isClosed = estadoForm === ESTADOS.CERRADO;
    const isVoidTicket = estadoForm === ESTADOS.ANULADO;
    const isInProcess = estadoActual === ESTADOS.EN_PROCESO;
    // Evidencias finales dentro del ConfirmDialog (cierre)
    const [closeDialogFiles, setCloseDialogFiles] = useState([]);
    const [closeDialogUploading, setCloseDialogUploading] = useState(false);
    const [closeDialogPct, setCloseDialogPct] = useState(0);


    
    const tituloCambioEstado =
        nuevoEstado === ESTADOS.CERRADO
            ? "Confirmar cierre del ticket"
            : nuevoEstado === ESTADOS.EN_PROCESO
                ? "Confirmar cambio a 'En Proceso'"
                : nuevoEstado === ESTADOS.ANULADO
                    ? "Confirmar anulación del ticket"
                    : nuevoEstado === ESTADOS.REABIERTO
                        ? "Confirmar reapertura del ticket"
                        : "Confirmar cambio de estado";

    const iconoCambioEstado =
        nuevoEstado === ESTADOS.CERRADO
            ? "pi pi-check-circle"
            : nuevoEstado === ESTADOS.EN_PROCESO
                ? "pi pi-play"
                : nuevoEstado === ESTADOS.ANULADO
                    ? "pi pi-times-circle"
                    : nuevoEstado === ESTADOS.REABIERTO
                        ? "pi pi-refresh"
                        : "pi pi-exclamation-triangle";

    const acceptClassCambioEstado =
        nuevoEstado === ESTADOS.CERRADO
            ? "p-button-success"
            : nuevoEstado === ESTADOS.EN_PROCESO
                ? "p-button-info"
                : nuevoEstado === ESTADOS.ANULADO
                    ? "p-button-danger"
                    : "p-button-primary";

    const textoMotivo =
        motivosLabels[nuevoEstado] ||
        "Por favor, ingresa la descripción del cambio de estado:";

    const placeholderMotivo =
        nuevoEstado === ESTADOS.CERRADO
            ? "Describe brevemente la solución aplicada..."
            : nuevoEstado === ESTADOS.EN_PROCESO
                ? "Indica qué acciones se iniciarán..."
                : nuevoEstado === ESTADOS.ANULADO
                    ? "Explica por qué se anula este ticket..."
                    : nuevoEstado === ESTADOS.REABIERTO
                        ? "Explica por qué se necesita reabrir el ticket..."
                        : "Escribe el motivo del cambio...";


    const FooterButtons = (
        <div className="ticket-footer w-full">
            {/* ✅ MOBILE + VIEW */}
            {isMobile && mode === "view" && (
                <div className="w-full flex flex-column gap-2">
                    {/* Ticket abierto / en proceso / reabierto */}
                    {tktId && !isClosed && !isVoidTicket && (
                        <>
                            {!isInProcess ? (
                                // --- NO está en proceso: Solucionar | En proceso  +  Anular | Editar ---
                                <>
                                    {/* Fila 1: Solucionar | En proceso */}
                                    <div className="flex gap-2 w-full">
                                        <Button
                                            label="Solucionar"
                                            icon="pi pi-check-circle"
                                            className="p-button-success p-button-sm flex-1"
                                            onClick={() => {
                                                setNuevoEstado(ESTADOS.CERRADO);
                                                setConfirmDialogVisible(true);
                                            }}
                                        />
                                        <Button
                                            label="En proceso"
                                            icon="pi pi-play"
                                            className="p-button-info p-button-sm flex-1"
                                            onClick={() => {
                                                setNuevoEstado(ESTADOS.EN_PROCESO);
                                                setConfirmDialogVisible(true);
                                            }}
                                        />
                                    </div>

                                    {/* Fila 2: Anular | Editar */}
                                    <div className="flex gap-2 w-full">
                                        <Button
                                            label="Anular"
                                            icon="pi pi-times"
                                            className="p-button-danger p-button-sm flex-1"
                                            onClick={() => {
                                                setNuevoEstado(ESTADOS.ANULADO);
                                                setConfirmDialogVisible(true);
                                            }}
                                        />

                                        {canEdit && (
                                            <Button
                                                label="Editar"
                                                icon="pi pi-pencil"
                                                className="p-button-warning p-button-sm flex-1"
                                                onClick={() => setMode("edit")}
                                            />
                                        )}
                                    </div>
                                </>
                            ) : (
                                // --- SÍ está EN PROCESO: Solucionar | Anular  +  Editar full width ---
                                <>
                                    {/* Fila 1: Solucionar | Anular */}
                                    <div className="flex gap-2 w-full">
                                        <Button
                                            label="Solucionar"
                                            icon="pi pi-check-circle"
                                            className="p-button-success p-button-sm flex-1"
                                            onClick={() => {
                                                setNuevoEstado(ESTADOS.CERRADO);
                                                setConfirmDialogVisible(true);
                                            }}
                                        />
                                        <Button
                                            label="Anular"
                                            icon="pi pi-times"
                                            className="p-button-danger p-button-sm flex-1"
                                            onClick={() => {
                                                setNuevoEstado(ESTADOS.ANULADO);
                                                setConfirmDialogVisible(true);
                                            }}
                                        />
                                    </div>

                                    {/* Fila 2: Editar full width */}
                                    {canEdit && (
                                        <div className="w-full">
                                            <Button
                                                label="Editar"
                                                icon="pi pi-pencil"
                                                className="p-button-warning p-button-sm w-full"
                                                onClick={() => setMode("edit")}
                                            />
                                        </div>
                                    )}
                                </>
                            )}
                        </>
                    )}

                    {/* Ticket CERRADO o ANULADO: solo PDF */}
                    {(isClosed || isVoidTicket) && (
                        <Button
                            label="Generar PDF"
                            icon="pi pi-file-pdf"
                            className="p-button-danger p-button-sm w-full"
                            onClick={handleGenerarPDF}
                            loading={loading}
                        />
                    )}
                </div>
            )}

            {/* ✅ MOBILE + EDIT */}
            {isMobile && mode !== "view" && (
                <>
                    {tktId && !isClosed && !isVoidTicket ? (
                        <div className="w-full flex flex-column gap-2 mt-2">
                            {!isInProcess ? (
                                // --- NO está EN PROCESO: Solucionar | En proceso  +  Anular | Guardar ---
                                <>
                                    {/* Fila 1: Solucionar | En proceso */}
                                    <div className="flex gap-2 w-full">
                                        <Button
                                            label="Solucionar"
                                            icon="pi pi-check-circle"
                                            className="p-button-success p-button-sm flex-1"
                                            onClick={() => {
                                                setNuevoEstado(ESTADOS.CERRADO);
                                                setConfirmDialogVisible(true);
                                            }}
                                        />
                                        <Button
                                            label="En proceso"
                                            icon="pi pi-play"
                                            className="p-button-info p-button-sm flex-1"
                                            onClick={() => {
                                                setNuevoEstado(ESTADOS.EN_PROCESO);
                                                setConfirmDialogVisible(true);
                                            }}
                                        />
                                    </div>

                                    {/* Fila 2: Anular | Guardar */}
                                    <div className="flex gap-2 w-full">
                                        <Button
                                            label="Anular"
                                            icon="pi pi-times"
                                            className="p-button-danger p-button-sm flex-1"
                                            onClick={() => {
                                                setNuevoEstado(ESTADOS.ANULADO);
                                                setConfirmDialogVisible(true);
                                            }}
                                        />

                                        <Button
                                            label="Guardar"
                                            icon="pi pi-save"
                                            className="p-button-submit p-button-sm flex-1"
                                            onClick={handleSubmit(handleSave)}
                                            loading={loading}
                                            disabled={loading}
                                        />
                                    </div>
                                </>
                            ) : (
                                // --- SÍ está EN PROCESO: Solucionar | Anular  +  Guardar full width ---
                                <>
                                    {/* Fila 1: Solucionar | Anular */}
                                    <div className="flex gap-2 w-full">
                                        <Button
                                            label="Solucionar"
                                            icon="pi pi-check-circle"
                                            className="p-button-success p-button-sm flex-1"
                                            onClick={() => {
                                                setNuevoEstado(ESTADOS.CERRADO);
                                                setConfirmDialogVisible(true);
                                            }}
                                        />
                                        <Button
                                            label="Anular"
                                            icon="pi pi-times"
                                            className="p-button-danger p-button-sm flex-1"
                                            onClick={() => {
                                                setNuevoEstado(ESTADOS.ANULADO);
                                                setConfirmDialogVisible(true);
                                            }}
                                        />
                                    </div>

                                    {/* Fila 2: Guardar full width */}
                                    <div className="w-full">
                                        <Button
                                            label="Guardar"
                                            icon="pi pi-save"
                                            className="p-button-submit p-button-sm w-full"
                                            onClick={handleSubmit(handleSave)}
                                            loading={loading}
                                            disabled={loading}
                                        />
                                    </div>
                                </>
                            )}
                        </div>
                    ) : (
                        // Ticket nuevo o cerrado/anulado: solo Guardar/Registrar
                        <div className="flex justify-content-end w-full mt-2">
                            <Button
                                className="p-button-submit p-button-sm"
                                onClick={handleSubmit(handleSave)}
                                label={tktId ? "Guardar" : "Registrar"}
                                loading={loading}
                                disabled={loading}
                                icon="pi pi-save"
                            />
                        </div>
                    )}
                </>
            )}

            {/* ✅ DESKTOP */}
            {!isMobile && (
                <>
                    {/* IZQUIERDA: cambio de estado */}
                    <div className="footer-left flex flex-wrap gap-2">
                        {tktId && mode !== "new" && !isClosed && !isVoidTicket && (
                            <>
                                <Button
                                    label="Solucionar"
                                    icon="pi pi-check-circle"
                                    className="p-button-success p-button-sm"
                                    onClick={() => {
                                        setNuevoEstado(ESTADOS.CERRADO);
                                        setConfirmDialogVisible(true);
                                    }}
                                />

                                {!isInProcess && (
                                    <Button
                                        label="En proceso"
                                        icon="pi pi-play"
                                        className="p-button-info p-button-sm"
                                        onClick={() => {
                                            setNuevoEstado(ESTADOS.EN_PROCESO);
                                            setConfirmDialogVisible(true);
                                        }}
                                    />
                                )}

                                <Button
                                    label="Anular"
                                    icon="pi pi-times"
                                    className="p-button-danger p-button-sm"
                                    onClick={() => {
                                        setNuevoEstado(ESTADOS.ANULADO);
                                        setConfirmDialogVisible(true);
                                    }}
                                />
                            </>
                        )}
                    </div>

                    {/* DERECHA: Editar / Guardar / PDF */}
                    <div className="footer-right flex flex-wrap gap-2 justify-content-end">
                        {mode === "view" ? (
                            <>
                                {canEdit && !isClosed && !isVoidTicket && (
                                    <Button
                                        label="Editar"
                                        icon="pi pi-pencil"
                                        className="p-button-warning p-button-sm"
                                        onClick={() => setMode("edit")}
                                    />
                                )}

                                {(isClosed || isVoidTicket) && (
                                    <Button
                                        label="Generar PDF"
                                        icon="pi pi-file-pdf"
                                        className="p-button-danger p-button-sm"
                                        onClick={handleGenerarPDF}
                                        loading={loading}
                                    />
                                )}
                            </>
                        ) : (
                            <Button
                                className="p-button-submit p-button-sm"
                                onClick={handleSubmit(handleSave)}
                                label={tktId ? "Guardar" : "Registrar"}
                                loading={loading}
                                disabled={loading}
                                icon="pi pi-save"
                            />
                        )}
                    </div>
                </>
            )}

            {/* ConfirmDialog */}
            <ConfirmDialog
                visible={confirmDialogVisible}
                onHide={() => setConfirmDialogVisible(false)}
                message={
                    <div className="flex flex-column gap-3 mt-2">
                        <span>{textoMotivo}</span>
                        <InputTextarea
                            rows={3}
                            autoFocus
                            value={comentario}
                            onChange={(e) => setComentario(e.target.value)}
                            placeholder={placeholderMotivo}
                        />

                        {/* Solo mostrar subida de evidencia extra cuando se está cerrando */}
                        {nuevoEstado === ESTADOS.CERRADO && (
                            <div className="mt-2">
                                <div className="mb-2" style={{ fontWeight: 600 }}>
                                    Evidencia final (opcional)
                                </div>
                                <UploadNativo
                                    inputId="upload-evidencia-final-confirm"
                                    fileList={closeDialogFiles}
                                    onUpload={onConfirmAddFinalFile}     // agrega a la lista local del dialog
                                    onRemove={onConfirmRemoveFinalFile} // remueve de la lista local del dialog
                                    onPreview={previewEvidence}         // ya maneja blobs y fileId
                                    onDownload={downloadEvidence}       // no tendrá fileId (solo activos cuando exista)
                                    disabled={closeDialogUploading || !tktId}
                                    forzarCamara={false}
                                    upload={true}
                                    maxCount={10}
                                    hideEmptyPreview        // 👈 solo botón cuando está vacío
                                    compact
                                />
                                {closeDialogUploading && (
                                    <ProgressBar value={closeDialogPct} style={{ height: 6 }} />
                                )}
                                {!tktId && (
                                    <small className="text-600">
                                        Guarda el ticket antes de adjuntar evidencias finales.
                                    </small>
                                )}
                            </div>
                        )}
                    </div>
                }
                header={tituloCambioEstado}
                icon={iconoCambioEstado}
                acceptLabel="Confirmar"
                rejectLabel="Cancelar"
                acceptClassName={acceptClassCambioEstado}
                accept={handleConfirmChangeEstado}
                reject={() => setConfirmDialogVisible(false)}
            />
        </div>
    );







    const MotivoCambio = mode === "edit" && estadoDialogVisible && (
        <div className="mt-3">
            <label className="font-semibold">
                {motivosLabels[nuevoEstado] || "Motivo del cambio:"}
            </label>
            <InputTextarea
                value={comentario}
                onChange={(e) => setComentario(e.target.value)}
                autoResize
                rows={3}
                className="w-full mt-2"
                placeholder="Describe el motivo del cambio..."
            />
        </div>
    );

    const fields = useMemo(() => {
        // localización seleccionada (si hay)
        const sel = locations.find((l) => l.uid === localizacionId);

        // flags que se le pasan al form
        const locationFlags = {
            aplicaBloque: !!sel?.aplicaBloque,
            aplicaLocal: !!sel?.aplicaLocal,
            aplicaPropietario: !!sel?.aplicaPropietario,
            lcaAreaId: sel?.lcaAreaId ?? null, // 👈 si lo tienes en el mapeo del back
            tipo: sel?.tipo ?? null, // "LOCAL" | "LOCALIZACION"
            bloId: sel?.bloId ?? null,                                  // ⬅️ NUEVO
            tieneBloquePorDefecto: sel?.tieneBloquePorDefecto ? 1 : 0,  // ⬅️ NUEVO
        };

        // 👉 Reglas de bloques:
        // - Si HAY localización y aplicaBloque=1 pero aplicaPropietario=0
        //   (ZONAS COMUNES / BAÑOS PÚBLICOS) -> usar todos los bloques del centro.
        // - En cualquier otro caso -> usar la lista normal (filtrada por cliente).
        const bloquesForForm =
            sel && locationFlags.aplicaBloque && !locationFlags.aplicaPropietario
                ? allBlocksFromLocales
                : bloques;

        return ticketsForm({
            clientes,
            bloques: bloquesForForm, // 👈 aquí va la lista ya calculada
            locales,
            areas,
            encargados,
            prioridades,
            estados,
            camposBloqueados,
            onCreateCliente: handleCreateCliente,
            onEditCliente: handleEditCliente,
            readOnly,
            localId,
            localizaciones: locations,
            locationFlags,
        });
    }, [
        clientes,
        bloques,
        allBlocksFromLocales, // 👈 importante
        locales,
        areas,
        encargados,
        prioridades,
        estados,
        readOnly,
        localId,
        locations,
        localizacionId,
        JSON.stringify(camposBloqueados),
    ]);
    const EvidencePanel = (
        <Accordion multiple activeIndex={[0]}>
            {/* INICIAL: habilitada en cualquier estado antes de CERRADO/ANULADO.
        Para ticket nuevo: sólo preview local; para existente: subida inmediata */}
            <AccordionTab header="Evidencias Iniciales">
                <div className="grid p-fluid">
                    <div className="col-12 md:col-12 text-center">
                        <UploadNativo
                            inputId="upload-evidencia-inicial"
                            fileList={initialFileList} // [{uid,url,thumbUrl,name,tipo,fileId}]
                            onUpload={agregarFotoInicial} // recibe (file)
                            onRemove={eliminarFotoInicial} // recibe (file)
                            onPreview={previewEvidence} // 👈
                            onDownload={downloadEvidence}
                            disabled={!canUploadInitialEvidence}
                            forzarCamara={false /* o permisos.some(...) */}
                            upload={true} // muestra botón cargar
                            maxCount={10} // múltiple por UI (repite selección)
                        />

                        {/* <UploadNativo
  fileList={files}
  onUpload={uploadFile}
  onRemove={removeFile}
  onPreview={handlePreview}
  onDownload={handleDownload}
/> */}
                        {isInitialUpload && (
                            <ProgressBar value={initialUploadPct} style={{ height: 6 }} />
                        )}
                        {isClosedOrVoid(estadoActual) && (
                            <div className="text-600 mt-2">
                                Ticket cerrado/anulado: solo lectura.
                            </div>
                        )}

                        {/* {estadoActual === ESTADOS.EN_PROCESO && !isClosedOrVoid(estadoActual) && (
                            <div className="text-600 mt-2">
                                La evidencia inicial no puede modificarse cuando el ticket está en
                                <strong> "En Proceso"</strong>.
                            </div>
                        )} */}
                    </div>
                </div>
            </AccordionTab>

            {showProcessEvidence && (
                <AccordionTab header="Evidencias de Proceso">
                    <div className="grid p-fluid">
                        <div className="col-12 md:col-12 text-center">
                            <UploadNativo
                                inputId="upload-evidencia-proceso"
                                fileList={processFileList}
                                onUpload={agregarFotoProceso}     // 👈 NUEVO
                                onRemove={eliminarFotoProceso}     // 👈 NUEVO
                                onPreview={previewEvidence}
                                onDownload={downloadEvidence}
                                disabled={!canEditProcessEvidence}
                                forzarCamara={false}
                                upload={!!tktId}
                                maxCount={10}
                            />
                            {isProcessUpload && <ProgressBar value={processUploadPct} style={{ height: 6 }} />}
                            {(!canEditProcessEvidence) && (
                                <div className="text-600 mt-2">Solo lectura en este estado.</div>
                            )}
                        </div>
                    </div>
                </AccordionTab>
            )}


            {/* FINAL: desde EN_PROCESO; en cerrado/anulado solo lectura */}
            {showFinalEvidence && (
                <AccordionTab header="Evidencias Finales">
                    <div className="grid p-fluid">
                        <div className="col-12 md:col-12 text-center">
                            <UploadNativo
                                inputId="upload-evidencia-final"
                                fileList={finalFileList}
                                onUpload={agregarFotoFinal}
                                onRemove={eliminarFotoFinal}
                                onPreview={previewEvidence}
                                onDownload={downloadEvidence}
                                disabled={!canEditFinalEvidence}
                                forzarCamara={false}
                                upload={!!tktId} // requiere ticket existente
                                maxCount={10}
                            />
                            {isFinalUpload && (
                                <ProgressBar value={finalUploadPct} style={{ height: 6 }} />
                            )}
                            {!tktId && (
                                <div className="text-600 mt-2">
                                    Guarda el ticket para habilitar evidencia final.
                                </div>
                            )}
                            {isClosedOrVoid(estadoActual) && (
                                <div className="text-600 mt-2">
                                    solo lectura.
                                </div>
                            )}
                        </div>
                    </div>
                </AccordionTab>
            )}
        </Accordion>
    );

    const FormPanel = (
        <FormProvider {...methods}>
            <div className="mt-2">
                <GenericFormSection
                    // fields={ticketsForm({
                    //     clientes,
                    //     bloques,
                    //     locales,
                    //     areas,
                    //     encargados,
                    //     prioridades,
                    //     estados,
                    //     camposBloqueados: camposBloqueados,
                    //     onCreateCliente: handleCreateCliente,
                    //     onEditCliente: handleEditCliente,
                    // })}
                    fields={fields}
                />
                {MotivoCambio}
            </div>
        </FormProvider>
    );

    const HistoryPanel = (
        <>
            {cargandoHistorial ? (
                <div className="text-center p-4">
                    <i className="pi pi-spin pi-spinner" style={{ fontSize: "2rem" }} />
                    <p className="mt-2">Cargando historial...</p>
                </div>
            ) : historial.length === 0 ? (
                <div className="text-center text-muted py-4">
                    <i className="pi pi-history" style={{ fontSize: "2rem" }} />
                    <p>Aún no hay información del historial.</p>
                </div>
            ) : (
                // ⬇️ quita el maxHeight aquí y deja solo overflow en el contenedor de la columna
                <div className="timeline-container pr-2">
                    {historial.map((item, index) => (
                        <div key={index} className="timeline-item">
                            <div className="timeline-icon">
                                <i className={getIconByAccion(item.accionId)} />
                            </div>
                            <div className="timeline-content">
                                <p className="timeline-date">
                                    {new Date(item.fecha).toLocaleString()}
                                </p>
                                <p className="timeline-title">
                                    <strong>{item.accionNombre}</strong>
                                </p>
                                <p className="timeline-user">{item.usuarioNombre}</p>
                                {(item.estadoAnteriorNombre || item.estadoNuevoNombre) && (
                                    <p className="timeline-status">
                                        {item.estadoAnteriorNombre || "Creado"} →{" "}
                                        <strong>{item.estadoNuevoNombre}</strong>
                                    </p>
                                )}
                                {item.comentario && (
                                    <p className="timeline-comment">
                                        <FiMessageSquare
                                            style={{ marginRight: 6, verticalAlign: "middle" }}
                                        />
                                        {item.comentario}
                                    </p>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </>
    );

    return (
        <Dialog
            // maximized ={isMobile || isTablet}
            // maximizable
            visible={visible}
            onHide={closeForm}
            header={HeaderTitle}
            footer={FooterButtons}
            closable
            dismissableMask
            modal
            blockScroll
            maximizable={isDesktop}
            className={isMobile ? "p-dialog-fullscreen" : "p-dialog-lg tickets-dialog"}
            style={
                isMobile
                    ? { width: "100vw", maxWidth: "100vw", height: "100dvh", margin: 0 }
                    : { width: isTablet ? "80vw" : "70vw", maxWidth: 1200 }
            }
            contentStyle={
                isMobile
                    ? { display: "flex", flexDirection: "column", overflow: "hidden", padding: 0 }
                    : {}
            }
        >
            {/* ⬇️ El wrapper NO debe estar vacío */}
            <div
                className="tickets-modal"
                style={{
                    position: "relative",
                    overflow: "hidden",
                    height: isMobile ? "100%" : "auto",
                }}
            >
                {!isMobile ? (
                    isEditing ? (
                        <div className="grid" style={{ marginTop: 4 }}>
                            <div
                                className="col-12 md:col-7"
                                style={{ borderRight: "1px solid #eee" }}
                            >
                                <h5 className="mt-0 mb-3">
                                    {mode === "new"
                                        ? "Crear ticket"
                                        : mode === "view"
                                            ? "Detalle del"
                                            : "Editar ticket"}{" "}
                                    ticket
                                </h5>
                                {FormPanel}
                                {EvidencePanel}
                            </div>
                            <div className="col-12 md:col-5">
                                <h5 className="mt-0 mb-3">Histórico</h5>
                                {HistoryPanel}
                            </div>
                        </div>
                    ) : (
                        // Desktop: SOLO el formulario a todo el ancho si es nuevo
                        <div>
                            {/* <h4 className="text-center">Copropietario </h4> */}
                            {FormPanel}
                            {EvidencePanel}
                        </div>
                    )
                ) : isEditing ? (
                    <div style={{ flex: 1, minHeight: 0, overflow: "auto", padding: "1rem" }}>
                        <TabView className="w-full">
                            <TabPanel header="Información">{FormPanel}</TabPanel>
                            <TabPanel header="Evidencias">{EvidencePanel}</TabPanel>
                            <TabPanel header="Histórico">{HistoryPanel}</TabPanel>
                        </TabView>
                    </div>
                ) : (
                    // Mobile: sin TabView cuando es nuevo
                    <div style={{ flex: 1, minHeight: 0, overflow: "auto", padding: "1rem" }}>
                        <TabView className="w-full">
                            <TabPanel header="Información">
                                <h4 className="text-center">Copropietario </h4>
                                {FormPanel}
                            </TabPanel>
                            <TabPanel header="Evidencias">{EvidencePanel}</TabPanel>
                        </TabView>
                    </div>
                )}

                {/* ---- Máscara + Panel inline (cliente) DENTRO de .tickets-modal ---- */}
                <div
                    className={`inline-inside-dialog-mask ${showClientePanel ? "show" : ""}`}
                    onClick={closeClientePanel}
                />
                {showClientePanel && (
                    <VenUsuario
                        ref={venUsuarioRef}
                        inline
                        addItem={handleAddCliente}
                        updateItem={handleUpdateCliente}
                        setCurrentUser={() => { }}
                        setDeleteDialogVisible={() => { }}
                        canAssignPermission={false}
                        canDelete={false}
                        listperfiles={listperfiles}
                        isClientUrl
                    />
                )}
            </div>
            {showFilePreview && (
                <VerFileSharePoint
                    title="Vista de evidencia"
                    visible={showFilePreview}
                    fileId={filePreviewId}
                    onClose={() => {
                        setShowFilePreview(false);
                        setFilePreviewId(null);
                    }}
                />
            )}
            {showReportPreview && (
                // <VerFileSharePoint
                //     title="Informe del ticket"
                //     visible={showReportPreview}
                //     fileUrl={reportPreviewUrl}
                //     onClose={() => {
                //         setShowReportPreview(false);
                //         if (reportPreviewUrl?.startsWith("blob:")) {
                //             window.URL.revokeObjectURL(reportPreviewUrl);
                //         }
                //         setReportPreviewUrl(null);
                //     }}
                // />

                <VerFileBuffer
                    title="Informe del ticket"
                    visible={showReportPreview}
                    fileUrl={reportPreviewUrl} // aquí pasamos la URL del blob
                    onClose={() => {
                    setShowReportPreview(false);
                    if (reportPreviewUrl?.startsWith("blob:")) {
                        window.URL.revokeObjectURL(reportPreviewUrl);
                    }
                    setReportPreviewUrl(null);
                    }}
                />
            )}
        </Dialog>
    );
});

export default VenTickets;
