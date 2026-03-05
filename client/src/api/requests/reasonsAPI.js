import httpCliente from "../services/httpCliente";

export const paginationReasonsApi = (params) => {
    return new Promise((resolve, reject) => {
        httpCliente
            .post(`api/management/reasons/pagination_reasons`, params)
            .then((response) => {
                resolve(response);
            })
            .catch((error) => {
                reject(error);
            });
    });
};

export const saveReasonApi = (params) => {
    return new Promise((resolve, reject) => {
        httpCliente
            .post(`api/management/reasons/save_reason`, params)
            .then((response) => {
                resolve(response);
            })
            .catch((error) => {
                reject(error);
            });
    });
};

export const deleteReasonApi = (params) => {
    return new Promise((resolve, reject) => {
        httpCliente
            .put(`api/management/reasons/delete_reason`, params)
            .then((response) => {
                resolve(response);
            })
            .catch((error) => {
                reject(error);
            });
    });
};

export const updateModulesReasonApi = (params) => {
    return new Promise((resolve, reject) => {
        httpCliente
            .put(`api/management/reasons/update_modules_reason`, params)
            .then((response) => {
                resolve(response);
            })
            .catch((error) => {
                reject(error);
            });
    });
};

export const getReasonsApi = (params) => {
    return new Promise((resolve, reject) => {
        httpCliente
            .get(`api/management/reasons/get_reasons`, params)
            .then((response) => {
                resolve(response);
            })
            .catch((error) => {
                reject(error);
            });
    });
};
