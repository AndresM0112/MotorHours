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
import '../../home/components/styles/Tickets.css';

const asNumSorted = (arr = []) => [...(arr || [])].map(Number).sort((a, b) => a - b);

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
        const [insurersOptions, setInsurersOptions] = useState([]);
        const [unidadesCliente] = useState([]); // Simplificado para taller
        const [visible, setVisible] = useState(false);
        const [usuId, setUsuId] = useState(0);
        const [originalData, setOriginalData] = useState({});
        const [loading, setLoading] = useState(false);

        const defaultValues = {
            perfil: null,
            nombre: "",
            apellido: "",
            documento: "",
            telefono: "",
            direccion: "",
            usuario: "",
            correo: "",
            clave: "",
            confclave: "",
            acceso: true,
            cambioclave: 0,
            estid: 1,
            usuventanas: [],
            usuareas: [],
        };

        // Simplificado para taller - eliminar configuraciones complejas
        useEffect(() => {
            // Solo configuración básica para el taller
        }, [visible]);

        const methods = useForm({ defaultValues, shouldUnregister: false });
        const { handleSubmit, reset, setValue, watch } = methods;
        const [permisosSeleccionados, setPermisosSeleccionados] = useState([]);
        const [originalPermiss, SetOriginalPermiss] = useState([]);
        // Derivar valores observados (no uses watch() directo en deps)
        // const perfil = watch("perfil");
        const perfil = watch("perfil");
        const acceso = watch("acceso");

        const permisOrigRef = useRef(false);

        useEffect(() => {
            if (!permisOrigRef.current) {
                permisOrigRef.current = true;
                SetOriginalPermiss(permisosSeleccionados);
            }
        }, [permisosSeleccionados]);



        // Simplificado - eliminar validaciones de bloques/locales

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

                const processedData = {
                    ...data,
                    acceso: data.acceso === 1,
                    agenda: data.agenda === 1,
                    instructor: data.instructor === 1,
                    requiere_confirmacion: data.requiere_confirmacion === 1,
                    cambioclave: data.cambioclave === 1,
                    usuventanas: data.usuventanas ? data.usuventanas.split(",").map(Number) : [],
                    usuareas: data.usuareas ? data.usuareas.split(",").map(Number) : [],
                };

                // Foto del usuario
                setUserImage(
                    data.usuFoto
                        ? { file: null, preview: data.usuFoto, firebaseUrl: data.usuFoto }
                        : { file: null, preview: null, firebaseUrl: null }
                );

                // Resetear el formulario con los datos del usuario
                reset(processedData);
                setOriginalData(processedData);

                setVisible(true);
            } catch (err) {
                handleApiError(err);
            }
        };




        useEffect(() => {
            if (visible) {
                // TODO: Simplificado para taller de motos - APIs eliminadas
                // getAllInsurersAPI().then((res) => setInsurersOptions(res.data || []));
                // getAllAreasAPI().then((res) => setAreas(res.data || []));
                setInsurersOptions([]);
                setAreas([]);

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

        // useEffect simplificado para taller - sin lógicas complejas de perfil
        useEffect(() => {
            if (!perfil) return;
            getVentanas(perfil);
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
                cambioclave,
                estid,
            } = datos;

            const hasPasswordChange = typeof clave === "string" && clave.trim().length > 0;

            const usuventanas = acceso ? (datos.usuventanas || []).join(",") : null;
            const usuareas = acceso ? (datos.usuareas || []).join(",") : null;

            const accesoChange = acceso ? 1 : 0;
            const cambioclaveChange = cambioclave ? 1 : 0;

            // Verificación de cambios simplificada para taller
            const noChanges =
                usuId > 0 &&
                perfil === originalData.perfil &&
                nombre === originalData.nombre &&
                apellido === originalData.apellido &&
                documento === originalData.documento &&
                usuario === originalData.usuario &&
                correo === originalData.correo &&
                telefono === originalData.telefono &&
                direccion === originalData.direccion &&
                accesoChange === (originalData.acceso ? 1 : 0) &&
                cambioclaveChange === (originalData.cambioclave ? 1 : 0) &&
                estid === originalData.estid &&
                arraysEqual(asNumSorted(originalData.usuventanas || []), asNumSorted(datos?.usuventanas || [])) &&
                arraysEqual(asNumSorted(originalPermiss || []), asNumSorted(permisosSeleccionados || []))
                && !hasPasswordChange;

            if (noChanges) {
                setLoading(false);
                return showInfo("No has realizado ninguna modificación");
            }

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

            // Payload simplificado para taller de motos
            const payload = {
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
                cambioclave: Boolean(cambioclaveChange),
                estid: String(estid),
                usuventanas: usuventanas ?? "",
                usuareas: usuareas ?? "",
                usuId: String(usuId),
                idusuario: String(idusuario),
                usuarioact: nombreusuario,
            };

            try {
                const { data } = await saveUserAPI(payload);
                showSuccess(data.message);

                const finalUsuId = usuId > 0 ? usuId : data.usuId;

                // Subir imagen si existe un archivo
                if (userImage?.file) {
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

                // Actualizar permisos si han cambiado
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
                    acceso: accesoChange,
                    cambioclave: cambioclaveChange,
                    estid,
                    usuventanas,
                    usuareas,
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

        // Debug simplificado para taller
        console.log("prueba campos", {
            usuId, perfil, acceso,
            ventanas: ventanasDisponibles?.length
        });

        const fieldsForm = useMemo(() => {
            const commonFields = [];

            // Perfil del usuario
            if (!ProfileMode) {
                commonFields.push({
                    key: "perfil",
                    type: "dropdown",
                    name: "perfil",
                    label: "Perfil de Usuario",
                    options: listperfiles,
                    optionLabel: "nombre",
                    optionValue: "id",
                    validation: { required: "El campo perfil es requerido." },
                    required: true,
                    className: "col-12",
                });
            }

            // Documento
            commonFields.push({
                key: "documento",
                type: "text",
                name: "documento",
                label: "NIT / CC",
                keyfilter: "int",
                maxLength: 255,
                disabled: ProfileMode,
                className: "col-12",
                required: true,
            });

            // Nombre y apellido para usuarios no en modo perfil
            if (!ProfileMode) {
                commonFields.push(
                    {
                        key: "nombre",
                        type: "text",
                        name: "nombre",
                        label: "Nombre(s)",
                        validation: { required: "El campo nombre es requerido." },
                        required: true,
                        maxLength: 255,
                        className: "col-12",
                    },
                    {
                        key: "apellido",
                        type: "text",
                        name: "apellido",
                        label: "Apellido(s)",
                        validation: { required: "El campo apellido es requerido." },
                        required: true,
                        maxLength: 255,
                        className: "col-12",
                    }
                );
            }

            // Correo electrónico
            commonFields.push({
                key: "correo",
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

            // Teléfono
            commonFields.push({
                key: "telefono",
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
                className: "col-12",
            });

            // Dirección
            commonFields.push({
                key: "direccion",
                type: "text",
                name: "direccion",
                label: "Dirección",
                props: !ProfileMode
                    ? { autoComplete: "off" }
                    : {
                        onBlur: (e) => updateData({ campo: "direccion", newValue: e.target.value }),
                        autoComplete: "off",
                    },
                maxLength: 255,
                className: "col-12",
            });
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
            const isClient = false; // Simplificado para taller
            const isEmployee = false; // Simplificado para taller
            const isThirdParty = !isClient && !isEmployee;

            if (isThirdParty && usuId > 0 && !ProfileMode) {
                commonFields.push({
                    key: "example-1",
                    type: "inputSwitch",
                    name: "acceso",
                    label: "Acceso Al Sistema",
                    className: "col-12",
                    value: false,
                });

                if (acceso) {
                    commonFields.push({
                        key: "example-1",
                        type: "inputSwitch",
                        name: "cambioclave",
                        label: "Pedir Cambio de contraseña",
                        className: "col-12",
                    });
                }
                commonFields.push({
                    key: "inmo-4",
                    type: "selectButton",
                    name: "estid",
                    label: "Estado",
                    options: estados,
                    props: propsSelectButton,
                    className: "col-12",
                });


                if (acceso && (ventanasDisponibles?.length || 0) > 0) {
                    commonFields.push({
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
                    commonFields.push({
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
                    commonFields.push({
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
                commonFields.push(
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
                            }
                        ]
                        : [])
                );
            }

            // Usuario y contraseña para nuevos usuarios o modo no perfil
            if (!ProfileMode) {
                commonFields.push({
                    key: "usuario",
                    type: "text",
                    name: "usuario",
                    label: "Usuario de Acceso",
                    validation: { required: "El campo usuario es requerido." },
                    required: true,
                    maxLength: 255,
                    className: "col-12",
                });

                // Solo mostrar campos de contraseña para usuarios nuevos
                if (usuId === 0) {
                    commonFields.push(
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
                        {
                            key: "confclave",
                            type: "password",
                            name: "confclave",
                            label: "Confirmar Contraseña",
                            props: { autoComplete: "new-password", toggleMask: true },
                            validation: {
                                required: "El campo confirmar contraseña es requerido.",
                                validate: (value) => {
                                    const password = methods.watch("clave");
                                    return value === password || "Las contraseñas no coinciden";
                                },
                            },
                            required: true,
                            maxLength: 255,
                            className: "col-12",
                        }
                    );
                }
            }

            // Acceso al sistema
            commonFields.push({
                key: "acceso",
                type: "confirmation",
                name: "acceso",
                label: "Acceso al Sistema",
                labelRadio: "¿Puede acceder al sistema?",
                className: "col-12",
            });

            // Ventanas y permisos si tiene acceso
            if (acceso && ventanasDisponibles.length > 0) {
                commonFields.push({
                    key: "usuventanas",
                    type: "multiselect",
                    name: "usuventanas",
                    label: "Ventanas Permitidas",
                    options: ventanasDisponibles,
                    optionLabel: "nombre",
                    optionValue: "id",
                    className: "col-12",
                });
            }

            // Estado del usuario
            commonFields.push({
                key: "estid",
                type: "dropdown",
                name: "estid",
                label: "Estado del Usuario",
                options: estados,
                optionLabel: "nombre",
                optionValue: "id",
                validation: { required: "El campo estado es requerido." },
                required: true,
                className: "col-12",
            });

            return commonFields;
        }, [
            ProfileMode,
            listperfiles,
            usuId,
            perfil,
            acceso,
            estados,
            areas,
            ventanasDisponibles,
            methods,
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
