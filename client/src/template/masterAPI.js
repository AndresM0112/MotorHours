import httpCliente from "../services/httpCliente";

export const getMasterTemplateApi = () => {
    return new Promise((resolve, reject) => {
        httpCliente
            .get(`api/template/get_templates`)
            .then((response) => {
                resolve(response);
            })
            .catch((error) => {
                reject(error);
            });
    });
};

export const paginationMasterTemplateApi = (params) => {
    return new Promise((resolve, reject) => {
        httpCliente
            .post(`api/template/pagination_templates`, params)
            .then((response) => {
                resolve(response);
            })
            .catch((error) => {
                reject(error);
            });
    });
};

export const saveMasterTemplateApi = (params) => {
    return new Promise((resolve, reject) => {
        httpCliente
            .post(`api/template/save_template`, params)
            .then((response) => {
                resolve(response);
            })
            .catch((error) => {
                reject(error);
            });
    });
};

export const deleteMasterTemplateApi = (params) => {
    return new Promise((resolve, reject) => {
        httpCliente
            .put(`api/template/delete_template`, params)
            .then((response) => {
                resolve(response);
            })
            .catch((error) => {
                reject(error);
            });
    });
};
