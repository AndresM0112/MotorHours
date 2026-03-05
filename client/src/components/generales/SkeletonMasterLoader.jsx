import React from "react";

const SkeletonMasterLoader = () => {
    return (
        <>
            {/* Encabezado de la Página */}
            <div className="p-3 mt-4 mb-4 surface-100 border-round">
                <div className="skeleton" style={{ width: "200px", height: "24px" }}></div>
                <div className="skeleton mt-2" style={{ width: "300px", height: "16px" }}></div>
            </div>

            {/* Botones de Filtros y Crear */}
            <div className="flex justify-content-end align-items-center mb-3">
                <div className="flex gap-2">
                    <div
                        className="skeleton border-round mr-2"
                        style={{ width: "80px", height: "32px" }}
                    ></div>
                    <div
                        className="skeleton border-round"
                        style={{ width: "80px", height: "32px" }}
                    ></div>
                </div>
            </div>

            {/* Tabla */}
            <div className="surface-100  border-300 border-round overflow-hidden">
                {/* Encabezado de la Tabla */}
                <div className="flex p-3 bg-primary-50">
                    <div className="skeleton" style={{ width: "10%", height: "16px" }}></div>
                    <div className="skeleton ml-3" style={{ width: "20%", height: "16px" }}></div>
                    <div className="skeleton ml-3" style={{ width: "20%", height: "16px" }}></div>
                    <div className="skeleton ml-3" style={{ width: "15%", height: "16px" }}></div>
                    <div className="skeleton ml-3" style={{ width: "15%", height: "16px" }}></div>
                    <div className="skeleton ml-3" style={{ width: "10%", height: "16px" }}></div>
                </div>

                {/* Filas de la Tabla */}
                {[...Array(5)].map((_, index) => (
                    <div
                        key={index}
                        className="flex align-items-center p-3 border-bottom-1 border-200"
                    >
                        <div className="skeleton" style={{ width: "10%", height: "16px" }}></div>
                        <div
                            className="skeleton ml-3"
                            style={{ width: "20%", height: "16px" }}
                        ></div>
                        <div
                            className="skeleton ml-3"
                            style={{ width: "20%", height: "16px" }}
                        ></div>
                        <div
                            className="skeleton ml-3"
                            style={{ width: "15%", height: "16px" }}
                        ></div>
                        <div
                            className="skeleton ml-3"
                            style={{ width: "15%", height: "16px" }}
                        ></div>
                        <div className="flex gap-2 ml-3">
                            <div
                                className="skeleton border-circle mr-2"
                                style={{ width: "24px", height: "24px" }}
                            ></div>
                            <div
                                className="skeleton border-circle mr-2"
                                style={{ width: "24px", height: "24px" }}
                            ></div>
                            <div
                                className="skeleton border-circle"
                                style={{ width: "24px", height: "24px" }}
                            ></div>
                        </div>
                    </div>
                ))}
            </div>
        </>
    );
};

export default SkeletonMasterLoader;
