import React, { useState, useEffect, useRef } from "react";
import { Button } from "primereact/button";
import { Dialog } from "primereact/dialog";
import { InputText } from "primereact/inputtext";
import { RadioButton } from "primereact/radiobutton";
import { Dropdown } from "primereact/dropdown";
import Webcam from "react-webcam";
import { BrowserMultiFormatReader } from "@zxing/library";
import useHandleApiError from "@hook/useHandleApiError";
import { CustomImage } from "@components/fields/CustomImage";

const ScannerModal = ({ articlesList, addArticleToTable }) => {
    const webcamRef = useRef(null);
    const inputRef = useRef(null);
    const [isDialogVisible, setIsDialogVisible] = useState(false);
    const [scannedProducts, setScannedProducts] = useState([]);
    const [useCamera, setUseCamera] = useState(false);
    const [scanner, setScanner] = useState(null);
    const [hasCamera, setHasCamera] = useState(false);
    const [cameraList, setCameraList] = useState([]);
    const [selectedCamera, setSelectedCamera] = useState("");
    const handleApiError = useHandleApiError();

    useEffect(() => {
        const newScanner = new BrowserMultiFormatReader();
        setScanner(newScanner);

        const checkDevices = async () => {
            try {
                const devices = await navigator.mediaDevices.enumerateDevices();
                const videoDevices = devices.filter((device) => device.kind === "videoinput");
                setHasCamera(videoDevices.length > 0);
                setCameraList(videoDevices);

                const rearCamera = videoDevices.find((device) =>
                    device.label.toLowerCase().includes("back")
                );
                setSelectedCamera(rearCamera?.deviceId || videoDevices[0]?.deviceId || "");
            } catch (error) {
                handleApiError("No se pudo acceder a los dispositivos de cámara.");
            }
        };

        checkDevices();
        navigator.mediaDevices.ondevicechange = checkDevices;

        return () => {
            navigator.mediaDevices.ondevicechange = null;
        };
    }, [handleApiError]);

    const handleCameraScan = () => {
        if (webcamRef.current) {
            const imageSrc = webcamRef.current.getScreenshot();
            if (imageSrc && scanner) {
                scanner.decodeFromImageUrl(imageSrc).then((result) => {
                    addScannedArticle(result.getText());
                });
            }
        }
    };

    const addScannedArticle = (code) => {
        const articulo = articlesList.find(
            (art) => art.codigo.toLowerCase() === code.toLowerCase()
        );

        if (!articulo) {
            handleApiError({
                status: 400,
                message: `Artículo con código '${code}' no encontrado.`,
            });
        } else {
            setScannedProducts((prev) => [...prev, articulo]);
        }
    };

    useEffect(() => {
        if (useCamera && isDialogVisible) {
            const interval = setInterval(() => handleCameraScan(), 1500);
            return () => clearInterval(interval);
        }
        // eslint-disable-next-line
    }, [useCamera, isDialogVisible]);

    const handleManualInput = (e) => {
        if (e.key === "Enter") {
            const value = e.target.value.trim();
            if (!value) return;

            addScannedArticle(value);
            e.target.value = "";
        }
    };

    const handleOpenDialog = () => {
        setIsDialogVisible(true);
        setScannedProducts([]);
        // setUseCamera(hasCamera);
    };

    const handleCloseDialog = () => {
        setIsDialogVisible(false);
    };

    const handleDelete = (index) => {
        setScannedProducts((prev) => prev.filter((_, i) => i !== index));
    };

    return (
        <>
            <Button
                icon="pi pi-camera"
                className="p-button p-button-primary"
                onClick={handleOpenDialog}
            />

            <Dialog
            closeOnEscape={false}
                header="Escanear Código"
                visible={isDialogVisible}
                onHide={handleCloseDialog}
                style={{ width: "50vw" }}
                footer={
                    <Button
                        label="Finalizar"
                        icon="pi pi-check"
                        disabled={!scannedProducts.length}
                        onClick={() => {
                            addArticleToTable({ scannedArticles: scannedProducts });
                            setIsDialogVisible(false);
                        }}
                    />
                }
            >
                <div className="flex align-items-center justify-content-center gap-3 mb-3">
                    <div className="mr-3 flex align-items-center gap-2">
                        <RadioButton
                            inputId="reader"
                            name="scannerMode"
                            value="reader"
                            onChange={() => setUseCamera(false)}
                            checked={!useCamera}
                        />
                        <label htmlFor="reader">Usar Lector</label>
                    </div>
                    <div className="flex align-items-center gap-2">
                        <RadioButton
                            inputId="camera"
                            name="scannerMode"
                            value="camera"
                            onChange={() => setUseCamera(true)}
                            checked={useCamera}
                            disabled={!hasCamera}
                        />
                        <label htmlFor="camera">Usar Cámara</label>
                    </div>
                </div>

                {useCamera && cameraList.length > 0 && (
                    <div className="mb-3">
                        <Dropdown
                            value={selectedCamera}
                            options={cameraList.map((camera) => ({
                                label: camera.label || `Cámara ${camera.deviceId}`,
                                value: camera.deviceId,
                            }))}
                            onChange={(e) => setSelectedCamera(e.value)}
                            placeholder="Selecciona una cámara"
                            className="w-full"
                        />
                    </div>
                )}

                {useCamera ? (
                    <Webcam
                        audio={false}
                        ref={webcamRef}
                        screenshotFormat="image/jpeg"
                        videoConstraints={{
                            deviceId: selectedCamera,
                            facingMode: "environment",
                        }}
                        style={{ width: "100%", height: "200px", objectFit: "cover" }}
                    />
                ) : (
                    <InputText
                        ref={inputRef}
                        placeholder="Ingresa el código"
                        onKeyDown={handleManualInput}
                        className="w-full"
                    />
                )}

                {/* Lista de Productos */}
                <div style={{ maxHeight: "400px", overflowY: "auto" }} className="mt-3">
                    {scannedProducts.map((product, index) => (
                        <div
                            key={product.codigo + index}
                            className="flex align-items-center justify-content-between gap-2 p-2 border-1 border-round mb-2"
                        >
                            <div className="flex align-items-center gap-2">
                                <CustomImage src={product.imagen} alt="Artículo" width="50" />
                                <div className="flex flex-column">
                                    <div className="font-semibold">{product.nombre}</div>
                                    <div className="text-sm text-secondary">{product.codigo}</div>
                                </div>
                            </div>
                            <Button
                                icon="pi pi-trash"
                                className="p-button-rounded p-button-danger p-button-text"
                                onClick={() => handleDelete(index)}
                                tooltip="Eliminar artículo"
                            />
                        </div>
                    ))}
                </div>
            </Dialog>
        </>
    );
};

export default ScannerModal;
