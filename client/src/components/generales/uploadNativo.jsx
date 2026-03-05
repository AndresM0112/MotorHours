
// UploadNativo.jsx
import React from "react";
import { Image } from "primereact/image";

const UploadNativo = ({
    fileList = [],
    onUpload,
    onRemove,
    onPreview, // 👈 nuevo
    onDownload, // 👈 nuevo
    disabled = false,
    maxCount = 5,
    forzarCamara = false,
    upload = true,
    inputId = "input-upload-evidencia",
    // 👇 nuevas
    hideEmptyPreview = false,
    compact = false,
}) => {
    const inputRef = React.useRef();

    const handleChange = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        try {
            await onUpload(file);
        } catch (err) {
            console.error("Error en subida:", err);
        } finally {
            if (inputRef.current) inputRef.current.value = "";
        }
    };

    const isPdfFile = (f) => {
        const mime = (f?.mimetype || f?.type || "").toLowerCase();
        const name = (f?.name || "").toLowerCase();
        const url = (f?.url || f?.thumbUrl || "").toLowerCase();
        if (mime.includes("application/pdf")) return true;
        return /\.pdf($|\?)/i.test(name) || /\.pdf($|\?)/i.test(url);
    };

    const isImageFile = (f) => {
        const mime = (f?.mimetype || f?.type || "").toLowerCase();
        const name = (f?.name || "").toLowerCase();
        const url = (f?.url || f?.thumbUrl || "").toLowerCase();
        if (mime.startsWith("image/")) return true;
        return (
            /\.(png|jpe?g|bmp|gif|webp)($|\?)/i.test(name) ||
            /\.(png|jpe?g|bmp|gif|webp)($|\?)/i.test(url)
        );
    };

    // const handleDownload = (file) => {
    //     const url = file.urlpublica || file.url || file.urllocal;
    //     if (!url) return;

    //     const link = document.createElement("a");
    //     link.href = url;
    //     link.download = file.name || "archivo";
    //     document.body.appendChild(link);
    //     link.click();
    //     document.body.removeChild(link);
    // };

    // const handlePreview = (file) => {
    //     const url = file.urlpublica || file.url || file.urllocal;
    //     if (!url) return;

    //     const pdf = isPdfFile(file);
    //     if (pdf) {
    //         window.open(url, "_blank");
    //     } else {
    //         // Para imágenes, podemos usar la función de PrimeReact Image o fallback
    //         console.log("Preview disponible para imágenes automáticamente");
    //     }
    // };

    return (
        <div className={`custom-upload ${compact ? "compact" : ""}`}>
            {/* 👇 solo renderiza la grilla si NO está oculto o si hay archivos */}
            {(!hideEmptyPreview || fileList.length > 0) && (
                <div className="upload-preview-container">
                    {fileList.map((file) => {
                        const pdf = isPdfFile(file);
                        const img = isImageFile(file);
                        const src = file.thumbUrl || file.url || file.urllocal || file.urlpublica;

                        return (
                            <div
                                key={file.uid}
                                className={`upload-preview ${pdf ? "pdf" : img ? "img" : "other"}`}
                            >
                                {img && src ? (
                                    <Image
                                        src={src}
                                        alt={file.name}
                                        preview={false}
                                        imageClassName="upload-image"
                                        downloadable
                                    />
                                ) : pdf && src ? (
                                    <a href={src} target="_blank" rel="noopener noreferrer" className="pdf-card">
                                        <object
                                            data={`${src}#toolbar=0&navpanes=0&scrollbar=0`}
                                            type="application/pdf"
                                            width="100%"
                                            height="100%"
                                            aria-label={file.name || "PDF"}
                                        >
                                            <div className="pdf-fallback">
                                                <i className="pi pi-file-pdf" />
                                                <span className="pdf-name">{file.name || "PDF"}</span>
                                            </div>
                                        </object>
                                    </a>
                                ) : (
                                    <a href={src} target="_blank" rel="noopener noreferrer" className="other-card">
                                        <i className="pi pi-file" />
                                        <span className="file-name">{file.name || "Archivo"}</span>
                                    </a>
                                )}

                                {/* Acciones */}
                                <div className="actions">
                                    {!!onPreview && (
                                        <button
                                            type="button"
                                            className="btn-action"
                                            title="Ver"
                                            onClick={() => onPreview(file)}
                                        >
                                            <i className="pi pi-eye" />
                                        </button>
                                    )}
                                    {!!onDownload && (
                                        <button
                                            type="button"
                                            className="btn-action"
                                            title="Descargar"
                                            onClick={() => onDownload(file)}
                                        >
                                            <i className="pi pi-download" />
                                        </button>
                                    )}
                                    {!disabled && (
                                        <button
                                            type="button"
                                            className="btn-delete"
                                            onClick={() => onRemove(file)}
                                            title="Eliminar evidencia"
                                        >
                                            <i className="pi pi-trash"></i>
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Botón de adjuntar (siempre visible cuando upload=true) */}
            {!disabled && fileList.length < maxCount && upload && (
                <div className="upload-button">
                    <label htmlFor={inputId} className="upload-label">
                        &#128247; {compact ? "Evidencias" : "Evidencias"}
                    </label>
                    <input
                        id={inputId}
                        type="file"
                        accept="image/png,image/jpg,image/jpeg,image/bmp,image/webp,application/pdf"
                        capture={forzarCamara ? "environment" : undefined}
                        ref={inputRef}
                        style={{ display: "none" }}
                        onChange={handleChange}
                        disabled={disabled}
                    />
                </div>
            )}

            <style jsx>{`
                .upload-preview-container {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 10px;
                }
                .upload-preview {
                    position: relative;
                    width: 100px;
                    height: 100px;
                }
                .upload-image {
                    width: 100px;
                    height: 100px;
                    object-fit: cover;
                    border-radius: 6px;
                    border: 1px solid #ccc;
                    background: #fafafa;
                }
                .pdf-card,
                .other-card {
                    display: flex;
                    width: 100px;
                    height: 100px;
                    border: 1px solid #ccc;
                    border-radius: 6px;
                    align-items: center;
                    justify-content: center;
                    text-decoration: none;
                    color: inherit;
                    overflow: hidden;
                    background: #fff;
                }
                .pdf-card object {
                    width: 100%;
                    height: 100%;
                    pointer-events: none;
                }
                .pdf-fallback,
                .other-card {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    gap: 6px;
                    padding: 6px;
                    text-align: center;
                }
                .pdf-fallback i,
                .other-card i {
                    font-size: 28px;
                }
                .pdf-name,
                .file-name {
                    font-size: 11px;
                    line-height: 1.1;
                    max-width: 92px;
                    word-break: break-word;
                }
                .actions {
                    position: absolute;
                    left: 4px;
                    bottom: 4px;
                    display: flex;
                    gap: 6px;
                }
                .btn-action {
                    background: #111827;
                    color: #fff;
                    border: none;
                    border-radius: 6px;
                    width: 26px;
                    height: 26px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.15);
                    cursor: pointer;
                    opacity: 0.92;
                }
                .btn-action:hover {
                    opacity: 1;
                }
                .btn-delete {
                    position: absolute;
                    top: 2px;
                    right: 2px;
                    background-color: #ef4444;
                    color: #fff;
                    border: none;
                    border-radius: 50%;
                    cursor: pointer;
                    width: 24px;
                    height: 24px;
                    font-size: 14px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.15);
                }
                .upload-button {
                    width: 100px;
                    height: 100px;
                    border: 1px dashed #ccc;
                    border-radius: 6px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    background: #fafafa;
                }
                .upload-label {
                    cursor: pointer;
                }

                 /* 👇 versión compacta para dialogs */
        .custom-upload.compact .upload-button {
          padding: 6px 10px;
          min-width: unset;
          min-height: unset;
          height: 32px;
        }

        /* 🔹 Mantener color estable del texto en el botón de carga */
            .upload-button {
            width: 100px;
            height: 100px;
            border: 1px dashed #ccc;
            border-radius: 6px;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            background: #fafafa;
            transition: background 0.2s ease;
            }

            .upload-button:hover {
            background: #f0f0f0; /* sutil efecto sin cambiar el texto */
            }

            .upload-label {
            color: #333 !important;   /* 👈 color estable */
            font-weight: 500;
            font-size: 10px;
            user-select: none;
            }

            .upload-label:hover {
            color: #333 !important;   /* 👈 evita que se vuelva blanca */
            }

            /* 👇 versión compacta para dialogs (mantiene el color estable) */
            .custom-upload.compact .upload-label {
            color: #333 !important;
            }

            `}</style>
        </div>
    );
};

export default UploadNativo;
