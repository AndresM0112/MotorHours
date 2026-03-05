import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from "firebase/storage";
import { storage } from "./firebaseConfig";
/**
 * Función para subir archivos a Firebase Storage.
 * @param {File} file - El archivo a subir.
 * @param {string} folderPath - El path de la carpeta donde se subirá el archivo en Firebase Storage.
 * @param {function} onProgress - Callback para manejar el progreso de la subida.
 * @param {function} onComplete - Callback para manejar la finalización de la subida.
 * @param {function} onError - Callback para manejar errores durante la subida.
 * @param {string} downloadURL - URL del archivo que deseas eliminar en Firebase Storage.
 * @param {function} onSuccess - Callback para manejar la eliminación exitosa.
 */

export const extractFilePathFromURL = (downloadURL) => {
    // Extraer la ruta del archivo desde la URL
    const baseURL = "https://firebasestorage.googleapis.com/v0/b/";
    const path = decodeURIComponent(downloadURL.split(baseURL)[1].split("?")[0].split("/o/")[1]);
    return path;
};

// Sube desde un archibo original
export const uploadFile = (file, folderPath, onProgress, onComplete, onError) => {
    if (!file) return;

    // Crear una referencia al archivo en el almacenamiento de Firebase
    const storageRef = ref(storage, `MOTORHOURS/${folderPath}/${file.name}`);
    const uploadTask = uploadBytesResumable(storageRef, file);

    // Escuchar los cambios de estado del proceso de subida
    uploadTask.on(
        "state_changed",
        (snapshot) => {
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            if (onProgress) {
                onProgress(progress);
            }
        },
        (error) => {
            // console.error("Error al subir el archivo:", error);
            if (onError) {
                onError(error);
            }
        },
        () => {
            // Obtener la URL de descarga cuando la subida finaliza
            getDownloadURL(uploadTask.snapshot.ref).then((downloadURL) => {
                if (onComplete) {
                    onComplete(downloadURL);
                }
            });
        }
    );
};

// Sube desde una url temporal
export const uploadFromUrl = async (
    tempUrl,
    fileName,
    folderPath,
    onProgress,
    onComplete,
    onError
) => {
    if (!tempUrl) return;

    try {
        // Descargar la imagen desde la URL temporal
        const response = await fetch(tempUrl);
        const blob = await response.blob();

        // console.log({ response, blob });
        // Crear una referencia al archivo en el almacenamiento de Firebase
        const storageRef = ref(storage, `MOTORHOURS/${folderPath}/${fileName}`);
        const uploadTask = uploadBytesResumable(storageRef, blob);

        // Escuchar los cambios de estado del proceso de subida
        uploadTask.on(
            "state_changed",
            (snapshot) => {
                const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                if (onProgress) {
                    onProgress(progress);
                }
            },
            (error) => {
                // console.error("Error al subir el archivo:", error);
                if (onError) {
                    onError(error);
                }
            },
            () => {
                // Obtener la URL de descarga cuando la subida finaliza
                getDownloadURL(uploadTask.snapshot.ref).then((downloadURL) => {
                    if (onComplete) {
                        onComplete(downloadURL);
                    }
                });
            }
        );
    } catch (error) {
        // console.error("Error al procesar la URL temporal:", error);
        if (onError) {
            onError(error);
        }
    }
};

// Sube desde un tipo bopb
export const uploadFileFromBlob = (blob, fileName, folderPath, onProgress, onComplete, onError) => {
    if (!blob) {
        console.error("Error: El Blob proporcionado está vacío.");
        return;
    }

    // console.log("Preparando referencia para la subida en Firebase Storage...", {
    //     fileName,
    //     folderPath,
    // });

    // Crear una referencia al archivo en Firebase
    const storageRef = ref(storage, `MOTORHOURS/${folderPath}/${fileName}`);
    const uploadTask = uploadBytesResumable(storageRef, blob);

    // Escuchar los cambios de estado del proceso de subida
    uploadTask.on(
        "state_changed",
        (snapshot) => {
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            // console.log(`Progreso de la subida: ${progress.toFixed(2)}%`);
            if (onProgress) {
                onProgress(progress);
            }
        },
        (error) => {
            // console.error("Error durante el proceso de subida:", error);
            if (onError) {
                onError(error);
            }
        },
        () => {
            // console.log("Subida completada. Obteniendo URL de descarga...");
            getDownloadURL(uploadTask.snapshot.ref)
                .then((downloadURL) => {
                    // console.log("URL de descarga obtenida:", downloadURL);
                    if (onComplete) {
                        onComplete(downloadURL);
                    }
                })
                .catch((error) => {
                    // console.error("Error al obtener la URL de descarga:", error);
                    if (onError) {
                        onError(error);
                    }
                });
        }
    );
};

export const deleteFile = (downloadURL, onSuccess, onError) => {
    // Crear una referencia al archivo que se va a eliminar
    const filePath = extractFilePathFromURL(downloadURL);
    const fileRef = ref(storage, filePath);

    // Intentar eliminar el archivo
    deleteObject(fileRef)
        .then(() => {
            if (onSuccess) {
                onSuccess();
            }
            // console.info("Archivo eliminado exitosamente");
        })
        .catch((error) => {
            if (onError) {
                onError(error);
            }
            // console.error("Error al eliminar el archivo:", error);
        });
};
