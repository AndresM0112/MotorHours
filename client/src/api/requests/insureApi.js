import httpCliente from "../services/httpCliente";

export const getAllAPI = () => {
    return new Promise((resolve, reject) => {
        httpCliente
            .get("api/management-refunds/insurer/all")
            .then((response) => {
                resolve(response);
            })
            .catch((error) => {
                reject(error);
            });
    });
};

export const getByIdAPI = (tiaId) => {
    return new Promise((resolve, reject) => {
        httpCliente
            .get(`api/management-refunds/insurer/get-by-id/${tiaId}`)
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
            .post("api/management-refunds/insurer/pagination", params)
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
            .post("api/management-refunds/insurer/save", params)
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
            .post("api/management-refunds/insurer/delete", params)
            .then((response) => {
                resolve(response);
            })
            .catch((error) => {
                reject(error);
            });
    });
};
