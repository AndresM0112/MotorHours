import httpCliente from "../services/httpCliente";

export const getAllMotosAPI = () => {
  return new Promise((resolve, reject) => {
    httpCliente
      .get("api/management/motos/all")
      .then((response) => resolve(response))
      .catch((error) => reject(error));
  });
};

export const getMotosDropdownAPI = (filters = {}) => {
  return new Promise((resolve, reject) => {
    httpCliente
      .get("api/management/motos/dropdown", { params: filters })
      .then((response) => resolve(response))
      .catch((error) => reject(error));
  });
};

export const getMotoByIdAPI = (id) => {
  return new Promise((resolve, reject) => {
    httpCliente
      .get(`api/management/motos/${id}`)
      .then((response) => resolve(response))
      .catch((error) => reject(error));
  });
};

export const paginateMotosAPI = (params) => {
  return new Promise((resolve, reject) => {
    httpCliente
      .post("api/management/motos/paginate", params)
      .then((response) => resolve(response))
      .catch((error) => reject(error));
  });
};

export const saveMotoAPI = (params) => {
  return new Promise((resolve, reject) => {
    httpCliente
      .post("api/management/motos/save", params)
      .then((response) => resolve(response))
      .catch((error) => reject(error));
  });
};

export const deleteMotoAPI = (params) => {
  return new Promise((resolve, reject) => {
    httpCliente
      .post("api/management/motos/delete", params)
      .then((response) => resolve(response))
      .catch((error) => reject(error));
  });
};
