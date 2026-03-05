import React, { useEffect, useState } from "react";
import { Dialog } from "primereact/dialog";
import { Button } from "primereact/button";
import Cropper from "react-easy-crop";

export const EasyCrop = ({
    originalImg = null,
    onClose,
    onImageCropped,
    aspect = 0.7,
    minZoom = 0.7,
    maxZoom = 3,
}) => {
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [imageURL, setImageURL] = useState(null);
    const [blobFile, setBlobFile] = useState(null);

    useEffect(() => {
        const imageURL = URL.createObjectURL(originalImg);
        setImageURL(imageURL);

        return () => {
            // Liberar urls temporales para evitar fugas de memoria
            URL.revokeObjectURL(imageURL);
        };
        // eslint-disable-next-line
    }, [originalImg]);

    const getCroppedImg = (imageSrc, croppedAreaPixels) => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");

        if (!ctx) {
            return null;
        }

        const image = new Image();
        image.src = imageSrc;

        return new Promise((resolve, reject) => {
            image.onload = () => {
                // Configura el tamaño del canvas al área recortada
                canvas.width = croppedAreaPixels.width;
                canvas.height = croppedAreaPixels.height;

                // Dibuja la parte recortada de la imagen en el canvas
                ctx.drawImage(
                    image,
                    croppedAreaPixels.x, // Coordenada x de inicio del recorte
                    croppedAreaPixels.y, // Coordenada y de inicio del recorte
                    croppedAreaPixels.width, // Ancho del recorte
                    croppedAreaPixels.height, // Alto del recorte
                    0,
                    0, // Coordenadas de inicio en el canvas
                    croppedAreaPixels.width, // Ancho en el canvas
                    croppedAreaPixels.height // Alto en el canvas
                );

                // Convierte el contenido del canvas a un Blob
                canvas.toBlob(
                    (blob) => {
                        if (!blob) {
                            reject(new Error("No se pudo generar un Blob."));
                            return;
                        }
                        resolve(blob);
                    },
                    originalImg.type, // Tipo MIME de la salida
                    1 // Calidad de la imagen (máxima)
                );
            };

            image.onerror = (error) => {
                reject(error);
            };
        });
    };

    const handleCropComplete = async (_croppedArea, croppedAreaPixels) => {
        if (imageURL) {
            const blobFile = await getCroppedImg(imageURL, croppedAreaPixels);
            setBlobFile(blobFile);
        }
    };

    return (
        <Dialog
            closeOnEscape={false}
            maximizable={true}
            draggable
            header="Ajustar Tamaño"
            visible={true}
            onHide={onClose}
            breakpoints={{ "1584px": "80vw", "960px": "60vw", "672px": "100vw" }}
            style={{ width: "30vw" }}
            footer={
                <Button
                    className="p-button-info"
                    onClick={() => {
                        onImageCropped(blobFile);
                    }}
                    label="Guardar"
                    disabled={!blobFile || !onImageCropped}
                />
            }
        >
            <div style={{ position: "relative", width: "100%", height: "400px" }}>
                <Cropper
                    image={imageURL}
                    crop={crop}
                    zoom={zoom}
                    onCropChange={setCrop}
                    onZoomChange={setZoom}
                    onCropComplete={handleCropComplete}
                    restrictPosition={false} // Permite mover libremente
                    aspect={aspect} // Relación de aspecto 1:1
                    minZoom={minZoom} // Permite alejar hasta la mitad del tamaño original
                    maxZoom={maxZoom} // Permite acercar hasta 3x del tamaño original
                    style={{
                        containerStyle: { position: "relative", width: "100%", height: "100%" },
                    }}
                />
            </div>
        </Dialog>
    );
};
