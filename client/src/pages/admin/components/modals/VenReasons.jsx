import React, { forwardRef, useContext, useEffect, useImperativeHandle, useState } from "react";
import { AuthContext } from "@context/auth/AuthContext";
import { ToastContext } from "@context/toast/ToastContext";
// UI
import { Button } from "primereact/button";
// HOOKS
import useHandleApiError from "@hook/useHandleApiError";
// OTROS
import { FormProvider, useForm } from "react-hook-form";
import moment from "moment";
// COMPONENTES
import GenericFormSection from "@components/data/GenericFormSection";
import { reasonsForm } from "../../configForms";
// API
import { saveReasonApi } from "@api/requests/reasonsAPI";
import { getModulesApi } from "@api/requests";
import PropTypes from "prop-types";
import { Sidebar } from "primereact/sidebar";
import { useMediaQueryContext } from "@context/mediaQuery/mediaQueryContext";

const defaultValues = { nombre: "", modulos: [], estado: 1 };

const VenReasons = forwardRef(
    ({ addItem, updateItem, setCurrentReason, setDeleteDialogVisible, canDelete }, ref) => {
        const { nombreusuario, idusuario } = useContext(AuthContext);
        const { showSuccess, showInfo } = useContext(ToastContext);
        const { isMobile, isTablet, isDesktop } = useMediaQueryContext();

        const handleApiError = useHandleApiError();
        const [visible, setVisible] = useState(false);
        const [motId, setMotId] = useState(null);
        const [loading, setLoading] = useState(false);
        const [listModules, setListModules] = useState([]);

        const [originalData, setOriginalData] = useState(null);

        useEffect(() => {
            getModulesApi()
                .then(({ data }) => {
                    setListModules(data);
                })
                .catch((error) => {
                    handleApiError(error);
                });
        }, [handleApiError]);

        const methods = useForm({ defaultValues });

        const { handleSubmit, reset, setValue, watch } = methods;

        const newReason = (modulo = null) => {
            setVisible(true);
            if (modulo) {
                setValue("modulos", [modulo]);
            }
        };

        const editReason = async (item) => {
            const { motId } = item;
            setMotId(motId);
            setOriginalData(item);

            const modulos = item.modulos ? item.modulos.split(",").map(Number) : [];
            setValue("nombre", item.nombre);
            setValue("modulos", modulos);
            setValue("estado", item.estado);
            setVisible(true);
        };

        const saveReason = async (values) => {
            setLoading(true);
            try {
                const nombre = values.nombre.trim().toUpperCase();
                const modulos = values.modulos.join(",");

                if (
                    motId > 0 &&
                    nombre === originalData.nombre &&
                    modulos === originalData.modulos &&
                    values.estado === originalData.estado
                ) {
                    return showInfo("No has realizado ningún cambio.");
                }

                const params = {
                    motId,
                    ...values,
                    nombre,
                    modulos,
                    usureg: idusuario,
                    usuact: nombreusuario,
                };
                const { data } = await saveReasonApi(params);
                showSuccess(data.message);
                setLoading(false);

                const item = {
                    motId: motId > 0 ? motId : data.motId,
                    ...values,
                    nombre,
                    modulos,
                    nomestado: values.estado === 1 ? "Activo" : "Inactivo",
                    usuact: nombreusuario,
                    fecact: moment().format("YYYY-MM-DD HH:mm:ss"),
                };

                if (motId > 0) {
                    updateItem({ idField: "motId", ...item });
                } else {
                    addItem(item);
                }

                reset(defaultValues);
                setMotId(null);
                setOriginalData(null);
                setVisible(false);
            } catch (error) {
                handleApiError(error);
                setLoading(false);
            } finally {
                setLoading(false);
            }
        };

        useImperativeHandle(ref, () => ({
            newReason,
            editReason,
            onClose: () => setVisible(false),
        }));

        return (
            <Sidebar
                dismissable={true}
                visible={visible}
                position="right"
                className="p-sidebar-md"
                onHide={() => {
                    reset(defaultValues);
                    setMotId(0);
                    setVisible(false);
                }}
                style={{ width: isMobile ? "100%" : isTablet ? 550 : isDesktop ? 400 : 400 }}
            >
                <div
                    style={{
                        display: "flex",
                        flexDirection: "column",
                        height: "100%",
                    }}
                >
                    <div
                        style={{
                            position: "absolute",
                            top: 0,
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                        }}
                    >
                        <h4 className="my-4 text-center" style={{ flex: 1, textAlign: "center" }}>
                            {motId > 0 ? "Edición motivo" : "Registro Motivo"}
                        </h4>
                    </div>
                    <FormProvider {...methods}>
                        <div style={{ marginTop: "10px" }} />
                        <div style={{ marginBottom: "50px" }}>
                            <GenericFormSection fields={reasonsForm({ listModules })} />
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
                            {canDelete && motId > 0 && (
                                <Button
                                    className="p-button-danger p-button-text"
                                    onClick={() => {
                                        setCurrentReason({ motId, nombre: watch("nombre") });
                                        setDeleteDialogVisible(true);
                                    }}
                                    label={"Eliminar motivo"}
                                    loading={loading}
                                />
                            )}
                            <Button
                                className="p-button-info p-button-text"
                                onClick={handleSubmit(saveReason)}
                                icon="pi pi-save"
                                label={motId ? "Guardar Cambios" : "Guardar"}
                                loading={loading}
                            />
                        </div>
                    </FormProvider>
                </div>
            </Sidebar>
        );
    }
);

VenReasons.propTypes = {
    addItem: PropTypes.func.isRequired, // Debe ser una función para agregar un usuario.
};

export default VenReasons;
