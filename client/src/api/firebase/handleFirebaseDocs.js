import { ref, listAll, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { storage } from "./firebaseConfig";
import { deleteEquipDocApi, saveEquipDocApi } from "@api/requests/equipmentDocsAPI";
import moment from "moment";

export const generateBlob = async (filePath) => {
    try {
        const url = await getDownloadURL(ref(storage, filePath));
        const response = await fetch(url);
        const blob = await response.blob();
        return blob; // Devuelve el blob directamente
    } catch (error) {
        console.error("Error generating blob: ", error);
        console.error(error);
        // A full list of error codes is available at
        // https://firebase.google.com/docs/storage/web/handle-errors
        switch (error.code) {
            case "storage/object-not-found":
                // File doesn't exist
                break;
            case "storage/unauthorized":
                // User doesn't have permission to access the object
                break;
            case "storage/canceled":
                // User canceled the upload
                break;

            // ...

            case "storage/unknown":
                // Unknown error occurred, inspect the server response
                break;

            default:
                break;
        }
        throw error; // Lanza el error para manejarlo más arriba si es necesario
    }
};

// creación de carpeta (sube un archivo vacío .folder)
export const createFolder = async (equId, folderName, idusuario, usuario) => {
    const folderPath = `MOTORHOURS/EQUIPOS/${equId}/${folderName}/.folder`;
    const storageRef = ref(storage, folderPath);
    const emptyFile = new Blob([""], { type: "text/plain" });
    await uploadBytes(storageRef, emptyFile);

    // Guardar en la BD
    const { data } = await saveEquipDocApi({
        equId,
        tipo: "carpeta",
        nombre: folderName,
        rutaStorage: `MOTORHOURS/EQUIPOS/${equId}/${folderName}`,
        url: "",
        extension: null,
        tamanio: 0,
        usuReg: idusuario,
        usuAct: usuario,
    });

    // Devolver para poder usar en el estado local
    return {
        eqdId: data.eqdId, // o genera uno si no viene
        tipo: "carpeta",
        nombre: folderName,
        rutaStorage: `MOTORHOURS/EQUIPOS/${equId}/${folderName}`,
        fecReg: moment().format("YYYY-MM-DD HH:mm:ss"),
        usuReg: usuario,
        usuAct: usuario,
    };
};

// Subir archivo a carpeta
export const uploadFileToFolder = async (equId, folderName, file, idusuario, usuario) => {
    const path = `MOTORHOURS/EQUIPOS/${equId}/${folderName}/${file.name}`;
    const fileRef = ref(storage, path);
    await uploadBytes(fileRef, file);
    const url = await getDownloadURL(fileRef);

    // Guardar trazabilidad en la BD
    const { data } = await saveEquipDocApi({
        equId,
        tipo: "archivo",
        nombre: file.name,
        rutaStorage: path,
        url,
        extension: file.name.split(".").pop(),
        tamanio: file.size,
        usuReg: idusuario,
        usuAct: usuario,
    });

    return {
        url,
        path,
        savedDoc: {
            eqdId: data.eqdId,
            nombre: file.name,
            rutaStorage: path,
            url,
            extension: file.name.split(".").pop(),
            tamanio: file.size,
            usuReg: usuario,
            usuAct: usuario,
        },
    };
};
// Listar carpetas y archivos bajo el equipo
export const listFoldersAndFiles = async (equId) => {
    const baseRef = ref(storage, `MOTORHOURS/EQUIPOS/${equId}`);
    const folderData = [];
    const fileData = [];

    const topLevel = await listAll(baseRef);

    for (const prefix of topLevel.prefixes) {
        const folderName = prefix.name;
        const subFiles = await listAll(prefix);
        folderData.push({
            name: folderName,
            path: prefix.fullPath,
            numFiles: subFiles.items.length,
        });

        for (const fileRef of subFiles.items) {
            // Ignorar .folder
            if (fileRef.name === ".folder") continue;

            const url = await getDownloadURL(fileRef);
            fileData.push({
                name: fileRef.name,
                folder: folderName,
                path: fileRef.fullPath,
                fileUrl: url,
                fileSize: 0, // No hay forma directa de saber tamaño aquí sin metadata adicional
                fileType: getFileTypeFromName(fileRef.name),
            });
        }
    }

    return { folders: folderData, files: fileData };
};

// Eliminar archivo
export const deleteFileByPath = async (fullPath, eqdId, usuario) => {
    const fileRef = ref(storage, fullPath);
    await deleteObject(fileRef); // Firebase

    // BD (soft delete)
    await deleteEquipDocApi({
        eqdId,
        usuAct: usuario,
    });
};

// Helper para tipo de archivo
const getFileTypeFromName = (fileName) => {
    const ext = fileName.split(".").pop().toLowerCase();
    if (["jpg", "jpeg", "png", "gif", "bmp"].includes(ext)) return "image";
    if (ext === "pdf") return "pdf";
    if (["txt", "md", "doc", "docx"].includes(ext)) return "text";
    return "other";
};
