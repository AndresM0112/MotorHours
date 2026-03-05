import React from "react";
// PRIMEREACT
import { InputText } from "primereact/inputtext";
import { InputTextarea } from "primereact/inputtextarea";
import { Dropdown } from "primereact/dropdown";
// OTROS
import CurrencyInput from "react-currency-input-field";
// UTILS
import { fCurrencyWithOutDecimal } from "@utils/formatNumber";
import { propsCurrencyInput, propsSelect } from "@utils/converAndConst";

const EditInput = ({ options, type, props = {} }) => {
    const { value, editorCallback } = options;

    switch (type) {
        case "text":
            if (props.disabled) return <div className="p-disabled">{value}</div>;
            return (
                <InputText
                    style={{ width: "100%" }}
                    value={value || ""}
                    onChange={(e) => editorCallback(e.target.value)}
                    {...props}
                />
            );
        case "textArea":
            if (props.disabled) return <div className="p-disabled">{value}</div>;
            return (
                <InputTextarea
                    style={{ width: "100%" }}
                    rows={1}
                    autoResize
                    value={value || ""}
                    onKeyDown={(event) => {
                        if (event.key === "Enter") event.stopPropagation();
                    }}
                    onChange={(e) => editorCallback(e.target.value)}
                    {...props}
                />
            );
        case "currency":
            if (props.disabled)
                return (
                    <div className="text-right p-disabled">{fCurrencyWithOutDecimal(value)}</div>
                );
            return (
                <CurrencyInput
                    style={{ width: "100%" }}
                    {...propsCurrencyInput}
                    defaultValue={value || ""}
                    onValueChange={(v) => editorCallback(v || 0)}
                />
            );
        case "dropdown":
            if (props.disabled) return <div className="p-disabled">{props.textValue}</div>;
            return (
                <Dropdown
                    style={{ width: "100%" }}
                    value={value || null}
                    {...propsSelect}
                    {...props}
                />
            );

        default:
            return <div></div>;
    }
};

export default EditInput;
