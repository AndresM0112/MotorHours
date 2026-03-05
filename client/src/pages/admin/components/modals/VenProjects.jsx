import React, { forwardRef, useImperativeHandle, useState, useContext, useEffect } from "react";
import { Sidebar } from "primereact/sidebar";
import { Button } from "primereact/button";
import { FormProvider, useForm } from "react-hook-form";
import moment from "moment";

// Contexts
import { AuthContext } from "@context/auth/AuthContext";
import { ToastContext } from "@context/toast/ToastContext";
import useHandleApiError from "@hook/useHandleApiError";
import { useMediaQueryContext } from "@context/mediaQuery/mediaQueryContext";

// Form
import GenericFormSection from "@components/data/GenericFormSection";
import { projectsForm } from "../../configForms";

// API
import { saveBlockAPI } from "@api/requests/blocksApi";
import { getAllAPI as getAllrefundableTypeAPI } from "@api/requests/RefundableTypeApi";
import { arraysEqual } from "@utils/converAndConst";

const defaultValues = {
    nombre: "",
    codigo: "",
    descripcion: "",
    estado: "activo",
    tirIds: [],
    color: "#ffff"
};

const VenProjects = forwardRef(
    ({ addItem, updateItem, setCurrentProject, setDeleteDialogVisible, canDelete }, ref) => {
        const { idusuario, nombreusuario } = useContext(AuthContext);
        const { showSuccess, showInfo } = useContext(ToastContext);
        const { isMobile, isTablet, isDesktop } = useMediaQueryContext();
        const handleApiError = useHandleApiError();

        const [visible, setVisible] = useState(false);
        const [proId, setProId] = useState(null);
        const [loading, setLoading] = useState(false);
        const [originalData, setOriginalData] = useState(null);

        const [lists, setLists] = useState({
            refundableTypeList: [],
        });

        const methods = useForm({ defaultValues });
        const { handleSubmit, reset, setValue, watch } = methods;

        const newProject = () => {
            reset(defaultValues);
            setProId(null);
            setOriginalData(null);
            setVisible(true);
        };

        const editProject = (item) => {
            setProId(item.proId);
            setOriginalData(item);
            setValue("nombre", item.nombre);
            setValue("codigo", item.codigo);
            setValue("descripcion", item.descripcion);
            setValue("estado", item.estado);
            setValue("tirIds", item.tirIds);
            setValue("color", item.color);
            setVisible(true);
        };

        const saveProject = async (values) => {
            setLoading(true);
            try {
                const nombre = values.nombre?.trim()?.toUpperCase();
                const codigo = values.codigo?.trim()?.toUpperCase();
                const descripcion = values.descripcion?.trim()?.toUpperCase();
                if (
                    proId &&
                    nombre === originalData.nombre &&
                    codigo === originalData.codigo &&
                    descripcion === originalData.descripcion &&
                    values.color === originalData.color &&
                    values.estado === originalData.estado && arraysEqual(
                        values.tirIds,
                        originalData?.tirIds
                    )
                ) {
                    showInfo("No has realizado ningún cambio.");
                    return;
                }

                const params = {
                    proId,
                    ...values,
                    nombre,
                    codigo,
                    descripcion,
                    usureg: idusuario,
                    usuact: nombreusuario,
                };

                const { data } = await saveBlockAPI(params);
                showSuccess(data.message);

                const item = {
                    proId: proId || data.projectId,
                    ...values,
                    nombre,
                    codigo,
                    descripcion,
                    usuact: nombreusuario,
                    fecact: moment().format("YYYY-MM-DD HH:mm:ss"),
                };

                if (proId) {
                    updateItem({ idField: "proId", ...item });
                } else {
                    addItem(item);
                }

                reset(defaultValues);
                setProId(null);
                setVisible(false);
            } catch (error) {
                handleApiError(error);
            } finally {
                setLoading(false);
            }
        };

        useImperativeHandle(ref, () => ({
            newProject,
            editProject,
            onClose: () => setVisible(false),
        }));

        useEffect(() => {
            const fetchLists = async () => {
                try {
                    const [refundableTypeRes] = await Promise.all([
                        getAllrefundableTypeAPI(),
                    ]);

                    setLists((prev) => ({
                        ...prev,
                        refundableTypeList: refundableTypeRes.data,
                    }));
                } catch (error) {
                    console.error("Error al cargar listas:", error);
                }
            };

            if (visible) fetchLists();
        }, [visible]);

        return (
            <Sidebar
                visible={visible}
                onHide={() => {
                    reset(defaultValues);
                    setProId(null);
                    setVisible(false);
                }}
                position="right"
                dismissable
                className="p-sidebar-md"
                style={{
                    width: isMobile ? "100%" : isTablet ? 550 : isDesktop ? 400 : 400,
                }}
            >
                <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
                    <div style={{ textAlign: "center" }}>
                        <h4 className="my-4">{proId ? "Editar Bloque" : "Registrar Bloque"}</h4>
                    </div>

                    <FormProvider {...methods}>
                        <div style={{ marginBottom: "50px" }}>
                            <GenericFormSection fields={projectsForm({ lists })} />
                        </div>

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
                            {canDelete && proId && (
                                <Button
                                    className="p-button-danger p-button-text"
                                    onClick={() => {
                                        setCurrentProject({
                                            proId,
                                            nombre: watch("nombre"),
                                            codigo: watch("codigo"),
                                            descripcion: watch("descripcion"),
                                        });
                                        setDeleteDialogVisible(true);
                                    }}
                                    label="Eliminar Bloque"
                                    loading={loading}
                                />
                            )}
                            <Button
                                className="p-button-info p-button-text"
                                onClick={handleSubmit(saveProject)}
                                icon="pi pi-save"
                                label={proId ? "Guardar Cambios" : "Guardar"}
                                loading={loading}
                            />
                        </div>
                    </FormProvider>
                </div>
            </Sidebar>
        );
    }
);

export default VenProjects;
