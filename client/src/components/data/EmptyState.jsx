import React from "react";
import { Button } from "primereact/button";

const EmptyState = ({
    icon = "pi pi-database",
    title = "No hay datos",
    description = "No hay información disponible.",
    buttonLabel = "Acción",
    onButtonClick = () => {},
    canCreate = true,
}) => {
    return (
        <div
            className="flex align-items-center justify-content-center h-full"
            style={{ minHeight: "60vh" }}
        >
            <div className="flex flex-column align-items-center justify-content-center gap-3 text-center">
                <i className={`${icon} text-5xl text-400`}></i>
                <h4 className="m-0">{title}</h4>
                <p className="mt-2 mb-3 text-600">{description}</p>
                <Button
                    icon="pi pi-plus"
                    label={buttonLabel}
                    className="p-button-primary p-button-rounded"
                    onClick={onButtonClick}
                    disabled={!canCreate}
                />
            </div>
        </div>
    );
};

export default EmptyState;
