import httpCliente from "../services/httpCliente";

export const getAllAPI = () => {
    return new Promise((resolve, reject) => {
        httpCliente
            .get("api/management-refunds/management/all")
            .then((response) => {
                resolve(response);
            })
            .catch((error) => {
                reject(error);
            });
    });
};

export const getByIdAPI = (gerId) => {
    return new Promise((resolve, reject) => {
        httpCliente
            .get(`api/management-refunds/management/get-by-id/${gerId}`)
            .then((response) => {
                resolve(response);
            })
            .catch((error) => {
                reject(error);
            });
    });
};

export const paginationAPI = (params) => {
    return new Promise((resolve, reject) => {
        httpCliente
            .post("api/management-refunds/management/pagination", params)
            .then((response) => {
                resolve(response);
            })
            .catch((error) => {
                reject(error);
            });
    });
};

export const saveAPI = (params) => {
    return new Promise((resolve, reject) => {
        httpCliente
            .post("api/management-refunds/management/save", params)
            .then((response) => {
                resolve(response);
            })
            .catch((error) => {
                reject(error);
            });
    });
};

export const deleteAPI = (params) => {
    return new Promise((resolve, reject) => {
        httpCliente
            .post("api/management-refunds/management/delete", params)
            .then((response) => {
                resolve(response);
            })
            .catch((error) => {
                reject(error);
            });
    });
};
