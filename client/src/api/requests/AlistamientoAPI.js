import httpCliente from "../services/httpCliente";

export const getAllAlistamientosAPI = () => {
  return new Promise((resolve, reject) => {
    httpCliente
      .get("api/management/alistamientos/all")
      .then((response) => resolve(response))
      .catch((error) => reject(error));
  });
};

export const getAlistamientosDropdownAPI = (filters = {}) => {
  return new Promise((resolve, reject) => {
    httpCliente
      .get("api/management/alistamientos/dropdown", { params: filters })
      .then((response) => resolve(response))
      .catch((error) => reject(error));
  });
};

export const getAlistamientoByIdAPI = (id) => {
  return new Promise((resolve, reject) => {
    httpCliente
      .get(`api/management/alistamientos/${id}`)
      .then((response) => resolve(response))
      .catch((error) => reject(error));
  });
};

export const paginateAlistamientosAPI = (params) => {
  return new Promise((resolve, reject) => {
    httpCliente
      .post("api/management/alistamientos/paginate", params)
      .then((response) => resolve(response))
      .catch((error) => reject(error));
  });
};

export const saveAlistamientoAPI = (params) => {
  return new Promise((resolve, reject) => {
    httpCliente
      .post("api/management/alistamientos/save", params)
      .then((response) => resolve(response))
      .catch((error) => reject(error));
  });
};

export const deleteAlistamientoAPI = (params) => {
  return new Promise((resolve, reject) => {
    httpCliente
      .post("api/management/alistamientos/delete", params)
      .then((response) => resolve(response))
      .catch((error) => reject(error));
  });
};
