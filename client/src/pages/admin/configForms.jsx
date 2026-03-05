import ColorPickerButton from "@components/data/ColorPickerField";
import { estados, optionsSelect } from "@utils/converAndConst";
import memoize from "memoize-one";

export const masterTemplateForm = memoize(() => {
    return [
        {
            key: "bas-1",
            className: "col-12",
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
            className: "col-12",
        },
    ];
});

export const reasonsForm = memoize(({ listModules }) => {
    return [
        {
            key: "mot-1",
            className: "col-12",
            type: "text",
            name: "nombre",
            label: "Nombre",
            props: { className: "uppercase-text" },
            validation: { required: "El campo nombre es requerido" },
            required: true,
        },
        {
            key: "mot-2",
            type: "selectButton",
            name: "estado",
            label: "Estado",
            options: estados,
            validation: { required: "El campo estado es requerido" },
            required: true,
            className: "col-12",
        },
        {
            key: "mot-3",
            type: "multiselect",
            name: "modulos",
            label: "Módulos",
            options: listModules || [],
            validation: { required: "El campo módulos es requerido" },
            required: true,
            className: "col-12",
        },
    ];
});

export const areasForm = memoize((empleadosOpts = [] ) => [
    {
        key: "area-1",
        type: "text",
        name: "nombre",
        label: "Nombre",
        className: "col-12",
        props: { className: "uppercase-text" },
        validation: { required: "El nombre es obligatorio" },
        required: true,
    },
    {
        key: "area-3",
        type: "text",
        name: "cantidadEstimado",
        label: "Tiempo estimado de solución",
        className: "col-12",
        props: { min: 0, step: 0.1, keyfilter: "pnum" },
        validation: {
            required: "La cantidad es obligatoria",
            min: { value: 0, message: "Debe ser mayor o igual a 0" },
        },
        required: true,
    },
    {
        key: "area-4",
        type: "dropdown",
        name: "frecuenciaId",
        label: "Frecuencia",
        className: "col-12",
        options: [
            { id: 1, nombre: "Minuto" },
            { id: 2, nombre: "Hora" },
            { id: 3, nombre: "Día" },
            { id: 4, nombre: "Semana" },
            { id: 5, nombre: "Mes" },
        ],
        optionLabel: "nombre",
        optionValue: "id",
        validation: { required: "La frecuencia es obligatoria" },
        required: true,
    },
    // === NUEVO CAMPO MULTI-ENCARGADOS ===
    // Ajusta "type" según cómo tu <GenericFormSection /> mapea a PrimeReact:
    // - Si soporta MultiSelect nativo: usa type: "multiSelect"
    // - Si solo hay dropdown: usa type: "dropdown" + props: { multiple: true }
    {
        key: "area-5",
        type: "multiselect",              // o "dropdown" con props.multiple
        name: "encargados",
        label: "Encargados ",
        className: "col-12",
        options: empleadosOpts,           // ← viene inyectado
        optionLabel: "nombre",
        optionValue: "id",
        props: {
            filter: true,
            // placeholder: "Selecciona uno o varios",
            // showSelectAll: false,
            // multiple: true,  // si tu GenericFormSection usa Dropdown en vez de MultiSelect
        },
        validation: { required: "Selecciona al menos un encargado" },
        required: true,
    },
    {
        key: "area-2",
        type: "selectButton",
        name: "estado",
        label: "Estado",
        options: [
            { nombre: "Activo", id: "activo" },
            { nombre: "Inactivo", id: "inactivo" },
        ],
        className: "col-12",
        validation: { required: "El estado es obligatorio" },
        required: true,
    },
]);

export const projectsForm = memoize(({ lists = { refundableTypeList: [] } }) => [
    {
        key: "project-1",
        type: "text",
        name: "codigo",
        label: "Código",
        className: "col-12",
        props: { className: "uppercase-text" },
        validation: { required: "El nombre es obligatorio" },
        required: true,
    },
    {
        key: "project-2",
        type: "text",
        name: "nombre",
        label: "Nombre",
        className: "col-11",
        props: { className: "uppercase-text" },
        validation: { required: "El nombre es obligatorio" },
        required: true,
    },
    {
        key: "asf-5",
        type: "custom",
        name: "color",
        // label: "Color de sesión",
        component: ColorPickerButton,
        className: "col-1",
    },
    {
        key: "project-3",
        type: "textarea",
        name: "descripcion",
        label: "Descripción",
        className: "col-12",
        props: { className: "uppercase-text" },
    },
    // {
    //     key: "project-5",
    //     type: "multiselect",
    //     name: "tirIds",
    //     label: "Tipo Reembolso",
    //     options: lists.refundableTypeList,
    //     // validation: { required: "El campo Tipo Reembolso es requerido" },
    //     // required: true,
    //     className: "col-12",
    // },
    {
        key: "project-4",
        type: "selectButton",
        name: "estado",
        label: "Estado",
        options: [
            { nombre: "Activo", id: "activo" },
            { nombre: "Inactivo", id: "inactivo" },
        ],
        className: "col-12",
        validation: { required: "El estado es obligatorio" },
        required: true,
    },
]);

export const insureForm = memoize(({ lists = {} }) => [
    {
        key: "ase-1",
        type: "text",
        name: "nombre",
        label: "Nombre",
        className: "col-12",
        props: { className: "uppercase-text" },
        validation: { required: "El nombre es obligatorio" },
        required: true,
    },
    {
        key: "ase-2",
        type: "text",
        name: "nit",
        label: "Nit",
        className: "col-12",
        props: { className: "uppercase-text", keyfilter: "pnum" },
        validation: { required: "El nombre es obligatorio" },
        required: true,
    },
    {
        key: "ase-3",
        type: "dropdown",
        name: "tiaId",
        label: "Tipo de aseguradora",
        options: lists.tipoAseguradora || [],
        className: "col-12",
        validation: { required: "El estado es obligatorio" },
        required: true,
    },
    {
        key: "ase-4",
        type: "selectButton",
        name: "estId",
        label: "Estado",
        options: estados,
        className: "col-12",
        validation: { required: "El estado es obligatorio" },
        required: true,
    },
]);

export const insureTypeForm = memoize(() => [
    {
        key: "ins-1",
        type: "text",
        name: "nombre",
        label: "Nombre",
        className: "col-12",
        props: { className: "uppercase-text" },
        validation: { required: "El nombre es obligatorio" },
        required: true,
    },
    {
        key: "ins-2",
        type: "selectButton",
        name: "estId",
        label: "Estado",
        options: estados,
        className: "col-12",
        validation: { required: "El estado es obligatorio" },
        required: true,
    },
]);

export const centerCostForm = memoize(({ lists = { gerenciaList: [] } }) => [
    {
        key: "cco-1",
        type: "text",
        name: "nombre",
        label: "Nombre",
        className: "col-12",
        props: { className: "uppercase-text" },
        validation: { required: "El nombre es obligatorio" },
        required: true,
    },
    {
        key: "cco-2",
        type: "text",
        name: "codigo",
        label: "Código",
        className: "col-12",
        props: { className: "uppercase-text" },
        validation: { required: "El nombre es obligatorio" },
        required: true,
    },
    {
        key: "cco-2",
        type: "dropdown",
        name: "gerId",
        label: "Gerencia",
        className: "col-12",
        options: lists.gerenciaList,
        validation: { required: "La gerencia es obligatorio" },
        required: true,
    },
    {
        key: "cco-3",
        type: "selectButton",
        name: "estId",
        label: "Estado",
        options: estados,
        className: "col-12",
        validation: { required: "El estado es obligatorio" },
        required: true,
    },
]);

export const managementForm = memoize(() => [
    {
        key: "ger-1",
        type: "text",
        name: "nombre",
        label: "Nombre",
        className: "col-12",
        props: { className: "uppercase-text" },
        validation: { required: "El nombre es obligatorio" },
        required: true,
    },
    {
        key: "ger-2",
        type: "selectButton",
        name: "estId",
        label: "Estado",
        options: estados,
        className: "col-12",
        validation: { required: "El estado es obligatorio" },
        required: true,
    },
]);

export const positionForm = memoize(() => [
    {
        key: "pos-1",
        type: "text",
        name: "nombre",
        label: "Nombre",
        className: "col-12",
        props: { className: "uppercase-text" },
        validation: { required: "El nombre es obligatorio" },
        required: true,
    },
    {
        key: "pos-2",
        type: "selectButton",
        name: "estId",
        label: "Estado",
        options: estados,
        className: "col-12",
        validation: { required: "El estado es obligatorio" },
        required: true,
    },
]);

export const refundableTypesForm = memoize(() => [
    {
        key: "tir-1",
        type: "text",
        name: "nombre",
        label: "Nombre",
        className: "col-12",
        props: { className: "uppercase-text" },
        validation: { required: "El nombre es obligatorio" },
        required: true,
    },
    {
        key: "tir-2",
        type: "selectButton",
        name: "estId",
        label: "Estado",
        options: estados,
        className: "col-12",
        validation: { required: "El estado es obligatorio" },
        required: true,
    },
]);

export const payrollConceptTypeForm = memoize(() => [
    {
        key: "tcn-1",
        type: "text",
        name: "nombre",
        label: "Nombre",
        className: "col-12",
        props: { className: "uppercase-text" },
        validation: { required: "El nombre es obligatorio" },
        required: true,
    },
    {
        key: "tcn-2",
        type: "selectButton",
        name: "estId",
        label: "Estado",
        options: estados,
        className: "col-12",
        validation: { required: "El estado es obligatorio" },
        required: true,
    },
]);

const opcionesSiNoNA = [
    { id: 1, nombre: "Sí" },
    { id: 2, nombre: "No" },
    { id: 3, nombre: "N/A" }
];


export const payrollConceptForm = ({ lists }) => [
    {
        key: "pc-1",
        type: "text",
        name: "nombre",
        label: "Nombre",
        className: "col-12",
        props: { className: "uppercase-text" },
        validation: { required: "El nombre es obligatorio" },
        required: true,
    },
    {
        key: "pc-2",
        type: "text",
        name: "prefijo",
        label: "Prefijo",
        className: "col-12",
    },
    {
        key: "pc-3",
        type: "dropdown",
        name: "tcnId",
        label: "Tipo Concepto",
        options: lists.tiposConcepto,
        className: "col-12",
        required: true,
        validation: { required: "Tipo de concepto obligatorio" },
    },
    {
        key: "pc-4",
        type: "dropdown",
        name: "nanId",
        label: "Naturaleza",
        options: lists.naturalezas,
        className: "col-12",
        required: true,
        validation: { required: "Naturaleza obligatoria" },
    },
    {
        key: "pc-5",
        type: "numeric",
        name: "factor",
        label: "Factor",
        className: "col-12",
    },
    {
        key: "pc-6",
        type: "dropdown",
        name: "fueraNomina",
        label: "¿Fuera de nómina?",
        className: "col-12",
        options: opcionesSiNoNA,
    },
    {
        key: "pc-7",
        type: "dropdown",
        name: "requiereFondo",
        label: "¿Requiere fondo?",
        className: "col-12",
        options: opcionesSiNoNA,
    },
    {
        key: "pc-8",
        type: "dropdown",
        name: "predeterminado",
        label: "¿Predeterminado?",
        className: "col-12",
        options: opcionesSiNoNA,
    },
    {
        key: "pc-10",
        type: "selectButton",
        name: "aplica",
        label: "¿Aplica para informe reembolso?",
        options: optionsSelect,
        className: "col-12",
        validation: { required: "El aplica es obligatorio" },
        required: true,
    },
    {
        key: "pc-9",
        type: "selectButton",
        name: "estId",
        label: "Estado",
        options: lists.estados,
        className: "col-12",
        validation: { required: "El estado es obligatorio" },
        required: true,
    },
];

