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
import { centerCostForm } from "../../configForms";

// API
import { saveAPI } from "@api/requests/centerCostApi";
import { getAllAPI as getAllManagementApi } from "@api/requests/managementApi";

const defaultValues = {
    gerId: null,
    codigo: "",
    nombre: "",
    estId: 1,
};

const VenCenterCost = forwardRef(
    ({ addItem, updateItem, setCurrentCenterCost, setDeleteDialogVisible, canDelete }, ref) => {
        const { idusuario, nombreusuario } = useContext(AuthContext);
        const { showSuccess, showInfo } = useContext(ToastContext);
        const { isMobile, isTablet, isDesktop } = useMediaQueryContext();
        const handleApiError = useHandleApiError();
        const [lists, setLists] = useState({
            gerenciaList: [],
        })

        const [visible, setVisible] = useState(false);
        const [ccoId, setCcoId] = useState(null);
        const [loading, setLoading] = useState(false);
        const [originalData, setOriginalData] = useState(null);

        const methods = useForm({ defaultValues });
        const { handleSubmit, reset, setValue, watch } = methods;


        const newCenterCost = () => {
            reset(defaultValues);
            setCcoId(null);
            setOriginalData(null);
            setVisible(true);
        };

        const editCenterCost = (item) => {
            setCcoId(item.ccoId);
            setOriginalData(item);
            setValue("gerId", item.gerId);
            setValue("codigo", item.codigo);
            setValue("nombre", item.nombre);
            setValue("estId", item.estId);
            setVisible(true);
        };

        const save = async (values) => {
            setLoading(true);
            try {
                const nombre = values.nombre.trim().toUpperCase();
                if (
                    ccoId &&
                    nombre === originalData.nombre &&
                    values.estId === originalData.estId
                ) {
                    showInfo("No has realizado ningún cambio.");
                    return;
                }

                const params = {
                    ccoId,
                    ...values,
                    nombre,
                    usureg: idusuario,
                    usuact: nombreusuario,
                };

                const { data } = await saveAPI(params);
                showSuccess(data.message);

                const item = {
                    ccoId: ccoId || data.ccoId,
                    ...values,
                    nombre,
                    nombreEstado: values.estId === 1 ? "Activo" : "Inactivo",
                    nombreGerencia: lists.gerenciaList.find(x => x.id === values.gerId)?.nombre ?? "",
                    usuact: nombreusuario,
                    fecact: moment().format("YYYY-MM-DD HH:mm:ss"),
                };

                if (ccoId) {
                    updateItem({ idField: "ccoId", ...item });
                } else {
                    addItem(item);
                }

                reset(defaultValues);
                setCcoId(null);
                setVisible(false);
            } catch (error) {
                handleApiError(error);
            } finally {
                setLoading(false);
            }
        };

        useImperativeHandle(ref, () => ({
            newCenterCost,
            editCenterCost,
            onClose: () => setVisible(false),
        }));

        const fetchList = async () => {
            try {
                const [{ data: gerencias }] = await Promise.all([getAllManagementApi()]);
                console.log(gerencias);
                setLists(prev => ({ ...prev, gerenciaList: gerencias }));
            } catch (error) {
                handleApiError(error);
            }
        };


        useEffect(() => {
            if (visible) fetchList()
        }, [visible])

        return (
            <Sidebar
                visible={visible}
                onHide={() => {
                    reset(defaultValues);
                    setCcoId(null);
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
                            {ccoId ? "Editar centro de costo" : "Registrar centro de costo"}
                        </h4>
                    </div>

                    <FormProvider {...methods}>
                        <div style={{ marginBottom: "50px" }}>
                            <GenericFormSection fields={centerCostForm({ lists })} />
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
                            {canDelete && ccoId && (
                                <Button
                                    className="p-button-danger p-button-text"
                                    onClick={() => {
                                        setCurrentCenterCost({
                                            ccoId,
                                            nombre: watch("nombre"),
                                        });
                                        setDeleteDialogVisible(true);
                                    }}
                                    label="Eliminar centro de costo"
                                    loading={loading}
                                />
                            )}
                            <Button
                                className="p-button-info p-button-text"
                                onClick={handleSubmit(save)}
                                icon="pi pi-save"
                                label={ccoId ? "Guardar Cambios" : "Guardar"}
                                loading={loading}
                            />
                        </div>
                    </FormProvider>
                </div>
            </Sidebar>
        );
    }
);

export default VenCenterCost;
