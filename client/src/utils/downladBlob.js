export const downloadBlob = (blob, fileName) => {
    return new Promise((resolve, reject) => {
        const blobURL = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = blobURL;
        link.download = fileName || "file.txt"; // Puedes proporcionar un nombre de archivo personalizado aquí
        document.body.appendChild(link);
        link.click();
        URL.revokeObjectURL(blobURL);
        document.body.removeChild(link);
        resolve();
    });
};
