import React, { useState, useEffect, useCallback } from "react";
import { InputText } from "primereact/inputtext";
import { debounce } from "lodash";
import { InputTextarea } from "primereact/inputtextarea";
import CurrencyInput from "react-currency-input-field";

const DebouncedInput = ({ value, onChange, type = "text", delay = 1000, props }) => {
    const [inputValue, setInputValue] = useState(value);

    // Crea una versión debounced de la función de cambio
    // Usa useCallback para evitar la creación de una nueva función en cada render
    const debouncedChange = useCallback(
        debounce((newValue) => {
            onChange(newValue);
        }, delay),
        [onChange, delay]
    );

    // Maneja cambios inmediatos en el input para actualización visual
    const handleChange = (newValue) => {
        if (type === "currency" && isNaN(Number(newValue))) {
            return; // Evitar actualizar el estado y la llamada debounced si el valor es NaN
        }
        setInputValue(newValue);
        debouncedChange(newValue);
    };

    // Actualiza el valor local cuando el valor externo cambie
    useEffect(() => {
        setInputValue(value);
    }, [value]);

    let InputComponent = InputText;
    if (type === "textarea") {
        InputComponent = InputTextarea;
    } else if (type === "currency") {
        InputComponent = CurrencyInput;
        return (
            <InputComponent
                value={inputValue}
                onValueChange={handleChange} // Usar onValueChange específico para CurrencyInput
                onBlur={() => onChange(inputValue)}
                {...props}
            />
        );
    }

    return (
        <InputComponent
            value={inputValue}
            onChange={(e) => handleChange(e.target.value)}
            onBlur={() => onChange(inputValue)}
            {...props}
        />
    );
};

export default DebouncedInput;
