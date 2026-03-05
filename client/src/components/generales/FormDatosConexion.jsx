// import React, { useContext, useState } from "react";
// import { AuthContext } from "@context/auth/AuthContext";
// import { ToastContext } from "@context/toast/ToastContext";
// // PRIMEREACT
// import { Button } from "primereact/button";
// import { InputText } from "primereact/inputtext";
// import { classNames } from "primereact/utils";
// // OTROS
// import { useForm } from "react-hook-form";
// import Axios from "axios";
// // UTILS
// import { headers } from "@utils/converAndConst";
// import Cookies from "js-cookie";

// export const FormDatosConexion = ({ dataForm, setDataForm }) => {
//     const { nombreusuario } = useContext(AuthContext);
//     const { showSuccess, showError, showInfo } = useContext(ToastContext);
//     const [loading, setLoading] = useState(false);

//     const {
//         register,
//         handleSubmit,
//         formState: { errors },
//     } = useForm({
//         defaultValues: {
//             tenantId: dataForm?.tenantId || "",
//             clientId: dataForm?.clientId || "",
//             clientSecret: dataForm?.clientSecret || "",
//         },
//     });

//     const modifyMicrosoftCredentials = async ({ tenantId, clientId, clientSecret }) => {
//         setLoading(true);
//         if (
//             tenantId === dataForm.tenantId &&
//             clientId === dataForm.clientId &&
//             clientSecret === dataForm.clientSecret
//         ) {
//             return showInfo("No has realizado ninguna modificación");
//         }

//         try {
//             const params = { tenantId, clientId, clientSecret, usuario: nombreusuario };

//             const { data } = await Axios.put("api/modify_microsoft_credentials", params, {
//                 headers: {
//                     ...headers,
//                     Authorization: `Bearer ${Cookies.get("tokenMOTORHOURS")}`,
//                 },
//             });
//             showSuccess(data.message);
//             setDataForm((prev) => ({ ...prev, tenantId, clientId, clientSecret }));
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
//         <form onSubmit={handleSubmit(modifyMicrosoftCredentials)}>
//             <div className="grid p-fluid">
//                 <div className="col-12">
//                     <label>Tenant Id:</label>
//                     <InputText
//                         placeholder="Tenant Id"
//                         className={classNames({ "p-invalid": errors.tenantId })}
//                         {...register("tenantId", { required: "El campo tenant id es requerido" })}
//                     />
//                     <div className={classNames({ "p-error": errors.tenantId })}>
//                         {errors.tenantId?.message}
//                     </div>
//                 </div>
//                 <div className="col-12">
//                     <label>Client Id:</label>
//                     <InputText
//                         placeholder="Client Id"
//                         className={classNames({ "p-invalid": errors.clientId })}
//                         {...register("clientId", { required: "El campo client id es requerido" })}
//                     />
//                     <div className={classNames({ "p-error": errors.clientId })}>
//                         {errors.clientId?.message}
//                     </div>
//                 </div>
//                 <div className="col-12">
//                     <label>Client Secret:</label>
//                     <InputText
//                         placeholder="Client Secret"
//                         className={classNames({ "p-invalid": errors.clientSecret })}
//                         {...register("clientSecret", {
//                             required: "El campo client secret es requerido",
//                         })}
//                     />
//                     <div className={classNames({ "p-error": errors.clientSecret })}>
//                         {errors.clientSecret?.message}
//                     </div>
//                 </div>
//                 <div className="col-12">
//                     <Button className="p-button-info" label="Guardar Cambios" loading={loading} />
//                 </div>
//             </div>
//         </form>
//     );
// };

import React, { useContext, useState } from "react";
import { AuthContext } from "@context/auth/AuthContext";
import { ToastContext } from "@context/toast/ToastContext";
// PRIMEREACT
import { Button } from "primereact/button";
import { InputText } from "primereact/inputtext";
import { classNames } from "primereact/utils";
// OTROS
import { useForm } from "react-hook-form";
// UTILS
// import { putRulesAPI } from "@api/requests";

import { putRulesAPI } from "@api/requests/rulesApi";

export const FormDatosConexion = ({ dataForm, setDataForm }) => {
    const { nombreusuario } = useContext(AuthContext);
    const { showSuccess, showError, showInfo } = useContext(ToastContext);
    const [loading, setLoading] = useState(false);

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm({
        defaultValues: {
            tenantId: dataForm?.tenantId || "",
            clientId: dataForm?.clientId || "",
            clientSecret: dataForm?.clientSecret || "",
        },
    });

    const modifyMicrosoftCredentials = async ({ tenantId, clientId, clientSecret }) => {
        setLoading(true);
        if (
            tenantId === dataForm.tenantId &&
            clientId === dataForm.clientId &&
            clientSecret === dataForm.clientSecret
        ) {
            return showInfo("No has realizado ninguna modificación");
        }

        try {
            const params = { tenantId, clientId, clientSecret, usuario: nombreusuario };

            const { data } = await putRulesAPI(params);
            showSuccess(data.message);
            setDataForm((prev) => ({ ...prev, tenantId, clientId, clientSecret }));
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
        <form onSubmit={handleSubmit(modifyMicrosoftCredentials)}>
            <div className="grid p-fluid">
                <div className="col-12">
                    <label>Tenant Id:</label>
                    <InputText
                        placeholder="Tenant Id"
                        className={classNames({ "p-invalid": errors.tenantId })}
                        {...register("tenantId", { required: "El campo tenant id es requerido" })}
                    />
                    <div className={classNames({ "p-error": errors.tenantId })}>
                        {errors.tenantId?.message}
                    </div>
                </div>
                <div className="col-12">
                    <label>Client Id:</label>
                    <InputText
                        placeholder="Client Id"
                        className={classNames({ "p-invalid": errors.clientId })}
                        {...register("clientId", { required: "El campo client id es requerido" })}
                    />
                    <div className={classNames({ "p-error": errors.clientId })}>
                        {errors.clientId?.message}
                    </div>
                </div>
                <div className="col-12">
                    <label>Client Secret:</label>
                    <InputText
                        placeholder="Client Secret"
                        className={classNames({ "p-invalid": errors.clientSecret })}
                        {...register("clientSecret", {
                            required: "El campo client secret es requerido",
                        })}
                    />
                    <div className={classNames({ "p-error": errors.clientSecret })}>
                        {errors.clientSecret?.message}
                    </div>
                </div>
                <div className="col-12">
                    <Button className="p-button-info" label="Guardar Cambios" loading={loading} />
                </div>
            </div>
        </form>
    );
};
