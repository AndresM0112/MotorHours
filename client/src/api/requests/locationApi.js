import httpCliente from "../services/httpCliente";

export const getAllLocationAPI = () => {
  return new Promise((resolve, reject) => {
    httpCliente
      .get("api/management/location/all")
      .then((response) => resolve(response))
      .catch((error) => reject(error));
  });
};

export const getUbicacionesAPI = () => {
  return new Promise((resolve, reject) => {
    httpCliente
      .get("api/management/location/ubicaciones")
      .then((response) => resolve(response))
      .catch((error) => reject(error));
  });
};

export const getLocationByIdAPI = (id) => {
  return new Promise((resolve, reject) => {
    httpCliente
      .get(`api/management/location/${id}`)
      .then((response) => resolve(response))
      .catch((error) => reject(error));
  });
};

export const paginateLocationAPI = (params) => {
  return new Promise((resolve, reject) => {
    httpCliente
      .post("api/management/location/paginate", params)
      .then((response) => resolve(response))
      .catch((error) => reject(error));
  });
};

export const saveLocationAPI = (params) => {
  return new Promise((resolve, reject) => {
    httpCliente
      .post("api/management/location/save", params)
      .then((response) => resolve(response))
      .catch((error) => reject(error));
  });
};

export const deleteLocationAPI = (params) => {
  return new Promise((resolve, reject) => {
    httpCliente
      .post("api/management/location/delete", params)
      .then((response) => resolve(response))
      .catch((error) => reject(error));
  });
};
