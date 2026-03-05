import React, { useCallback, useRef } from "react";
import { OverlayPanel } from "primereact/overlaypanel";
import { Dropdown } from "primereact/dropdown";
import { InputText } from "primereact/inputtext";
import { Calendar } from "primereact/calendar";
import { SelectButton } from "primereact/selectbutton";
import { MultiSelect } from "primereact/multiselect";
import { Button } from "primereact/button";
import { debounce } from "lodash";
import { propsSelect } from "@utils/converAndConst";
import { Chips } from "primereact/chips";

const FilterOverlay = ({ filters, setFilters, initialFilters, overlayRef }) => {
    const debounceSetFilters = useCallback(
        debounce((inputName, value) => {
            setFilters((prevState) => ({ ...prevState, [inputName]: value }));
        }, 500), // Tiempo de espera en milisegundos
        []
    );

    const inputRefs = useRef([]);

    const handleKeyUp = (event, inputName) => {
        const { value } = event.target;
        debounceSetFilters(inputName, value);
    };

    const clearFilters = () => {
        setFilters(() => initialFilters); // Resetear los filtros en el estado

        // Resetear los valores de los InputText utilizando las referencias
        inputRefs.current.forEach((ref) => {
            if (ref) {
                ref.value = ""; // O el valor predeterminado que desees
            }
        });
    };

    return (
        <OverlayPanel ref={overlayRef} style={{ maxWidth: "700px" }} dismissable>
            <div className="grid p-fluid">
                {filters.map((filter, index) => (
                    <div
                        key={index}
                        className={filter.type === "chips" ? "col-12" : `col-12 md:col-4 mt-2`}
                    >
                        <span className="p-float-label">
                            {filter.type === "dropdown" && (
                                <Dropdown
                                    {...filter.props}
                                    value={filter.filtro || null}
                                    showClear={filter.showClear ? filter.showClear : false}
                                    onChange={(e) =>
                                        setFilters((prev) => ({
                                            ...prev,
                                            [filter.key]: e.value ? e.value : null,
                                        }))
                                    }
                                />
                            )}
                            {filter.type === "input" && (
                                <InputText
                                    ref={(el) => (inputRefs.current[index] = el)}
                                    defaultValue={filter.filtro || ""}
                                    onKeyUp={(event) => handleKeyUp(event, filter.key)}
                                />
                            )}
                            {filter.type === "calendar" && (
                                <Calendar
                                    {...filter.props}
                                    value={filter.filtro || null}
                                    onChange={(e) => {
                                        setFilters((prev) => ({
                                            ...prev,
                                            [filter.key]: e.value ? e.value : null,
                                        }));
                                    }}
                                />
                            )}
                            {filter.type === "calendar-range" && (
                                <Calendar
                                    {...filter.props}
                                    value={filter.filtro || null}
                                    onChange={(e) => {
                                        setFilters((prev) => ({
                                            ...prev,
                                            [filter.key]: e.value ? e.value : null,
                                        }));
                                    }}
                                    selectionMode="range"
                                />
                            )}
                            {filter.type === "selectButton" && (
                                <SelectButton
                                    {...filter.props}
                                    value={filter.filtro || null}
                                    onChange={(e) =>
                                        setFilters((prev) => ({
                                            ...prev,
                                            [filter.key]: e.value,
                                        }))
                                    }
                                />
                            )}
                            {filter.type === "multiSelect" && (
                                <MultiSelect
                                    {...propsSelect}
                                    {...filter.props}
                                    value={
                                        filter?.filtro
                                            ? filter?.filtro?.split(",").map(Number)
                                            : null
                                    }
                                    onChange={(e) => {
                                        setFilters((prev) => ({
                                            ...prev,
                                            [filter.key]: e.value?.join(","),
                                        }));
                                    }}
                                />
                            )}
                            {filter.type === "chips" && (
                                <Chips
                                    value={filter.filtro || []}
                                    separator=","
                                    onChange={(e) =>
                                        setFilters((prev) => ({
                                            ...prev,
                                            [filter.key]: e.value,
                                        }))
                                    }
                                />
                            )}
                            <label>{filter.label}</label>
                        </span>
                    </div>
                ))}
                <div className={`col-12 md:col-4 mt-2`}>
                    <Button
                        label="Limpiar filtros"
                        className="p-button-secondary ml-auto"
                        onClick={clearFilters}
                    />
                </div>
            </div>
        </OverlayPanel>
    );
};

export default FilterOverlay;
