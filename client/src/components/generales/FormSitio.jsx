// import React, { useContext, useEffect, useState } from "react";
// import { AuthContext } from "@context/auth/AuthContext";
// import { ToastContext } from "@context/toast/ToastContext";
// // PRIMEREACT
// import { Button } from "primereact/button";
// import { Dropdown } from "primereact/dropdown";
// import { TreeSelect } from "primereact/treeselect";
// import { classNames } from "primereact/utils";
// // OTROS
// import { useForm } from "react-hook-form";
// import Axios from "axios";
// // COMPONENTES
// import { SkeletonForm, SpanLoading } from "./ItemTemplates";
// // UTILS
// import { propsSelect, headers } from "@utils/converAndConst";
// import { findNode, findNodePath, setNodePath } from "@utils/asambleData";
// import Cookies from "js-cookie";

// export const FormSitio = ({ dataForm, setData }) => {
//     const { nombreusuario } = useContext(AuthContext);
//     const { showSuccess, showError, showInfo } = useContext(ToastContext);
//     const [loading, setLoading] = useState(false);
//     const {
//         register,
//         handleSubmit,
//         setValue,
//         getValues,
//         formState: { errors },
//     } = useForm({
//         defaultValues: {
//             sitio: dataForm?.sitio || "",
//             biblioteca: dataForm?.biblioteca || "",
//             carpeta: dataForm?.carpeta || "",
//             ruta: dataForm?.ruta || "",
//         },
//     });

//     const [listas, setListas] = useState({ sitios: [], bibliotecas: [], carpetas: [] });
//     const [loadings, setLoadings] = useState({ sitio: false, biblioteca: false, carpeta: false });
//     const [listCarpetas, setListCarpetas] = useState([]);

//     useEffect(() => {
//         const abortController = new AbortController();
//         setListas({ sitios: [], bibliotecas: [], carpetas: [] });
//         setLoadings((prev) => ({ ...prev, sitio: true }));

//         Axios.get("api/microsoft-graph/get_user_drive", {
//             headers: { ...headers, Authorization: `Bearer ${Cookies.get("tokenMOTORHOURS")}` },
//         })
//             .then(async ({ data }) => {
//                 setListas((prev) => ({ ...prev, sitios: data }));
//                 setLoadings((prev) => ({ ...prev, sitio: false }));

//                 const { sitio, biblioteca, ruta } = dataForm;

//                 if (sitio) getUnitsDrive(sitio);

//                 if (sitio && biblioteca && ruta) {
//                     const folders = await setNodePath(sitio, biblioteca, ruta);
//                     setListCarpetas(folders);
//                 }

//                 setLoadings((prev) => ({ ...prev, listas: false }));
//             })
//             .catch((error) => {
//                 setLoadings((prev) => ({ ...prev, sitio: false }));

//                 if (error.response) {
//                     if (error.response.status === 404) return showError("Api no encontrada");
//                     return showError(error.response?.data.message);
//                 }
//                 showError(error);
//             });
//         return () => abortController.abort();
//         // eslint-disable-next-line
//     }, [dataForm.tenantId, dataForm.clientId, dataForm.clientSecret]);

//     if (loadings.sitio)
//         return (
//             <div>
//                 <h5 className="text-center" style={{ color: "#2196f3" }}>
//                     {"Cargando Carpetas Por favor espere..."}
//                 </h5>
//                 {SkeletonForm}
//             </div>
//         );

//     const getUnitsDrive = async (sitio) => {
//         setListas((prev) => ({ ...prev, bibliotecas: [] }));
//         setLoadings((prev) => ({ ...prev, biblioteca: true }));

//         if (sitio) {
//             try {
//                 const { data } = await Axios.get(
//                     "api/microsoft-graph/microsoft-graph/get_units_drive",
//                     {
//                         params: { sitio },
//                         headers: {
//                             ...headers,
//                             Authorization: `Bearer ${Cookies.get("tokenMOTORHOURS")}`,
//                         },
//                     }
//                 );

//                 setListas((prev) => ({ ...prev, bibliotecas: data }));
//                 setLoadings((prev) => ({ ...prev, biblioteca: false }));
//             } catch (error) {
//                 setLoadings((prev) => ({ ...prev, biblioteca: false }));

//                 if (error.response) {
//                     if (error.response.status === 404) return showError("Api no encontrada");
//                     return showError(error.response?.data.message);
//                 }
//                 showError(error);
//             }
//         }
//     };

//     const getFoldersDrive = async (carpeta) => {
//         const sitio = getValues("sitio");
//         const biblioteca = getValues("biblioteca");

//         setListCarpetas([]);

//         const params = { sitio, biblioteca, carpeta };

//         if (sitio && biblioteca) {
//             setLoadings((prev) => ({ ...prev, carpeta: true }));

//             try {
//                 const { data } = await Axios.get(
//                     "api/microsoft-graph/microsoft-graph/get_folders_drive",
//                     {
//                         params,
//                         headers: {
//                             ...headers,
//                             Authorization: `Bearer ${Cookies.get("tokenMOTORHOURS")}`,
//                         },
//                     }
//                 );

//                 setListCarpetas(data);
//                 setLoadings((prev) => ({ ...prev, carpeta: false }));
//             } catch (error) {
//                 setLoadings((prev) => ({ ...prev, carpeta: false }));
//                 if (error.response) {
//                     if (error.response.status === 404) return showError("Api no encontrada");
//                     return showError(error.response?.data.message);
//                 }
//                 showError(error);
//             }
//         }
//     };

//     // AGREGA CARPETA HIJOS AL EXPANDIR
//     const onExpand = async (e) => {
//         const nodeValue = e.node.key;
//         const updatedData = [...listCarpetas];

//         // Buscar el nodo en el árbol
//         const expandedNode = findNode(updatedData, nodeValue);
//         expandedNode.children = [{ key: 0, label: SpanLoading }];

//         if (expandedNode) {
//             if (expandedNode.children[0].key === 0) {
//                 const sitio = getValues("sitio");
//                 const biblioteca = getValues("biblioteca");

//                 const params = { sitio, biblioteca, carpeta: nodeValue };
//                 try {
//                     const { data } = await Axios.get(
//                         "api/microsoft-graph/microsoft-graph/get_folders_drive",
//                         {
//                             params,
//                             headers: {
//                                 ...headers,
//                                 Authorization: `Bearer ${Cookies.get("tokenMOTORHOURS")}`,
//                             },
//                         }
//                     );

//                     expandedNode.children = data;
//                     expandedNode.expanded = true;

//                     setListCarpetas(updatedData);
//                 } catch (error) {
//                     expandedNode.children = [{ key: 0, label: "" }];
//                     if (error.response) {
//                         if (error.response.status === 404) return showError("Api no encontrada");
//                         return showError(error.response?.data.message);
//                     }
//                     showError(error);
//                 }
//             }
//         }
//     };

//     const onNodeCollapse = async (e) => {
//         const nodeValue = e.node.key;
//         const updatedData = [...listCarpetas];

//         // Buscar el nodo en el árbol
//         const expandedNode = findNode(updatedData, nodeValue);

//         if (expandedNode) {
//             expandedNode.children = [{ key: 0, label: "" }];
//             expandedNode.expanded = false;
//             setListCarpetas(updatedData);
//         }
//     };

//     const updateStorageSite = async ({ sitio, biblioteca, carpeta, ruta }) => {
//         setLoading(true);
//         if (
//             sitio === dataForm.sitio &&
//             biblioteca === dataForm.biblioteca &&
//             carpeta === dataForm.carpeta
//         ) {
//             return showInfo("No has hecho ninguna Actualización");
//         }

//         const params = { sitio, biblioteca, carpeta, ruta, usuario: nombreusuario };
//         try {
//             const { data } = await Axios.put(
//                 "api/microsoft-graph/microsoft-graph/update_storage_site",
//                 params,
//                 {
//                     headers: {
//                         ...headers,
//                         Authorization: `Bearer ${Cookies.get("tokenMOTORHOURS")}`,
//                     },
//                 }
//             );
//             showSuccess(data.message);
//             setData((prev) => ({ ...prev, sitio, biblioteca, carpeta, ruta }));
//         } catch (error) {
//             if (error.response) {
//                 if (error.response.status === 404) return showError("Api no encontrada");
//                 return showError(error.response?.data.message);
//             }
//             showError(error);
//         } finally {
//             setLoading(false);
//         }
//     };

//     return (
//         <form onSubmit={handleSubmit(updateStorageSite)}>
//             <div className="grid p-fluid">
//                 <div className="col-12">
//                     <label>Usuario</label>
//                     <Dropdown
//                         {...propsSelect}
//                         value={getValues("sitio")}
//                         options={listas.sitios}
//                         optionLabel="nombre"
//                         filterBy="nombre"
//                         optionValue="id"
//                         filter
//                         showClear
//                         placeholder="Seleccionar Usuario"
//                         className={classNames({ "p-invalid": errors.sitio })}
//                         {...register("sitio", {
//                             required: "El campo sitio es requerido",
//                             onChange: (e) => {
//                                 const value = e.value || null;
//                                 setValue("sitio", value, { shouldValidate: true });
//                                 setValue("biblioteca", null);
//                                 setValue("carpeta", null);
//                                 setListCarpetas([]);
//                                 getUnitsDrive(value);
//                             },
//                         })}
//                     />
//                     <div className={classNames({ "p-error": errors.sitio })}>
//                         {errors.sitio?.message}
//                     </div>
//                 </div>
//                 <div className="col-12">
//                     <label>Biblioteca</label>
//                     <Dropdown
//                         {...propsSelect}
//                         value={getValues("biblioteca")}
//                         options={listas.bibliotecas}
//                         optionLabel="nombre"
//                         filterBy="nombre"
//                         optionValue="id"
//                         filter
//                         showClear
//                         placeholder={loadings.biblioteca ? SpanLoading : "Seleccionar Biblioteca"}
//                         disabled={loadings.biblioteca}
//                         className={classNames({ "p-invalid": errors.biblioteca })}
//                         {...register("biblioteca", {
//                             required: "El campo biblioteca es requerido",
//                             onChange: (e) => {
//                                 const value = e.value || null;
//                                 setValue("biblioteca", value, { shouldValidate: true });
//                                 setValue("carpeta", null);
//                                 getFoldersDrive("");
//                             },
//                         })}
//                     />
//                     <div className={classNames({ "p-error": errors.biblioteca })}>
//                         {errors.biblioteca?.message}
//                     </div>
//                 </div>
//                 <div className="col-12">
//                     <label>Carpeta Almacenamiento</label>
//                     <TreeSelect
//                         {...propsSelect}
//                         value={getValues("carpeta")}
//                         options={listCarpetas}
//                         filter
//                         placeholder={loadings.carpeta ? SpanLoading : "Seleccionar Carpeta"}
//                         className={classNames({ "p-invalid": errors.carpeta })}
//                         onNodeExpand={(e) => onExpand(e, 1)}
//                         onNodeCollapse={(e) => onNodeCollapse(e, 1)}
//                         onNodeSelect={(e) =>
//                             setValue("ruta", findNodePath(listCarpetas, e.node.key).join("/"), {
//                                 shouldValidate: true,
//                             })
//                         }
//                         disabled={loadings.carpeta}
//                         {...register("carpeta", {
//                             required: "El campo carpeta de almacenamiento es requerido",
//                         })}
//                     />
//                     <div className={classNames({ "p-error": errors.carpeta })}>
//                         {errors.carpeta?.message}
//                     </div>
//                 </div>
//                 <div className="col-12">
//                     <Button className="p-button-info" label="Guardar Cambios" loading={loading} />
//                 </div>
//             </div>
//         </form>
//     );
// };

import React, { useContext, useEffect, useState } from "react";
import { AuthContext } from "@context/auth/AuthContext";
import { ToastContext } from "@context/toast/ToastContext";
// PRIMEREACT
import { Button } from "primereact/button";
import { Dropdown } from "primereact/dropdown";
import { TreeSelect } from "primereact/treeselect";
import { classNames } from "primereact/utils";
// OTROS
import { useForm } from "react-hook-form";
// COMPONENTES
import { SkeletonForm, SpanLoading } from "./ItemTemplates";
// UTILS
import { propsSelect } from "@utils/converAndConst";
import { findNode, findNodePath, setNodePath } from "@utils/asambleData";
// import { getFoldersDriveAPI, getSitesDriveAPI, getUnitsDriveAPI, putStorageSiteAPI } from "@api/requests";
import { getFoldersDriveAPI,getSitesDriveAPI,getUnitsDriveAPI,putStorageSiteAPI } from "@api/requests/rulesApi";

export const FormSitio = ({ dataForm, setData }) => {
    const { nombreusuario } = useContext(AuthContext);
    const { showSuccess, showError, showInfo } = useContext(ToastContext);
    const [loading, setLoading] = useState(false);
    const {
        register,
        handleSubmit,
        setValue,
        getValues,
        formState: { errors },
    } = useForm({
        defaultValues: {
            sitio: dataForm?.sitio || "",
            biblioteca: dataForm?.biblioteca || "",
            carpeta: dataForm?.carpeta || "",
            ruta: dataForm?.ruta || "",
        },
    });

    const [listas, setListas] = useState({ sitios: [], bibliotecas: [], carpetas: [] });
    const [loadings, setLoadings] = useState({ sitio: false, biblioteca: false, carpeta: false });
    const [listCarpetas, setListCarpetas] = useState([]);

    useEffect(() => {
        const abortController = new AbortController();
        setListas({ sitios: [], bibliotecas: [], carpetas: [] });
        setLoadings((prev) => ({ ...prev, sitio: true }));

        getSitesDriveAPI()
            .then(async ({ data }) => {
                setListas((prev) => ({ ...prev, sitios: data }));
                setLoadings((prev) => ({ ...prev, sitio: false }));

                const { sitio, biblioteca, ruta } = dataForm;

                if (sitio) getUnitsDrive(sitio);

                if (sitio && biblioteca && ruta) {
                    const folders = await setNodePath(sitio, biblioteca, ruta);
                    setListCarpetas(folders);
                }

                setLoadings((prev) => ({ ...prev, listas: false }));
            })
            .catch((error) => {
                setLoadings((prev) => ({ ...prev, sitio: false }));

                if (error.response) {
                    if (error.response.status === 404) return showError("Api no encontrada");
                    return showError(error.response?.data.message);
                }
                showError(error);
            });
        return () => abortController.abort();
        // eslint-disable-next-line
    }, [dataForm.tenantId, dataForm.clientId, dataForm.clientSecret]);

    if (loadings.sitio)
        return (
            <div>
                <h5 className="text-center" style={{ color: "#2196f3" }}>
                    {"Cargando Carpetas Por favor espere..."}
                </h5>
                {SkeletonForm}
            </div>
        );

    const getUnitsDrive = async (sitio) => {
        setListas((prev) => ({ ...prev, bibliotecas: [] }));
        setLoadings((prev) => ({ ...prev, biblioteca: true }));

        if (sitio) {
            try {
                const { data } = await getUnitsDriveAPI(sitio)

                setListas((prev) => ({ ...prev, bibliotecas: data }));
                setLoadings((prev) => ({ ...prev, biblioteca: false }));
            } catch (error) {
                setLoadings((prev) => ({ ...prev, biblioteca: false }));

                if (error.response) {
                    if (error.response.status === 404) return showError("Api no encontrada");
                    return showError(error.response?.data.message);
                }
                showError(error);
            }
        }
    };

    const getFoldersDrive = async (carpeta) => {
        const sitio = getValues("sitio");
        const biblioteca = getValues("biblioteca");

        setListCarpetas([]);

        const params = { sitio, biblioteca, carpeta };

        if (sitio && biblioteca) {
            setLoadings((prev) => ({ ...prev, carpeta: true }));

            try {
                // ! fallas acá.
                const { data } = await getFoldersDriveAPI(params)
                setListCarpetas(data);
                setLoadings((prev) => ({ ...prev, carpeta: false }));
            } catch (error) {
                setLoadings((prev) => ({ ...prev, carpeta: false }));
                if (error.response) {
                    if (error.response.status === 404) return showError("Api no encontrada");
                    return showError(error.response?.data.message);
                }
                showError(error);
            }
        }
    };

    // AGREGA CARPETA HIJOS AL EXPANDIR
    const onExpand = async (e) => {
        const nodeValue = e.node.key;
        const updatedData = [...listCarpetas];

        // Buscar el nodo en el árbol
        const expandedNode = findNode(updatedData, nodeValue);
        expandedNode.children = [{ key: 0, label: SpanLoading }];

        if (expandedNode) {
            if (expandedNode.children[0].key === 0) {
                const sitio = getValues("sitio");
                const biblioteca = getValues("biblioteca");

                const params = { sitio, biblioteca, carpeta: nodeValue };
                try {
                    const { data } = await getFoldersDriveAPI(params)

                    expandedNode.children = data;
                    expandedNode.expanded = true;

                    setListCarpetas(updatedData);
                } catch (error) {
                    expandedNode.children = [{ key: 0, label: "" }];
                    if (error.response) {
                        if (error.response.status === 404) return showError("Api no encontrada");
                        return showError(error.response?.data.message);
                    }
                    showError(error);
                }
            }
        }
    };

    const onNodeCollapse = async (e) => {
        const nodeValue = e.node.key;
        const updatedData = [...listCarpetas];

        // Buscar el nodo en el árbol
        const expandedNode = findNode(updatedData, nodeValue);

        if (expandedNode) {
            expandedNode.children = [{ key: 0, label: "" }];
            expandedNode.expanded = false;
            setListCarpetas(updatedData);
        }
    };

    const updateStorageSite = async ({ sitio, biblioteca, carpeta, ruta }) => {
        setLoading(true);
        if (
            sitio === dataForm.sitio &&
            biblioteca === dataForm.biblioteca &&
            carpeta === dataForm.carpeta
        ) {
            setLoading(false)
            return showInfo("No has hecho ninguna Actualización");
        }

        const params = { sitio, biblioteca, carpeta, ruta, usuario: nombreusuario };
        try {
            const { data } = await putStorageSiteAPI(params)
            showSuccess(data.message);
            setData((prev) => ({ ...prev, sitio, biblioteca, carpeta, ruta }));
        } catch (error) {
            if (error.response) {
                if (error.response.status === 404) return showError("Api no encontrada");
                return showError(error.response?.data.message);
            }
            showError(error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit(updateStorageSite)}>
            <div className="grid p-fluid">
                <div className="col-12">
                    <label>Sitio</label>
                    <Dropdown
                        {...propsSelect}
                        appendTo="self"
                        value={getValues("sitio")}
                        options={listas.sitios}
                        optionLabel="nombre"
                        filterBy="nombre"
                        optionValue="id"
                        filter
                        showClear
                        placeholder="Seleccionar Usuario"
                        className={classNames({ "p-invalid": errors.sitio })}
                        {...register("sitio", {
                            required: "El campo sitio es requerido",
                            onChange: (e) => {
                                const value = e.value || null;
                                setValue("sitio", value, { shouldValidate: true });
                                setValue("biblioteca", null);
                                setValue("carpeta", null);
                                setListCarpetas([]);
                                getUnitsDrive(value);
                            },
                        })}
                    />
                    <div className={classNames({ "p-error": errors.sitio })}>
                        {errors.sitio?.message}
                    </div>
                </div>
                <div className="col-12">
                    <label>Biblioteca</label>
                    <Dropdown
                        {...propsSelect}
                        appendTo="self"
                        value={getValues("biblioteca")}
                        options={listas.bibliotecas}
                        optionLabel="nombre"
                        filterBy="nombre"
                        optionValue="id"
                        filter
                        showClear
                        placeholder={loadings.biblioteca ? SpanLoading : "Seleccionar Biblioteca"}
                        disabled={loadings.biblioteca}
                        className={classNames({ "p-invalid": errors.biblioteca })}
                        {...register("biblioteca", {
                            required: "El campo biblioteca es requerido",
                            onChange: (e) => {
                                const value = e.value || null;
                                setValue("biblioteca", value, { shouldValidate: true });
                                setValue("carpeta", null);
                                getFoldersDrive("");
                            },
                        })}
                    />
                    <div className={classNames({ "p-error": errors.biblioteca })}>
                        {errors.biblioteca?.message}
                    </div>
                </div>
                <div className="col-12">
                    <label>Carpeta Almacenamiento</label>
                    <TreeSelect
                        {...propsSelect}
                        appendTo="self"
                        value={getValues("carpeta")}
                        options={listCarpetas}
                        filter
                        placeholder={loadings.carpeta ? SpanLoading : "Seleccionar Carpeta"}
                        className={classNames({ "p-invalid": errors.carpeta })}
                        onNodeExpand={(e) => onExpand(e, 1)}
                        onNodeCollapse={(e) => onNodeCollapse(e, 1)}
                        onNodeSelect={(e) =>
                            setValue("ruta", findNodePath(listCarpetas, e.node.key).join("/"), {
                                shouldValidate: true,
                            })
                        }
                        disabled={loadings.carpeta}
                        {...register("carpeta")}
                    />
                    <div className={classNames({ "p-error": errors.carpeta })}>
                        {errors.carpeta?.message}
                    </div>
                </div>
                <div className="col-12">
                    <Button className="p-button-info" label="Guardar Cambios" loading={loading} />
                </div>
            </div>
        </form>
    );
};


