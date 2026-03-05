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

export const ticketsForm = (
  ({
    clientes,
    bloques,
    locales,
    areas,
    encargados,
    prioridades,
    estados,
    camposBloqueados = {},
    onCreateCliente,
    onEditCliente,
    readOnly = false,
    localId,
    localizaciones = [],
    locationFlags = {},      //  { aplicaBloque, aplicaLocal, aplicaPropietario, lcaAreaId, tipo }
  }) => {
    const dis = (key) => readOnly || !!camposBloqueados[key];

    const noLocal = !localId;

    // 👇 OJO: aquí ya NO ponemos default true en aplicaBloque/aplicaPropietario
    // porque queremos diferenciar "no definido" de "false"
    const {
      aplicaBloque,
      aplicaLocal,
      aplicaPropietario,
      lcaAreaId = null,
      tipo = null,       // "LOCAL" / "LOCALIZACION" / null si no hay selección
      bloId = null,                   
    tieneBloquePorDefecto = 0,
    } = locationFlags || {};

    const hasLocation = !!tipo; // si hay localización seleccionada

    // 👉 Reglas:
    // - Si NO hay localización seleccionada → mostramos bloque y propietario (true)
    // - Si SÍ hay localización → usamos los flags del back
    const showBloque = !hasLocation || !!aplicaBloque;
    const showPropietario = !hasLocation || !!aplicaPropietario;

     // 👉 Si la localización fija un bloque por defecto, deshabilita el dropdown de bloque.
  const bloqueDisabled = dis("bloqueId") || (!!hasLocation && !!aplicaBloque && !!tieneBloquePorDefecto);

    // ==============================
    // Agrupar opciones de Localización / Local
    // ==============================
    const localesOpts = (localizaciones || []).filter(o => o.tipo === "LOCAL");
    const localizacionesGenericas = (localizaciones || []).filter(o => o.tipo === "LOCALIZACION");

    const localizacionesOptions = [
      ...(localizacionesGenericas.length
        ? [{ uid: "__header_lca", nombre: "Localizaciones", esHeader: true }]
        : []),
      ...localizacionesGenericas,
      ...(localesOpts.length
        ? [{ uid: "__header_loc", nombre: "Locales", esHeader: true }]
        : []),
      ...localesOpts,
    ];

     const localizacionClassName =
      showBloque || showPropietario
        ? "col-12 md:col-4"
        : "col-12";

    return [
      // ==============================
      // Localización / Local
      // ==============================
      // {
      //   key: "tkt-localizacion",
      //   type: "dropdown",
      //   name: "localizacionId",
      //   label: "Localización / Local",
      //   className: "col-4",
      //   disabled: dis("localizacionId"),
      //   required: true,
      //   validation: { required: "La localización es obligatoria" },
      //   options: localizaciones || [],
      //   props: {
      //     optionLabel: "nombre",
      //     optionValue: "uid",
      //     filter: true,
      //     showClear: true,
      //     filterBy: "codigo,nombre,bloqueNombre",
      //     optionDisabled: "esHeader",
      //     itemTemplate: (option) => {
      //       if (!option) return null;
      //       const esLocal = option.tipo === "LOCAL";

      //       if (esLocal) {
      //         return (
      //           <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.2 }}>
      //             <div>
      //               <strong>{option.codigo || "S/C"}</strong> · {option.nombre}
      //             </div>
      //             <small style={{ color: "#6c757d" }}>
      //               Bloque: {option.bloqueNombre || "—"}
      //             </small>
      //           </div>
      //         );
      //       }

      //       // LOCALIZACIÓN genérica → solo nombre
      //       return (
      //         <div style={{ lineHeight: 1.2 }}>
      //           {option.nombre}
      //         </div>
      //       );
      //     },
      //     valueTemplate: (option) => {
      //       if (!option) return "Selecciona una localización";
      //       const esLocal = option.tipo === "LOCAL";

      //       if (esLocal) {
      //         return (
      //           <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      //             <span><strong>{option.codigo || "S/C"}</strong></span>
      //             <span>{option.nombre}</span>
      //             {option.bloqueNombre && (
      //               <small style={{ color: "#6c757d" }}>· {option.bloqueNombre}</small>
      //             )}
      //           </div>
      //         );
      //       }

      //       return <span>{option.nombre}</span>;
      //     },
      //   },
      // },
      {
        key: "tkt-localizacion",
        type: "dropdown",
        name: "localizacionId",
        label: "Localización / Local",
        className: localizacionClassName,
        disabled: dis("localizacionId"),
        required: true,
        validation: { required: "La localización es obligatoria" },
        options: localizacionesOptions,
        props: {
          optionLabel: "nombre",
          optionValue: "uid",
          filter: true,
          showClear: true,
          filterBy: "codigo,nombre,bloqueNombre",
          optionDisabled: "esHeader", // ⬅️ los headers no son seleccionables

          itemTemplate: (option) => {
            if (!option) return null;

            // Header de grupo
            if (option.esHeader) {
              return (
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    textTransform: "uppercase",
                    padding: "4px 8px",
                    background: "#F3F4F6",
                    color: "#6B7280",
                    borderBottom: "1px solid #E5E7EB",
                  }}
                >
                  {option.nombre}
                </div>
              );
            }

            const esLocal = option.tipo === "LOCAL";

            if (esLocal) {
              return (
                <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.2 }}>
                  <div>
                    <strong>{option.codigo || "S/C"}</strong> · {option.nombre}
                  </div>
                  <small style={{ color: "#6c757d" }}>
                    Bloque: {option.bloqueNombre || "—"}
                  </small>
                </div>
              );
            }

            // LOCALIZACIÓN genérica → solo nombre
            return (
              <div style={{ lineHeight: 1.2 }}>
                {option.nombre}
              </div>
            );
          },

          valueTemplate: (option) => {
            if (!option) return "Selecciona una localización";

            // por si acaso, nunca deberías tener un header como valor,
            // pero lo ignoramos igual
            if (option.esHeader) {
              return "Selecciona una localización";
            }

            const esLocal = option.tipo === "LOCAL";

            if (esLocal) {
              return (
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span><strong>{option.codigo || "S/C"}</strong></span>
                  <span>{option.nombre}</span>
                  {option.bloqueNombre && (
                    <small style={{ color: "#6c757d" }}>· {option.bloqueNombre}</small>
                  )}
                </div>
              );
            }

            return <span>{option.nombre}</span>;
          },
        },
      },
      // ==============================
      // Bloque – solo si showBloque === true
      // ==============================
      showBloque && {
        key: "tkt-bloque",
        type: "dropdown",
        name: "bloqueId",
        label: "Bloque",
        options: bloques || [],
        className:  "col-6 md:col-4",
        required: true,
        validation: { required: "El bloque es obligatorio" },
        disabled: dis("bloqueId"),
        props: {
          optionLabel: "nombre",
          optionValue: "id",
          filter: false,
          showClear: true,
        },
      },

      // ==============================
      // Copropietario – solo si showPropietario === true
      // ==============================
      showPropietario && {
        key: "tkt-cliente",
        type: "dropdown",
        name: "clienteId",
        label: "Copropietario",
        options: noLocal ? [] : (clientes || []),
        className: "col-6 md:col-4",
        required: !noLocal, // solo obligatorio si ya hay local
        validation: !noLocal
          ? { required: "El cliente es obligatorio" }
          : undefined,
        disabled: dis("clienteId") || noLocal,
        props: {
          optionLabel: "nombre",
          optionValue: "id",
          filter: true,
          showClear: false,
          filterBy: "nombre,documento,correo,telefono",
          emptyMessage: noLocal
            ? "Selecciona un local para ver copropietarios"
            : "No hay copropietarios para este local",
          emptyFilterMessage: noLocal
            ? "Selecciona un local para ver copropietarios"
            : "Sin resultados",
          itemTemplate: (option) => {
            if (!option) return null;
            return (
              <div style={{ lineHeight: 1.2 }}>
                <div style={{ fontWeight: 600 }}>
                  {option.nombre} {option.documento ? `(${option.documento})` : ""}
                </div>
                <div style={{ fontSize: "0.8rem", color: "#6c757d" }}>
                  {option.telefono} {option.telefono && option.correo ? " | " : ""} {option.correo}
                </div>
              </div>
            );
          },
          valueTemplate: (option) => {
            if (!option) {
              return noLocal
                ? "Selecciona un local para ver copropietarios"
                : "Selecciona copropietario";
            }
            return (
              <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.2 }}>
                <div style={{ fontWeight: 600 }}>
                  {option.nombre} {option.documento ? `(${option.documento})` : ""}
                </div>
                <small style={{ color: "#6c757d" }}>
                  {option.telefono} {option.telefono && option.correo ? " | " : ""} {option.correo}
                </small>
              </div>
            );
          },
        },
      },

      // ==============================
      // Descripción
      // ==============================
      {
        key: "tkt-descripcion",
        type: "textarea",
        name: "descripcion",
        label: "Descripción",
        className: "col-12",
        validation: { required: "La descripción es obligatoria" },
        required: true,
        disabled: dis("descripcion"),
      },

      // ==============================
      // Área (global) – deshabilitada si viene lcaAreaId
      // ==============================
      {
        key: "tkt-area",
        type: "dropdown",
        name: "areaId",
        label: "Área",
        options: areas || [],
        className: "col-12 md:col-6",
        validation: { required: "El área es obligatoria" },
        required: true,
        disabled: dis("areaId") || !!lcaAreaId,
        props: {
          optionLabel: "nombre",
          optionValue: "id",
          filter: false,
          showClear: true,
        },
        autoFocus: true,
      },

      // Encargado (interno)
      {
        key: "tkt-asignados",
        type: "dropdown",
        name: "asignado",
        label: "Encargado",
        options: encargados || [],
        placeholder: "Selecciona encargado",
        className: "col-12 md:col-6",
        required: true,
        validation: { required: "Debes seleccionar un encargado" },
        disabled: dis("asignado"),
        props: {
          optionLabel: "nombre",
          optionValue: "id",
          filter: false,
          showClear: true,
          showOnFocus: false,
        },
      },

      // Prioridad
      {
        key: "tkt-prioridad",
        type: "dropdown",
        name: "prioridadId",
        label: "Prioridad",
        options: prioridades || [],
        className: "col-12 md:col-6",
        validation: { required: "La prioridad es obligatoria" },
        required: true,
        disabled: dis("prioridadId"),
        props: {
          optionLabel: "nombre",
          optionValue: "id",
          filter: false,
        },
      },

      // Estado (solo lectura)
      {
        key: "tkt-estado",
        type: "dropdown",
        name: "estadoId",
        label: "Estado Actual",
        options: estados || [],
        className: "col-12 md:col-6",
        disabled: true,
        props: {
          optionLabel: "nombre",
          optionValue: "id",
        },
      },
    ];
  }
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

  const motoTypeOptions = [
    { label: "Moto Taxi", value: "Moto Taxi" },
    { label: "Moto Carga", value: "Moto Carga" },
    { label: "Moto Particular", value: "Moto Particular" },
    { label: "Moto Delivery", value: "Moto Delivery" },
  ];

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
      type: "email",
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
      type: "dropdown",
      name: "moto.type",
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

export const payrollForm = memoize(
  ({
    sedes = [],
    tiposPeriodo = [],
    planesCuenta = [],
    camposBloqueados = {},
  } = {}) => {
    const meses = [
      { value: 1, label: "Enero" },
      { value: 2, label: "Febrero" },
      { value: 3, label: "Marzo" },
      { value: 4, label: "Abril" },
      { value: 5, label: "Mayo" },
      { value: 6, label: "Junio" },
      { value: 7, label: "Julio" },
      { value: 8, label: "Agosto" },
      { value: 9, label: "Septiembre" },
      { value: 10, label: "Octubre" },
      { value: 11, label: "Noviembre" },
      { value: 12, label: "Diciembre" },
    ];

    return [
      // ======== Identificación de la nómina ========
      {
        key: "payroll-codigo",
        type: "input",
        name: "codigo",
        label: "Código",
        className: "col-12 md:col-3",
        validation: {
          required: "El código es obligatorio",
          maxLength: { value: 50, message: "Máximo 50 caracteres" },
        },
        required: true,
        disabled: camposBloqueados.codigo || false,
        props: {
          placeholder: "COD-2025-08",
        },
      },
      {
        key: "payroll-nombre",
        type: "input",
        name: "nomNombre",
        label: "Nombre de Nómina",
        className: "col-12 md:col-5",
        validation: {
          required: "El nombre es obligatorio",
          maxLength: { value: 120, message: "Máximo 120 caracteres" },
        },
        required: true,
        disabled: camposBloqueados.nomNombre || false,
        props: {
          placeholder: "Nómina Agosto 2025",
        },
      },

      // ======== Periodo ========
      {
        key: "payroll-anio",
        type: "input",
        name: "anio",
        label: "Año",
        className: "col-6 md:col-2",
        validation: {
          required: "El año es obligatorio",
          min: { value: 2000, message: "Año mínimo 2000" },
          max: { value: 2100, message: "Año máximo 2100" },
          pattern: { value: /^[0-9]{4}$/, message: "Año inválido" },
        },
        required: true,
        disabled: camposBloqueados.anio || false,
        props: {
          keyfilter: "int", // si tu GenericFormSection lo soporta
          placeholder: "2025",
        },
      },
      {
        key: "payroll-mes",
        type: "dropdown",
        name: "mes",
        label: "Mes",
        options: meses,
        className: "col-6 md:col-2",
        validation: { required: "El mes es obligatorio" },
        required: true,
        disabled: camposBloqueados.mes || false,
        props: {
          optionLabel: "label",
          optionValue: "value",
          placeholder: "Selecciona",
          showClear: true,
        },
      },

      // ======== Opcionales (si manejas maestro) ========
      sedes.length
        ? {
          key: "payroll-sede",
          type: "dropdown",
          name: "sedeId",
          label: `Sede (${sedes.length})`,
          options: sedes,
          className: "col-12 md:col-4",
          disabled: camposBloqueados.sedeId || false,
          props: {
            optionLabel: "nombre",
            optionValue: "id",
            filter: true,
            filterBy: "nombre",
            placeholder: "Selecciona la sede",
            showClear: true,
            itemTemplate: (opt) => (
              <div>
                <strong>{opt?.nombre}</strong>
                {opt?.codigo && (
                  <div style={{ fontSize: 12, color: "#888" }}>{opt.codigo}</div>
                )}
              </div>
            ),
            valueTemplate: (opt) => (opt ? opt.nombre : "Seleccione una sede"),
          },
        }
        : null,

      tiposPeriodo.length
        ? {
          key: "payroll-tipoperiodo",
          type: "dropdown",
          name: "tppId",
          label: `Tipo de Periodo (${tiposPeriodo.length})`,
          options: tiposPeriodo,
          className: "col-12 md:col-4",
          disabled: camposBloqueados.tppId || false,
          props: {
            optionLabel: "nombre",
            optionValue: "id",
            filter: true,
            filterBy: "nombre",
            placeholder: "Selecciona el tipo",
            showClear: true,
          },
        }
        : null,

      planesCuenta.length
        ? {
          key: "payroll-plancuenta",
          type: "dropdown",
          name: "pccId",
          label: `Plan de Cuentas (${planesCuenta.length})`,
          options: planesCuenta,
          className: "col-12 md:col-4",
          disabled: camposBloqueados.pccId || false,
          props: {
            optionLabel: "nombre",
            optionValue: "id",
            filter: true,
            filterBy: "nombre",
            placeholder: "Selecciona el plan",
            showClear: true,
          },
        }
        : null,
    ].filter(Boolean);
  }
);