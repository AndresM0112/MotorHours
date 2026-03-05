import React, {
    useState,
    useEffect,
    useContext,
    forwardRef,
    useImperativeHandle,
    useCallback,
    useMemo,
    useRef
} from "react";
import { AuthContext } from "@context/auth/AuthContext";
import { ToastContext } from "@context/toast/ToastContext";
import { Button } from "primereact/button";
import { FormProvider, useForm } from "react-hook-form";
import Axios from "axios";
import { arraysEqual, estados, headers, propsSelectButton } from "@utils/converAndConst";
import { isEmail, isStrongPassword } from "@utils/validations";
import {
    saveUserAPI,
    updateUserPermissionsAPI,
    updateUserPhotoAPI,
    saveUserProfileAPI,
    getUserByIdApi,
} from "@api/requests";
import {
    getBlocksByClientAPI,
    getLocalesByBlockAndClientAPI
} from "@api/requests/blocksApi";
import useHandleApiError from "@hook/useHandleApiError";
import GenericFormSection from "@components/data/GenericFormSection";
import moment from "moment";
import Cookies from "js-cookie";
import { Sidebar } from "primereact/sidebar";
import { useMediaQueryContext } from "@context/mediaQuery/mediaQueryContext";
import { TabPanel, TabView } from "primereact/tabview";
import UserImageUploader from "./UserImageUploader";
import PermisosTab from "./PermisosTab";
import { uploadFile } from "@api/firebase/handleFirebase";
import { getAllAreasAPI } from "@api/requests/areasApi";
import { getAllBlocksAPI } from "@api/requests/blocksApi";
import { getAllAPI as getAllInsurersAPI } from "@api/requests/insureApi";
import { getAllAPI as getAllrefundableTypeAPI } from "@api/requests/RefundableTypeApi";
import '../../home/components/styles/Tickets.css';

const asNumSorted = (arr = []) => [...(arr || [])].map(Number).sort((a, b) => a - b);

const normalizeProjects = (arr = []) =>
    (arr || [])
        .map(r => ({
            id: Number(r.id ?? r.proId ?? r.proyectoId ?? r.projectId),
            nombre: r.nombre ?? r.proNombre ?? r.projectName ?? String(
                r.id ?? r.proId ?? r.proyectoId ?? r.projectId ?? ''
            ),
        }))
        .filter(p => Number.isFinite(p.id));


const asValidId = (v) => {
    const n = Number(v);
    return Number.isFinite(n) && n > 0 ? n : null; // 0 o NaN -> null
};



const VenUsuario = forwardRef(
    (
        {
            addItem,
            updateItem,
            deleteItem,
            setCurrentUser,
            setDeleteDialogVisible,
            canAssignPermission,
            canDelete,
            listperfiles,
            ProfileMode = false,
            setUsuFoto,
            isClientUrl,
            isEmployeeUrl,
            /** NUEVO: activa modo inline */
            // inline = false,
            /** opcional: callback al cerrar inline */
            // onInlineClose,
        },
        ref
    ) => {


        const { nombreusuario, idusuario } = useContext(AuthContext);
        const { showSuccess, showInfo, showError } = useContext(ToastContext);
        const { isMobile, isTablet, isDesktop } = useMediaQueryContext();
        const handleApiError = useHandleApiError();

        const [userImage, setUserImage] = useState({
            file: null,
            preview: null,
            firebaseUrl: null,
        });
        const [activeTab, setActiveTab] = useState(0);
        const [PerfilInicial, setPerfilInicial] = useState(null);
        const [VentanasInicial, setVentanaInicial] = useState([]);
        const [ventanasDisponibles, setVentanasDisponibles] = useState([]);
        const [areas, setAreas] = useState([]);
        // catálogo de aseguradoras (opciones)
        const [insurersOptions, setInsurersOptions] = useState([]);
        const [visible, setVisible] = useState(false);
        const [usuId, setUsuId] = useState(0);

        const [unidadesCliente, setUnidadesCliente] = useState([]);

        const [originalData, setOriginalData] = useState({});
        const [loading, setLoading] = useState(false);

        const [isClient, setIsClient] = useState(!isClientUrl);
        const [isEmployee, setIsEmployee] = useState(!isEmployeeUrl);

        const [lists, setLists] = useState({
            projectsLists: [],
            refundableTypeList: [],
        });

        const [localesOptions, setLocalesOptions] = useState([]); // Locales dependientes del bloque

        const defaultValues = {
            perfil: isClient ? 3 : isEmployee ? 14 : null,
            nombre: "",
            apellido: "",
            documento: "",
            telefono: "",
            direccion: "",
            usuario: "",
            correo: "",
            clave: "",
            confclave: "",
            acceso: isClient || isEmployee ? false : true,
            cambioclave: 0,
            estid: 1,
            usuventanas: [],
            usuareas: [],
            aseguradoras: [],
            valorHora: null,
            // tirIds: [],
            // proIds: [10],
            bloqueId: null,
            localId: null,
        };

        useEffect(() => {
            const fetchLists = async () => {
                try {
                    const [refundableTypeRes] = await Promise.all([
                        getAllrefundableTypeAPI(),
                    ]);

                    let projects = [];
                    if (isClient && usuId > 0) {
                        // Bloques asignados al cliente
                        const { data: blocksByClient } = await getBlocksByClientAPI(usuId);
                        projects = (blocksByClient || []).map(r => ({
                            id: Number(r.id ?? r.proId ?? r.proyectoId ?? r.projectId),
                            nombre: r.nombre ?? r.proNombre ?? r.projectName ?? String(r.id ?? r.proId ?? '')
                        }));
                        // Fallback: si no tiene bloques asignados, carga todos (para no dejar vacío el dropdown)
                        if (projects.length === 0) {
                            const projectsRes = await getAllBlocksAPI();
                            projects = (projectsRes.data || []).map(r => ({
                                id: Number(r.id ?? r.proId ?? r.proyectoId ?? r.projectId),
                                nombre: r.nombre ?? r.proNombre ?? r.projectName ?? String(r.id ?? r.proId ?? '')
                            }));
                        }
                    } else {
                        // No es cliente o es alta → todos
                        const projectsRes = await getAllBlocksAPI();
                        projects = (projectsRes.data || []).map(r => ({
                            id: Number(r.id ?? r.proId ?? r.proyectoId ?? r.projectId),
                            nombre: r.nombre ?? r.proNombre ?? r.projectName ?? String(r.id ?? r.proId ?? '')
                        }));
                    }



                    setLists((prev) => ({
                        ...prev,
                        projectsLists: projects,
                        refundableTypeList: refundableTypeRes.data,
                    }));
                } catch (error) {
                    console.error("Error al cargar listas:", error);
                }
            };

            if (visible) fetchLists();
        }, [visible]);

        const methods = useForm({ defaultValues, shouldUnregister: false });
        const { handleSubmit, reset, setValue, watch } = methods;
        const [permisosSeleccionados, setPermisosSeleccionados] = useState([]);
        const [originalPermiss, SetOriginalPermiss] = useState([]);
        // Derivar valores observados (no uses watch() directo en deps)
        // const perfil = watch("perfil");
        const perfil = watch("perfil");
        const acceso = watch("acceso");
        const bloqueId = watch("bloqueId");
        const localId = watch("localId");

        const permisOrigRef = useRef(false);

        useEffect(() => {
            if (!permisOrigRef.current) {
                permisOrigRef.current = true;
                SetOriginalPermiss(permisosSeleccionados);
            }
        }, [permisosSeleccionados]);



        // Si por alguna razón llegan como string, corrige una sola vez:
        useEffect(() => {
            if (typeof bloqueId === 'string') setValue('bloqueId', Number(bloqueId), { shouldDirty: false });
        }, [bloqueId, setValue]);
        useEffect(() => {
            if (typeof localId === 'string') setValue('localId', Number(localId), { shouldDirty: false });
        }, [localId, setValue]);


        // 🔁 Cuando cambia el bloque seleccionado, cargar locales dependientes
        useEffect(() => {
            if (!visible) return;
            if (!bloqueId) {
                setLocalesOptions([]);
                setValue("localId", null);
                return;
            }
            getLocalesByBlockAndClientAPI({ bloId: bloqueId, clientId: isClient ? usuId : null })
                .then(({ data }) => {
                    const mapped = (data || []).map(r => ({
                        id: Number(r.etaId ?? r.id),
                        nombre: r.nombre,
                    }));
                    setLocalesOptions(mapped);

                    // 👇 solo autoseleccionar si NO hay un local ya puesto
                    const current = methods.getValues("localId");
                    if (current == null) {
                        if (mapped.length === 1) {
                            setValue("localId", mapped[0].id, { shouldDirty: true, shouldValidate: true });
                        }
                        // si hay varios y no hay current, lo dejamos en null para que el usuario elija
                    }
                    // importante: NO limpiar localId si ya había uno, aunque no esté en la lista (lo controla editUser)
                })
                .catch(err => {
                    if (err?.response?.status === 404) {
                        setLocalesOptions([]);
                        setValue("localId", null);
                    } else {
                        handleApiError(err);
                    }
                });
        }, [visible, bloqueId, isClient, usuId]);
        const resetFormState = () => {
            reset(defaultValues);
            setUsuId(0);
            setOriginalData({});
            setPerfilInicial(null);
            setVentanaInicial([]);
            setPermisosSeleccionados([]);
            setUserImage({ file: null, preview: null, firebaseUrl: null });
        };

        const newUser = () => {
            resetFormState();
            setIsClient(!!isClientUrl);
            setIsEmployee(!!isEmployeeUrl);
            setActiveTab(0);
            setVisible(true);
        };

        const editUser = async (item, tabIndex = 0) => {
            setUsuId(item.usuId);
            setActiveTab(tabIndex);

            try {
                const { data } = await getUserByIdApi(item.usuId);
                if (!data) {
                    showError("No se encontró información del usuario.");
                    return;
                }

                // const isClientProfile = data.perfil === 3 || !!isClientUrl;
                // const isEmployeeProfile = data.perfil === 14 || !!isEmployeeUrl;
                // setIsClient(isClientProfile);
                // setIsEmployee(isEmployeeProfile);

                // const isClientProfile = Number(data.perfil) === 3;
                // const isEmployeeProfile = Number(data.perfil) === 14;

                // // En edición, que mande el perfil del registro, no la URL
                // setIsClient(isClientProfile);
                // setIsEmployee(isEmployeeProfile);

                if (data.perfil === 3) setIsClient(true);
                else if (data.perfil === 14) setIsEmployee(true);


                const processedData = {
                    ...data,
                    // perfil: Number(data.perfil),
                    acceso: data.acceso === 1,
                    agenda: data.agenda === 1,
                    instructor: data.instructor === 1,
                    requiere_confirmacion: data.requiere_confirmacion === 1,
                    cambioclave: data.cambioclave === 1,
                    usuventanas: data.usuventanas ? data.usuventanas.split(",").map(Number) : [],
                    usuareas: data.usuareas ? data.usuareas.split(",").map(Number) : [],
                    aseguradoras: data.aseguradoras ? data.aseguradoras.split(",").map(Number) : [],
                    tirIds: data.tirIds ? data.tirIds.split(",").map(Number) : [],
                    proIds: data.proIds ? data.proIds.split(",").map(Number) : [],
                };

                // Foto
                setUserImage(
                    data.usuFoto
                        ? { file: null, preview: data.usuFoto, firebaseUrl: data.usuFoto }
                        : { file: null, preview: null, firebaseUrl: null }
                );

                // Ids existentes
                const existingBloqueId = asValidId(
                    (Array.isArray(data.proIds) && data.proIds.length ? data.proIds[0] : null)
                    ?? data.bloqueId ?? data.proyectoId ?? data.projectId
                );

                const existingLocalId = asValidId(data.localId ?? data.unidadId);


                // 1) reset base (SIN bloque/local) para no colisionar con options aún vacías
                reset({
                    ...processedData,
                    bloqueId: null,
                    localId: null,
                });
                setOriginalData({
                    ...processedData,
                    bloqueId: existingBloqueId ?? null,
                    localId: existingLocalId ?? null,
                });



                // 2) cargar proyectos (bloques)
                let projects = [];
                if (data.perfil === 3 && item.usuId) {
                    try {
                        const { data: blocksByClient } = await getBlocksByClientAPI(item.usuId);
                        projects = normalizeProjects(blocksByClient);
                    } catch { }
                }
                if (projects.length === 0) {
                    const projectsRes = await getAllBlocksAPI();
                    projects = normalizeProjects(projectsRes.data);
                }

                // 🧠 AUTODETECCIÓN: si tengo localId pero bloqueId es null, busca el bloque que contiene ese local
                let detectedBloqueId = existingBloqueId;
                let locals = []; // <- lo usaremos también abajo

                if (!detectedBloqueId && existingLocalId) {

                    for (const p of projects) {
                        try {
                            const { data: locs } = await getLocalesByBlockAndClientAPI({
                                bloId: p.id,
                                clientId: data.perfil === 3 ? item.usuId : null,
                            });
                            const mapped = (locs || []).map(r => ({ id: Number(r.etaId ?? r.id), nombre: r.nombre }));
                            const hit = mapped.some(l => Number(l.id) === Number(existingLocalId));
                            console.log('[DETECT] revisando bloque', p.id, '→ contiene local?', hit);
                            if (hit) {
                                detectedBloqueId = p.id;
                                locals = mapped; // ya tenemos los locales del bloque correcto
                                break;
                            }
                        } catch (e) {
                            // silencioso
                        }
                    }
                }

                setLists(prev => ({ ...prev, projectsLists: projects }));

                // Si aún no cargamos locals (caso normal cuando sí había bloque), hazlo:
                if (!locals.length && detectedBloqueId) {
                    try {
                        const { data: locs } = await getLocalesByBlockAndClientAPI({
                            bloId: detectedBloqueId,
                            clientId: data.perfil === 3 ? item.usuId : null,
                        });
                        locals = (locs || []).map(r => ({ id: Number(r.etaId ?? r.id), nombre: r.nombre }));
                    } catch { }
                }
                setLocalesOptions(locals);

                // 4) Setear valores en RHF con lo detectado/cargado
                if (detectedBloqueId && projects.some(p => p.id === detectedBloqueId)) {
                    setValue("bloqueId", detectedBloqueId, { shouldDirty: false, shouldValidate: true });

                } else {
                    setValue("bloqueId", null, { shouldDirty: false, shouldValidate: true });

                }

                if (existingLocalId && locals.some(o => o.id === existingLocalId)) {
                    setValue("localId", existingLocalId, { shouldDirty: false, shouldValidate: true });

                } else {
                    setValue("localId", null, { shouldDirty: false, shouldValidate: true });

                }

                setVisible(true);
            } catch (err) {
                handleApiError(err);
            }
        };




        useEffect(() => {
            if (visible) {
                getAllInsurersAPI().then((res) => setInsurersOptions(res.data || []));
                getAllAreasAPI().then((res) => setAreas(res.data || []));

                // if (isClient) {
                //     getUnidadesByClienteAPI(usuId)
                //         .then((res) => {
                //             setUnidadesCliente(res.data || []);
                //             const asignadas = (res.data || [])
                //                 .filter((u) => u.asignada)
                //                 .map((u) => u.id);
                //             setValue("unidadesCliente", asignadas);
                //         })
                //         .catch((err) => {
                //             console.error("Error al cargar unidades del cliente:", err);
                //             showError("No se pudieron cargar las unidades");
                //         });
                // }
            }
            // eslint-disable-next-line react-hooks/exhaustive-deps
        }, [visible, usuId]);

        const editProfile = async (data) => {
            setUsuId(data.usuId);
            const processedData = { ...data };
            reset(processedData);

            if (data.usufoto) {
                setUserImage({ file: null, preview: data.usufoto, firebaseUrl: data.usufoto });
            } else {
                setUserImage({ file: null, preview: null, firebaseUrl: null });
            }
            setVisible(true);
        };

        const getVentanas = async (prfId) => {
            try {
                const { data } = await Axios.get("api/auth/get_windows_by_profile", {
                    params: { prfId },
                    headers: {
                        ...headers,
                        Authorization: `Bearer ${Cookies.get("tokenMOTORHOURSNEW")}`,
                    },
                });

                setVentanasDisponibles(data);

                if (usuId === 0) {
                    setValue(
                        "usuventanas",
                        data.map((v) => v.id)
                    );
                } else {
                    if (prfId === PerfilInicial && VentanasInicial.length > 0) {
                        setValue(
                            "usuventanas",
                            typeof VentanasInicial === "string" ? VentanasInicial.split(",").map(Number) : VentanasInicial
                        );
                    } else {
                        setValue(
                            "usuventanas",
                            data.map((v) => v.id)
                        );
                    }
                }
            } catch (error) {
                handleApiError(error);
            }
        };

        useEffect(() => {
            if (!perfil) return;
            getVentanas(perfil);
            // eslint-disable-next-line react-hooks/exhaustive-deps
        }, [perfil]);

        // Manejo de perfil → client/employee + limpieza de aseguradoras si cambia
        // useEffect(() => {
        //     const perfil = watch("perfil");
        //     if (perfil) {
        //         if (perfil === 3) {
        //             setIsClient(true);
        //         } else if (perfil === 14) {
        //             setIsEmployee(true);
        //         } else {
        //             setIsClient(false);
        //             setIsEmployee(false);
        //             setValue("aseguradoras", []);
        //         }
        //     }
        //     // eslint-disable-next-line react-hooks/exhaustive-deps
        // }, [watch("perfil")]);
        useEffect(() => {
            if (!perfil) return;

            if (perfil === 3) {
                setIsClient(true);
                setIsEmployee(false);
            } else if (perfil === 14) {
                setIsEmployee(true);
                setIsClient(false);
            } else {
                setIsClient(false);
                setIsEmployee(false);
                setValue("aseguradoras", []);
            }

            // si quieres mantener el fetch de ventanas en el mismo efecto:
            getVentanas(perfil);
            // eslint-disable-next-line react-hooks/exhaustive-deps
        }, [perfil]);

        const saveUser = async (datos) => {
            setLoading(true);

            const {
                perfil,
                nombre,
                apellido,
                documento,
                usuario = "",
                correo = "",
                telefono = "",
                direccion = "",
                clave = "",
                confclave = "",
                acceso,
                agenda,
                instructor,
                requiere_confirmacion,
                cambioclave,
                estid,
                valorHora = null,
                aseguradoras: aseguradorasForm = [],
            } = datos;

            console.log(datos);

            const hasPasswordChange = typeof clave === "string" && clave.trim().length > 0;

            const usuventanas = acceso ? (datos.usuventanas || []).join(",") : null;
            const usuareas = acceso ? (datos.usuareas || []).join(",") : null;

            // const tirIds = (datos.tirIds || []).map(Number);
            // const proIds = (datos.proIds || []).map(Number);

            const tirIds = (datos.tirIds || []).map(Number);
            const bloqueId = datos.bloqueId ? Number(datos.bloqueId) : null;
            const localId = datos.localId ? Number(datos.localId) : null;
            const proIds = bloqueId ? [bloqueId] : []; // ⚙️ compatibilidad (si tu backend usa proIds)


            const accesoChange = acceso ? 1 : 0;
            const agendaChange = agenda ? 1 : 0;
            const instructorChange = instructor ? 1 : 0;
            const requiereConfirmacionChange = requiere_confirmacion ? 1 : 0;
            const cambioclaveChange = cambioclave ? 1 : 0;

            // Normaliza aseguradoras siempre como array numérico y sin duplicados
            const selectedAseguradoras = Array.from(new Set((aseguradorasForm || []).map(Number)));

            // Comparación sin cambios (tipos y orden ya normalizados)



            const noChanges =
                usuId > 0 &&
                acceso &&
                agenda &&
                instructor &&
                perfil === originalData.perfil &&
                nombre === originalData.nombre &&
                apellido === originalData.apellido &&
                documento === originalData.documento &&
                usuario === originalData.usuario &&
                correo === originalData.correo &&
                telefono === originalData.telefono &&
                direccion === originalData.direccion &&
                accesoChange === (originalData.acceso ? 1 : 0) &&
                agendaChange === (originalData.agenda ? 1 : 0) &&
                instructorChange === (originalData.instructor ? 1 : 0) &&
                requiereConfirmacionChange === (originalData.requiere_confirmacion ? 1 : 0) &&
                cambioclaveChange === (originalData.cambioclave ? 1 : 0) &&
                estid === originalData.estid &&
                valorHora === originalData.valorHora &&
                arraysEqual(asNumSorted(originalData.usuventanas || []), asNumSorted(datos?.usuventanas || [])) &&
                arraysEqual(asNumSorted(originalData.aseguradoras || []), asNumSorted(selectedAseguradoras || [])) &&
                arraysEqual(asNumSorted(originalData.tirIds || []), asNumSorted(datos?.tirIds || [])) &&
                arraysEqual(asNumSorted(originalData.proIds || []), asNumSorted(datos?.proIds || [])) &&
                arraysEqual(asNumSorted(originalPermiss || []), asNumSorted(permisosSeleccionados || []))
                && !hasPasswordChange;


            if (noChanges) {
                setLoading(false);
                return showInfo("No has realizado ninguna modificación");
            }

            const formData = new FormData();
            let uploadedImageUrl = null;

            // Subida de imagen SOLO si hay archivo nuevo
            if (userImage.file) {
                const folderPath = `usuarios/${usuId > 0 ? usuId : "temp"}`;
                await new Promise((resolve, reject) => {
                    uploadFile(
                        userImage.file,
                        folderPath,
                        null,
                        (downloadURL) => {
                            uploadedImageUrl = downloadURL;
                            resolve();
                        },
                        (error) => {
                            console.error("Error al subir imagen:", error);
                            reject(error);
                        }
                    );
                });
            }

            const seleccionUnidades = (datos.unidadesCliente || [])
                .map((id) => {
                    const unidad = unidadesCliente.find((u) => u.id === id);
                    return unidad ? { uniId: unidad.id, etaId: unidad.etapaId } : null;
                })
                .filter(Boolean);

            const aseguradorasToSend = perfil === 14 ? selectedAseguradoras : [];

            const payload = {
                unidadesCliente: seleccionUnidades || [],
                tirIds: tirIds || [],
                proIds: proIds || [],
                bloqueId: bloqueId ?? "",
                localId: localId ?? "",
                usuFoto: uploadedImageUrl || userImage?.firebaseUrl || "",
                perfil,
                nombre,
                apellido,
                documento,
                usuario,
                correo,
                telefono,
                direccion,
                clave,
                confclave,
                acceso: Boolean(accesoChange),
                agenda: Boolean(agendaChange),
                instructor: Boolean(instructorChange),
                requiere_confirmacion: Boolean(requiereConfirmacionChange),
                cambioclave: Boolean(cambioclaveChange),
                estid: String(estid),
                valorHora: valorHora ?? "",
                usuventanas: usuventanas ?? "",
                usuareas: usuareas ?? "",
                usuId: String(usuId),
                idusuario: String(idusuario),
                usuarioact: nombreusuario,
                aseguradoras: perfil === 14 ? selectedAseguradoras : [],
            };


            try {
                const { data } = await saveUserAPI(payload);
                showSuccess(data.message);

                if (usuId === 0 && uploadedImageUrl && data.usuId) {
                    const folderPath = `usuarios/${data.usuId}`;
                    await new Promise((resolve, reject) => {
                        uploadFile(
                            userImage.file,
                            folderPath,
                            null,
                            async (downloadURLFinal) => {
                                await updateUserPhotoAPI({
                                    usuId: data.usuId,
                                    usuFoto: downloadURLFinal,
                                });
                                resolve();
                            },
                            reject
                        );
                    });
                }

                const finalUsuId = usuId > 0 ? usuId : data.usuId;

                if (permisosSeleccionados.length > 0) {
                    await updateUserPermissionsAPI({
                        permissions: permisosSeleccionados.map((p) => p.perId),
                        usuId: finalUsuId,
                    });
                }

                const item = {
                    usuId: usuId > 0 ? usuId : data.usuId,
                    usuFoto: uploadedImageUrl || userImage.firebaseUrl || null,
                    perfil,
                    nombre,
                    apellido,
                    documento: documento === "null" ? null : documento,
                    usuario: usuario === "null" ? null : usuario,
                    correo: correo === "null" ? null : correo,
                    telefono: telefono === "null" ? null : telefono,
                    direccion: direccion === "null" ? null : direccion,
                    clave,
                    confclave,
                    acceso: accesoChange,
                    agenda: agendaChange,
                    instructor: instructorChange,
                    requiere_confirmacion: requiereConfirmacionChange,
                    cambioclave: cambioclaveChange,
                    estid,
                    valorHora,
                    usuventanas,
                    usuareas,
                    aseguradoras: aseguradorasToSend, // mantener array en tu store/grilla
                    nomestado: estid === 1 ? "Activo" : "Inactivo",
                    nomperfil: listperfiles?.find((per) => per.id === perfil)?.nombre,
                    usuact: nombreusuario,
                    fecact: moment().format("YYYY-MM-DD HH:mm:ss"),
                };

                if (usuId > 0) {
                    if (originalData.perfil !== perfil) {
                        deleteItem({ id: usuId, idField: "usuId" });
                        // contarUsuarios()
                    }
                    else {
                        updateItem({ idField: "usuId", ...item })
                    }
                }
                else addItem(item);

                resetFormState();
                setVisible(false);
            } catch (error) {
                handleApiError(error);
            } finally {
                setLoading(false);
            }
        };

        const updateData = useCallback(
            async ({ campo = "", newValue, newFile = { file: null } }) => {
                setTimeout(async () => {
                    try {
                        let uploadedImageUrl = null;

                        if (newFile?.file) {
                            const folderPath = `usuarios/${usuId > 0 ? usuId : "temp"}`;
                            await new Promise((resolve, reject) => {
                                uploadFile(
                                    newFile.file,
                                    folderPath,
                                    null,
                                    (downloadURL) => {
                                        uploadedImageUrl = downloadURL;
                                        setUsuFoto(downloadURL);
                                        localStorage.setItem("usuFoto", downloadURL);
                                        resolve();
                                    },
                                    (error) => {
                                        console.error("Error al subir imagen:", error);
                                        reject(error);
                                    }
                                );
                            });
                        }

                        const params = {
                            usuact: nombreusuario,
                            ProfileMode,
                            fecact: moment().format("YYYY-MM-DD HH:mm:ss"),
                            campo,
                            value: newValue,
                            usuId: idusuario,
                            usuFoto: uploadedImageUrl || userImage.firebaseUrl || null,
                        };
                        await saveUserProfileAPI(params);
                    } catch (error) {
                        handleApiError(error);
                    }
                }, 100);
            },
            [userImage, ProfileMode, idusuario, nombreusuario, handleApiError, setUsuFoto, usuId]
        );

        // Agrupar unidades por proyecto (para el multiselect group)
        const unidadesAgrupadas = [];
        unidadesCliente.forEach((unidad) => {
            const proyectoExistente = unidadesAgrupadas.find((g) => g.nombre === unidad.proyectoNombre);
            const unidadItem = {
                id: unidad.id,
                nombre: `${unidad.etapaNombre} - ${unidad.nombre}`,
                proyectoNombre: unidad.proyectoNombre,
                etapaNombre: unidad.etapaNombre,
            };
            if (proyectoExistente) {
                proyectoExistente.items.push(unidadItem);
            } else {
                unidadesAgrupadas.push({
                    id: unidad.proyectoId,
                    nombre: unidad.proyectoNombre,
                    items: [unidadItem],
                });
            }
        });

        console.log("prueba campos", {

            usuId, perfil, acceso,
            isClient, isEmployee,
            isThirdParty: !isClient && !isEmployee,
            ventanas: ventanasDisponibles?.length
        });

        const fieldsForm = useMemo(() => {
            const common = [];

            if (!ProfileMode) {
                common.push({
                    key: "example-8",
                    type: "dropdown",
                    name: "perfil",
                    label: "Seleccionar Perfil",
                    options: listperfiles,
                    optionLabel: "nombre",
                    optionValue: "id",
                    validation: { required: "el campo perfil es requerido." },
                    required: true,
                    disabled: (isClient || isEmployee) && usuId > 0 && !canAssignPermission,
                    className: "col-12",
                });
            }

            common.push({
                key: "Documento",
                type: "text",
                name: "documento",
                label: "NIT / CC",
                keyfilter: "int",
                maxLength: 255,
                disabled: ProfileMode,
                className: "col-12",
                required: true,
            });

            if (!ProfileMode) {
                common.push(
                    {
                        key: "Nombre",
                        type: "text",
                        name: "nombre",
                        label: "Nombre(s)",
                        validation: { required: "el campo nombre es requerido." },
                        required: true,
                        maxLength: 255,
                        className: "col-12",
                    },


                    {
                        key: "Apellido",
                        type: "text",
                        name: "apellido",
                        label: "Apellido(s)",
                        validation: { required: "el campo apellido es requerido." },
                        required: true,
                        maxLength: 255,
                        className: "col-12",

                    }
                );
            }

            common.push({
                key: "Correo",
                type: "text",
                name: "correo",
                label: "Correo Electrónico",
                validation: { required: "El campo correo es requerido.", validate: isEmail() },
                props: !ProfileMode
                    ? { autoComplete: "off" }
                    : {
                        onBlur: (e) => updateData({ campo: "usu_correo", newValue: e.target.value }),
                        autoComplete: "off",
                    },
                required: true,
                maxLength: 255,
                className: "col-12",
            });
            // common.push({
            //     key: "Correo",
            //     type: "text",
            //     name: "correo",
            //     label: "Correo Electrónico",
            //     // Si quieres validar:
            //     // validation: { required: "El campo correo es requerido.", validate: isEmail() },
            //     maxLength: 255,
            //     className: "col-12",
            // });


            common.push({
                key: "Telefono",
                type: "text",
                name: "telefono",
                label: "Celular / Teléfono",
                props: !ProfileMode
                    ? { autoComplete: "off" }
                    : {
                        onBlur: (e) => updateData({ campo: "usu_telefono", newValue: e.target.value }),
                        autoComplete: "off",
                    },
                keyfilter: "int",
                maxLength: 11,
                disabled: false,
                className: "col-12",
            });


            common.push({
                key: "Direccion",
                type: "text",
                name: "direccion",
                label: "Dirección",
                props: !ProfileMode
                    ? { autoComplete: "off" }
                    : {
                        onBlur: (e) => updateData({ campo: "direccion", newValue: e.target.value }),
                        autoComplete: "off",
                    },
                // keyfilter: "int",
                maxLength: 255,
                className: "col-12",
            });



            if (perfil !== 3) {
                common.push({
                    key: "example-3",
                    type: "multiselect",
                    name: "usuareas",
                    label: "Seleccionar Áreas",
                    options: areas,
                    className: "col-12",
                });
            }

            // watch("perfil") === 14 && {
            //     key: "example-3",
            //     type: "multiselect",
            //     name: "aseguradoras",
            //     label: "Seleccionar Aseguradoras",
            //     options: insurersOptions,
            //     optionLabel: "nombre",
            //     optionValue: "id",
            //     className: "col-12",
            // },

            if (isClient) {
                common.push(
                    {
                        key: "client-bloque",
                        type: "dropdown",
                        name: "bloqueId",
                        label: "Bloque",
                        options: lists.projectsLists, // [{id,nombre}]
                        optionLabel: "nombre",
                        optionValue: "id",
                        // validation: { required: "Selecciona un bloque." },
                        // required: true,
                        className: "col-12",
                        props: {
                            filter: true,
                            showClear: true,
                            onChange: (e) => {
                                // PrimeReact entrega e.value = id (por optionValue)
                                setValue("bloqueId", Number(e.value), { shouldDirty: true, shouldValidate: true });
                                // setValue("localId", null, { shouldDirty: true, shouldValidate: true });
                            },
                        },
                    },

                    {
                        key: "client-local",
                        type: "dropdown",
                        name: "localId",
                        label: "Local",
                        options: localesOptions, // cargados por efecto al cambiar bloque
                        optionLabel: "nombre",
                        optionValue: "id",
                        // validation: { required: "Selecciona un local." },
                        // required: true,
                        className: "col-12",
                        disabled: !bloqueId,
                        props: {
                            filter: true,
                            showClear: true,
                            onChange: (e) => {
                                setValue("localId", Number(e.value), { shouldDirty: true, shouldValidate: true });
                                methods.clearErrors("localId");
                            },
                        },
                    }
                );
            }

            // isClient && {
            //     key: "client-local",
            //     type: "dropdown",
            //     name: "localId",
            //     label: "Local",
            //     options: localesOptions, // cargados por efecto al cambiar bloque
            //     optionLabel: "nombre",
            //     optionValue: "id",
            //     // validation: { required: "Selecciona un local." },
            //     // required: true,
            //     className: "col-12",
            //     disabled: !bloqueId,
            //     props: {
            //         filter: true,
            //         showClear: true,
            //         onChange: (e) => {
            //             setValue("localId", Number(e.value), { shouldDirty: true, shouldValidate: true });
            //             methods.clearErrors("localId");
            //         },
            //     },
            // },

            // watch("perfil") === 14 && {
            //     key: "example-32",
            //     type: "multiselect",
            //     name: "tirIds",
            //     label: "Seleccionar Tipo de reembolsos",
            //     options: lists.refundableTypeList,
            //     optionLabel: "nombre",
            //     optionValue: "id",
            //     className: "col-12",
            // },

            // isClient && {
            //     key: "unidadesCliente",
            //     type: "multiselectGroup",
            //     name: "unidadesCliente",
            //     label: "Unidades Asignadas o Disponibles",
            //     options: unidadesAgrupadas,
            //     optionGroupLabel: "nombre",
            //     optionGroupChildren: "items",
            //     optionLabel: "nombre",
            //     optionValue: "id",
            //     props: {
            //         display: "chip",
            //         filter: true,
            //         filterBy: "nombre,proyectoNombre,etapaNombre",
            //         optionGroupTemplate: (group) => (
            //             <div className="text-primary font-bold">
            //                 <i className="pi pi-building mr-2" />
            //                 {group.nombre}
            //             </div>
            //         ),
            //         selectedItemTemplate: (option) => {
            //             const flatList = unidadesAgrupadas.flatMap((g) => g.items);
            //             const unidad = flatList.find((u) => u.id === option);
            //             return <span>{unidad?.nombre || "-"}</span>;
            //         },
            //     },
            //     className: "col-12",
            // },

            // Acceso / Estado / Ventanas / Usuario / Clave (solo cuando NO es cliente NI empleado)
            const isThirdParty = !isClient && !isEmployee;

            if (isThirdParty && usuId > 0 && !ProfileMode) {
                common.push({
                    key: "example-1",
                    type: "inputSwitch",
                    name: "acceso",
                    label: "Acceso Al Sistema",
                    className: "col-12",
                    value: false,
                });

                if (acceso) {
                    common.push({
                        key: "example-1",
                        type: "inputSwitch",
                        name: "cambioclave",
                        label: "Pedir Cambio de contraseña",
                        className: "col-12",
                    });
                }
                common.push({
                    key: "inmo-4",
                    type: "selectButton",
                    name: "estid",
                    label: "Estado",
                    options: estados,
                    props: propsSelectButton,
                    className: "col-12",
                });


                if (acceso && (ventanasDisponibles?.length || 0) > 0) {
                    common.push({
                        key: "example-3",
                        type: "multiselect",
                        name: "usuventanas",
                        label: "Seleccionar Ventanas",
                        options: ventanasDisponibles,
                        validation: watch("perfil") !== 3 ? { required: "El campo ventanas es requerido." } : {},
                        required: watch("perfil") !== 3,
                        className: "col-12",
                    });
                }


                if (acceso) {
                    common.push({
                        key: "example-1",
                        type: "text",
                        name: "usuario",
                        label: "Usuario",
                        validation: { required: "el campo usuario es requerido." },
                        required: true,
                        maxLength: 255,
                        disabled: false,
                        className: "col-12",
                    });
                }
                if (acceso) {
                    common.push({
                        key: "example-1",
                        type: "password",
                        name: "clave",
                        label: "Contraseña",
                        props: { autoComplete: "new-password", toggleMask: true },
                        validation: {
                            required: usuId === 0 && "El campo contraseña es requerido.",
                            validate: usuId === 0 && isStrongPassword,
                        },
                        required: usuId === 0,
                        maxLength: 255,
                        className: "col-12",
                    });
                }
            }

            if (!isClient && !isEmployee && usuId === 0 && !ProfileMode) {
                common.push(
                    {
                        key: "acceso",
                        type: "inputSwitch",
                        name: "acceso",
                        label: "Acceso Al Sistema",
                        className: "col-12",
                        value: false,
                    },
                    ...(acceso
                        ? [
                            {
                                key: "cambioclave",
                                type: "inputSwitch",
                                name: "cambioclave",
                                label: "Pedir Cambio de contraseña",
                                className: "col-12",
                            },
                            {
                                key: "usuventanas",
                                type: "multiselect",
                                name: "usuventanas",
                                label: "Seleccionar Ventanas",
                                options: ventanasDisponibles,
                                validation: perfil !== 3 ? { required: "El campo ventanas es requerido." } : {},
                                required: perfil !== 3,
                                className: "col-12",
                            },
                            {
                                key: "usuario",
                                type: "text",
                                name: "usuario",
                                label: "Usuario",
                                validation: { required: "el campo usuario es requerido." },
                                required: true,
                                maxLength: 255,
                                disabled: false,
                                className: "col-12",
                            },
                            {
                                key: "clave",
                                type: "password",
                                name: "clave",
                                label: "Contraseña",
                                props: { autoComplete: "new-password", toggleMask: true },
                                validation: {
                                    required: "El campo contraseña es requerido.",
                                    validate: isStrongPassword,
                                },
                                required: true,
                                maxLength: 255,
                                className: "col-12",
                            },
                        ]
                        : [])
                );
            }

            return common;
        }, [
            ProfileMode,
            listperfiles,
            usuId,
            isClient,
            isEmployee,
            localesOptions,
            perfil,
            acceso,
            estados,
            areas,
            insurersOptions,
            ventanasDisponibles,
            unidadesAgrupadas,
        ]);



        // .filter(Boolean);
        // 🚨 Log en cada render
        // console.log(
        //     "Render VenUsuario → fieldsForm generado",
        //     fieldsForm.map(f => ({
        //         key: f.key,
        //         name: f.name,
        //         isNewObject: true // <- cada vez será nuevo
        //     }))
        // );

        useImperativeHandle(ref, () => ({
            newUser,
            editUser,
            editProfile,
            onClose: () => setVisible(false),
        }));

        return (
            <Sidebar
                dismissable={true}
                visible={visible}
                position="right"
                className="p-sidebar-md"
                appendTo={typeof window !== 'undefined' ? document.body : null}
                baseZIndex={2000}   // mayor que el Dialog
                onHide={() => {
                    resetFormState();
                    setVisible(false);
                }}
                style={{ width: isMobile ? "100%" : isTablet ? 550 : isDesktop ? 400 : 400 }}
            >
                <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
                    {/* Imagen y encabezado */}
                    <div style={{ flexShrink: 0, paddingTop: 0 }}>
                        <div style={{ display: "flex", justifyContent: "center", alignItems: "center" }}>
                            <UserImageUploader
                                fullName={`${watch("nombre") || ""} ${watch("apellido") || ""}`.toUpperCase()}
                                profileName={listperfiles?.find((p) => p.id === watch("perfil"))?.nombre || ""}
                                imageUrl={userImage.preview}
                                onUpload={(file, preview) => {
                                    setUserImage({ file: file || null, preview, firebaseUrl: null });
                                    if (ProfileMode) {
                                        try {
                                            updateData({
                                                campo: "usu_foto",
                                                newValue: preview,
                                                newFile: { file: file || null, preview, firebaseUrl: null },
                                            });
                                            setUsuFoto(preview);
                                        } catch (error) {
                                            console.error("Error al actualizar la foto:", error);
                                        }
                                    }
                                }}
                            />
                        </div>
                    </div>

                    {/* Contenido scrollable */}
                    <div style={{ flex: 1, overflowY: "auto", padding: "0 1rem" }}>
                        {!ProfileMode && (
                            <TabView activeIndex={activeTab} onTabChange={(e) => setActiveTab(e.index)}>
                                <TabPanel header="Información Básica">
                                    <FormProvider {...methods}>
                                        <div style={{ marginTop: "10px", marginBottom: "50px" }}>
                                            <GenericFormSection fields={fieldsForm} />
                                        </div>
                                    </FormProvider>
                                </TabPanel>

                                <TabPanel header="Asignación Permisos" disabled={!canAssignPermission || usuId === 0}>
                                    <div style={{ marginTop: "10px" }}>
                                        <PermisosTab
                                            usuId={usuId}
                                            opc={2}
                                            visible={visible}
                                            onPermisosChange={setPermisosSeleccionados}
                                        />
                                    </div>
                                </TabPanel>
                            </TabView>
                        )}
                        {ProfileMode && (
                            <FormProvider {...methods}>
                                <div style={{ marginTop: "10px", marginBottom: "50px" }}>
                                    <GenericFormSection fields={fieldsForm} />
                                </div>
                            </FormProvider>
                        )}
                    </div>

                    {/* Footer fijo al fondo */}
                    <div
                        className="sidebar-footer"
                        style={{
                            flexShrink: 0,
                            padding: "1rem",
                            textAlign: "right",
                            borderTop: "1px solid #ccc",
                            background: "#fff",
                        }}
                    >
                        {canDelete && usuId > 0 && !ProfileMode && (
                            <Button
                                className="p-button-danger p-button-text"
                                onClick={() => {
                                    setCurrentUser({ usuId, nombre: watch("nombre") });
                                    setDeleteDialogVisible(true);
                                }}
                                label={"Eliminar usuario"}
                                loading={loading}
                            />
                        )}
                        {!ProfileMode && (
                            <Button
                                label={usuId ? "Guardar Cambios" : "Guardar"}
                                icon="pi pi-save"
                                className="p-button-info p-button-text ml-2"
                                onClick={handleSubmit(saveUser)}
                                loading={loading}
                            />
                        )}
                    </div>
                </div>
            </Sidebar>
        );
    }
);

// useImperativeHandle(ref, () => ({
//     newUser,
//     editUser,
//     editProfile,
//     onClose: () => setVisible(false),
// }));

// const handleHide = () => {
//     resetFormState();
//     setVisible(false);
//     if (inline && typeof onInlineClose === 'function') onInlineClose();
// };

/** 👉 Mismo contenido que hoy (avatar, tabs, formulario, footer),
 *  envuelto en un contenedor flex column para reusar en ambos modos.
 */
//     const renderContent = () => (
//         <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
//             {/* Header/avatar */}
//             <div style={{ flexShrink: 0, paddingTop: 0 }}>
//                 <div style={{ display: "flex", justifyContent: "center", alignItems: "center" }}>
//                     <UserImageUploader
//                         fullName={`${watch("nombre") || ""} ${watch("apellido") || ""}`.toUpperCase()}
//                         profileName={listperfiles?.find((p) => p.id === watch("perfil"))?.nombre || ""}
//                         imageUrl={userImage.preview}
//                         onUpload={(file, preview) => {
//                             setUserImage({ file: file || null, preview, firebaseUrl: null });
//                             if (ProfileMode) {
//                                 try {
//                                     updateData({
//                                         campo: "usu_foto",
//                                         newValue: preview,
//                                         newFile: { file: file || null, preview, firebaseUrl: null },
//                                     });
//                                     setUsuFoto(preview);
//                                 } catch (error) {
//                                     console.error("Error al actualizar la foto:", error);
//                                 }
//                             }
//                         }}
//                     />
//                 </div>
//             </div>

//             {/* Cuerpo scrollable */}
//             <div style={{ flex: 1, overflowY: "auto", padding: "0 1rem" }}>
//                 {!ProfileMode ? (
//                     <TabView activeIndex={activeTab} onTabChange={(e) => setActiveTab(e.index)}>
//                         <TabPanel header="Información Básica">
//                             <FormProvider {...methods}>
//                                 <div style={{ marginTop: "10px", marginBottom: "50px" }}>
//                                     <GenericFormSection fields={fieldsForm} />
//                                 </div>
//                             </FormProvider>
//                         </TabPanel>

//                         <TabPanel header="Asignación Permisos" disabled={!canAssignPermission || usuId === 0}>
//                             <div style={{ marginTop: "10px" }}>
//                                 <PermisosTab
//                                     usuId={usuId}
//                                     opc={2}
//                                     visible={visible}
//                                     onPermisosChange={setPermisosSeleccionados}
//                                 />
//                             </div>
//                         </TabPanel>
//                     </TabView>
//                 ) : (
//                     <FormProvider {...methods}>
//                         <div style={{ marginTop: "10px", marginBottom: "50px" }}>
//                             <GenericFormSection fields={fieldsForm} />
//                         </div>
//                     </FormProvider>
//                 )}
//             </div>

//             {/* Footer (sticky en inline, fijo en Sidebar) */}
//             <div className="sidebar-footer" style={{ flexShrink: 0, padding: "1rem", textAlign: "right", background: "#fff" }}>
//                 {canDelete && usuId > 0 && !ProfileMode && (
//                     <Button
//                         className="p-button-danger p-button-text"
//                         onClick={() => {
//                             setCurrentUser({ usuId, nombre: watch("nombre") });
//                             setDeleteDialogVisible(true);
//                         }}
//                         label={"Eliminar usuario"}
//                         loading={loading}
//                     />
//                 )}
//                 {!ProfileMode && (
//                     <Button
//                         label={usuId ? "Guardar Cambios" : "Guardar"}
//                         icon="pi pi-save"
//                         className="p-button-info p-button-text ml-2"
//                         onClick={handleSubmit(saveUser)}
//                         loading={loading}
//                     />
//                 )}
//             </div>
//         </div>
//     );

//     /** 🔀 Render según modo */
//     // if (inline) {
//     //     // NOTA: visible controla que se monte; la animación show la maneja el padre
//     //     return visible ? (
//     //         <div className="inline-inside-dialog show">
//     //             <div className="inline-header">
//     //                 <div className="flex align-items-center justify-content-between">
//     //                     <h4 className="m-0">{usuId ? "Editar cliente" : "Nuevo cliente"}</h4>
//     //                     <Button label="Cerrar" className="p-button-text" onClick={handleHide} />
//     //                 </div>
//     //             </div>
//     //             <div className="inline-body">{renderContent()}</div>
//     //         </div>
//     //     ) : null;
//     // }

//     return (
//         <Sidebar
//             dismissable
//             visible={visible}
//             position="right"
//             className="p-sidebar-md"
//             appendTo={typeof window !== 'undefined' ? document.body : null}
//             baseZIndex={2000}
//             onHide={() => {
//                 resetFormState();
//                 setVisible(false);
//             }}
//             style={{ width: isMobile ? "100%" : isTablet ? 550 : isDesktop ? 400 : 400 }}
//         >
//             {renderContent()}
//         </Sidebar>
//     );
// });

export default VenUsuario;
