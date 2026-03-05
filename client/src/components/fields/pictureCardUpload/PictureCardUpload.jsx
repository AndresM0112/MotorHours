import React, { useEffect, useRef, useState } from "react";
// UI
import { Button } from "primereact/button";
import { Tooltip } from "primereact/tooltip";
import { Image } from "primereact/image";
import { ProgressBar } from "primereact/progressbar";

import uploadImg from "./assets/downloadProgress.gif";
import uploadInProgressGif from "./assets/downloadProgress.gif";
import "./pictureCardUpload.css";

const PictureCardUpload = ({
    label = "Cargar Imagen",
    multiple,
    accept = "image/*",
    maxCount = 1,
    fileList = [],
    onChange,
    handleRemove,
    progress,
    disabled,
    textTooltip = "",
}) => {
    const [internalList, setInternalList] = useState(fileList);
    const wrapperRef = useRef(null);

    const onDragEnter = () => wrapperRef.current.classList.add("dragover");
    const onDragLeave = () => wrapperRef.current.classList.remove("dragover");
    const onDrop = () => wrapperRef.current.classList.remove("dragover");

    useEffect(() => {
        setInternalList(fileList);
    }, [fileList]);

    const onFileDrop = (e) => {
        const files = Array.from(e.target.files);
        if (onChange) return onChange(files);

        const newFiles = files.map((file) => ({
            uid: Math.random().toString(36).substring(2),
            name: file.name,
            url: URL.createObjectURL(file),
        }));

        setInternalList([...internalList, ...newFiles]);
    };

    const onRemove = (file) => {
        if (handleRemove) return handleRemove(file);
        setInternalList((prv) => prv.filter((f) => f.uid !== file.uid));
    };

    return (
        <div className="flex justify-content-center">
            <div className="upload-list">
                {internalList.map((file) => (
                    <div key={file.uid} className="upload-item">
                        <Image src={file.url} alt={file.name} preview width="100%" />
                        <div className="upload-item-actions">
                            <Tooltip target=".delete-button" />
                            <Button
                                icon="pi pi-trash"
                                className="delete-button p-button-rounded p-button-danger p-button-xs"
                                onClick={() => onRemove(file)}
                                tooltip="Eliminar"
                                tooltipOptions={{ position: "bottom" }}
                            />
                        </div>
                    </div>
                ))}
            </div>
            <Tooltip target={`.picture-card`} position="top" content={textTooltip} />
            {maxCount > internalList.length && (
                <div
                    ref={wrapperRef}
                    className="drop-file-input"
                    onDragEnter={onDragEnter}
                    onDragLeave={onDragLeave}
                    onDrop={onDrop}
                >
                    {progress ? (
                        <div className="drop-file-input__label">
                            <img
                                src={uploadInProgressGif}
                                alt="Cargando"
                                className="uploading"
                                style={{ width: "50px" }}
                            />
                            <p>Subiendo...</p>
                            <ProgressBar value={progress} style={{ height: "1.3rem" }} />
                        </div>
                    ) : (
                        <div className="drop-file-input__label">
                            <img src={uploadImg} alt="" />
                            <p>{label}</p>
                        </div>
                    )}
                    <input
                        type="file"
                        value=""
                        onChange={onFileDrop}
                        multiple={multiple}
                        accept={accept}
                        disabled={disabled || progress}
                    />
                </div>
            )}
        </div>
    );
};

export default PictureCardUpload;
