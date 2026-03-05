import axios from "axios";

const instance = axios.create();
instance.CancelToken = axios.CancelToken;
instance.isCancel = axios.isCancel;

export const documentTypeAPI = () => {
    return new Promise((resolve, reject) => {
        instance
            .get("api/management/document-type/get_document_type")
            .then((response) => {
                resolve(response);
            })
            .catch((error) => {
                reject(error);
            });
    });
};
