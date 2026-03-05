import React from "react";
import { Chip } from "primereact/chip";

const ChipStatusOperation = ({ id, nameStatus }) => {
    return (
        <Chip
            label={nameStatus}
            className="mr-2 mb-2"
            style={{
                background: id === 1 ? "#f59e0b" : id === 2 ? "#4757e7" : id === 3 ? "#00a19b" : "",
                color: "white",
            }}
        />
    );
};

export default ChipStatusOperation;
