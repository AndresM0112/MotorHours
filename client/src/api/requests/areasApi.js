import httpCliente from "../services/httpCliente";

export const getAllAreasByProjectApi = (projectId) => {
    return new Promise((resolve, reject) => {
        httpCliente
            .get(`api/management/areas/all-by-project/${projectId}`)
            .then((response) => {
                resolve(response);
            })
            .catch((error) => {
                reject(error);
            });
    });
};

export const getAllAreasAPI = () => {
    return new Promise((resolve, reject) => {
        httpCliente
            .get("api/management/areas/all")
            .then((response) => {
                resolve(response);
            })
            .catch((error) => {
                reject(error);
            });
    });
};

export const getAreaByIdAPI = (id) => {
    return new Promise((resolve, reject) => {
        httpCliente
            .get(`api/management/areas/${id}`)
            .then((response) => {
                resolve(response);
            })
            .catch((error) => {
                reject(error);
            });
    });
};

export const paginationAreasAPI = (params) => {
    return new Promise((resolve, reject) => {
        httpCliente
            .post("api/management/areas/paginate", params)
            .then((response) => {
                resolve(response);
            })
            .catch((error) => {
                reject(error);
            });
    });
};

export const saveAreaAPI = (params) => {
    return new Promise((resolve, reject) => {
        httpCliente
            .post("api/management/areas/save", params)
            .then((response) => {
                resolve(response);
            })
            .catch((error) => {
                reject(error);
            });
    });
};

export const deleteAreasAPI = (params) => {
    return new Promise((resolve, reject) => {
        httpCliente
            .post("api/management/areas/delete", params)
            .then((response) => {
                resolve(response);
            })
            .catch((error) => {
                reject(error);
            });
    });
};

export const getAreasManagersByIdAPI = (ids) => {
    return new Promise((resolve, reject) => {
        httpCliente
            .post(`api/management/areas/getAllManagerByIdAreas`, { ids })
            .then((response) => {
                resolve(response);
            })
            .catch((error) => {
                reject(error);
            });
    });
};

//  api/management/areas/getAllManagerByIdAreas`, { ids: id }

export const getAreasWithEncargadosAPI = (params) => {
    return new Promise((resolve, reject) => {
        httpCliente
            .post(`api/management/areas/getAreasWithEncargados`, params)
            .then((response) => resolve(response))
            .catch((error) => reject(error));
    });
};
