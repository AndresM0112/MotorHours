import axios from "axios";

const instance = axios.create();
instance.CancelToken = axios.CancelToken;
instance.isCancel = axios.isCancel;

export const loginAPI = (usuario, clave) => {
    return new Promise((resolve, reject) => {
        instance
            .post("api/auth/login", { usuario, clave })
            .then((response) => {
                resolve(response);
            })
            .catch((error) => {
                reject(error);
            });
    });
};

export const registerAPI = (params) => {
    return new Promise((resolve, reject) => {
        instance
            .post("api/auth/register", params)
            .then((response) => {
                resolve(response);
            })
            .catch((error) => {
                reject(error);
            });
    });
};

export const resendOtpAPI = (params) => {
    return new Promise((resolve, reject) => {
        instance
            .post("api/auth/resend-otp", params)
            .then((response) => {
                resolve(response);
            })
            .catch((error) => {
                reject(error);
            });
    });
};

export const verifyOtpAPI = (params) => {
    return new Promise((resolve, reject) => {
        instance
            .post("api/auth/verify-otp", params)
            .then((response) => {
                resolve(response);
            })
            .catch((error) => {
                reject(error);
            });
    });
};

export const restorePasswordsUsersAPI = (params) => {
    return new Promise((resolve, reject) => {
        instance
            .post(`api/mails/restore_credentials_access`, params)
            .then((response) => {
                resolve(response);
            })
            .catch((error) => {
                reject(error);
            });
    });
};

export const validateCodePasswordAPI = (params) => {
    return new Promise((resolve, reject) => {
        instance
            .post(`api/auth/validate_code_password`, params)
            .then((response) => {
                resolve(response);
            })
            .catch((error) => {
                reject(error);
            });
    });
};

export const restorePasswordAPI = (params) => {
    return new Promise((resolve, reject) => {
        instance
            .post(`api/auth/restore_password`, params)
            .then((response) => {
                resolve(response);
            })
            .catch((error) => {
                reject(error);
            });
    });
};
