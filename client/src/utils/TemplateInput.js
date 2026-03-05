import React from "react";

export const OptionTemplateCodNom = (option) => {
    const { nombre, porcentaje } = option;

    return (
        <div className="flex align-items-center">
            <div>{nombre || ""}</div>{" "}
            {porcentaje && (
                <div className="country-item-percent">
                    {parseFloat(porcentaje).toFixed(0) || ""}%
                </div>
            )}
        </div>
    );
};

export const SelectedTemplateCodNom = (option) => {
    if (option) {
        const { nombre, porcentaje } = option;
        return (
            <div className="flex align-items-center">
                <div>{nombre || ""}</div>{" "}
                {porcentaje && (
                    <div className="country-item-percent">
                        {parseFloat(porcentaje).toFixed(0) || ""}%
                    </div>
                )}
            </div>
        );
    }

    return null;
};
