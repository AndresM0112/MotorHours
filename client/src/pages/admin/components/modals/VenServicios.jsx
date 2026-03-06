import React, {
    forwardRef,
    useImperativeHandle,
    useState,
    useContext,
    useMemo,
    useEffect,
} from "react";
import { Dialog } from "primereact/dialog";
import { Button } from "primereact/button";
import { FormProvider, useForm } from "react-hook-form";
import { Panel } from "primereact/panel";
import { RadioButton } from "primereact/radiobutton";
import { InputTextarea } from "primereact/inputtextarea";
import GenericFormSection from "@components/data/GenericFormSection";
import { AuthContext } from "@context/auth/AuthContext";
import { ToastContext } from "@context/toast/ToastContext";
import useHandleApiError from "@hook/useHandleApiError";
import { useMediaQueryContext } from "@context/mediaQuery/mediaQueryContext";
import { saveServicioAPI } from "@api/requests/ServiciosAPI";
import { getPilotosDropdownAPI } from "@api/requests/pilotosAPI";
import { getAlistamientosDropdownAPI } from "@api/requests/AlistamientoAPI";
import { serviciosForm } from "@pages/home/configForms";

const defaultValues = {
    pilotoId: null,
    moto_type: "",
    moto_hours: "",
    service_type: "",  // Empezar vacío para que el usuario seleccione
    items: [],
};

// Componente para manejar los items de alistamiento
const AlistamientoItemsSection = ({ alistamientos, values, setValue, readOnly }) => {
    const [alistamientoStates, setAlistamientoStates] = useState({});

    useEffect(() => {
        // Inicializar el estado de los alistamientos
        if (alistamientos.length > 0) {
            const initialStates = {};
            
            // Si hay valores existentes (modo edición/vista), usar esos valores
            const existingItems = values.items || [];
            
            alistamientos.forEach(item => {
                const existingItem = existingItems.find(ei => ei.id === item.id);
                initialStates[item.id] = {
                    realizada: existingItem?.completed ?? null,
                    observaciones: existingItem?.notes ?? ""
                };
            });
            setAlistamientoStates(initialStates);
        }
    }, [alistamientos, values.alistamiento_items]);

    const handleRealizadaChange = (itemId, value) => {
        setAlistamientoStates(prev => {
            const newState = {
                ...prev,
                [itemId]: {
                    ...prev[itemId],
                    realizada: value
                }
            };
            return newState;
        });
    };

    const handleObservacionesChange = (itemId, observaciones) => {
        setAlistamientoStates(prev => {
            const newState = {
                ...prev,
                [itemId]: {
                    ...prev[itemId],
                    observaciones
                }
            };
            return newState;
        });
    };

    // Actualizar el formulario cuando cambie el estado de alistamientos
    useEffect(() => {
        if (Object.keys(alistamientoStates).length > 0) {
            const completedItems = Object.entries(alistamientoStates)
                .filter(([_, state]) => state.realizada !== null)
                .map(([itemId, state]) => ({
                    id: parseInt(itemId),
                    realizada: state.realizada,
                    observaciones: state.observaciones ? state.observaciones.trim() : ""
                }));
            
            setValue("items", completedItems, { shouldValidate: false });
        }
    }, [alistamientoStates, setValue]);

    if (!alistamientos || alistamientos.length === 0) {
        return (
            <div className="text-center p-3">
                <p>No hay items de alistamiento disponibles</p>
            </div>
        );
    }

    return (
        <Panel header="Items de Alistamiento General" className="mt-3">
            <div className="alistamiento-items-list">
                {alistamientos.map((item, index) => (
                    <div key={item.id} className="alistamiento-item border-bottom-1 border-200 pb-3 mb-3">
                        {/* Fila principal: Número, descripción y botones SÍ/NO en línea */}
                        <div className="flex align-items-center mb-2 gap-2 flex-wrap">
                            <span className="font-bold">{index + 1}.</span>
                            <span className="flex-1 min-w-0">{item.label || item.description}</span>
                            
                            {/* Botones SÍ/NO al costado */}
                            <div className="flex gap-2 align-items-center flex-shrink-0">
                                <span className="font-semibold text-sm whitespace-nowrap">Realizado:</span>
                                <div className="flex align-items-center">
                                    <RadioButton
                                        inputId={`si-${item.id}`}
                                        name={`realizada-${item.id}`}
                                        value={true}
                                        onChange={() => handleRealizadaChange(item.id, true)}
                                        checked={alistamientoStates[item.id]?.realizada === true}
                                        disabled={readOnly}
                                    />
                                    <label htmlFor={`si-${item.id}`} className="ml-1 text-sm">SÍ</label>
                                </div>
                                <div className="flex align-items-center">
                                    <RadioButton
                                        inputId={`no-${item.id}`}
                                        name={`realizada-${item.id}`}
                                        value={false}
                                        onChange={() => handleRealizadaChange(item.id, false)}
                                        checked={alistamientoStates[item.id]?.realizada === false}
                                        disabled={readOnly}
                                    />
                                    <label htmlFor={`no-${item.id}`} className="ml-1 text-sm">NO</label>
                                </div>
                            </div>
                        </div>
                        
                        {/* Fila de observaciones */}
                        <div className="mt-2">
                            <label htmlFor={`obs-${item.id}`} className="font-semibold text-sm mb-2 block">
                                Observaciones:
                            </label>
                            <InputTextarea
                                id={`obs-${item.id}`}
                                value={alistamientoStates[item.id]?.observaciones || ""}
                                onChange={(e) => handleObservacionesChange(item.id, e.target.value)}
                                placeholder="Ingrese observaciones..."
                                rows={2}
                                className="w-full"
                                disabled={readOnly}
                            />
                        </div>
                    </div>
                ))}
            </div>
        </Panel>
    );
};

const VenServicios = forwardRef(({ addItem, updateItem }, ref) => {
    const [visible, setVisible] = useState(false);
    const [mode, setMode] = useState("new"); // "new" | "view" | "edit"
    const [servicioId, setServicioId] = useState(null);
    const [loading, setLoading] = useState(false);
    const [pilotos, setPilotos] = useState([]);
    const [alistamientos, setAlistamientos] = useState([]);

    const { showSuccess } = useContext(ToastContext);
    const handleApiError = useHandleApiError();
    const { isMobile, isTablet } = useMediaQueryContext();
    const isDesktop = !isMobile && !isTablet;

    const methods = useForm({ defaultValues });
    const { reset, handleSubmit, getValues, watch, setValue } = methods;

    const readOnly = mode === "view";

    const pilotoId = watch("pilotoId");
    const serviceType = watch("service_type");

    useEffect(() => {
        // Solo actualizar moto_type automáticamente en modo "new"
        // En modo view/edit, preservar los datos originales
        if (mode === "new" && pilotoId) {
            const selectedPiloto = pilotos.find((p) => p.id === pilotoId);
            setValue("moto_type", selectedPiloto?.motos?.[0]?.type || "N/A");
        } else if (mode === "new" && !pilotoId) {
            setValue("moto_type", "");
        }
    }, [pilotoId, pilotos, setValue, mode]);

    // Campos del formulario excluyendo los alistamientos que manejaremos por separado
    const fields = useMemo(() => {
        const formFields = serviciosForm({ readOnly, pilotos, alistamientos: [], watch });
        return formFields;
    }, [readOnly, pilotos, watch]);

    const fetchDropdowns = async () => {
        try {
            const [pilotosRes, alistamientosRes] = await Promise.all([
                getPilotosDropdownAPI(),
                getAlistamientosDropdownAPI(),
            ]);
            setPilotos(pilotosRes.data || []);
            setAlistamientos(alistamientosRes.data || []);
        } catch (error) {
            handleApiError(error);
        }
    };

    useImperativeHandle(ref, () => ({
        newServicio: () => {
            setMode("new");
            setServicioId(null);
            reset(defaultValues);
            fetchDropdowns();
            setVisible(true);
        },
        editServicio: (row) => {
            setMode("edit");
            setServicioId(row?.id || null);
            
            // Mapear correctamente los datos del backend
            const resetData = {
                pilotoId: row?.pilotId || null, // pilotId del backend
                moto_type: row?.bikeType || "",
                moto_hours: row?.hours?.toString() || "",
                service_type: row?.serviceType || "",
                items: row?.items || [],
            };
            
            reset(resetData);
            fetchDropdowns();
            setVisible(true);
        },
        viewServicio: (row) => {
            setMode("view");
            setServicioId(row?.id || null);
            
            // Mapear correctamente los datos del backend para vista
            const resetData = {
                pilotoId: row?.pilotId || null, 
                moto_type: row?.bikeType || "",
                moto_hours: row?.hours?.toString() || "",
                service_type: row?.serviceType || "",
                items: row?.items || [],
            };
            
            reset(resetData);
            fetchDropdowns();
            setVisible(true);
        },
        onClose: () => {
            closeForm();
        },
    }));

    const closeForm = () => {
        setVisible(false);
        setServicioId(null);
        setMode("new");
        reset(defaultValues);
        setLoading(false);
    };

    const handleSave = async () => {
        const values = getValues();

        // Validación para alistamientos
        if (values.service_type === 'ALISTAMIENTO') {
            if (!values.items || values.items.length === 0) {
                handleApiError(new Error("Debe completar al menos un item de alistamiento"));
                return;
            }
        }

        // Obtener el moto_id del piloto seleccionado
        const selectedPiloto = pilotos.find(p => p.id === values.pilotoId);
        if (!selectedPiloto || !selectedPiloto.motos || selectedPiloto.motos.length === 0) {
            handleApiError(new Error("El piloto seleccionado no tiene motos asociadas"));
            return;
        }

        // Tomar la primera moto del piloto (por ahora)
        const moto_id = selectedPiloto.motos[0].id;

        const payload = {
            id: servicioId || 0,
            moto_id: moto_id, // Enviar moto_id en lugar de pilotoId
            moto_hours: parseFloat(values.moto_hours) || 0,
            service_type: values.service_type,
            alistamiento_items: values.service_type === 'ALISTAMIENTO' ? values.items : [],
        };

        setLoading(true);
        try {
            const { data } = await saveServicioAPI(payload);
            showSuccess(data?.message || "Servicio guardado correctamente");
            
            // Construir el array de alistamientos con nombres para la tabla
            const alistamientosConNombres = payload.alistamiento_items.map(item => {
                const alistamientoInfo = alistamientos.find(a => a.id === item.id);
                return {
                    ...item,
                    description: alistamientoInfo?.label || alistamientoInfo?.description || "Item desconocido"
                };
            });

            const row = {
                id: servicioId || data.id,
                pilotoId: values.pilotoId, // Mantener pilotoId para la tabla
                pilotName: selectedPiloto?.name || "Sin piloto", // Nombre del piloto
                hours: payload.moto_hours,
                serviceType: payload.service_type,
                bikeType: selectedPiloto?.motos?.[0]?.type || "N/A",
                items: alistamientosConNombres,
                createdAt: data.createdAt || new Date().toISOString(),
            };

            if (servicioId) {
                updateItem && updateItem({ idField: "id", ...row });
            } else {
                addItem && addItem(row);
            }

            closeForm();
        } catch (err) {
            handleApiError(err);
        } finally {
            setLoading(false);
        }
    };

    const HeaderTitle = (
        <h4 className="my-0" style={{ fontWeight: 600 }}>
            {mode === "new"
                ? "Nuevo Servicio"
                : mode === "view"
                    ? `Servicio ${servicioId ? `#${servicioId}` : ""}`
                    : `Editar Servicio ${servicioId ? `#${servicioId}` : ""}`}
        </h4>
    );

    const FooterButtons = (
        <div className="flex justify-content-end gap-2 w-full">
            {mode === "view" ? null : (
                <Button
                    className="p-button-submit"
                    onClick={handleSubmit(handleSave)}
                    label={servicioId ? "Guardar" : "Registrar"}
                    loading={loading}
                    disabled={loading}
                    icon="pi pi-save"
                />
            )}
        </div>
    );

    return (
        <Dialog
            visible={visible}
            onHide={closeForm}
            header={HeaderTitle}
            footer={FooterButtons}
            closable
            dismissableMask
            modal
            blockScroll
            maximizable={isDesktop}
            className={isMobile ? "p-dialog-fullscreen" : "p-dialog-md"}
            style={
                isMobile
                    ? { width: "100vw", maxWidth: "100vw", height: "100dvh", margin: 0 }
                    : { width: isTablet ? "60vw" : "50vw", maxWidth: 900 }
            }
            contentStyle={
                isMobile
                    ? { display: "flex", flexDirection: "column", overflow: "auto", padding: "1rem" }
                    : {}
            }
        >
            <div
                className="servicio-modal"
                style={{
                    position: "relative",
                    overflow: isMobile ? "auto" : "hidden",
                    height: isMobile ? "100%" : "auto",
                    paddingBottom: isMobile ? "60px" : "0", // Espacio para el botón en móvil
                }}
            >
                <FormProvider {...methods}>
                    <div className="mt-2">
                        <GenericFormSection fields={fields} />
                        
                        {serviceType === "ALISTAMIENTO" && (
                            <AlistamientoItemsSection
                                alistamientos={alistamientos}
                                values={getValues()}
                                setValue={setValue}
                                readOnly={readOnly}
                            />
                        )}
                    </div>
                </FormProvider>
            </div>
        </Dialog>
    );
});

VenServicios.displayName = "VenServicios";

export default VenServicios;
