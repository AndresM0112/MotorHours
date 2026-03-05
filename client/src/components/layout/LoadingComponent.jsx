import React from "react";
import "./styles/loading.css";

const LoadingComponent = () => {
    return (
        <div className="loader-container">
            <span className="loader-5"></span>
            <strong>Obteniendo datos ...</strong>
        </div>
    );
};

export default LoadingComponent;
