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
import { payrollConceptForm } from "../../configForms";

// API
import { saveAPI } from "@api/requests/payrollConceptApi";
import { estados } from "@utils/converAndConst";
import { getAllAPI as getAllPayrollConceptType } from "@api/requests/payrollConceptTypeApi";
import { getAllAPI as getAllPayrollNature } from "@api/requests/payrollNatureApi";

const defaultValues = {
    nombre: "",
    prefijo: "",
    tcnId: null,
    nanId: null,
    factor: 0,
    fueraNomina: null,
    requiereFondo: null,
    predeterminado: null,
    estId: 1,
    aplica: 0,
};


const VenPayrollConcept = forwardRef(
    (
        { addItem, updateItem, setCurrentPayrollConcept, setDeleteDialogVisible, canDelete },
        ref
    ) => {
        const [lists, setLists] = useState({
            tiposConcepto: [],
            naturalezas: [],
            estados
        });


        const { idusuario, nombreusuario } = useContext(AuthContext);
        const { showSuccess, showInfo } = useContext(ToastContext);
        const { isMobile, isTablet, isDesktop } = useMediaQueryContext();
        const handleApiError = useHandleApiError();

        const [visible, setVisible] = useState(false);
        const [conId, setConId] = useState(null);
        const [loading, setLoading] = useState(false);
        const [originalData, setOriginalData] = useState(null);

        const methods = useForm({ defaultValues });
        const { handleSubmit, reset, setValue, watch } = methods;

        const newPayrollConcept = () => {
            reset(defaultValues);
            setConId(null);
            setOriginalData(null);
            setVisible(true);
        };

        const editPayrollConcept = (item) => {
            setConId(item.conId);
            setOriginalData(item);
            setValue("nombre", item.nombre);
            setValue("prefijo", item.prefijo);
            setValue("tcnId", item.tcnId);
            setValue("nanId", item.nanId);
            setValue("factor", item.factor);
            setValue("fueraNomina", item.fueraNomina);
            setValue("requiereFondo", item.requiereFondo);
            setValue("predeterminado", item.predeterminado);
            setValue("estId", item.estId);
            setValue("aplica", item.aplica ?? 0);
            setVisible(true);
        };

        const save = async (values) => {
            setLoading(true);
            try {
                const nombre = values.nombre.trim().toUpperCase();

                // Validación rápida de cambios
                if (
                    conId &&
                    nombre === originalData.nombre &&
                    values.prefijo === originalData.prefijo &&
                    values.tcnId === originalData.tcnId &&
                    values.nanId === originalData.nanId &&
                    values.factor === originalData.factor &&
                    values.fueraNomina === originalData.fueraNomina &&
                    values.requiereFondo === originalData.requiereFondo &&
                    values.predeterminado === originalData.predeterminado &&
                    values.estId === originalData.estId &&
                    values.aplica === originalData.aplica
                ) {
                    showInfo("No has realizado ningún cambio.");
                    return;
                }

                const params = {
                    conId,
                    ...values,
                    nombre,
                    usureg: idusuario,
                    usuact: nombreusuario,
                };

                const { data } = await saveAPI(params);
                showSuccess(data.message);

                const findLabel = (list, id) => {
                    const found = list.find((item) => item.id === id);
                    return found ? found.nombre : "";
                };

                const item = {
                    conId: conId || data.conId,
                    nombre,
                    prefijo: values.prefijo,
                    factor: values.factor,
                    fueraNomina: values.fueraNomina,
                    requiereFondo: values.requiereFondo,
                    predeterminado: values.predeterminado,
                    tcnId: values.tcnId,
                    tipoConceptoNombre: findLabel(lists.tiposConcepto, values.tcnId),
                    nanId: values.nanId,
                    naturalezaNombre: findLabel(lists.naturalezas, values.nanId),
                    estId: values.estId,
                    aplica: values.aplica,
                    estadoNombre: findLabel(lists.estados, values.estId),
                    usuarioActualiza: nombreusuario,
                    fechaActualizacion: moment().format("YYYY-MM-DD HH:mm:ss"),
                };


                if (conId) {
                    updateItem({ idField: "conId", ...item });
                } else {
                    addItem(item);
                }

                reset(defaultValues);
                setConId(null);
                setVisible(false);
            } catch (error) {
                handleApiError(error);
            } finally {
                setLoading(false);
            }
        };


        useImperativeHandle(ref, () => ({
            newPayrollConcept,
            editPayrollConcept,
            onClose: () => setVisible(false),
        }));

        useEffect(() => {
            const fetchLists = async () => {
                try {
                    const [tipos, naturalezas] = await Promise.all([
                        getAllPayrollConceptType(),
                        getAllPayrollNature(),
                    ]);

                    setLists((prev) => ({
                        ...prev,
                        tiposConcepto: tipos.data,
                        naturalezas: naturalezas.data,
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
                    setConId(null);
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
                            {conId
                                ? "Editar tipo concepto de nomina"
                                : "Registrar tipo concepto de nomina"}
                        </h4>
                    </div>

                    <FormProvider {...methods}>
                        <div style={{ marginBottom: "50px" }}>
                            <GenericFormSection fields={payrollConceptForm({ lists })} />
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
                            {canDelete && conId && (
                                <Button
                                    className="p-button-danger p-button-text"
                                    onClick={() => {
                                        setCurrentPayrollConcept({
                                            conId,
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
                                label={conId ? "Guardar Cambios" : "Guardar"}
                                loading={loading}
                            />
                        </div>
                    </FormProvider>
                </div>
            </Sidebar>
        );
    }
);

export default VenPayrollConcept;
