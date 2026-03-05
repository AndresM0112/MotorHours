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
import { saveAPI } from "@api/requests/payrollNatureApi";

const defaultValues = {
    nombre: "",
    estId: 1,
};

const VenPayrollNature = forwardRef(
    ({ addItem, updateItem, setCurrentPayrollNature, setDeleteDialogVisible, canDelete }, ref) => {
        const { idusuario, nombreusuario } = useContext(AuthContext);
        const { showSuccess, showInfo } = useContext(ToastContext);
        const { isMobile, isTablet, isDesktop } = useMediaQueryContext();
        const handleApiError = useHandleApiError();

        const [visible, setVisible] = useState(false);
        const [nanId, setNanId] = useState(null);
        const [loading, setLoading] = useState(false);
        const [originalData, setOriginalData] = useState(null);

        const methods = useForm({ defaultValues });
        const { handleSubmit, reset, setValue, watch } = methods;

        const newPayrollNature = () => {
            reset(defaultValues);
            setNanId(null);
            setOriginalData(null);
            setVisible(true);
        };

        const editPayrollNature = (item) => {
            setNanId(item.nanId);
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
                    nanId &&
                    nombre === originalData.nombre &&
                    values.estId === originalData.estId
                ) {
                    showInfo("No has realizado ningún cambio.");
                    return;
                }

                const params = {
                    nanId,
                    ...values,
                    nombre,
                    usureg: idusuario,
                    usuact: nombreusuario,
                };

                const { data } = await saveAPI(params);
                showSuccess(data.message);

                const item = {
                    nanId: nanId || data.nanId,
                    ...values,
                    nombre,
                    nombreEstado: values.estId === 1 ? "Activo" : "Inactivo",
                    usuact: nombreusuario,
                    fecact: moment().format("YYYY-MM-DD HH:mm:ss"),
                };

                if (nanId) {
                    updateItem({ idField: "nanId", ...item });
                } else {
                    addItem(item);
                }

                reset(defaultValues);
                setNanId(null);
                setVisible(false);
            } catch (error) {
                handleApiError(error);
            } finally {
                setLoading(false);
            }
        };

        useImperativeHandle(ref, () => ({
            newPayrollNature,
            editPayrollNature,
            onClose: () => setVisible(false),
        }));

        return (
            <Sidebar
                visible={visible}
                onHide={() => {
                    reset(defaultValues);
                    setNanId(null);
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
                            {nanId
                                ? "Editar naturaleza de nomina"
                                : "Registrar naturaleza de nomina"}
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
                            {canDelete && nanId && (
                                <Button
                                    className="p-button-danger p-button-text"
                                    onClick={() => {
                                        setCurrentPayrollNature({
                                            nanId,
                                            nombre: watch("nombre"),
                                        });
                                        setDeleteDialogVisible(true);
                                    }}
                                    label="Eliminar naturaleza de nomina"
                                    loading={loading}
                                />
                            )}
                            <Button
                                className="p-button-info p-button-text"
                                onClick={handleSubmit(save)}
                                icon="pi pi-save"
                                label={nanId ? "Guardar Cambios" : "Guardar"}
                                loading={loading}
                            />
                        </div>
                    </FormProvider>
                </div>
            </Sidebar>
        );
    }
);

export default VenPayrollNature;
