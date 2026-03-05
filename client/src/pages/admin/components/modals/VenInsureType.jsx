import React, { forwardRef, useImperativeHandle, useState, useContext } from "react";
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
import { insureTypeForm } from "../../configForms";

// API
import { saveAPI } from "@api/requests/insureTypeApi";

const defaultValues = {
    nombre: "",
    estId: 1,
};

const VenInsureType = forwardRef(
    ({ addItem, updateItem, setCurrentInsureType, setDeleteDialogVisible, canDelete }, ref) => {
        const { idusuario, nombreusuario } = useContext(AuthContext);
        const { showSuccess, showInfo } = useContext(ToastContext);
        const { isMobile, isTablet, isDesktop } = useMediaQueryContext();
        const handleApiError = useHandleApiError();

        const [visible, setVisible] = useState(false);
        const [tiaId, setTiaId] = useState(null);
        const [loading, setLoading] = useState(false);
        const [originalData, setOriginalData] = useState(null);

        const methods = useForm({ defaultValues });
        const { handleSubmit, reset, setValue, watch } = methods;

        const newInsureType = () => {
            reset(defaultValues);
            setTiaId(null);
            setOriginalData(null);
            setVisible(true);
        };

        const editInsureType = (item) => {
            console.log(item);

            setTiaId(item.tiaId);
            setOriginalData(item);
            setValue("nombre", item.nombre);
            setValue("estId", item.estId);
            setVisible(true);
        };

        const save = async (values) => {
            setLoading(true);
            try {
                const nombre = values.nombre.trim().toUpperCase();
                if (
                    tiaId &&
                    nombre === originalData.nombre &&
                    values.estId === originalData.estId
                ) {
                    showInfo("No has realizado ningún cambio.");
                    return;
                }

                const params = {
                    tiaId,
                    ...values,
                    nombre,
                    usureg: idusuario,
                    usuact: nombreusuario,
                };

                const { data } = await saveAPI(params);
                showSuccess(data.message);

                const item = {
                    tiaId: tiaId || data.tiaId,
                    ...values,
                    nombre,
                    nombreEstado: values.estId === 1 ? "Activo" : "Inactivo",
                    usuact: nombreusuario,
                    fecact: moment().format("YYYY-MM-DD HH:mm:ss"),
                };

                if (tiaId) {
                    updateItem({ idField: "tiaId", ...item });
                } else {
                    addItem(item);
                }

                reset(defaultValues);
                setTiaId(null);
                setVisible(false);
            } catch (error) {
                handleApiError(error);
            } finally {
                setLoading(false);
            }
        };

        useImperativeHandle(ref, () => ({
            newInsureType,
            editInsureType,
            onClose: () => setVisible(false),
        }));

        return (
            <Sidebar
                visible={visible}
                onHide={() => {
                    reset(defaultValues);
                    setTiaId(null);
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
                            {tiaId ? "Editar tipo de aseguradora" : "Registrar tipo de aseguradora"}
                        </h4>
                    </div>

                    <FormProvider {...methods}>
                        <div style={{ marginBottom: "50px" }}>
                            <GenericFormSection fields={insureTypeForm()} />
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
                            {canDelete && tiaId && (
                                <Button
                                    className="p-button-danger p-button-text"
                                    onClick={() => {
                                        setCurrentInsureType({
                                            tiaId,
                                            nombre: watch("nombre"),
                                        });
                                        setDeleteDialogVisible(true);
                                    }}
                                    label="Eliminar tipo de aseguradora"
                                    loading={loading}
                                />
                            )}
                            <Button
                                className="p-button-info p-button-text"
                                onClick={handleSubmit(save)}
                                icon="pi pi-save"
                                label={tiaId ? "Guardar Cambios" : "Guardar"}
                                loading={loading}
                            />
                        </div>
                    </FormProvider>
                </div>
            </Sidebar>
        );
    }
);

export default VenInsureType;
