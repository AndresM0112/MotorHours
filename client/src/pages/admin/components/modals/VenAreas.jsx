import React, { forwardRef, useImperativeHandle, useState, useContext, useEffect } from "react";
import { Sidebar } from "primereact/sidebar";
import { Button } from "primereact/button";
import { FormProvider, useForm } from "react-hook-form";
import moment from "moment";

// Contexts
import { AuthContext } from "@context/auth/AuthContext";
import { ToastContext } from "@context/toast/ToastContext";
import useHandleApiError from "@hook/useHandleApiError";
import { useMediaQueryContext } from "@context/mediaQuery/mediaQueryContext";
import { config } from "@context/permissions/permissionsConfig";


// Form
import GenericFormSection from "@components/data/GenericFormSection";
import { areasForm } from "../../configForms";

// API
import { saveAreaAPI, getAreasManagersByIdAPI } from "@api/requests/areasApi";
import { getUsersApi } from "@api/requests/usersApi";

const defaultValues = {
    nombre: "",
    estado: "activo",
    cantidadEstimado: null,
    frecuenciaId: null,
    encargados: [],
};

const VenAreas = forwardRef(
    ({ addItem, updateItem, setCurrentArea, setDeleteDialogVisible, canDelete }, ref) => {
        const { idusuario, nombreusuario } = useContext(AuthContext);
        const { showSuccess, showInfo } = useContext(ToastContext);
        const { isMobile, isTablet, isDesktop } = useMediaQueryContext();
        const handleApiError = useHandleApiError();

        const [visible, setVisible] = useState(false);
        const [areId, setAreId] = useState(null);
        const [loading, setLoading] = useState(false);
        const [originalData, setOriginalData] = useState(null);

        //Encargado de area
        const [empleadosOpts, setEmpleadosOpts] = useState([]);
        const [empleadosLoading, setEmpleadosLoading] = useState(false);

        const methods = useForm({ defaultValues });
        const { handleSubmit, reset, setValue, watch } = methods;


        useEffect(() => {
            let cancel = false;
            (async () => {
                try {
                    setEmpleadosLoading(true);
                    // ajusta filtros según tu API (ejemplos: prfId=empleado, estId=1, limit=500)
                    const { data } = await getUsersApi({ prfId:"8,16", estId: 1,
                         permisoId: config.home.tickets.SoticketSolver, 
                          limit: 500 });
                    const rows = data?.datos || data || [];

                    const mapped = rows.map(u => ({
                        id: u.usuId ?? u.usu_id ?? u.id,
                        nombre: `${u.usu_nombre ?? u.nombre ?? ""} 
                        ${u.usu_apellido ?? u.apellido ?? ""}`.trim()
                        || u.usu_usuario || u.usuario || `ID ${u.usuId ?? u.usu_id ?? u.id}`,
                    }));
                    if (!cancel) setEmpleadosOpts(mapped);
                } catch (_) {
                    if (!cancel) setEmpleadosOpts([]);
                } finally {
                    if (!cancel) setEmpleadosLoading(false);
                }
            })();
            return () => { cancel = true; };
        }, []);


        // arriba del componente o dentro del mismo archivo:
        const arraysEqual = (a = [], b = []) => {
            const A = [...new Set(a.map(Number))].sort((x, y) => x - y);
            const B = [...new Set(b.map(Number))].sort((x, y) => x - y);
            return A.length === B.length && A.every((v, i) => v === B[i]);
        };


        const newArea = () => {
            reset(defaultValues);
            setAreId(null);
            setOriginalData(null);
            setVisible(true);
        };

        const editArea = (item) => {
            setAreId(item.areId);
            setOriginalData(item);
            setValue("nombre", item.nombre);
            setValue("estado", item.estado);
            setValue("cantidadEstimado", item.cantidadEstimado);
            setValue("frecuenciaId", item.frecuenciaId);
            setValue("encargados", item.encargados || []);  // array de IDs
            setVisible(true);


            getAreasManagersByIdAPI([item.areId])
                .then(({ data }) => {
                    const rows = Array.isArray(data) ? data : (data?.datos || []);
                    const ids = rows
                        .filter(r => Number(r.areaId) === Number(item.areId))
                        .map(r => Number(r.encargadoId))
                        .filter(Boolean);

                    setValue("encargados", ids);

                    // 👇 muy importante: guardar en originalData
                    setOriginalData(prev => ({ ...(prev || {}), encargados: ids }));
                })
                .catch(() => {
                    setValue("encargados", []);
                    setOriginalData(prev => ({ ...(prev || {}), encargados: [] }));
                });


        };

        const saveArea = async (values) => {
            setLoading(true);
            try {
                const nombre = values.nombre.trim().toUpperCase();

                // Normaliza encargados a array de IDs numéricos
                const encRaw = values.encargados;
                const encArr = Array.isArray(encRaw) ? encRaw : (encRaw == null || encRaw === '' ? [] : [encRaw]);
                const encargadosIds = encArr
                    .map(v => (v && typeof v === 'object' ? (v.id ?? v.value ?? null) : v))
                    .filter(v => v !== null && v !== undefined && v !== '')
                    .map(Number);

                // 👇 incluir encargados en el chequeo
                const noChanges =
                    areId &&
                    nombre === (originalData?.nombre ?? '') &&
                    values.estado === (originalData?.estado ?? '') &&
                    Number(values.cantidadEstimado) === Number(originalData?.cantidadEstimado) &&
                    Number(values.frecuenciaId) === Number(originalData?.frecuenciaId) &&
                    arraysEqual(encargadosIds, originalData?.encargados || []);

                if (noChanges) {
                    showInfo("No has realizado ningún cambio.");
                    return;
                }

                const params = {
                    areId,
                    nombre,
                    estado: values.estado,
                    cantidadEstimado: Number(values.cantidadEstimado),
                    frecuenciaId: Number(values.frecuenciaId),
                    encargados: encargadosIds,

                    // ⚠️ el back espera 'usuario'
                    usuario: idusuario,
                };

                const { data } = await saveAreaAPI(params);
                showSuccess(data.message);

                const item = {
                    areId: areId || data.areId,
                    nombre,
                    estado: values.estado,
                    cantidadEstimado: Number(values.cantidadEstimado),
                    frecuenciaId: Number(values.frecuenciaId),
                    encargados: encargadosIds,
                    tiempoEstimadoMinutos: data.tiempoEstimadoMinutos,
                    usuact: nombreusuario,
                    fecact: moment().format("YYYY-MM-DD HH:mm:ss"),
                };

                if (areId) updateItem({ idField: "areId", ...item });
                else addItem(item);

                reset(defaultValues);
                setAreId(null);
                setVisible(false);
            } catch (error) {
                handleApiError(error);
            } finally {
                setLoading(false);
            }
        };


        useImperativeHandle(ref, () => ({
            newArea,
            editArea,
            onClose: () => setVisible(false),
        }));

        return (
            <Sidebar
                visible={visible}
                onHide={() => {
                    reset(defaultValues);
                    setAreId(null);
                    setVisible(false);
                }}
                position="right"
                dismissable
                className="p-sidebar-md inline-inside-dialog"
                style={{
                    width: isMobile ? "100%" : isTablet ? 550 : isDesktop ? 400 : 400,
                }}
            >
                <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
                    <div style={{ textAlign: "center" }}>
                        <h4 className="my-4">{areId ? "Editar Área" : "Registrar Área"}</h4>
                    </div>

                    <FormProvider {...methods}>
                        <div style={{ marginBottom: "50px" }}>
                            <GenericFormSection fields={areasForm(empleadosOpts)} />
                        </div>

                        <div
                            className="sidebar-footer"
                            style={{
                                flexShrink: 0,
                                padding: "1rem",
                                textAlign: "right",
                                borderTop: "1px solid #ccc",
                                background: "#fff",
                            }}
                        >
                            {canDelete && areId && (
                                <Button
                                    className="p-button-danger p-button-text"
                                    onClick={() => {
                                        setCurrentArea({
                                            areId,
                                            nombre: watch("nombre"),
                                        });
                                        setDeleteDialogVisible(true);
                                    }}
                                    label="Eliminar área"
                                    loading={loading}
                                />
                            )}
                            <Button
                                className="p-button-info p-button-text"
                                onClick={handleSubmit(saveArea)}
                                icon="pi pi-save"
                                label={areId ? "Guardar Cambios" : "Guardar"}
                                loading={loading}
                            />
                        </div>
                    </FormProvider>
                </div>
            </Sidebar>
        );
    }
);

export default VenAreas;
