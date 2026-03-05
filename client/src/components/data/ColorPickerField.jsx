import React, { useState, useRef, forwardRef } from "react";
import { OverlayPanel } from "primereact/overlaypanel";
import { ColorPicker } from "primereact/colorpicker";
import { InputText } from "primereact/inputtext";
import "./styles/ColorPickerButton.css";

const presetColors = [
    "#F76D6D",
    "#6AD9D9",
    "#F9D689",
    "#F86C29",
    "#9C6EFF",
    "#F65EA1",
    "#6C925D",
    "#7CE1AD",
    "#D0D0D0",
    "#68B684",
    "#C650F3",
    "#6C2C2C",
];

const ColorPickerButton = forwardRef(({ value, onChange }, ref) => {
    const [hex, setHex] = useState(value || "#F9D689");
    const op = useRef(null);

    const handleColorSelect = (color) => {
        setHex(color);
        onChange(color);
        op.current.hide();
    };

    const handleCustomColorChange = (e) => {
        const newColor = `#${e.value}`;
        setHex(newColor);
        onChange(newColor);
    };

    return (
        <div ref={ref}>
            <button
                className="color-picker-button"
                style={{ backgroundColor: hex }}
                onClick={(e) => op.current.toggle(e)}
                type="button"
            />
            <OverlayPanel ref={op} className="custom-overlay-panel">
                <div className="color-grid">
                    {presetColors.map((color) => (
                        <div
                            key={color}
                            className={`color-swatch ${color === hex ? "selected" : ""}`}
                            style={{ backgroundColor: color }}
                            onClick={() => handleColorSelect(color)}
                        />
                    ))}
                </div>
                <div className="custom-color-section">
                    <ColorPicker value={hex.replace("#", "")} onChange={handleCustomColorChange} />
                    <InputText value={hex} readOnly className="hex-display" />
                </div>
            </OverlayPanel>
        </div>
    );
});

export default ColorPickerButton;
