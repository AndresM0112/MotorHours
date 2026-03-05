import httpCliente from "../services/httpCliente";

export const getAllAPI = () => {
    return new Promise((resolve, reject) => {
        httpCliente
            .get("api/management-refunds/payroll-concept-type/all")
            .then((response) => {
                resolve(response);
            })
            .catch((error) => {
                reject(error);
            });
    });
};

export const getByIdAPI = (nanId) => {
    return new Promise((resolve, reject) => {
        httpCliente
            .get(`api/management-refunds/payroll-concept-type/get-by-id/${nanId}`)
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
            .post("api/management-refunds/payroll-concept-type/pagination", params)
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
            .post("api/management-refunds/payroll-concept-type/save", params)
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
            .post("api/management-refunds/payroll-concept-type/delete", params)
            .then((response) => {
                resolve(response);
            })
            .catch((error) => {
                reject(error);
            });
    });
};
