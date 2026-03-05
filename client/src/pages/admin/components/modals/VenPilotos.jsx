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
import { savePilotoAPI } from "@api/requests/pilotosAPI";

// ⬇️ nuevo import del config
import { pilotosForm } from "@pages/home/configForms";

const defaultValues = {
    name: "",
    phone: "",
    email: "",
    moto: {
        type: "",
    },
};

const VenPilotos = forwardRef(({ addItem, updateItem }, ref) => {
    const [visible, setVisible] = useState(false);
    const [mode, setMode] = useState("new"); // "new" | "view" | "edit"
    const [pilotoId, setPilotoId] = useState(null);
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
        () => pilotosForm({ readOnly }),
        [readOnly]
    );

    useImperativeHandle(ref, () => ({
        newPiloto: () => {
            setMode("new");
            setPilotoId(null);
            reset(defaultValues);
            setVisible(true);
        },
        editPiloto: (row) => {
            setMode("edit");
            setPilotoId(row?.id);
            reset({
                name: row?.name ?? "",
                phone: row?.phone ?? "",
                email: row?.email ?? "",
                moto: {
                    type: row?.motos?.[0]?.type ?? "",
                },
            });
            setVisible(true);
        },
        viewPiloto: (row) => {
            setMode("view");
            setPilotoId(row?.id);
            reset({
                name: row?.name ?? "",
                phone: row?.phone ?? "",
                email: row?.email ?? "",
                moto: {
                    type: row?.motos?.[0]?.type ?? "",
                },
            });
            setVisible(true);
        },
        onClose: () => {
            closeForm();
        },
    }));

    const closeForm = () => {
        setVisible(false);
        setPilotoId(null);
        setMode("new");
        reset(defaultValues);
        setLoading(false);
    };

    const handleSave = async () => {
        const values = getValues();

        const payload = {
            id: pilotoId || 0,
            name: (values.name || "").trim(),
            phone: (values.phone || "").trim(),
            email: (values.email || "").trim(),
            moto: {
                type: (values.moto?.type || "").trim(),
            },
        };

        setLoading(true);
        try {
            const { data } = await savePilotoAPI(payload);

            showSuccess(data?.message || "Piloto guardado correctamente");

            const row = {
                id: pilotoId || data.id,
                name: payload.name,
                phone: payload.phone,
                email: payload.email,
                motos: payload.moto?.type ? [{ id: data.motoId || 0, type: payload.moto.type }] : [],
                createdAt: data.createdAt || new Date().toISOString(),
            };

            if (pilotoId) {
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
                ? "Nuevo piloto"
                : mode === "view"
                    ? `Piloto #${pilotoId}`
                    : `Editar piloto #${pilotoId}`}
        </h4>
    );

    const FooterButtons = (
        <div className="flex justify-content-end gap-2 w-full">
            {mode === "view" ? null : (
                <Button
                    className="p-button-submit"
                    onClick={handleSubmit(handleSave)}
                    label={pilotoId ? "Guardar" : "Registrar"}
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
                className="piloto-modal"
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

VenPilotos.displayName = "VenPilotos";

export default VenPilotos;
