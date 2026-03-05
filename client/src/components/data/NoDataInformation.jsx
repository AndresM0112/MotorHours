import React from "react";

const NoDataInformation = ({ img = "notifications.svg", text }) => {
    return (
        <div style={{ textAlign: "center", padding: "20px" }}>
            <img
                src={`${process.env.PUBLIC_URL}/images/${img}`}
                alt="No data"
                style={{ maxWidth: "60%", height: "auto" }}
            />
            <h4 className="text-center">{text}</h4>
        </div>
    );
};

export default NoDataInformation;
