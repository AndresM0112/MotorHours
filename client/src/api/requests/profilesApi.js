import httpCliente from "../services/httpCliente";

export const getProfilesAPI = () => {
    return new Promise((resolve, reject) => {
        httpCliente
            .get("api/app/get_profiles")
            .then((response) => {
                resolve(response);
            })
            .catch((error) => {
                reject(error);
            });
    });
};

export const paginationProfilesAPI = (params) => {
    return new Promise((resolve, reject) => {
        httpCliente
            .post("api/security/profiles/pagination_profiles", params)
            .then((response) => {
                resolve(response);
            })
            .catch((error) => {
                reject(error);
            });
    });
};

export const deleteProfileAPI = (params) => {
    return new Promise((resolve, reject) => {
        httpCliente
            .put("api/security/profiles/delete_profile", params)
            .then((response) => {
                resolve(response);
            })
            .catch((error) => {
                reject(error);
            });
    });
};

export const saveProfileAPI = (params) => {
    return new Promise((resolve, reject) => {
        httpCliente
            .post("api/security/profiles/save_profile", params)
            .then((response) => {
                resolve(response);
            })
            .catch((error) => {
                reject(error);
            });
    });
};

export const getModulesAPI = (prfId) => {
    return new Promise((resolve, reject) => {
        const params = {
            prfId,
        };
        httpCliente
            .get("api/security/profiles/get_modules", params)
            .then((response) => {
                resolve(response);
            })
            .catch((error) => {
                reject(error);
            });
    });
};
