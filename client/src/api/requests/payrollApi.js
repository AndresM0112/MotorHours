import httpCliente from "../services/httpCliente";

export const getAllPayrollAPI = () => {
    return new Promise((resolve, reject) => {
        httpCliente
            .get("api/management-refunds/payroll/all")
            .then((response) => resolve(response))
            .catch((error) => reject(error));
    });
};

export const getPayrollByIdAPI = (nomId) => {
    return new Promise((resolve, reject) => {
        httpCliente
            .get(`api/management-refunds/payroll/${nomId}`)
            .then((response) => resolve(response))
            .catch((error) => reject(error));
    });
};

export const paginatePayrollAPI = (params) => {
    return new Promise((resolve, reject) => {
        httpCliente
            .post("api/management-refunds/payroll/paginate", params)
            .then((response) => resolve(response))
            .catch((error) => reject(error));
    });
};

export const savePayrollAPI = (payload) => {
    return new Promise((resolve, reject) => {
        httpCliente
            .post("api/management-refunds/payroll/save", payload)
            .then((response) => resolve(response))
            .catch((error) => reject(error));
    });
};

export const deletePayrollAPI = (payload) => {
    return new Promise((resolve, reject) => {
        httpCliente
            .post("api/management-refunds/payroll/delete", payload)
            .then((response) => resolve(response))
            .catch((error) => reject(error));
    });
};

export const importPayrollAPI = (payload) => {
    return new Promise((resolve, reject) => {
        httpCliente
            .post("api/management-refunds/payroll/import/payroll", payload)
            .then((response) => resolve(response))
            .catch((error) => reject(error));
    });
};

export const importBudgetAPI = (file) => {
    const formData = new FormData();
    formData.append("file", file);

    return new Promise((resolve, reject) => {
        httpCliente
            .post("api/management-refunds/payroll/import/budget", formData, {
                headers: { "Content-Type": "multipart/form-data" },
            })
            .then((response) => resolve(response))
            .catch((error) => reject(error));
    });
};

export const getBudgetExecutionAPI = ({ anio, mes, proId }) => {
    return new Promise((resolve, reject) => {
        httpCliente
            .get("api/management-refunds/payroll/execution", {
                params: { anio, mes, proId },
            })
            .then((response) => resolve(response))
            .catch((error) => reject(error));
    });
};

export const getPayrollHeaderAPI = ({ nomId }) => {
    return new Promise((resolve, reject) => {
        httpCliente
            .get(`api/management-refunds/payroll/header/${nomId}`)
            .then(resolve)
            .catch(reject);
    });
};

export const savePayrollHeaderAPI = (payload) => {
    return new Promise((resolve, reject) => {
        httpCliente
            .post("api/management-refunds/payroll/header/save", payload)
            .then(resolve)
            .catch(reject);
    });
};

export const paginatePayrollDetailAPI = (params) => {
    return new Promise((resolve, reject) => {
        httpCliente
            .post("api/management-refunds/payroll/detail/paginate", params)
            .then(resolve)
            .catch(reject);
    });
};

export const upsertPayrollDetailAPI = (payload) => {
    return new Promise((resolve, reject) => {
        httpCliente
            .post("api/management-refunds/payroll/detail/save", payload)
            .then(resolve)
            .catch(reject);
    });
};

export const deletePayrollDetailAPI = (payload) => {
    return new Promise((resolve, reject) => {
        httpCliente
            .post("api/management-refunds/payroll/detail/delete", payload)
            .then(resolve)
            .catch(reject);
    });
};

export const paginatePayrollBudgetAPI = (params) => {
    return new Promise((resolve, reject) => {
        httpCliente
            .post("api/management-refunds/payroll/budget/paginate", params)
            .then(resolve)
            .catch(reject);
    });
};

export const upsertPayrollBudgetAPI = (payload) => {
    return new Promise((resolve, reject) => {
        httpCliente
            .post("api/management-refunds/payroll/budget/save", payload)
            .then(resolve)
            .catch(reject);
    });
};

export const deletePayrollBudgetAPI = (payload) => {
    return new Promise((resolve, reject) => {
        httpCliente
            .post("api/management-refunds/payroll/budget/delete", payload)
            .then(resolve)
            .catch(reject);
    });
};

export const deleteAllPayrollDataAPI = (payload) => {
    return new Promise((resolve, reject) => {
        httpCliente
            .post("api/management-refunds/payroll/data/delete-all", payload)
            .then(resolve)
            .catch(reject);
    });
};

export const getPayrollEmployeeReportAPI = ({ nomId, tirId = null }) => {
    return new Promise((resolve, reject) => {
        const url = tirId
            ? `api/management-refunds/payroll/report/employee/${nomId}?tirId=${tirId}`
            : `api/management-refunds/payroll/report/employee/${nomId}`;

        httpCliente
            .get(url)
            .then(resolve)
            .catch(reject);
    });
};

export const upsertPayrollEmployeesAPI = (nomId, payload) => {
    return new Promise((resolve, reject) => {
        httpCliente
            .post(`api/management-refunds/payroll/employees/upsert/${nomId}`, payload)
            .then(resolve)
            .catch(reject);
    });
};

export const getPayrollMatrixAPI = (nomId) => {
    return new Promise((resolve, reject) => {
        httpCliente
            .get(`api/management-refunds/payroll/matrix/${nomId}`)
            .then(resolve)
            .catch(reject);
    });
};
