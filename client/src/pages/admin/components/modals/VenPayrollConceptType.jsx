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
import { payrollConceptTypeForm } from "../../configForms";

// API
import { saveAPI } from "@api/requests/payrollConceptTypeApi";

const defaultValues = {
    nombre: "",
    estId: 1,
};

const VenPayrollConceptType = forwardRef(
    (
        { addItem, updateItem, setCurrentPayrollConceptType, setDeleteDialogVisible, canDelete },
        ref
    ) => {
        const { idusuario, nombreusuario } = useContext(AuthContext);
        const { showSuccess, showInfo } = useContext(ToastContext);
        const { isMobile, isTablet, isDesktop } = useMediaQueryContext();
        const handleApiError = useHandleApiError();

        const [visible, setVisible] = useState(false);
        const [tcnId, setTcnId] = useState(null);
        const [loading, setLoading] = useState(false);
        const [originalData, setOriginalData] = useState(null);

        const methods = useForm({ defaultValues });
        const { handleSubmit, reset, setValue, watch } = methods;

        const newPayrollConceptType = () => {
            reset(defaultValues);
            setTcnId(null);
            setOriginalData(null);
            setVisible(true);
        };

        const editPayrollConceptType = (item) => {
            setTcnId(item.tcnId);
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
                    tcnId &&
                    nombre === originalData.nombre &&
                    values.estId === originalData.estId
                ) {
                    showInfo("No has realizado ningún cambio.");
                    return;
                }

                const params = {
                    tcnId,
                    ...values,
                    nombre,
                    usureg: idusuario,
                    usuact: nombreusuario,
                };

                const { data } = await saveAPI(params);
                showSuccess(data.message);

                const item = {
                    tcnId: tcnId || data.tcnId,
                    ...values,
                    nombre,
                    nombreEstado: values.estId === 1 ? "Activo" : "Inactivo",
                    usuact: nombreusuario,
                    fecact: moment().format("YYYY-MM-DD HH:mm:ss"),
                };

                if (tcnId) {
                    updateItem({ idField: "tcnId", ...item });
                } else {
                    addItem(item);
                }

                reset(defaultValues);
                setTcnId(null);
                setVisible(false);
            } catch (error) {
                handleApiError(error);
            } finally {
                setLoading(false);
            }
        };

        useImperativeHandle(ref, () => ({
            newPayrollConceptType,
            editPayrollConceptType,
            onClose: () => setVisible(false),
        }));

        return (
            <Sidebar
                visible={visible}
                onHide={() => {
                    reset(defaultValues);
                    setTcnId(null);
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
                            {tcnId
                                ? "Editar tipo concepto de nomina"
                                : "Registrar tipo concepto de nomina"}
                        </h4>
                    </div>

                    <FormProvider {...methods}>
                        <div style={{ marginBottom: "50px" }}>
                            <GenericFormSection fields={payrollConceptTypeForm()} />
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
                            {canDelete && tcnId && (
                                <Button
                                    className="p-button-danger p-button-text"
                                    onClick={() => {
                                        setCurrentPayrollConceptType({
                                            tcnId,
                                            nombre: watch("nombre"),
                                        });
                                        setDeleteDialogVisible(true);
                                    }}
                                    label="Eliminar tipo concepto de nomina"
                                    loading={loading}
                                />
                            )}
                            <Button
                                className="p-button-info p-button-text"
                                onClick={handleSubmit(save)}
                                icon="pi pi-save"
                                label={tcnId ? "Guardar Cambios" : "Guardar"}
                                loading={loading}
                            />
                        </div>
                    </FormProvider>
                </div>
            </Sidebar>
        );
    }
);

export default VenPayrollConceptType;
