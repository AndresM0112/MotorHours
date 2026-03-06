import React, {
    useState,
    useEffect,
    useContext,
    forwardRef,
    useImperativeHandle,
    useCallback,
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
} from "@api/requests";
import useHandleApiError from "@hook/useHandleApiError";
import GenericFormSection from "@components/data/GenericFormSection";
import moment from "moment";
import Cookies from "js-cookie";
import { TabPanel, TabView } from "primereact/tabview";
import UserImageUploader from "./UserImageUploader";
import PermisosTab from "./PermisosTab";
import { uploadFile } from "@api/firebase/handleFirebase";

const VenUsuario = ({
    addItem,
    updateItem,
    setCurrentUser,
    setDeleteDialogVisible,
    canAssignPermission,
    canDelete,
    listperfiles,
    ProfileMode = false,
    setUsuFoto,
    isClient,
}) => {
    const { nombreusuario, idusuario } = useContext(AuthContext);
    const { showSuccess, showInfo } = useContext(ToastContext);
    const handleApiError = useHandleApiError();
    const [userImage, setUserImage] = useState({
        file: null,
        preview: null,
        firebaseUrl: null,
    });
    const [activeTab, setActiveTab] = useState(0);
    const [PerfilInicial, setPerfilInicial] = useState(null);
    const [VentanasInicial] = useState([]);
    const [ventanasDisponibles, setVentanasDisponibles] = useState([]);
    const [areas, setAreas] = useState([]);
    const [visible, setVisible] = useState(false);
    const [usuId, setUsuId] = useState(0);

    const [originalData, setOriginalData] = useState({});
    const [loading, setLoading] = useState(false);

    const defaultValues = {
        perfil: isClient ? 3 : null, // Cliente por defecto
        nombre: "",
        apellido: "",
        documento: "",
        telefono: "",
        usuario: "",
        correo: "",
        clave: "",
        confclave: "",
        acceso: isClient ? false : true,
        cambioclave: 0,
        estid: 1,
        usuventanas: [],
        usuareas: [],
        valorHora: null,
    };

    const methods = useForm({ defaultValues });
    const { handleSubmit, reset, setValue, watch } = methods;
    const [permisosSeleccionados, setPermisosSeleccionados] = useState([]);

    useEffect(() => {
        // TODO: Reemplazar con API del taller cuando sea necesario
        // getAllAreasAPI().then((res) => setAreas(res.data));
        setAreas([]);
    }, []);

    const newUser = () => {
        setPerfilInicial(null);
        setActiveTab(0);
        setVisible(true);
    };

    const editUser = async (data, tabIndex = 0) => {
        setUsuId(data.usuId);

        const processedData = {
            ...data,
            acceso: data.acceso === 1 ? true : false,
            agenda: data.agenda === 1 ? true : false,
            instructor: data.instructor === 1 ? true : false,
            requiere_confirmacion: data.requiere_confirmacion === 1 ? true : false,
            cambioclave: data.cambioclave === 1 ? true : false,
            usuventanas: data.usuventanas ? data.usuventanas.split(",").map(Number) : [],
            usuareas: data.usuareas ? data.usuareas.split(",").map(Number) : [],
        };

        reset(processedData);

        if (data.usuFoto) {
            setUserImage({
                file: null,
                preview: data.usuFoto,
                firebaseUrl: data.usuFoto,
            });
        } else {
            setUserImage({ file: null, preview: null, firebaseUrl: null });
        }
        setVisible(true);
    };

    const editProfile = async (data) => {
        setUsuId(data.usuId);
        const processedData = {
            ...data,
        };
        reset(processedData);

        if (data.usufoto) {
            setUserImage({
                file: null,
                preview: data.usufoto,
                firebaseUrl: data.usufoto,
            });
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
                    data.map((ventana) => ventana.id)
                );
            } else {
                if (prfId === PerfilInicial && VentanasInicial.length > 0) {
                    setValue(
                        "usuventanas",
                        typeof VentanasInicial === "string"
                            ? VentanasInicial.split(",")
                            : VentanasInicial
                    );
                } else {
                    setValue(
                        "usuventanas",
                        data.map((ventana) => ventana.id)
                    );
                }
            }
        } catch (error) {
            handleApiError(error);
        }
    };

    useEffect(() => {
        if (!watch("perfil")) return;
        getVentanas(watch("perfil"));
        // eslint-disable-next-line
    }, [watch("perfil")]);

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
            clave = "",
            confclave = "",
            acceso,
            agenda,
            instructor,
            requiere_confirmacion,
            cambioclave,
            estid,
            valorHora = null,
        } = datos;

        const usuventanas = acceso ? (datos.usuventanas || []).join(",") : null;
        const usuareas = acceso ? (datos.usuareas || []).join(",") : null;

        const accesoChange = acceso ? 1 : 0;
        const agendaChange = agenda ? 1 : 0;
        const instructorChange = instructor ? 1 : 0;
        const requiereConfirmacionChange = requiere_confirmacion ? 1 : 0;
        const cambioclaveChange = cambioclave ? 1 : 0;

        if (
            usuId > 0 &&
            acceso &&
            agenda &&
            instructor &&
            originalData.usuFoto === userImage.file &&
            perfil === originalData.perfil &&
            nombre === originalData.nombre &&
            apellido === originalData.apellido &&
            documento === originalData.documento &&
            usuario === originalData.usuario &&
            correo === originalData.correo &&
            telefono === originalData.telefono &&
            accesoChange === originalData.acceso &&
            agendaChange === originalData.agenda &&
            instructorChange === originalData.instructor &&
            requiereConfirmacionChange === originalData.requiereConfirmacion &&
            cambioclaveChange === originalData.cambioclave &&
            estid === originalData.estid &&
            valorHora === originalData.valorHora &&
            arraysEqual(
                originalData?.usuventanas ? usuventanas : [],
                originalData?.usuventanas?.split(",") || []
            )
        ) {
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

        formData.append("usuFoto", uploadedImageUrl || userImage.firebaseUrl || null);
        formData.append("perfil", perfil);
        formData.append("nombre", nombre);
        formData.append("apellido", apellido);
        formData.append("documento", documento);
        formData.append("usuario", usuario);
        formData.append("correo", correo);
        formData.append("telefono", telefono);
        formData.append("clave", clave);
        formData.append("confclave", confclave);
        formData.append("acceso", accesoChange);
        formData.append("agenda", agendaChange);
        formData.append("instructor", instructorChange);
        formData.append("requiere_confirmacion", requiereConfirmacionChange);
        formData.append("cambioclave", cambioclaveChange);
        formData.append("estid", estid);
        formData.append("valorHora", valorHora);
        formData.append("usuventanas", usuventanas);
        formData.append("usuareas", usuareas);
        formData.append("usuId", usuId);
        formData.append("idusuario", idusuario);
        formData.append("usuarioact", nombreusuario);

        try {
            const { data } = await saveUserAPI(formData);
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
                nomestado: estid === 1 ? "Activo" : "Inactivo",
                nomperfil: listperfiles?.find((per) => per.id === perfil)?.nombre,
                usuact: nombreusuario,
                fecact: moment().format("YYYY-MM-DD HH:mm:ss"),
            };
            if (usuId > 0) {
                updateItem({ idField: "usuId", ...item });
                reset(defaultValues);
                setUsuId(0);
                setOriginalData({});
            } else {
                addItem(item);
                setUsuId(finalUsuId);
            }
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

                    // Subida de imagen SOLO si hay archivo nuevo
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

    const fieldsForm = [
        !ProfileMode && {
            key: "example-8",
            type: "dropdown",
            name: "perfil",
            label: "Seleccionar Perfil",
            options: listperfiles,
            validation: { required: "el campo perfil es requerido." },
            required: true,
            disabled: isClient ? true : false,
            className: "col-12",
        },
        {
            key: "example-1",
            type: "text",
            name: "documento",
            label: "NIT / CC",
            // validation: { required: "el campo documento es requerido." },
            // required: true,
            keyfilter: "int",
            maxLength: 255,
            disabled: ProfileMode,
            className: "col-12",
            required: true,
        },
        !ProfileMode && {
            key: "example-1",
            type: "text",
            name: "nombre",
            label: "Nombre(s)",
            validation: { required: "el campo nombre es requerido." },
            required: true,
            maxLength: 255,
            className: "col-12",
        },
        !ProfileMode && {
            key: "example-1",
            type: "text",
            name: "apellido",
            label: "Apellido(s)",
            validation: { required: "el campo apellido es requerido." },
            required: true,
            maxLength: 255,
            className: "col-12",
        },
        {
            key: "example-1",
            type: "text",
            name: "correo",
            label: "Correo Electrónico",
            validation: {
                required: "El campo correo es requerido.",
                validate: isEmail(),
            },
            props: !ProfileMode
                ? { autoComplete: "off" }
                : {
                      onBlur: (e) => updateData({ campo: "usu_correo", newValue: e.target.value }),
                      autoComplete: "off",
                  },
            required: true,
            maxLength: 255,
            className: "col-12",
        },
        {
            key: "example-1",
            type: "text",
            name: "telefono",
            label: "Celular / Teléfono",
            props: !ProfileMode
                ? { autoComplete: "off" }
                : {
                      onBlur: (e) =>
                          updateData({ campo: "usu_telefono", newValue: e.target.value }),
                      autoComplete: "off",
                  },
            // validation: { required: "el campo documento es requerido." },
            // required: true,
            keyfilter: "int",
            maxLength: 11,
            disabled: false,
            className: "col-12",
        },
        watch("perfil") !== 3 && {
            key: "example-3",
            type: "multiselect",
            name: "usuareas",
            label: "Seleccionar Áreas",
            options: areas,
            className: "col-12",
        },

        !ProfileMode && {
            key: "example-1",
            type: "inputSwitch",
            name: "acceso",
            label: "Acceso Al Sistema",
            className: "col-12",
            value: false,
        },
        watch("acceso") &&
            !ProfileMode && {
                key: "example-1",
                type: "inputSwitch",
                name: "cambioclave",
                label: "Pedir Cambio de contraseña",
                className: "col-12",
            },
        !ProfileMode && {
            key: "inmo-4",
            type: "selectButton",
            name: "estid",
            label: "Estado",
            options: estados,
            props: propsSelectButton,
            className: "col-12",
        },
        watch("acceso") &&
            !ProfileMode &&
            ventanasDisponibles?.length > 0 && {
                key: "example-3",
                type: "multiselect",
                name: "usuventanas",
                label: "Seleccionar Ventanas",
                options: ventanasDisponibles,
                validation:
                    watch("perfil") !== 3 ? { required: "El campo ventanas es requerido." } : {},
                required: watch("perfil") !== 3,
                className: "col-12",
            },
        watch("acceso") &&
            !ProfileMode && {
                key: "example-1",
                type: "text",
                name: "usuario",
                label: "Usuario",
                validation: { required: "el campo usuario es requerido." },
                required: true,
                maxLength: 255,
                disabled: false,
                className: "col-12",
            },
        watch("acceso") &&
            !ProfileMode && {
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
            },
    ].filter(Boolean);

    useImperativeHandle(ref, () => ({
        newUser,
        editUser,
        editProfile,
        onClose: () => setVisible(false),
    }));

    return (
        <div
            style={{
                display: "flex",
                flexDirection: "column",
                height: "100%",
            }}
        >
            {/* Imagen y encabezado */}
            <div style={{ flexShrink: 0, paddingTop: 0 }}>
                <div
                    style={{
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                    }}
                >
                    <UserImageUploader
                        fullName={`${watch("nombre") || ""} ${
                            watch("apellido") || ""
                        }`.toUpperCase()}
                        profileName={
                            listperfiles?.find((p) => p.id === watch("perfil"))?.nombre || ""
                        }
                        imageUrl={userImage.preview}
                        onUpload={(file, preview) => {
                            setUserImage({
                                file: file || null,
                                preview,
                                firebaseUrl: null,
                            });
                            if (ProfileMode) {
                                try {
                                    updateData({
                                        campo: "usu_foto",
                                        newValue: preview,
                                        newFile: {
                                            file: file || null,
                                            preview,
                                            firebaseUrl: null,
                                        },
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
            <div
                style={{
                    flex: 1,
                    overflowY: "auto",
                    padding: "0 1rem",
                }}
            >
                {!ProfileMode && (
                    <TabView activeIndex={activeTab} onTabChange={(e) => setActiveTab(e.index)}>
                        <TabPanel header="Información Básica">
                            <FormProvider {...methods}>
                                <div style={{ marginTop: "10px", marginBottom: "50px" }}>
                                    <GenericFormSection fields={fieldsForm} />
                                </div>
                            </FormProvider>
                        </TabPanel>

                        <TabPanel
                            header="Asignación Permisos"
                            disabled={!canAssignPermission || usuId === 0}
                        >
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
    );
};

export default VenUsuario;
