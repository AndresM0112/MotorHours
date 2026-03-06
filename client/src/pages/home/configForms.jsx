import React from "react";
import memoize from "memoize-one";
import GenericSelector from "@components/ui/GenericSelector";
import { Button } from "primereact/button";

const clienteTemplate = (item) => (
  <div>
    <div style={{ fontWeight: 600 }}>
      {item?.nombre} ({item?.documento || ""})
    </div>
    <div style={{ fontSize: 12, color: "#888" }}>
      {item?.telefono || ""} | {item?.correo || ""}
    </div>
  </div>
);



export const locationForm = ({ readOnly = false } = {}) => {
  const dis = () => readOnly;

  const estadosOptions = [
    { label: "Activo", value: 1 },
    { label: "Inactivo", value: 0 },
  ];

  return [

    {
      key: "loc-nombre",
      type: "textarea",
      name: "nombre",
      label: "Nombre de la localización",
      className: "col-8",
      validation: { required: "El nombre es obligatorio" },
      required: true,
      disabled: dis(),
      maxLength: 150,

    },

    // 👇 Checkbox simple (tipo muy estándar)
    {
      key: "loc-aplica-bloque",
      type: "checkbox",
      name: "aplicaBloque",
      label: "¿Aplica para bloque?",
      className: "col-12 md:col-4",
      disabled: dis(),
      props: {
        inputId: "aplicaBloque",
      },
    },

    {
      key: "loc-aplica-local",
      type: "checkbox",
      name: "aplicaLocal",
      label: "¿Aplica para local?",
      className: "col-12 md:col-4",
      disabled: dis(),
      props: {
        inputId: "aplicaLocal",
      },
    },

    {
      key: "loc-estado",
      type: "dropdown",
      name: "estId",
      label: "Estado",
      options: estadosOptions,
      className: "col-12 md:col-4",
      validation: { required: "El estado es obligatorio" },
      required: true,
      disabled: dis(),
      props: {
        optionLabel: "label",
        optionValue: "value",
        placeholder: "Selecciona estado",
        showClear: false,
      },
    },
  ];
};

export const alistamientoForm = ({ readOnly = false } = {}) => {
  const dis = () => readOnly;

  const estadosOptions = [
    { label: "Activo", value: 1 },
    { label: "Inactivo", value: 0 },
  ];

  return [
    {
      key: "alis-descripcion",
      type: "textarea",
      name: "description",
      label: "Descripción de la tarea",
      className: "col-12",
      validation: {
        required: "La descripción es requerida",
        minLength: {
          value: 3,
          message: "Mínimo 3 caracteres",
        },
      },
      required: true,
      disabled: dis(),
      maxLength: 255,
      placeholder: "Ej: Revisar presión de llantas",
    },
    {
      key: "alis-estado",
      type: "dropdown",
      name: "active",
      label: "Estado",
      options: estadosOptions,
      className: "col-12 md:col-6",
      validation: { required: "El estado es obligatorio" },
      required: true,
      disabled: dis(),
      props: {
        optionLabel: "label",
        optionValue: "value",
        placeholder: "Selecciona estado",
        showClear: false,
      },
    },
  ];
};

export const pilotosForm = ({ readOnly = false } = {}) => {
  const dis = () => readOnly;

  return [
    {
      key: "piloto-nombre",
      type: "text",
      name: "name",
      label: "Nombre",
      className: "col-12 md:col-6",
      validation: {
        required: "El nombre es requerido",
        minLength: {
          value: 3,
          message: "Mínimo 3 caracteres",
        },
      },
      required: true,
      disabled: dis(),
      placeholder: "Ej: Juan Pérez",
    },
    {
      key: "piloto-telefono",
      type: "text",
      name: "phone",
      label: "Teléfono",
      className: "col-12 md:col-6",
      validation: {
        required: "El teléfono es requerido",
        minLength: {
          value: 7,
          message: "Mínimo 7 caracteres",
        },
      },
      required: true,
      disabled: dis(),
      placeholder: "Ej: 3001234567",
    },
    {
      key: "piloto-email",
      type: "text",
      name: "email",
      label: "Email",
      className: "col-12",
      validation: {
        required: "El email es requerido",
        pattern: {
          value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
          message: "Email inválido",
        },
      },
      required: true,
      disabled: dis(),
      placeholder: "Ej: juan@example.com",
    },
    {
      key: "piloto-moto-type",
      type: "text",
      name: "moto.type",
      label: "Tipo de Moto",
      className: "col-12",
      validation: { required: "El tipo de moto es obligatorio" },
      required: true,
      disabled: dis(),
      placeholder: "Ej: Moto Taxi, Moto Carga, Particular, etc.",
    },
  ];
};

export const motosForm = ({
  readOnly = false,
  pilotos = [],
} = {}) => {
  const dis = () => readOnly;

  const motoTypeOptions = [
    { label: "Moto Taxi", value: "Moto Taxi" },
    { label: "Moto Carga", value: "Moto Carga" },  
    { label: "Moto Particular", value: "Moto Particular" },
    { label: "Moto Delivery", value: "Moto Delivery" },
    { label: "Moto Urbana", value: "Moto Urbana" },
    { label: "Moto de Trabajo", value: "Moto de Trabajo" },
  ];

  return [
    {
      key: "moto-piloto",
      type: "dropdown",
      name: "pilotId",
      label: "Piloto",
      className: "col-12",
      validation: { required: "El piloto es requerido" },
      required: true,
      disabled: dis(),
      options: pilotos,
      props: {
        optionLabel: "name",
        optionValue: "id",
        placeholder: "Selecciona un piloto",
        showClear: true,
        filter: true,
        filterBy: "name,phone",
        emptyMessage: "No hay pilotos disponibles",
        emptyFilterMessage: "Sin resultados",
        itemTemplate: (option) => {
          if (!option) return null;
          return (
            <div style={{ lineHeight: 1.2 }}>
              <div style={{ fontWeight: 600 }}>
                {option.name}
              </div>
              <div style={{ fontSize: "0.8rem", color: "#6c757d" }}>
                Tel: {option.phone || "No registrado"}
              </div>
            </div>
          );
        },
        valueTemplate: (option) => {
          if (!option) return "Selecciona un piloto";
          return (
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontWeight: 600 }}>{option.name}</span>
              <small style={{ color: "#6c757d" }}>
                {option.phone && `• ${option.phone}`}
              </small>
            </div>
          );
        },
      },
    },
    {
      key: "moto-tipo",
      type: "dropdown",
      name: "type",
      label: "Tipo de Moto",
      options: motoTypeOptions,
      className: "col-12",
      validation: { required: "El tipo de moto es obligatorio" },
      required: true,
      disabled: dis(),
      props: {
        optionLabel: "label",
        optionValue: "value",
        placeholder: "Selecciona tipo de moto",
        showClear: false,
      },
    },
  ];
};

export const serviciosForm = ({
  readOnly = false,
  pilotos = [],
  alistamientos = [],
  watch,
} = {}) => {
  const dis = () => readOnly;
  const serviceType = watch("service_type");

  return [
    {
      key: "servicio-piloto",
      type: "dropdown",
      name: "pilotoId",
      label: "Piloto",
      className: "col-12 md:col-6",
      validation: { required: "El piloto es requerido" },
      required: true,
      disabled: dis(),
      options: pilotos,
      props: {
        optionLabel: "name",
        optionValue: "id",
        // placeholder: "Seleccione un piloto",
        filter: true,
        showClear: true,
      },
    },
    {
      key: "servicio-moto",
      type: "text",
      name: "moto_type",
      label: "Moto",
      className: "col-12 md:col-6",
      disabled: true,
      props: {
        // placeholder: "Se autocompleta al seleccionar piloto",
        readOnly: true,
      },
    },
    {
      key: "servicio-horas",
      type: "text",
      name: "moto_hours",
      label: "Horas de Moto",
      className: "col-12 md:col-6",
      validation: {
        required: "Las horas de la moto son requeridas",
        pattern: {
          value: /^\d+(\.\d+)?$/,
          message: "Ingrese un número válido",
        },
      },
      required: true,
      disabled: dis(),
      props: {
        // placeholder: "Ingrese las horas (ej: 150.5)",
        keyfilter: "pnum",
      },
    },
    {
      key: "servicio-tipo",
      type: "selectButton",
      name: "service_type",
      label: "Tipo de Servicio",
      className: "col-12", // Ancho completo para evitar recorte en mobile
      validation: { required: "Seleccione un tipo de servicio" },
      required: true,
      disabled: dis(),
      options: [
        { label: "Alistamiento", value: "ALISTAMIENTO" },
        { label: "Reparación", value: "REPARACION" },
      ],
      props: {
        optionLabel: "label",
        optionValue: "value",
      },
    },
  ];
};
