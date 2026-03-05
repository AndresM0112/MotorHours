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
import { saveAlistamientoAPI } from "@api/requests/AlistamientoAPI";

// ⬇️ nuevo import del config
import { alistamientoForm } from "@pages/home/configForms"; 

const defaultValues = {
    description: "",
    active: 1,
};

const VenAlistamiento = forwardRef(({ addItem, updateItem }, ref) => {
    const [visible, setVisible] = useState(false);
    const [mode, setMode] = useState("new"); // "new" | "view" | "edit"
    const [alistamientoId, setAlistamientoId] = useState(null);
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
        () => alistamientoForm({ readOnly }),
        [readOnly]
    );

    useImperativeHandle(ref, () => ({
        newAlistamiento: () => {
            setMode("new");
            setAlistamientoId(null);
            reset(defaultValues);
            setVisible(true);
        },
        editAlistamiento: (row) => {
            setMode("edit");
            setAlistamientoId(row?.id);
            reset({
                description: row?.description ?? "",
                active: row?.active ?? 1,
            });
            setVisible(true);
        },
        viewAlistamiento: (row) => {
            setMode("view");
            setAlistamientoId(row?.id);
            reset({
                description: row?.description ?? "",
                active: row?.active ?? 1,
            });
            setVisible(true);
        },
        onClose: () => {
            closeForm();
        },
    }));

    const closeForm = () => {
        setVisible(false);
        setAlistamientoId(null);
        setMode("new");
        reset(defaultValues);
        setLoading(false);
    };

    const handleSave = async () => {
        const values = getValues();

        const payload = {
            id: alistamientoId || 0,
            description: (values.description || "").trim(),
            active: values.active ? 1 : 0,
        };

        setLoading(true);
        try {
            const { data } = await saveAlistamientoAPI(payload);

            showSuccess(data?.message || "Alistamiento guardado correctamente");

            const row = {
                id: alistamientoId || data.id,
                description: payload.description,
                active: payload.active,
                createdAt: data.createdAt || new Date().toISOString(),
            };

            if (alistamientoId) {
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
                ? "Nuevo alistamiento"
                : mode === "view"
                    ? `Alistamiento #${alistamientoId}`
                    : `Editar alistamiento #${alistamientoId}`}
        </h4>
    );

    const FooterButtons = (
        <div className="flex justify-content-end gap-2 w-full">
            {mode === "view" ? null : (
                <Button
                    className="p-button-submit"
                    onClick={handleSubmit(handleSave)}
                    label={alistamientoId ? "Guardar" : "Registrar"}
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
                className="alistamiento-modal"
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

VenAlistamiento.displayName = "VenAlistamiento";

export default VenAlistamiento;
