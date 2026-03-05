import httpCliente from "../services/httpCliente";

/* ============================
   BLOQUES
   ============================ */

export const getAllBlocksAPI = () => {
  return new Promise((resolve, reject) => {
    httpCliente
      .get("api/management/blocks/all")
      .then((response) => resolve(response))
      .catch((error) => reject(error));
  });
};

export const getBlockByIdAPI = (id) => {
  return new Promise((resolve, reject) => {
    httpCliente
      .get(`api/management/blocks/${id}`)
      .then((response) => resolve(response))
      .catch((error) => reject(error));
  });
};

export const paginateBlocksAPI = (params) => {
  return new Promise((resolve, reject) => {
    httpCliente
      .post("api/management/blocks/paginate", params)
      .then((response) => resolve(response))
      .catch((error) => reject(error));
  });
};

export const saveBlockAPI = (params) => {
  return new Promise((resolve, reject) => {
    httpCliente
      .post("api/management/blocks/save", params)
      .then((response) => resolve(response))
      .catch((error) => reject(error));
  });
};

export const deleteBlocksAPI = (params) => {
  return new Promise((resolve, reject) => {
    httpCliente
      .post("api/management/blocks/delete", params)
      .then((response) => resolve(response))
      .catch((error) => reject(error));
  });
};

/* ============================
   LOCALES (antes “etapas”)
   ============================ */

   
export const getLocalesAPI = () => {
  return new Promise((resolve, reject) => {
    httpCliente
      .get(`api/management/blocks/locales/all`)
      .then((response) => resolve(response))
      .catch((error) => reject(error));
  });
};

export const getLocalesByBlockAPI = (bloId) => {
  return new Promise((resolve, reject) => {
    httpCliente
      .get(`api/management/blocks/${bloId}/locales`)
      .then((response) => resolve(response))
      .catch((error) => reject(error));
  });
};

export const createLocalAPI = (params) => {
  return new Promise((resolve, reject) => {
    httpCliente
      .post("api/management/blocks/locales", params)
      .then((response) => resolve(response))
      .catch((error) => reject(error));
  });
};

export const updateLocalAPI = (id, params) => {
  return new Promise((resolve, reject) => {
    httpCliente
      .put(`api/management/blocks/locales/${id}`, params)
      .then((response) => resolve(response))
      .catch((error) => reject(error));
  });
};



// Después: acepta el body { usuarioActualiza }
export const deleteLocalAPI = (id, body) => {
  return new Promise((resolve, reject) => {
    httpCliente
      .delete(`api/management/blocks/locales/${id}`, { data: body })
      .then((response) => resolve(response))
      .catch((error) => reject(error));
  });
};

/* ============================
   PROPIETARIOS / ENCARGADOS DE LOCAL
   ============================ */

export const getPropietariosAPI = (locId) => {
  return new Promise((resolve, reject) => {
    httpCliente
      .get(`api/management/blocks/locales/${locId}/propietarios`)
      .then((response) => resolve(response))
      .catch((error) => reject(error));
  });
};

export const setPropietariosAPI = (locId, payload) => {
  return new Promise((resolve, reject) => {
    httpCliente
      .put(`api/management/blocks/locales/${locId}/propietarios`, payload)
      .then((response) => resolve(response))
      .catch((error) => reject(error));
  });
};

/* ============================
   CONSULTAS POR CLIENTE
   ============================ */

export const getBlocksByClientAPI = (clientId) => {
  return new Promise((resolve, reject) => {
    httpCliente
      .get(`api/management/blocks/clients/${clientId}/blocks`)
      .then((response) => resolve(response))
      .catch((error) => reject(error));
  });
};

export const getLocalesByBlockAndClientAPI = ({ bloId, clientId }) => {
  return new Promise((resolve, reject) => {
    const q = clientId ? `?clientId=${clientId}` : "";
    httpCliente
      .get(`api/management/blocks/${bloId}/locales/by-client${q}`)
      .then((response) => resolve(response))
      .catch((error) => reject(error));
  });
};

// API para clientes (para el dropdown)
export const getClientsAPI = (params = {}) => {
  return new Promise((resolve, reject) => {
    httpCliente
      .get("api/security/users/get_clients", { params }) // <-- AQUÍ VA { params }
      .then((response) => resolve(response))
      .catch((error) => reject(error));
  });
};

/* ============================
   IMPORTACIÓN UNIFICADA
   ============================ */

// JSON: rows [{bloCodigo?, bloNombre*, locCodigo?, locNombre*, descripcion?, owners?:[...] }], usuario opcional
export const importPropertiesAPI = ({ rows = [], usuario = null }) => {
  return new Promise((resolve, reject) => {
    httpCliente
      .post("api/management/blocks/import_properties", { rows, usuario })
      .then((response) => resolve(response))
      .catch((error) => reject(error));
  });
};

// Excel (multipart): file = File/Blob (campo "file" o "archivo")
export const importPropertiesExcelAPI = ({ file, usuario = null }) => {
  const form = new FormData();
  // el backend acepta req.files.file || req.files.archivo
  form.append("file", file);
  if (usuario !== null) form.append("usuario", usuario);

  return new Promise((resolve, reject) => {
    httpCliente
      .post("api/management/blocks/import_properties_excel", form, {
        headers: { "Content-Type": "multipart/form-data" },
      })
      .then((response) => resolve(response))
      .catch((error) => reject(error));
  });
};
