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

import GenericFormSection from "@components/data/GenericFormSection";

import { AuthContext } from "@context/auth/AuthContext";
import { ToastContext } from "@context/toast/ToastContext";
import useHandleApiError from "@hook/useHandleApiError";
import { useMediaQueryContext } from "@context/mediaQuery/mediaQueryContext";

// API
import { saveMotoAPI } from "@api/requests/motosAPI";
import { getPilotosDropdownAPI } from "@api/requests/pilotosAPI";

// Config del formulario
import { motosForm } from "@pages/home/configForms";

const defaultValues = {
    pilotId: null,
    type: "",
};

const VenMotos = forwardRef(({ addItem, updateItem }, ref) => {
    const [visible, setVisible] = useState(false);
    const [mode, setMode] = useState("new"); // "new" | "view" | "edit"
    const [motoId, setMotoId] = useState(null);
    const [loading, setLoading] = useState(false);
    const [pilotos, setPilotos] = useState([]);

    const { idusuario } = useContext(AuthContext);
    const { showSuccess } = useContext(ToastContext);
    const handleApiError = useHandleApiError();
    const { isMobile, isTablet } = useMediaQueryContext();
    const isDesktop = !isMobile && !isTablet;

    const methods = useForm({ defaultValues });
    const { reset, handleSubmit, getValues, watch } = methods;

    const readOnly = mode === "view";

    // Cargar pilotos para el dropdown
    useEffect(() => {
        const loadPilotos = async () => {
            try {
                const { data } = await getPilotosDropdownAPI();
                setPilotos(Array.isArray(data) ? data : []);
            } catch (err) {
                console.error('Error al cargar pilotos:', err);
                setPilotos([]);
            }
        };

        if (visible) {
            loadPilotos();
        }
    }, [visible]);

    // Configuración de campos del formulario
    const fields = useMemo(
        () => motosForm({ readOnly, pilotos }),
        [readOnly, pilotos]
    );

    useImperativeHandle(ref, () => ({
        newMoto: () => {
            setMode("new");
            setMotoId(null);
            reset(defaultValues);
            setVisible(true);
        },
        editMoto: (row) => {
            setMode("edit");
            setMotoId(row?.id);
            reset({
                pilotId: row?.pilotId ?? null,
                type: row?.type ?? "",
            });
            setVisible(true);
        },
        viewMoto: (row) => {
            setMode("view");
            setMotoId(row?.id);
            reset({
                pilotId: row?.pilotId ?? null,
                type: row?.type ?? "",
            });
            setVisible(true);
        },
        onClose: () => {
            closeForm();
        },
    }));

    const closeForm = () => {
        setVisible(false);
        setMotoId(null);
        setMode("new");
        reset(defaultValues);
        setLoading(false);
    };

    const handleSave = async () => {
        const values = getValues();

        const payload = {
            id: motoId || 0,
            pilotId: values.pilotId,
            type: (values.type || "").trim(),
        };

        setLoading(true);
        try {
            const { data } = await saveMotoAPI(payload);

            showSuccess(data?.message || "Moto guardada correctamente");

            // Crear objeto para actualizar la tabla
            const pilotoSeleccionado = pilotos.find(p => p.id === values.pilotId);
            const row = {
                id: motoId || data.id,
                pilotId: payload.pilotId,
                type: payload.type,
                pilotName: pilotoSeleccionado?.name || "—",
                createdAt: data.createdAt || new Date().toISOString(),
            };

            if (motoId) {
                // Actualizar
                updateItem && updateItem({ idField: "id", ...row });
            } else {
                // Crear nuevo
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
                ? "Nueva Moto"
                : mode === "view"
                    ? `Moto #${motoId}`
                    : `Editar Moto #${motoId}`}
        </h4>
    );

    const FooterButtons = (
        <div className="flex justify-content-end gap-2 w-full">
            {mode === "view" ? null : (
                <Button
                    className="p-button-submit"
                    onClick={handleSubmit(handleSave)}
                    label={motoId ? "Guardar" : "Registrar"}
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
                    : { width: isTablet ? "50vw" : "40vw", maxWidth: 600 }
            }
            contentStyle={
                isMobile
                    ? { display: "flex", flexDirection: "column", overflow: "hidden", padding: "1rem" }
                    : {}
            }
        >
            <div
                className="moto-modal"
                style={{
                    position: "relative",
                    overflow: "hidden",
                    height: isMobile ? "100%" : "auto",
                }}
            >
                <FormProvider {...methods}>
                    <div className="mt-2">
                        <GenericFormSection fields={fields} />
                    </div>
                </FormProvider>
            </div>
        </Dialog>
    );
});

VenMotos.displayName = "VenMotos";

export default VenMotos;
