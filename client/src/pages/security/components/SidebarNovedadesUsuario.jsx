import React, { useState, useEffect, useContext } from "react";
import { Sidebar } from "primereact/sidebar";
import { TabMenu } from "primereact/tabmenu";
import { Button } from "primereact/button";
import { ConfirmDialog } from "primereact/confirmdialog";
import moment from "moment";
import "moment/locale/es";
import GenericFormSection from "@components/data/GenericFormSection";
import { FormProvider, useForm } from "react-hook-form";
import { userNewsForm } from "../../admin/configForms";
import UserImageUploader from "./UserImageUploader";
import { useMediaQueryContext } from "@context/mediaQuery/mediaQueryContext";
import { ToastContext } from "@context/toast/ToastContext";
import { deleteNewnessUserAPI, getNewnessUserAPI, saveNewnessUserAPI } from "@api/requests";
// TODO: API eliminada para taller de motos
// import { getNewnessApi } from "@api/requests/newnessAPI";

const SidebarNovedadesUsuario = ({ visible, onHide, usuario, listperfiles }) => {
    const [activeIndex, setActiveIndex] = useState(0);
    const [historial, setHistorial] = useState([]);
    const [novId, setNovId] = useState(null);
    const [deleteDialog, setDeleteDialog] = useState(false);
    const [lists, setLists] = useState({ novedades: [] });
    const [novedadToDelete, setNovedadToDelete] = useState(null);
    const { isMobile, isTablet, isDesktop } = useMediaQueryContext();
    const { showSuccess } = useContext(ToastContext);

    const toast = React.useRef(null);
    const defaultValues = {
        novId: 0,
        fecha: [],
        tipoNovedad: lists.novedades.length > 0 ? lists.novedades[0].id : null,
        horaInicio: "",
        horaFin: "",
        descripcion: "",
    };
    const methods = useForm({ defaultValues });
    const { reset, handleSubmit, setValue, watch } = methods;
    const fetchHistorial = async () => {
        if (visible && usuario) {
            const { data } = await getNewnessUserAPI({ usuId: usuario.usuId });
            if (data) {
                setHistorial(data);
            }
        }
    };

    const getLists = async () => {
        try {
            const { data } = await getNewnessApi({modulo: 2});
            setLists({ novedades: data });
        } catch (error) {
            console.error(error)
        }
    };

    useEffect(() => {
        getLists();
    }, []);

    useEffect(() => {
        fetchHistorial();
    }, [visible, usuario]);

    const handleRegistrar = async (values) => {
        const { horaInicio, horaFin } = values;
        let horaInicioFormated = horaInicio
            ? moment(horaInicio, "HH:mm:ss").format("HH:mm:ss")
            : null;
        let horaFinFormated = horaFin ? moment(horaFin, "HH:mm:ss").format("HH:mm:ss") : null;
        const params = {
            ...values,
            novId,
            usuId: usuario.usuId,
            horaInicio: horaInicioFormated,
            horaFin: horaFinFormated,
        };
        const { data } = await saveNewnessUserAPI(params);
        if (data.message) {
            showSuccess(data.message);
        }
        reset(defaultValues);
        setNovId(null);
        fetchHistorial();
        setActiveIndex(1);
    };

    const handleEdit = (row) => {
        // Fechas para Calendar rango
        let fechas = [];
        if (row.fechaInicio && row.fechaFin) {
            fechas = [moment(row.fechaInicio).toDate(), moment(row.fechaFin).toDate()];
        } else if (row.fechaInicio) {
            fechas = [moment(row.fechaInicio).toDate()];
        }

        // Horas para TimePicker (Calendar timeOnly espera Date)
        const horaInicio = row.horaIncio ? moment(row.horaIncio, "HH:mm:ss").toDate() : null;
        const horaFin = row.horaFin ? moment(row.horaFin, "HH:mm:ss").toDate() : null;

        setValue("novId", row.id);
        setValue("fecha", fechas);
        setValue("tipoNovedad", row.tipoNovedad);
        setValue("horaInicio", horaInicio);
        setValue("horaFin", horaFin);
        setValue("descripcion", row.descripcion);
        setActiveIndex(0); // Cambia al tab de Registrar Novedad
    };

    const handleDelete = async () => {
        const { data } = await deleteNewnessUserAPI({ id: novedadToDelete.id });
        if (data.message) {
            showSuccess(data.message);
        }
        setDeleteDialog(false);
        fetchHistorial();
    };

    const items = [
        { label: "Novedad", icon: novId > 0 ? "pi pi-pencil" : "pi pi-plus" },
        { label: "Historial", icon: "pi pi-list" },
    ];

    return (
        <>
            <Sidebar
                visible={visible}
                onHide={() => {
                    onHide();
                    reset(defaultValues);
                    setNovId(null);
                }}
                position="right"
                style={{ width: isMobile ? "100%" : isTablet ? 550 : isDesktop ? 400 : 400 }}
                className="p-sidebar-md"
                blockScroll
                showCloseIcon
                header={`Novedades de ${usuario?.nombre || ""}`}
            >
                {/* Imagen y encabezado */}

                <div style={{ flexShrink: 0, paddingTop: 0 }} className="my-4">
                    <div
                        style={{
                            display: "flex",
                            justifyContent: "center",
                            alignItems: "center",
                        }}
                    >
                        <UserImageUploader
                            fullName={`${usuario?.nombre?.toUpperCase() || ""} `}
                            profileName={
                                listperfiles.find((p) => p.id === usuario?.perfil)?.nombre || ""
                            }
                            imageUrl={usuario?.usuFoto}
                            onUpload={(file, preview) => {}}
                            canUpload={false}
                        />
                    </div>
                </div>

                <div
                    style={{
                        display: "flex",
                        flexDirection: "column",
                        height: "100%",
                    }}
                >
                    <div
                        style={{
                            flex: 1,
                            overflowY: "auto",
                            padding: "0 1rem",
                            marginBottom: "300px",
                        }}
                    >
                        <TabMenu
                            model={items}
                            activeIndex={activeIndex}
                            onTabChange={(e) => setActiveIndex(e.index)}
                            className="mb-4"
                        />

                        {activeIndex === 0 && (
                            <FormProvider {...methods}>
                                <div style={{ marginTop: "10px", marginBottom: "50px" }}>
                                    <GenericFormSection fields={userNewsForm({ lists, watch })} />
                                </div>
                            </FormProvider>
                        )}

                        {activeIndex === 1 && (
                            <div
                                className="novedades-cards-container"
                                style={{
                                    display: "flex",
                                    flexDirection: "column",
                                    gap: "1rem",
                                    marginBottom: "2rem",
                                }}
                            >
                                {historial.length === 0 ? (
                                    <div
                                        style={{
                                            textAlign: "center",
                                            color: "#888",
                                            padding: "2rem 0",
                                        }}
                                    >
                                        No hay novedades registradas.
                                    </div>
                                ) : (
                                    historial.map((row) => (
                                        <div
                                            key={row.id}
                                            className="novedad-card"
                                            style={{
                                                background: "#fff",
                                                borderRadius: "12px",
                                                boxShadow: "0 2px 8px rgba(0,0,0,0.07)",
                                                padding: "1rem 1.5rem",
                                                display: "flex",
                                                flexDirection: "column",
                                                position: "relative",
                                                minHeight: "90px",
                                            }}
                                        >
                                            <div
                                                style={{
                                                    display: "flex",
                                                    justifyContent: "space-between",
                                                    alignItems: "flex-start",
                                                    gap: "1rem",
                                                }}
                                            >
                                                <div style={{ flex: 1 }}>
                                                    <div
                                                        style={{
                                                            fontWeight: 700,
                                                            fontSize: "1.08rem",
                                                            color: "rgb(34, 34, 36)",
                                                            marginBottom: 4,
                                                            textTransform: "capitalize",
                                                        }}
                                                    >
                                                        {lists.novedades.find(
                                                            (n) => n.id == row.tipoNovedad
                                                        ).nombre || "Novedad"}
                                                    </div>
                                                    <div
                                                        style={{
                                                            fontSize: "0.95rem",
                                                            color: "#666",
                                                            marginBottom: 2,
                                                            display: "flex",
                                                            alignItems: "center",
                                                            gap: 6,
                                                        }}
                                                    >
                                                        {/* Calendar icon and date range */}
                                                        <i
                                                            className="pi pi-calendar"
                                                            style={{
                                                                marginRight: 4,
                                                                color: "#607d8b",
                                                            }}
                                                        />
                                                        {row.fechaInicio && row.fechaFin
                                                            ? `${moment(row.fechaInicio).format(
                                                                  "DD/MM/YYYY"
                                                              )} - ${moment(row.fechaFin).format(
                                                                  "DD/MM/YYYY"
                                                              )}`
                                                            : row.fechaInicio
                                                            ? moment(row.fechaInicio).format(
                                                                  "DD/MM/YYYY"
                                                              )
                                                            : null}
                                                    </div>
                                                    <div
                                                        style={{
                                                            fontSize: "0.95rem",
                                                            color: "#666",
                                                            marginBottom: 2,
                                                            display: "flex",
                                                            alignItems: "center",
                                                            gap: 6,
                                                        }}
                                                    >
                                                        {/* Time icon and time range */}
                                                        <i
                                                            className="pi pi-clock"
                                                            style={{
                                                                marginRight: 4,
                                                                color: "#607d8b",
                                                            }}
                                                        />
                                                        {row.horaIncio && row.horaFin
                                                            ? `${row.horaIncio} - ${row.horaFin}`
                                                            : row.horaIncio
                                                            ? row.horaIncio
                                                            : null}
                                                    </div>
                                                    <div
                                                        style={{
                                                            fontSize: "0.97rem",
                                                            color: "#444",
                                                            marginTop: 6,
                                                            wordBreak: "break-word",
                                                        }}
                                                    >
                                                        {row.descripcion}
                                                    </div>
                                                </div>
                                                <div
                                                    style={{
                                                        display: "flex",
                                                        flexDirection: "row",
                                                        gap: 8,
                                                        alignItems: "center",
                                                        minWidth: 0,
                                                    }}
                                                >
                                                    <Button
                                                        icon="pi pi-pencil"
                                                        className="p-button-rounded p-button-text p-button-info"
                                                        style={{ minWidth: 36, minHeight: 36 }}
                                                        onClick={() => {
                                                            setNovId(row.id);
                                                            handleEdit(row);
                                                        }}
                                                        tooltip="Editar"
                                                    />
                                                    <Button
                                                        icon="pi pi-trash"
                                                        className="p-button-rounded p-button-text p-button-danger"
                                                        style={{ minWidth: 36, minHeight: 36 }}
                                                        onClick={() => {
                                                            setNovedadToDelete(row);
                                                            setDeleteDialog(true);
                                                        }}
                                                        tooltip="Eliminar"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}
                    </div>

                    <ConfirmDialog
                        visible={deleteDialog}
                        onHide={() => setDeleteDialog(false)}
                        message="¿Seguro que deseas eliminar esta novedad?"
                        header="Confirmar eliminación"
                        icon="pi pi-exclamation-triangle"
                        accept={handleDelete}
                        acceptLabel="Si"
                        reject={() => setDeleteDialog(false)}
                        acceptClassName="p-button-danger"
                    />
                    {/* Footer fijo al fondo */}
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
                        {activeIndex !== 1 && (
                            <Button
                                label={novId > 0 ? "Actualizar" : "Registrar"}
                                icon="pi pi-check"
                                className="p-button-outlined p-button-text p-button-success w-full"
                                onClick={handleSubmit(handleRegistrar)}
                            />
                        )}
                    </div>
                </div>
            </Sidebar>
        </>
    );
};

export default SidebarNovedadesUsuario;
