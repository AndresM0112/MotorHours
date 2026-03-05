import React from "react";
import { Divider } from "primereact/divider";
import { Button } from "primereact/button";
import { Skeleton } from "primereact/skeleton";

export const ItemVentanas = (item) => {
    return (
        <div className="product-item">
            <div className="product-list-detail">
                <p className="mb-2">{item.descripcion}</p>
            </div>
        </div>
    );
};

export const HeaderPassword = () => {
    return <h6>Elige una contraseña</h6>;
};

export const FooterPassword = () => {
    return (
        <React.Fragment>
            <Divider />
            <p className="mt-2">Sugerencias</p>
            <ul className="pl-2 ml-2 mt-0" style={{ lineHeight: "1.5" }}>
                <li>No contener espacios</li>
                <li>Mínimo 8 caracteres</li>
            </ul>
        </React.Fragment>
    );
};

export const RightToolbar = ({ label, onClick, disabled, status = "success" }) => {
    return (
        <Button
            className={`p-button-sm  p-button-rounded p-button-${status} ml-2`}
            icon="pi pi-plus"
            iconPos="right"
            label={label}
            onClick={onClick}
            disabled={disabled}
        />
    );
};

export const SpanLoading = <span style={{ color: "#2196f3" }}>{"Cargando..."}</span>;

export const SkeletonForm = (
    <div className="field col-12">
        <Skeleton className="mb-2"></Skeleton>
        <Skeleton width="20rem" className="mb-2"></Skeleton>
        <Skeleton width="25rem" className="mb-2"></Skeleton>
        <Skeleton height="2rem" className="mb-2"></Skeleton>

        <Skeleton className="mb-2"></Skeleton>
        <Skeleton width="20rem" className="mb-2"></Skeleton>
        <Skeleton width="25rem" className="mb-2"></Skeleton>
        <Skeleton height="2rem" className="mb-2"></Skeleton>
    </div>
);
