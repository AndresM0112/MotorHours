import React from "react";
import "./styles/CardGrid.css";

const CardGrid = ({
    titulo,
    icono,
    color,
    textColor = "black",
    backgroundColor = "#fff",
    backgroundColorIcon = "#ccc",
    contador = null,
    onClick,
    isButton = false,
    href = "#",
    isActive = false,
}) => {
    const cardContent = (
        <div
            className={`card-custom ${isActive ? "active-card" : ""}`}
            style={{
                background: backgroundColor,
                transform: isActive ? "scale(1.05)" : "scale(1)",
                transition: "all 0.3s ease",
            }}
        >
            <div className="icon" style={{ backgroundColor: backgroundColorIcon }}>
                <i
                    className={icono}
                    style={{ color: textColor, fontSize: "20px", fontWeight: "bold" }}
                ></i>
            </div>
            <h5 style={{ color: "black" }}>{titulo}</h5>
            {<span className="counter">{contador !== null ? contador : "\u00A0"}</span>}
        </div>
    );

    if (isButton) {
        return (
            <div onClick={onClick} className="grid-item" style={{ cursor: "pointer" }}>
                {cardContent}
            </div>
        );
    }
    return (
        <a href={href} className="grid-item">
            {cardContent}
        </a>
    );
};

export default CardGrid;
