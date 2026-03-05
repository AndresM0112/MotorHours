import httpCliente from "../services/httpCliente";

export const getAllServiciosAPI = () => {
  return new Promise((resolve, reject) => {
    httpCliente
      .get("api/management/servicios/all")
      .then((response) => resolve(response))
      .catch((error) => reject(error));
  });
};

export const getServiciosDropdownAPI = (filters = {}) => {
  return new Promise((resolve, reject) => {
    httpCliente
      .get("api/management/servicios/dropdown", { params: filters })
      .then((response) => resolve(response))
      .catch((error) => reject(error));
  });
};

export const getServicioByIdAPI = (id) => {
  return new Promise((resolve, reject) => {
    httpCliente
      .get(`api/management/servicios/${id}`)
      .then((response) => resolve(response))
      .catch((error) => reject(error));
  });
};

export const paginateServiciosAPI = (params) => {
  return new Promise((resolve, reject) => {
    httpCliente
      .post("api/management/servicios/paginate", params)
      .then((response) => resolve(response))
      .catch((error) => reject(error));
  });
};

export const saveServicioAPI = (params) => {
  return new Promise((resolve, reject) => {
    httpCliente
      .post("api/management/servicios/save", params)
      .then((response) => resolve(response))
      .catch((error) => reject(error));
  });
};

export const deleteServicioAPI = (params) => {
  return new Promise((resolve, reject) => {
    httpCliente
      .post("api/management/servicios/delete", params)
      .then((response) => resolve(response))
      .catch((error) => reject(error));
  });
};
