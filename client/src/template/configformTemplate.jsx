import memoize from "memoize-one";
import { estados } from "@utils/converAndConst";

export const MasterTemplateForm = memoize(() => {
    return [
        {
            key: "bas-1",
            className: "col-12 md:col-8",
            type: "text",
            name: "nombre",
            label: "Nombre",
            props: { className: "uppercase-text" },
            validation: { required: "El campo nombre es requerido" },
            required: true,
        },
        {
            key: "bas-2",
            type: "selectButton",
            name: "estado",
            label: "Estado",
            options: estados,
            validation: { required: "El campo estado es requerido" },
            required: true,
            className: "col-12 md:col-4",
        },
    ];
});
