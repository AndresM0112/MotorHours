import React, { useCallback, useRef } from "react";
import { Sidebar } from "primereact/sidebar";
import { Dropdown } from "primereact/dropdown";
import { InputText } from "primereact/inputtext";
import { Calendar } from "primereact/calendar";
import { SelectButton } from "primereact/selectbutton";
import { MultiSelect } from "primereact/multiselect";
import { Button } from "primereact/button";
import { debounce } from "lodash";
import { Chips } from "primereact/chips";
import { propsSelect } from "@utils/converAndConst";

const FilterSidebar = ({ visible, onHide, filters, setFilters, initialFilters }) => {
    const debounceSetFilters = useCallback(
        debounce((inputName, value) => {
            setFilters((prev) => ({ ...prev, [inputName]: value }));
        }, 500),
        []
    );

    const inputRefs = useRef([]);

    const handleKeyUp = (event, inputName) => {
        const { value } = event.target;
        debounceSetFilters(inputName, value || null);
    };

    const clearFilters = () => {
        setFilters(() => initialFilters);
        inputRefs.current.forEach((ref) => {
            if (ref) ref.value = "";
        });
    };

    return (
        <Sidebar
            visible={visible}
            onHide={onHide}
            position="right"
            className="apt-filters-sidebar p-sidebar-md"
            blockScroll
            dismissable={true}
        >
            <div className="flex flex-column gap-2 mb-4">
                <h3 className="text-primary font-bold m-0">Filtros avanzados</h3>
                <span className="text-sm text-color-secondary">
                    Personaliza tu búsqueda seleccionando uno o más criterios.
                </span>
            </div>

            <div className="grid p-fluid">
                {filters.map((filter, index) => (
                    <div key={index} className="col-12 mt-3">
                        <span className="p-float-label">
                            {filter.type === "dropdown" && (
                                <Dropdown
                                    {...filter.props}
                                    value={filter.filtro || null}
                                    showClear={filter.showClear ?? false}
                                    onChange={(e) =>
                                        setFilters((prev) => ({
                                            ...prev,
                                            [filter.key]: e.value || null,
                                        }))
                                    }
                                />
                            )}
                            {filter.type === "input" && (
                                <InputText
                                    ref={(el) => (inputRefs.current[index] = el)}
                                    defaultValue={filter.filtro || ""}
                                    onKeyUp={(e) => handleKeyUp(e, filter.key)}
                                />
                            )}
                            {filter.type === "calendar" && (
                                <Calendar
                                    {...filter.props}
                                    value={filter.filtro || null}
                                    onChange={(e) =>
                                        setFilters((prev) => ({
                                            ...prev,
                                            [filter.key]: e.value || null,
                                        }))
                                    }
                                />
                            )}
                            {filter.type === "calendar-range" && (
                                <Calendar
                                    {...filter.props}
                                    selectionMode="range"
                                    value={filter.filtro || null}
                                    onChange={(e) =>
                                        setFilters((prev) => ({
                                            ...prev,
                                            [filter.key]: e.value || null,
                                        }))
                                    }
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
                                        filter.filtro
                                            ? filter.filtro.length > 0
                                                ? filter.filtro?.split(",").map(Number)
                                                : null
                                            : null
                                    }
                                    onChange={(e) =>
                                        setFilters((prev) => ({
                                            ...prev,
                                            [filter.key]: e.value?.join(","),
                                        }))
                                    }
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
            </div>

            <div className="flex justify-content-between mt-5">
                <Button
                    label="Limpiar"
                    icon="pi pi-trash"
                    className="p-button-secondary"
                    onClick={clearFilters}
                />
                <Button
                    label="Aplicar filtros"
                    icon="pi pi-check"
                    className="p-button-primary"
                    onClick={onHide}
                />
            </div>
        </Sidebar>
    );
};

export default FilterSidebar;
