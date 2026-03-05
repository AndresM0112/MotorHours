import httpCliente from "../services/httpCliente";

// --- Gestión de Tickets ---

export const getAllTicketsAPI = () => {
    return new Promise((resolve, reject) => {
        httpCliente
            .get("api/tickets/all")
            .then((response) => {
                resolve(response);
            })
            .catch((error) => {
                reject(error);
            });
    });
};

export const getTicketByIdAPI = (id) => {
    return new Promise((resolve, reject) => {
        httpCliente
            .get(`api/tickets/getById/${id}`)
            .then((response) => {
                resolve(response);
            })
            .catch((error) => {
                reject(error);
            });
    });
};

export const getResumenPorEstadosAPI = () => {
    return new Promise((resolve, reject) => {
        httpCliente
            .get("api/tickets/resumen-estados")
            .then((response) => {
                resolve(response);
            })
            .catch((error) => {
                reject(error);
            });
    });
};

export const paginationTicketsAPI = (params) => {
    return new Promise((resolve, reject) => {
        httpCliente
            .post("api/tickets/paginate", params)
            .then((response) => {
                resolve(response);
            })
            .catch((error) => {
                reject(error);
            });
    });
};

export const saveTicketAPI = (data) => {
    return new Promise((resolve, reject) => {
        httpCliente
            .post("api/tickets/save", data)
            .then((response) => {
                resolve(response);
            })
            .catch((error) => {
                reject(error);
            });
    });
};

export const deleteTicketsAPI = (data) => {
    return new Promise((resolve, reject) => {
        httpCliente
            .post("api/tickets/delete", data)
            .then((response) => {
                resolve(response);
            })
            .catch((error) => {
                reject(error);
            });
    });
};

export const restoreTicketAPI = (id, usuarioId) => {
    return new Promise((resolve, reject) => {
        httpCliente
            .put(`api/tickets/restore/${id}`, { usuarioId })
            .then((response) => {
                resolve(response);
            })
            .catch((error) => {
                reject(error);
            });
    });
};

export const updateTicketEstadoAPI = (data) => {
    return new Promise((resolve, reject) => {
        httpCliente
            .put("api/tickets/estado", data)
            .then((response) => {
                resolve(response);
            })
            .catch((error) => {
                reject(error);
            });
    });
};

export const updateTicketResultadoAPI = (data) => {
    return new Promise((resolve, reject) => {
        httpCliente
            .put("api/tickets/resultado", data)
            .then((response) => {
                resolve(response);
            })
            .catch((error) => {
                reject(error);
            });
    });
};

export const countTicketsByEstadoAPI = () => {
    return new Promise((resolve, reject) => {
        httpCliente
            .get("api/tickets/count-by-estado")
            .then((response) => {
                resolve(response);
            })
            .catch((error) => {
                reject(error);
            });
    });
};

// --- Historial ---

export const getHistorialByTicketAPI = (tktId) => {
    return new Promise((resolve, reject) => {
        httpCliente
            .get(`api/tickets/historial/${tktId}`)
            .then((response) => {
                resolve(response);
            })
            .catch((error) => {
                reject(error);
            });
    });
};

export const addHistorialTicketAPI = (data) => {
    return new Promise((resolve, reject) => {
        httpCliente
            .post("api/tickets/historial", data)
            .then((response) => {
                resolve(response);
            })
            .catch((error) => {
                reject(error);
            });
    });
};

// --- Catálogos ---

export const getEstadosTicketsAPI = () => {
    return new Promise((resolve, reject) => {
        httpCliente
            .get("api/tickets/estados")
            .then((response) => {
                resolve(response);
            })
            .catch((error) => {
                reject(error);
            });
    });
};

export const getAccionesTicketsAPI = () => {
    return new Promise((resolve, reject) => {
        httpCliente
            .get("api/tickets/acciones")
            .then((response) => {
                resolve(response);
            })
            .catch((error) => {
                reject(error);
            });
    });
};

export const getResultadosTicketsAPI = () => {
    return new Promise((resolve, reject) => {
        httpCliente
            .get("api/tickets/resultados")
            .then((response) => {
                resolve(response);
            })
            .catch((error) => {
                reject(error);
            });
    });
};

export const getPrioridadesTicketsAPI = () => {
    return new Promise((resolve, reject) => {
        httpCliente
            .get("api/tickets/prioridades")
            .then((response) => {
                resolve(response);
            })
            .catch((error) => {
                reject(error);
            });
    });
};

// --- Asignación ---

export const asignarUsuariosATicketAPI = (tktId, usuarios) => {
    return new Promise((resolve, reject) => {
        httpCliente
            .post("api/tickets/asignar", { tktId, usuarios })
            .then((response) => {
                resolve(response);
            })
            .catch((error) => {
                reject(error);
            });
    });
};

export const getAsignadosByTicketAPI = (tktId, onlyActual = false) => {
    return new Promise((resolve, reject) => {
        httpCliente
            .get(`api/tickets/asignados/${tktId}?onlyActual=${onlyActual}`)
            .then((response) => {
                resolve(response);
            })
            .catch((error) => {
                reject(error);
            });
    });
};

export const reasignarTicketAPI = (tktId, nuevoUsuarioId) => {
    return new Promise((resolve, reject) => {
        httpCliente
            .post("api/tickets/reasignar", { tktId, nuevoUsuarioId })
            .then((response) => {
                resolve(response);
            })
            .catch((error) => {
                reject(error);
            });
    });
};



export const uploadTicketEvidenceAPI = (tktId, formData, onUploadProgress) => {
  return httpCliente.post(`api/tickets/evidencias/${tktId}`, formData, {
    // No fuerces Content-Type; el navegador setea el boundary
    onUploadProgress,
  });
};

export const deleteTicketEvidenceAPI = (tktId, { tipos = [], fileIds = [] }) => {
  return httpCliente.delete(`api/tickets/evidencias/${tktId}`, {
    data: { tipos, fileIds },
  });
};

export const getTicketEvidencesAPI = (tktId) =>
  httpCliente.get(`/api/tickets/${tktId}/evidencias`);


export const previewTicketEvidenceAPI = (fileId) =>
  httpCliente.get(`api/tickets/evidencias/${fileId}/preview`);

export const downloadTicketEvidenceAPI = (fileId) =>
  httpCliente.get(`api/tickets/evidencias/${fileId}/download`);


export const getPreviewForm = (params) => {
    return new Promise((resolve, reject) => {
        httpCliente
            .post("api/tickets/see_formulario", params, {
                responseType: "blob",
            })
            .then((response) => {
                resolve(response);
            })
            .catch((error) => {
                reject(error);
            });
    });
};

//   const form = new FormData();
//   form.append("file", file);           // 👈 debe llamarse "file"
//   form.append("tipo", String(tipo));   // 1 = INICIAL, 2 = FINAL

//   return new Promise((resolve, reject) => {
//     httpCliente
//       .post(`api/tickets/${tktId}/evidencias`, form, {
//         headers: { /* no pongas Content-Type, el browser lo setea */ },
//         onUploadProgress, // opcional: (evt) => { ... }
//       })
//       .then(resolve)
//       .catch(reject);
//   });
// };

// ✅ Subir evidencias (1..N archivos)
// Acepta: { file } o { files } y siempre envía como files[]
// export const uploadTicketEvidenceAPI = (tktId, { file, files, tipo }, onUploadProgress) => {
//   const form = new FormData();

//   const arr = files ?? (file ? [file] : []);
//   for (const f of arr) form.append("files[]", f);   // <- nombre esperado por multer.array("files[]")
//   form.append("tipo", String(tipo));                // 1 = inicial, 2 = final

//   return httpCliente.post(`api/tickets/${tktId}/evidencias`, form, {
//     onUploadProgress, // (evt) => {}
//     // No seteas Content-Type; el browser pone el boundary
//   });
// };