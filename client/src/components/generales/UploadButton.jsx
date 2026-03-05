import React, { useRef } from "react";
import { classNames } from "primereact/utils";

export const UploadButton = ({
    label = "",
    title = "",
    className = "",
    accept = "",
    onChange,
    disabled,
    loading = false,
    style = {},
}) => {
    const fileInputRef = useRef(null);

    const handleButtonClick = () => {
        fileInputRef.current.value = null; // Restablece el valor del elemento de entrada de archivo
        fileInputRef.current.click();
    };

    return (
        <div style={{ display: "flex", alignItems: "center" }}>
            <>
                <button
                    style={{
                        ...style,
                    }}
                    type="button"
                    className={`p-button p-component upload-button ${className}`}
                    onClick={handleButtonClick}
                    disabled={disabled || loading}
                    title={title}
                >
                    {label}
                    {loading ? (
                        <i
                            className={`pi pi-spin pi-spinner ${classNames({ "ml-2": label })}`}
                            style={{ fontSize: "1rem" }}
                        ></i>
                    ) : (
                        <i className={`pi pi-upload ${classNames({ "ml-2": label })}`}></i>
                    )}
                </button>
                <input
                    type="file"
                    className="p-inputtext p-component"
                    accept={accept}
                    onChange={onChange}
                    disabled={disabled}
                    ref={fileInputRef}
                    style={{ display: "none" }}
                />
            </>
        </div>
    );
};
