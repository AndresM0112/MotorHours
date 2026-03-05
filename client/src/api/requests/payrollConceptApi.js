import httpCliente from "../services/httpCliente";

export const getAllAPI = () => {
    return new Promise((resolve, reject) => {
        httpCliente
            .get("api/management-refunds/payroll-concept/all")
            .then((response) => {
                resolve(response);
            })
            .catch((error) => {
                reject(error);
            });
    });
};

export const getByIdAPI = (tirId) => {
    return new Promise((resolve, reject) => {
        httpCliente
            .get(`api/management-refunds/payroll-concept/get-by-id/${tirId}`)
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
            .post("api/management-refunds/payroll-concept/pagination", params)
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
            .post("api/management-refunds/payroll-concept/save", params)
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
            .post("api/management-refunds/payroll-concept/delete", params)
            .then((response) => {
                resolve(response);
            })
            .catch((error) => {
                reject(error);
            });
    });
};
