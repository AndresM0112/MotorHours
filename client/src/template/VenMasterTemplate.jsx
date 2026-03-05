import React, { forwardRef, useContext, useImperativeHandle, useState } from "react";
import { AuthContext } from "@context/auth/AuthContext";
import { ToastContext } from "@context/toast/ToastContext";
// UI
import { Dialog } from "primereact/dialog";
import { Button } from "primereact/button";
// HOOKS
import useHandleApiError from "@hook/useHandleApiError";
// OTROS
import { FormProvider, useForm } from "react-hook-form";
import moment from "moment";
// COMPONENTES
import GenericFormSection from "@components/data/GenericFormSection";
import { MasterTemplateForm } from "./configformTemplate";
// API
import { saveMasterTemplateApi } from "./masterAPI";
import PropTypes from "prop-types";

const defaultValues = { nombre: "", estado: 1 };

const VenMasterTemplate = forwardRef(({ addItem, updateItem }, ref) => {
    const { nombreusuario, idusuario } = useContext(AuthContext);
    const { showSuccess, showInfo } = useContext(ToastContext);

    const handleApiError = useHandleApiError();
    const [visible, setVisible] = useState(false);
    const [masId, setMasId] = useState(null);
    const [loading, setLoading] = useState(false);

    const [originalData, setOriginalData] = useState(null);

    const methods = useForm({ defaultValues });

    const { handleSubmit, reset, setValue } = methods;

    const newUnity = () => setVisible(true);

    const editUnity = async (item) => {
        const { masId } = item;
        setMasId(masId);
        setOriginalData(item);

        setValue("nombre", item.nombre);
        setValue("estado", item.estado);
        setVisible(true);
    };

    useImperativeHandle(ref, () => ({ newUnity, editUnity }));

    const saveUnity = async (values) => {
        setLoading(true);
        try {
            const nombre = values.nombre.trim().toUpperCase();

            if (
                masId > 0 &&
                nombre === originalData.nombre &&
                values.estado === originalData.estado
            ) {
                return showInfo("No has realizado ningún cambio.");
            }

            const params = { masId, ...values, nombre, usureg: idusuario, usuact: nombreusuario };
            const { data } = await saveMasterTemplateApi(params);
            showSuccess(data.message);
            setLoading(false);

            const item = {
                masId: masId > 0 ? masId : data.masId,
                ...values,
                nombre,
                nomestado: values.estado === 1 ? "Activo" : "Inactivo",
                usuact: nombreusuario,
                fecact: moment().format("YYYY-MM-DD HH:mm:ss"),
            };

            if (masId > 0) {
                updateItem({ idField: "masId", ...item });
            } else {
                addItem(item);
            }

            reset(defaultValues);
            setMasId(null);
            setOriginalData(null);
            setVisible(false);
        } catch (error) {
            handleApiError(error);
            setLoading(false);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog
            closeOnEscape={false}
            maximizable={true}
            draggable
            header={masId ? "Edición Master Template" : "Nueva Master Template"}
            visible={visible}
            onHide={() => {
                reset(defaultValues);
                setMasId(null);
                setVisible(false);
            }}
            breakpoints={{ "1584px": "80vw", "960px": "90vw", "672px": "100vw" }}
            style={{ width: "45vw" }}
            footer={
                <Button
                    className="p-button-info"
                    onClick={handleSubmit(saveUnity)}
                    label={masId ? "Guardar Cambios" : "Guardar"}
                    loading={loading}
                />
            }
        >
            <FormProvider {...methods}>
                <GenericFormSection fields={MasterTemplateForm()} />
            </FormProvider>
        </Dialog>
    );
});

VenMasterTemplate.propTypes = {
    addItem: PropTypes.func.isRequired, // Debe ser una función para agregar un usuario.
    updateItem: PropTypes.func.isRequired, // Debe ser una función para actualizar un usuario existente.
};

export default VenMasterTemplate;
