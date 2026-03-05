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
import { insureForm } from "../../configForms";

// API
import { saveAPI } from "@api/requests/insureApi";
import { getAllAPI } from "@api/requests/insureTypeApi";

const defaultValues = {
    nombre: "",
    nit: null,
    tiaId: null,
    estId: 1,
};

const VenInsure = forwardRef(
    ({ addItem, updateItem, setCurrentInsure, setDeleteDialogVisible, canDelete }, ref) => {
        const { idusuario, nombreusuario } = useContext(AuthContext);
        const { showSuccess, showInfo } = useContext(ToastContext);
        const { isMobile, isTablet, isDesktop } = useMediaQueryContext();
        const handleApiError = useHandleApiError();

        const [visible, setVisible] = useState(false);
        const [aseId, setAseId] = useState(null);
        const [loading, setLoading] = useState(false);
        const [originalData, setOriginalData] = useState(null);
        const [lists, setLists] = useState({ tipoAseguradora: [] });
        const methods = useForm({ defaultValues });
        const { handleSubmit, reset, setValue, watch } = methods;

        useEffect(() => {
            const getLists = async () => {
                const { data } = await getAllAPI();
                setLists((prev) => ({ ...prev, tipoAseguradora: data }));
            };

            if (visible) getLists();
        }, [visible]);

        const newInsure = () => {
            reset(defaultValues);
            setAseId(null);
            setOriginalData(null);
            setVisible(true);
        };

        const editInsure = (item) => {
            setAseId(item.aseId);
            setOriginalData(item);
            setValue("nombre", item.nombre);
            setValue("nit", item.nit);
            setValue("tiaId", item.tiaId);
            setValue("estId", item.estId);
            setVisible(true);
        };

        const save = async (values) => {
            setLoading(true);
            try {
                const nombre = values.nombre.trim().toUpperCase();
                if (
                    aseId &&
                    nombre === originalData.nombre &&
                    values.nit === originalData.nit &&
                    values.tiaId === originalData.tiaId &&
                    values.estId === originalData.estId
                ) {
                    showInfo("No has realizado ningún cambio.");
                    return;
                }

                const params = {
                    aseId,
                    ...values,
                    nombre,
                    usureg: idusuario,
                    usuact: nombreusuario,
                };

                const { data } = await saveAPI(params);
                showSuccess(data.message);

                const item = {
                    aseId: aseId || data.aseId,
                    ...values,
                    nombre,
                    nombreEstado: values.estId === 1 ? "Activo" : "Inactivo",
                    tipoAseguradora: lists.tipoAseguradora.find((x) => x.id === values.tiaId)
                        ?.nombre,
                    usuact: nombreusuario,
                    fecact: moment().format("YYYY-MM-DD HH:mm:ss"),
                };

                if (aseId) {
                    updateItem({ idField: "aseId", ...item });
                } else {
                    addItem(item);
                }

                reset(defaultValues);
                setAseId(null);
                setVisible(false);
            } catch (error) {
                handleApiError(error);
            } finally {
                setLoading(false);
            }
        };

        useImperativeHandle(ref, () => ({
            newInsure,
            editInsure,
            onClose: () => setVisible(false),
        }));

        return (
            <Sidebar
                visible={visible}
                onHide={() => {
                    reset(defaultValues);
                    setAseId(null);
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
                        <h4 className="my-4">
                            {aseId ? "Editar aseguradora" : "Registrar aseguradora"}
                        </h4>
                    </div>

                    <FormProvider {...methods}>
                        <div style={{ marginBottom: "50px" }}>
                            <GenericFormSection fields={insureForm({ lists })} />
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
                            {canDelete && aseId && (
                                <Button
                                    className="p-button-danger p-button-text"
                                    onClick={() => {
                                        setCurrentInsure({
                                            aseId,
                                            nombre: watch("nombre"),
                                        });
                                        setDeleteDialogVisible(true);
                                    }}
                                    label="Eliminar aseguradora"
                                    loading={loading}
                                />
                            )}
                            <Button
                                className="p-button-info p-button-text"
                                onClick={handleSubmit(save)}
                                icon="pi pi-save"
                                label={aseId ? "Guardar Cambios" : "Guardar"}
                                loading={loading}
                            />
                        </div>
                    </FormProvider>
                </div>
            </Sidebar>
        );
    }
);

export default VenInsure;
