import httpCliente from "../services/httpCliente";

export const getAllAPI = () => {
    return new Promise((resolve, reject) => {
        httpCliente
            .get("api/management-refunds/position/all")
            .then((response) => {
                resolve(response);
            })
            .catch((error) => {
                reject(error);
            });
    });
};

export const getByIdAPI = (carId) => {
    return new Promise((resolve, reject) => {
        httpCliente
            .get(`api/management-refunds/position/get-by-id/${carId}`)
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
            .post("api/management-refunds/position/pagination", params)
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
            .post("api/management-refunds/position/save", params)
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
            .post("api/management-refunds/position/delete", params)
            .then((response) => {
                resolve(response);
            })
            .catch((error) => {
                reject(error);
            });
    });
};
