// src/pages/management/location/components/VenLocation.jsx

import React, {
    forwardRef,
    useImperativeHandle,
    useState,
    useContext,
    useMemo,
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
import { saveLocationAPI } from "@api/requests/locationApi";

// ⬇️ nuevo import del config
// import { locationForm } from "../configForms"; // ajusta la ruta si hace falta
import { locationForm } from "@pages/home/configForms";


const defaultValues = {
    nombre: "",
    estId: 1,
    aplicaBloque: false,
    aplicaLocal: false,
};

const VenLocation = forwardRef(({ addItem, updateItem }, ref) => {
    const [visible, setVisible] = useState(false);
    const [mode, setMode] = useState("new"); // "new" | "view" | "edit"
    const [lcaId, setLcaId] = useState(null);
    const [loading, setLoading] = useState(false);

    const { idusuario } = useContext(AuthContext);
    const { showSuccess } = useContext(ToastContext);
    const handleApiError = useHandleApiError();
    const { isMobile, isTablet } = useMediaQueryContext();
    const isDesktop = !isMobile && !isTablet;

    const methods = useForm({ defaultValues });
    const { reset, handleSubmit, getValues } = methods;

    const readOnly = mode === "view";

    // ⬇️ campos vienen del config
    const fields = useMemo(
        () => locationForm({ readOnly }),
        [readOnly]
    );

    useImperativeHandle(ref, () => ({
        newLocation: () => {
            setMode("new");
            setLcaId(null);
            reset(defaultValues);
            setVisible(true);
        },
        editLocation: (row) => {
            setMode("edit");
            setLcaId(row?.lcaId);
            reset({
                nombre: row?.nombre ?? "",
                estId: row?.estId ?? 1,
                aplicaBloque: !!row?.bloqueId, // 1 → true, 0 → false
                aplicaLocal: !!row?.localId,
            });
            setVisible(true);
        },
        viewLocation: (row) => {
            setMode("view");
            setLcaId(row?.lcaId);
            reset({
                nombre: row?.nombre ?? "",
                estId: row?.estId ?? 1,
                aplicaBloque: !!row?.bloqueId,
                aplicaLocal: !!row?.localId,
            });
            setVisible(true);
        },
        onClose: () => {
            closeForm();
        },
    }));

    const closeForm = () => {
        setVisible(false);
        setLcaId(null);
        setMode("new");
        reset(defaultValues);
        setLoading(false);
    };

    const handleSave = async () => {
        const values = getValues();

        const payload = {
            lcaId: lcaId || 0,
            nombre: (values.nombre || "").trim(),
            estId: Number(values.estId) || 1,
            bloqueId: values.aplicaBloque ? 1 : 0,
            localId: values.aplicaLocal ? 1 : 0,
            usuario: idusuario,
        };

        setLoading(true);
        try {
            const { data } = await saveLocationAPI(payload);

            showSuccess(data?.message || "Localización guardada correctamente");

            const row = {
                lcaId: lcaId || data.lcaId || data.id,
                nombre: payload.nombre,
                estId: payload.estId,
                bloqueId: payload.bloqueId,
                localId: payload.localId,
                bloqueNombre: null,
                bloqueCodigo: null,
                localNombre: null,
                localCodigo: null,
                fechaRegistro: data.fechaRegistro || new Date().toISOString(),
                fechaActualizacion: new Date().toISOString(),
            };

            if (lcaId) {
                updateItem && updateItem({ idField: "lcaId", ...row });
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
                ? "Nueva localización"
                : mode === "view"
                    ? `Localización #${lcaId}`
                    : `Editar localización #${lcaId}`}
        </h4>
    );

    const FooterButtons = (
        <div className="flex justify-content-end gap-2 w-full">
            {/* <Button
        label="Cerrar"
        icon="pi pi-times"
        className="p-button-text"
        onClick={closeForm}
      /> */}
            {mode === "view" ? null : (
                <Button
                    className="p-button-submit"
                    onClick={handleSubmit(handleSave)}
                    label={lcaId ? "Guardar" : "Registrar"}
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
                    : { width: isTablet ? "50vw" : "40vw", maxWidth: 700 }
            }
            contentStyle={
                isMobile
                    ? { display: "flex", flexDirection: "column", overflow: "hidden", padding: "1rem" }
                    : {}
            }
        >
            <div
                className="location-modal"
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

export default VenLocation;
