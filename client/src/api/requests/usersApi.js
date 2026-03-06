import Cookies from "js-cookie";
import httpCliente from "../services/httpCliente";
import axios from "axios";

const instance = axios.create({ baseURL: process.env.REACT_APP_API_URL || "" });
instance.CancelToken = axios.CancelToken;
instance.isCancel = axios.isCancel;

export const getClientsApi = (params) => {
    return new Promise((resolve, reject) => {
        httpCliente
            .get(`api/security/users/get_clients`, params)
            .then((response) => {
                resolve(response);
            })
            .catch((error) => {
                reject(error);
            });
    });
};

export const getUsersApi = (params) => {
    return new Promise((resolve, reject) => {
        httpCliente
            .get(`api/security/users/get_users`, params)
            .then((response) => {
                resolve(response);
            })
            .catch((error) => {
                reject(error);
            });
    });
};

export const getUserByIdApi = (usuId) => {
    return new Promise((resolve, reject) => {
        httpCliente
            .get(`api/security/users/get_user_by_id/${usuId}`)
            .then((response) => {
                resolve(response);
            })
            .catch((error) => {
                reject(error);
            });
    });
};

export const getUserByPermisionAPI = (params) => {
    return new Promise((resolve, reject) => {
        httpCliente
            .post("api/security/users/get_users_permision", params)
            .then((response) => {
                resolve(response);
            })
            .catch((error) => {
                reject(error);
            });
    });
};

export const getInstructorsAPI = (params) => {
    return new Promise((resolve, reject) => {
        httpCliente
            .post("api/security/users/get_instructors", params)
            .then((response) => {
                resolve(response);
            })
            .catch((error) => {
                reject(error);
            });
    });
};

export const countUsersAPI = (params) => {
    return new Promise((resolve, reject) => {
        httpCliente
            .get("api/security/users/count_users", params)
            .then((response) => {
                resolve(response);
            })
            .catch((error) => {
                reject(error);
            });
    });
};

export const paginationUsersAPI = (params) => {
    return new Promise((resolve, reject) => {
        httpCliente
            .post("api/security/users/list_users", params)
            .then((response) => {
                resolve(response);
            })
            .catch((error) => {
                reject(error);
            });
    });
};

export const deleteUserAPI = (params) => {
    return new Promise((resolve, reject) => {
        httpCliente
            .put("api/security/users/delete_user", params)
            .then((response) => {
                resolve(response);
            })
            .catch((error) => {
                reject(error);
            });
    });
};

export const saveUserAPI = (params) => {
    return new Promise((resolve, reject) => {
        httpCliente
            .post("api/security/users/save_user", params)
            .then((response) => {
                resolve(response);
            })
            .catch((error) => {
                reject(error);
            });
    });
};

export const saveUserProfileAPI = (params) => {
    return new Promise((resolve, reject) => {
        httpCliente
            .post("api/security/users/save_user", params, {})
            .then((response) => {
                resolve(response);
            })
            .catch((error) => {
                reject(error);
            });
    });
};

export const updateUserPhotoAPI = (params) => {
    return new Promise((resolve, reject) => {
        httpCliente
            .post("api/security/users/update_user_photo", params)
            .then((response) => {
                resolve(response);
            })
            .catch((error) => {
                reject(error);
            });
    });
};

export const updateUserPermissionsAPI = (params) => {
    return new Promise((resolve, reject) => {
        httpCliente
            .post("api/security/permissions/update_permissions_user", params)
            .then((response) => resolve(response))
            .catch((error) => reject(error));
    });
};

export const saveNewnessUserAPI = (params) => {
    return new Promise((resolve, reject) => {
        httpCliente
            .post("api/security/users/save_newness_user", params)
            .then((response) => {
                resolve(response);
            })
            .catch((error) => {
                reject(error);
            });
    });
};
export const deleteNewnessUserAPI = (params) => {
    return new Promise((resolve, reject) => {
        httpCliente
            .post("api/security/users/delete_newness_user", params)
            .then((response) => {
                resolve(response);
            })
            .catch((error) => {
                reject(error);
            });
    });
};

export const getNewnessUserAPI = (params) => {
    return new Promise((resolve, reject) => {
        httpCliente
            .post("api/security/users/get_newness_user", params)
            .then((response) => {
                resolve(response);
            })
            .catch((error) => {
                reject(error);
            });
    });
};

export const importEmployeesAPI = (params) => {
    return new Promise((resolve, reject) => {
        httpCliente
            .post("api/security/users/import_employees", params)
            .then((response) => {
                resolve(response);
            })
            .catch((error) => {
                reject(error);
            });
    });
};

export const getPayrollEmployeesAPI = (nomId) => {
    return new Promise((resolve, reject) => {
        httpCliente
            .post(`api/security/users/employees-payroll`, { nomId })
            .then((response) => resolve(response))
            .catch((error) => reject(error));
    });
};
