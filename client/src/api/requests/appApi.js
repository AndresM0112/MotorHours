import httpCliente from "../services/httpCliente";

export const validateTokenAPI = () => {
    return new Promise((resolve, reject) => {
        httpCliente
            .get("api/app/verify_token")
            .then((response) => {
                resolve(response);
            })
            .catch((error) => {
                reject(error);
            });
    });
};

export const getRulesAPI = (params) => {
    return new Promise((resolve, reject) => {
        httpCliente
            .get(`api/app/get_rules`, params)
            .then((response) => {
                resolve(response);
            })
            .catch((error) => {
                reject(error);
            });
    });
};

export const getMenuAPI = (params) => {
    return new Promise((resolve, reject) => {
        httpCliente
            .get("api/app/get_menu", params)
            .then((response) => {
                resolve(response);
            })
            .catch((error) => {
                reject(error);
            });
    });
};

export const getModulesApi = () => {
    return new Promise((resolve, reject) => {
        httpCliente
            .get(`api/app/get_modules`)
            .then((response) => {
                resolve(response);
            })
            .catch((error) => {
                reject(error);
            });
    });
};
