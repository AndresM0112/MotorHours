import httpCliente from "../services/httpCliente";

export const getAllPilotosAPI = () => {
  return new Promise((resolve, reject) => {
    httpCliente
      .get("api/management/pilotos/all")
      .then((response) => resolve(response))
      .catch((error) => reject(error));
  });
};

export const getPilotosDropdownAPI = (filters = {}) => {
  return new Promise((resolve, reject) => {
    httpCliente
      .get("api/management/pilotos/dropdown", { params: filters })
      .then((response) => resolve(response))
      .catch((error) => reject(error));
  });
};

export const getPilotoByIdAPI = (id) => {
  return new Promise((resolve, reject) => {
    httpCliente
      .get(`api/management/pilotos/${id}`)
      .then((response) => resolve(response))
      .catch((error) => reject(error));
  });
};

export const paginatePilotosAPI = (params) => {
  return new Promise((resolve, reject) => {
    httpCliente
      .post("api/management/pilotos/paginate", params)
      .then((response) => resolve(response))
      .catch((error) => reject(error));
  });
};

export const savePilotoAPI = (params) => {
  return new Promise((resolve, reject) => {
    httpCliente
      .post("api/management/pilotos/save", params)
      .then((response) => resolve(response))
      .catch((error) => reject(error));
  });
};

export const deletePilotoAPI = (params) => {
  return new Promise((resolve, reject) => {
    httpCliente
      .post("api/management/pilotos/delete", params)
      .then((response) => resolve(response))
      .catch((error) => reject(error));
  });
};
