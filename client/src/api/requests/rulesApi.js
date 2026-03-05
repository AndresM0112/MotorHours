import httpCliente from "../services/httpCliente";

export const getUserDriveAPI = () => {
    return new Promise((resolve, reject) => {
        httpCliente
            .get(`api/security/microsoft-graph/get_user_drive`)
            .then((response) => {
                resolve(response);
            })
            .catch((error) => {
                reject(error);
            });
    });
};

export const getSitesDriveAPI = () => {
    return new Promise((resolve, reject) => {
        httpCliente
            .get(`api/security/microsoft-graph/get_sites_drive`)
            .then((response) => {
                resolve(response);
            })
            .catch((error) => {
                reject(error);
            });
    });
};

export const getUnitsDriveAPI = (sitio) => {
    return new Promise((resolve, reject) => {
        httpCliente
            .get(`api/security/microsoft-graph/get_units_drive?sitio=${sitio}`)
            .then((response) => {
                resolve(response);
            })
            .catch((error) => {
                reject(error);
            });
    });
};

export const getFoldersDriveAPI = (params) => {
    const { sitio, biblioteca, carpeta } = params;
    return new Promise((resolve, reject) => {
        httpCliente
            .get(`api/security/microsoft-graph/get_folders_drive?sitio=${sitio}&biblioteca=${biblioteca}&carpeta=${carpeta}`)
            .then((response) => {
                resolve(response);
            })
            .catch((error) => {
                reject(error);
            });
    });
};

export const putStorageSiteAPI = (params) => {
    return new Promise((resolve, reject) => {
        httpCliente
            .put(`api/security/microsoft-graph/update_storage_site`, params)
            .then((response) => {
                resolve(response);
            })
            .catch((error) => {
                reject(error);
            });
    });
};

export const putRulesAPI = (params) => {
    return new Promise((resolve, reject) => {
        httpCliente
            .put(`api/app/update_rules`, params)
            .then((response) => {
                resolve(response);
            })
            .catch((error) => {
                reject(error);
            });
    });
};
