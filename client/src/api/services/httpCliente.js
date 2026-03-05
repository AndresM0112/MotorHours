import axios from "axios";
import Cookies from "js-cookie";

// Configurar un interceptor de solicitud para añadir el token de autenticación y otros datos del usuario
axios.interceptors.request.use(
    (config) => {
        config.withCredentials = true; // Incluir cookies en las solicitudes

        // Obtener datos del usuario y el token de las cookies
        const tokenSecurity = Cookies.get("tokenMOTORHOURS");
        const currenUserApp = Cookies.get("idMOTORHOURS");
        const currentPermissionsUserApp = Cookies.get("permisosMOTORHOURS");

        // Añadir el token al header Authorization si existe
        if (tokenSecurity) {
            config.headers.Authorization = `Bearer ${tokenSecurity}`;
        }

        // Añadir currenUserApp y currentPermissionsUserApp como headers personalizados
        if (currenUserApp) {
            config.headers.currenuserapp = currenUserApp;
        }
        if (currentPermissionsUserApp) {
            config.headers.currentpermissionsuserapp = currentPermissionsUserApp;
        }

        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Configura un interceptor de respuesta para manejar errores globalmente
axios.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response && error.response.status === 401) {
            // Manejar errores de autenticación aquí (opcional)
            console.log("No autorizado. Redirigiendo a la página de login.");
            // window.location.href = '/login'; // Redirigir al login si es necesario
        }
        return Promise.reject(error);
    }
);

export const getFilenameFromContentDisposition = (cd = "") => {
    // filename*=UTF-8''...  o  filename="..."
    const m = /filename\*=UTF-8''([^;]+)|filename="?([^"]+)"?/i.exec(cd);
    const raw = m?.[1] || m?.[2] || "";
    try { return decodeURIComponent(raw); } catch { return raw; }
};

// Configuración genérica de peticiones HTTP
const genericRequest = {
    get: (url, params) => {
        const config = {
            params: params || {},
            withCredentials: true, // Incluir cookies en la solicitud
        };
        return axios.get(url, config);
    },
    post: (url, body, config = {}) => axios.post(url, body, { ...config, withCredentials: true }),
    put: (url, body, config = {}) => axios.put(url, body, { ...config, withCredentials: true }),
    delete: (url, config = {}) => axios.delete(url, { ...config, withCredentials: true }),

    // Método para descargar archivos
    downloadFile: (url, params = {}, config = {}) => {
        return axios.get(url, {
            ...config,
            withCredentials: true,
            responseType: "blob",
            params,
        });
    },

    // Método flexible para subir archivos (POST/PUT/PATCH)
    uploadFile: (url, formData, method = "post", config = {}) => {
        return axios({
            url,
            method: method.toLowerCase(),
            data: formData,
            withCredentials: true,
            headers: {
                ...config.headers,
                "Content-Type": "multipart/form-data",
            },
            ...config,
        });
    },
    downloadAndHandleFile: async (url, params = {}, fallbackName = "file", config = {}) => {
        try {
            const response = await genericRequest.downloadFile(url, params, config);

            // Lee headers que llegan desde el server
            const cd = response.headers?.['content-disposition'] || '';
            const ct = response.headers?.['content-type'] || 'application/octet-stream';
            // Si el server devolvió HTML, casi seguro te redirigieron al index/login
            if (ct.includes('text/html')) {
                const text = await response.data.text?.(); // Blob -> text
                throw new Error(
                    `Respuesta HTML en descarga (posible redirección). Content-Type: ${ct}. ` +
                    `Primeros 200 chars: ${String(text).slice(0, 200)}`
                );
            }

            const filenameFromAPI = getFilenameFromContentDisposition(cd);
            const finalName = filenameFromAPI || fallbackName;

            // Normaliza: si ya es Blob, úsalo; si no, construye con el MIME del server
            const data = response.data;
            const blob = data instanceof Blob ? data : new Blob([data], { type: ct });

            // Descarga
            const blobUrl = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = blobUrl;
            link.setAttribute('download', finalName);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(blobUrl);

            return { success: true };
        } catch (error) {
            console.error('Error downloading file:', error);
            throw error;
        }
    },
};


export default genericRequest;
