import React from "react";
import { Skeleton } from "primereact/skeleton";

const SkeletonTable = ({ rows = 5, columns = 8 }) => {
    return (
        <div className="p-datatable p-component" style={{ position: "relative" }}>
            {/* Header de botones */}
            <div
                style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: "1rem",
                }}
            >
                <Skeleton width="8rem" height="2.5rem" style={{ borderRadius: "6px" }} />
                <Skeleton width="6rem" height="2.5rem" style={{ borderRadius: "6px" }} />
            </div>

            {/* Tabla Skeleton */}
            <div className="p-datatable-wrapper" style={{ overflow: "hidden" }}>
                <table className="p-datatable-table">
                    <thead>
                        <tr>
                            {Array.from({ length: columns }).map((_, index) => (
                                <th
                                    key={index}
                                    className="p-column-header"
                                    style={{ padding: "1rem" }}
                                >
                                    <Skeleton width="80%" height="1rem" />
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {Array.from({ length: rows }).map((_, rowIndex) => (
                            <tr key={rowIndex}>
                                {Array.from({ length: columns }).map((_, colIndex) => (
                                    <td
                                        key={colIndex}
                                        className="p-datatable-cell"
                                        style={{ padding: "1rem" }}
                                    >
                                        <Skeleton width="100%" height="1.5rem" />
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Skeleton de paginación */}
            <div
                style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginTop: "1rem",
                }}
            >
                <Skeleton width="8rem" height="1.5rem" />
                <Skeleton width="6rem" height="1.5rem" />
            </div>
        </div>
    );
};

export default SkeletonTable;
