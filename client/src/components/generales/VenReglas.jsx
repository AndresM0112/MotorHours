import React, { useEffect, useState, useContext } from "react";
import { Dialog } from "primereact/dialog";
import { InputText } from "primereact/inputtext";
import { InputNumber } from "primereact/inputnumber";
import { Checkbox } from "primereact/checkbox";
import { Button } from "primereact/button";
import { Card } from "primereact/card";
import { TabView, TabPanel } from "primereact/tabview";
import { ToastContext } from "@context/toast/ToastContext";
import Axios from "axios";
import Cookies from "js-cookie";
import "@styles/VenReglas.css";
// import { MultiSelect } from "primereact/multiselect";
import { getRulesAPI } from "@api/requests";
import { AuthContext } from "@context/auth/AuthContext";
import { FormDatosConexion } from "./FormDatosConexion";
import { FormSitio } from "./FormSitio";

const initialState = {
    horarioInicio: "08:00",
    horarioFin: "17:00",
    anticipacionMinimaReagendar: 2, // horas
    permitirCancelarMismoDia: false,
    notificarAntesMinutos: 30,
    metodoNotificacion: "email",
    maxSesionesPorDia: 5,
    habilitarWhatsapp: false,
    whatsappToken: "",
    whatsappNumero: "",
    habilitarCorreo: false,
    habilitarSMS: false,
    smsAPIKey: "",
    numeroPrincipal: "",
    otroNumero: "",
    direccion: "",
};

const metodoOptions = [
    { label: "Correo", value: "email" },
    { label: "WhatsApp", value: "whatsapp" },
    { label: "SMS", value: "sms" },
];
const reglasConfig = [
    //{
    //     key: "cronRecordatorio",
    //     title: "Recordatorio de tickets",
    //     description:
    //         "Configura cuándo y cómo se enviarán recordatorios automáticos de tickets a los encargador.",
    //     fields: [
    //         {
    //             key: "habilitarCronRecordatorio",
    //             label: "Habilitar recordatorio de citas",
    //             type: "checkbox",
    //             component: Checkbox,
    //         },
    //         {
    //             key: "recordarNDiasAntes",
    //             label: "¿Recordar N días antes?",
    //             type: "checkbox",
    //             component: Checkbox,
    //             showIf: (rules) => rules.habilitarCronRecordatorio,
    //         },
    //         {
    //             key: "cronDiasAnticipacion",
    //             label: "¿Cuántos días antes recordar?",
    //             type: "number",
    //             component: InputNumber,
    //             props: { showButtons: true, min: 1, max: 7 },
    //             showIf: (rules) => rules.habilitarCronRecordatorio && rules.recordarNDiasAntes,
    //         },
    //         {
    //             key: "recordarMismoDia",
    //             label: "¿Recordar el mismo día?",
    //             type: "checkbox",
    //             component: Checkbox,
    //             showIf: (rules) => rules.habilitarCronRecordatorio && !rules.recordarNDiasAntes,
    //         },
    //         {
    //             key: "cronHorasAnticipacion",
    //             label: "¿Cuántas horas antes recordar el mismo día?",
    //             type: "number",
    //             component: InputNumber,
    //             props: { showButtons: true, min: 1, max: 24 },
    //             showIf: (rules) =>
    //                 rules.habilitarCronRecordatorio &&
    //                 rules.recordarMismoDia &&
    //                 !rules.recordarNDiasAntes,
    //         },
    //     ],
    // },
    // {
    //     key: "horario",
    //     title: "Horario laboral",
    //     description: "Define el horario base durante el cual se pueden agendar sesiones.",
    //     fields: [
    //         {
    //             key: "horarioInicio",
    //             label: "Desde",
    //             type: "time",
    //             component: InputText,
    //         },
    //         {
    //             key: "horarioFin",
    //             label: "Hasta",
    //             type: "time",
    //             component: InputText,
    //         },
    //     ],
    // },
    // {
    //     key: "modificacion",
    //     title: "Política de modificación",
    //     description: "Controla cuándo un usuario puede cancelar o reagendar una sesión.",
    //     fields: [
    //         {
    //             key: "anticipacionMinimaReagendar",
    //             label: "Horas mínimas para reagendar",
    //             type: "number",
    //             component: InputNumber,
    //             props: { showButtons: true, min: 0, max: 48 },
    //         },
    //         {
    //             key: "permitirCancelarMismoDia",
    //             label: "Permitir cancelar sesiones el mismo día",
    //             type: "checkbox",
    //             component: Checkbox,
    //         },
    //         {
    //             key: "anticipacionMinimaCancelar",
    //             label: "Horas mínimas para cancelar el mismo día",
    //             type: "number",
    //             component: InputNumber,
    //             props: { showButtons: true, min: 0, max: 24 },
    //             showIf: (rules) => !!rules.permitirCancelarMismoDia, // <-- solo si está activo
    //         },
    //     ],
    // },
    // {
    //     key: "Contacto",
    //     title: "Números de contacto para el paciente.",
    //     description: "Proporciona los números de contacto al paciente para atención al cliente..",
    //     fields: [
    //         {
    //             key: "numeroPrincipal",
    //             label: "Número de WhatsApp",
    //             type: "text",
    //             component: InputText,
    //         },
    //         {
    //             key: "otroNumero",
    //             label: "Otro número de contacto",
    //             type: "text",
    //             component: InputText,
    //         },
    //     ],
    // },
    // {
    //     key: "notificaciones",
    //     title: "Alertas y notificaciones",
    //     description: "Configura cuándo y cómo se notifica a los usuarios sobre sus sesiones.",
    //     fields: [
    //         {
    //             key: "notificarAntesMinutos",
    //             label: "Minutos de anticipación",
    //             type: "number",
    //             component: InputNumber,
    //             props: { showButtons: true, min: 5, max: 240 },
    //         },
    //         {
    //             key: "metodosNotificacion",
    //             label: "Métodos de notificación",
    //             type: "multiselect",
    //             component: MultiSelect,
    //             props: { options: metodoOptions, placeholder: "Seleccionar métodos" },
    //         },
    //     ],
    // },
    // {
    //     key: "limites",
    //     title: "Límites",
    //     description: "Controla cuántas sesiones puede tener una persona al día.",
    //     fields: [
    //         {
    //             key: "maxSesionesPorDia",
    //             label: "Máx. sesiones por día por usuario",
    //             type: "number",
    //             component: InputNumber,
    //             props: { showButtons: true, min: 1, max: 20 },
    //         },
    //     ],
    // },
    {
        key: "mensajeria",
        title: "Mensajería (WhatsApp & Correo electrónico)",
        description: "Configura los servicios de mensajería automatizada para recordatorios.",
        fields: [
            {
                key: "habilitarCorreo",
                label: "Habilitar notificaciones por correo.",
                type: "checkbox",
                component: Checkbox,
            },
            {
                key: "habilitarWhatsapp",
                label: "Habilitar WhatsApp",
                type: "checkbox",
                component: Checkbox,
            },
            {
                key: "whatsappToken",
                label: "Token API",
                type: "text",
                component: InputText,
                showIf: (rules) => rules.habilitarWhatsapp,
            },
            {
                key: "whatsappNumero",
                label: "Número emisor",
                type: "text",
                component: InputText,
                showIf: (rules) => rules.habilitarWhatsapp,
            },

            // {
            //     key: "habilitarSMS",
            //     label: "Habilitar SMS",
            //     type: "checkbox",
            //     component: Checkbox,
            // },
            // {
            //     key: "smsAPIKey",
            //     label: "API Key",
            //     type: "text",
            //     component: InputText,
            //     showIf: (rules) => rules.habilitarSMS,
            // },
        ],
    },
];

export const VenReglas = ({ visible, setVisible }) => {

    const appendTarget = typeof window !== 'undefined' ? document.body : null;
    const { showError, showSuccess } = useContext(ToastContext);
    const [loading, setLoading] = useState(false);
    const [rules, setRules] = useState(initialState);
    const { idusuario, locations, selectedLocation } = useContext(AuthContext);

    const [dataForm, setDataForm] = useState({
        tenantId: "",
        clientId: "",
        clientSecret: "",
        sitio: "",
        biblioteca: "",
        carpeta: "",
        ruta: "",
    });

    const [activeIndex, setActiveIndex] = useState(0);

    // useEffect(async () => {
    //     setLoading(true);
    //     //     Axios.get("api/app/get_rules", {
    //     //         headers: { Authorization: `Bearer ${Cookies.get("tokenMOTORHOURS")}` },
    //     //     })
    //     //         .then(({ data }) => {
    //     //             setRules({ ...initialState, ...data });
    //     //             setLoading(false);
    //     //         })
    //     //         .catch((err) => {
    //     //             showError("Error al cargar las reglas de negocio");
    //     //             setLoading(false);
    //     //         });
    //     // }, []);
    //     const { data } = await getRulesAPI({ sed_id: selectedLocation });
    //     setRules({ ...initialState, ...data });
    //     setLoading(false);
    // }, [])

    useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        // Puedes unificar tu API para traer todo; aquí uso la que ya llamabas:
        const { data } = await getRulesAPI({ sed_id: selectedLocation });
        if (!mounted) return;

        // Mezcla para reglas existentes
        setRules((prev) => ({ ...prev, ...data }));

        // Mezcla para integraciones (coincide con FormDatosConexion y FormSitio)
        setDataForm((prev) => ({
          ...prev,
          tenantId: data?.tenantId ?? prev.tenantId,
          clientId: data?.clientId ?? prev.clientId,
          clientSecret: data?.clientSecret ?? prev.clientSecret,
          sitio: data?.sitio ?? prev.sitio,
          biblioteca: data?.biblioteca ?? prev.biblioteca,
          carpeta: data?.carpeta ?? prev.carpeta,
          ruta: data?.ruta ?? prev.ruta,
        }));
      } catch (err) {
        showError("Error al cargar las reglas de negocio");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [selectedLocation, showError]);

    const saveRules = () => {
        Axios.put("api/app/update_rules", rules, {
            headers: { Authorization: `Bearer ${Cookies.get("tokenMOTORHOURS")}` },
        })
            .then(() => showSuccess("Reglas actualizadas"))
            .catch(() => showError("Error al guardar las reglas"));
    };

    const footer = (
    <div className="flex justify-content-end gap-2">
      <Button label="Cerrar" className="p-button-text" onClick={() => setVisible(false)} />
      <Button label="Guardar Cambios" className="p-button-primary" onClick={saveRules} />
    </div>
  );

  const handleChange = (field, e) => {
    const value =
      field.type === "checkbox"
        ? e.checked
        : field.type === "number"
        ? e.value
        : e?.target?.value ?? e.value;

    setRules((prev) => ({ ...prev, [field.key]: value }));
  };


    return (
        <Dialog
            header="Configuraciones del sistema"
            visible={visible}
            onHide={() => setVisible(false)}
            breakpoints={{ "960px": "75vw", "640px": "100vw" }}
            style={{ width: "50vw" }}
            appendTo={appendTarget}   // ⬅︎ clave
            baseZIndex={7000}
            className="zfix-dialog"
            maskClassName="zfix-mask"
            modal
            blockScroll
            // footer={
            //     <div className="flex justify-content-end">
            //         <Button
            //             label="Guardar Cambios"
            //             className="p-button-primary"
            //             onClick={saveRules}
            //         />
            //     </div>
            // }
            footer={footer}
        >
            {/* <div className="grid p-fluid">
                {reglasConfig.map((section) => (
                    <div className="col-12 mb-4" key={section.key}>
                        <h5>{section.title}</h5>
                        <p className="text-sm text-secondary mb-3">{section.description}</p>
                        <hr />
                        {section.fields.map((field) => {
                            if (field.showIf && !field.showIf(rules)) return null;
                            const Comp = field.component;
                            return (
                                <div className="field" key={field.key}>
                                    {field.type === "checkbox" ? (
                                        <>
                                            <Comp
                                                inputId={field.key}
                                                checked={!!rules[field.key]}
                                                onChange={(e) =>
                                                    setRules({
                                                        ...rules,
                                                        [field.key]: e.checked,
                                                    })
                                                }
                                                {...field.props}
                                            />
                                            <label htmlFor={field.key} className="ml-2 mt-2">
                                                {field.label}
                                            </label>
                                        </>
                                    ) : (
                                        <>
                                            <label className="mt-2">{field.label}</label>
                                            <Comp
                                                value={rules[field.key]}
                                                onChange={(e) =>
                                                    setRules({
                                                        ...rules,
                                                        [field.key]:
                                                            field.type === "number"
                                                                ? e.value
                                                                : e.target.value,
                                                    })
                                                }
                                                {...field.props}
                                                type={
                                                    field.type !== "number" ? field.type : undefined
                                                }
                                            />
                                        </>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                ))}
            </div> */}

             <TabView activeIndex={activeIndex} onTabChange={(e) => setActiveIndex(e.index)}>
        {/* TAB 1: Reglas dinámicas */}
        <TabPanel header="Reglas y Políticas">
          <div className="grid p-fluid">
            {reglasConfig.map((section) => (
              <div className="col-12 mb-4" key={section.key}>
                <h5 className="mb-1">{section.title}</h5>
                {section.description && (
                  <p className="text-sm text-secondary mb-3">{section.description}</p>
                )}
                <hr />
                {section.fields.map((field) => {
                  if (field.showIf && !field.showIf(rules)) return null;
                  const Comp = field.component;
                  const value = field.type === "checkbox" ? !!rules[field.key] : rules[field.key];

                  return (
                    <div className="field" key={field.key}>
                      {field.type === "checkbox" ? (
                        <>
                          <Comp
                            inputId={field.key}
                            checked={value}
                            onChange={(e) => handleChange(field, e)}
                            {...field.props}
                          />
                          <label htmlFor={field.key} className="ml-2 mt-2">
                            {field.label}
                          </label>
                        </>
                      ) : (
                        <>
                          <label htmlFor={field.key} className="mt-2 block">
                            {field.label}
                          </label>
                          <Comp
                            id={field.key}
                            value={value}
                            onChange={(e) => handleChange(field, e)}
                            {...field.props}
                            type={field.type !== "number" ? field.type : undefined}
                          />
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </TabPanel>

        {/* TAB 2: Integraciones */}
        <TabPanel header="Integraciones">
          <div className="grid p-fluid">
            <div className="col-12 xl:col-6">
              <Card title="Credenciales Microsoft Graph" className="w-full">
                {/* Ojo: FormDatosConexion espera setDataForm */}
                <FormDatosConexion dataForm={dataForm} setDataForm={setDataForm} />
              </Card>
            </div>
            <div className="col-12 xl:col-6">
              <Card title="Sitio de Almacenamiento" className="w-full">
                {/* Ojo: FormSitio espera setData */}
                <FormSitio dataForm={dataForm} setData={setDataForm} />
              </Card>
            </div>
          </div>
        </TabPanel>
      </TabView>
        </Dialog>
    );
};
