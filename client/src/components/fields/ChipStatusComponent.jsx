import React from "react";
import { Chip } from "primereact/chip";

const ChipStatusComponent = ({ id, nameStatus, background = "#00a19b", color = "white" }) => {
    return (
        <Chip
            label={nameStatus}
            className="mr-2 mb-2"
            style={{
                background,
                color,
            }}
        />
    );
};

export default ChipStatusComponent;
