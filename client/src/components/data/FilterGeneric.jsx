import React, { useRef, memo, useState, useMemo } from "react";
import { Dropdown } from "primereact/dropdown";
import { InputText } from "primereact/inputtext";
import { Calendar } from "primereact/calendar";
import { Chips } from "primereact/chips";
import { MultiSelect } from "primereact/multiselect";
import { SelectButton } from "primereact/selectbutton";
import { Panel } from "primereact/panel";
import PropTypes from "prop-types";
import { propsSelect } from "@utils/converAndConst";
import { Sidebar } from "primereact/sidebar";
import { Button } from "primereact/button";

// --- Componente presentacional de los campos ---
const FilterFormatter = memo(function FilterFormatter({ filters, setFilters, handleKeyUp }) {
    const inputRefs = useRef([]);

    if (!filters || filters.length === 0) return null;

    return (
        <div className="grid p-fluid w-full mt-2">
            {filters.map((filter, index) => (
                <div
                    key={filter.key ?? index}
                    className={filter?.className ? filter.className : "col-12 md:col-3 mt-2"}
                >
                    <span className="p-float-label">
                        {filter.type === "dropdown" && (
                            <Dropdown
                                value={filter.filtro ?? null}
                                onChange={(e) =>
                                    setFilters((prev) => ({
                                        ...prev,
                                        [filter.key]: e.value ?? null,
                                    }))
                                }
                                {...filter.props}
                                showClear={filter.showClear ?? false}
                            />
                        )}

                        {filter.type === "input" && (
                            <InputText
                                ref={(el) => (inputRefs.current[index] = el)}
                                defaultValue={filter.filtro ?? ""}
                                onKeyUp={(event) => handleKeyUp(event, filter.key)}
                            />
                        )}

                        {filter.type === "calendar" && (
                            <Calendar
                                {...filter.props}
                                value={filter.filtro ?? null}
                                onChange={(e) =>
                                    setFilters((prev) => ({
                                        ...prev,
                                        [filter.key]: e.value ?? null,
                                    }))
                                }
                            />
                        )}

                        {filter.type === "calendar-range" && (
                            <Calendar
                                {...filter.props}
                                value={filter.filtro ?? null}
                                selectionMode="range"
                                onChange={(e) =>
                                    setFilters((prev) => ({
                                        ...prev,
                                        [filter.key]: e.value ?? null,
                                    }))
                                }
                            />
                        )}

                        {filter.type === "selectButton" && (
                            <SelectButton
                                value={filter.filtro ?? null}
                                onChange={(e) =>
                                    setFilters((prev) => ({
                                        ...prev,
                                        [filter.key]: e.value,
                                    }))
                                }
                                {...filter.props}
                            />
                        )}

                        {filter.type === "multiSelect" && (
                            <MultiSelect
                                {...propsSelect}
                                {...filter.props}
                                value={filter.filtro ?? null}
                                onChange={(e) =>
                                    setFilters((prev) => ({
                                        ...prev,
                                        [filter.key]: e.value,
                                    }))
                                }
                            />
                        )}

                        {filter.type === "chips" && (
                            <Chips
                                value={filter.filtro ?? []}
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
    );
});

FilterFormatter.propTypes = {
    filters: PropTypes.array.isRequired,
    setFilters: PropTypes.func.isRequired,
    handleKeyUp: PropTypes.func.isRequired,
};

// --- Contenedor con Panel y header ---
const FilterGeneric = ({ filters, setFilters, initialFilters, headerTemplateFilter, typeFilter = 1, isMobile = false }) => {
    const [visible, setVisible] = useState(false);
    const inputRefs = useRef([]);
    const handleKeyUp = (event, inputName) => {
        if (event.key === "Enter") {
            const { value } = event.target;
            setFilters((prevState) => ({ ...prevState, [inputName]: value }));
        }
    };

    const clearFilters = () => {
        setFilters(() => initialFilters); // Resetea los filtros en el estado

        // Resetea los valores de los InputText utilizando las referencias
        inputRefs.current.forEach((ref) => {
            if (ref) {
                ref.value = ""; // O el valor predeterminado que desees
            }
        });
    };


    const externos = Array.isArray(filters) ? filters.filter((f) => f?.externo === true) : [];
    const internos = Array.isArray(filters) ? filters.filter((f) => !f?.externo) : [];

    const getActiveFiltersCount = (filters) => {
        return Object.values(filters).filter((value) => {
            const f = value?.filtro;
            if (Array.isArray(f)) return f.length > 0;
            return Boolean(f);
        }).length;
    };

    const activeFiltersCount = useMemo(() => getActiveFiltersCount(filters), [filters]);

    // ---- móvil: todo al sidebar
    if (isMobile) {
        return (
            <div className={`flex align-items-center justify-content-${isMobile ? 'end' : 'between'} gap-2 pr-4`}>
                <Button icon="pi pi-filter" label="Filtros" className="p-button-outlined" onClick={() => setVisible(true)}
                  badge={activeFiltersCount > 0 ? String(activeFiltersCount) : null}
                />
                {/* {activeFiltersCount > 0 && (
                    <span
                        className="fade-in"
                        style={{
                            position: "absolute",
                            top: "-8px",
                            right: "-8px",
                            backgroundColor: "#f44336",
                            color: "#fff",
                            borderRadius: "50%",
                            padding: "3px 7px",
                            fontSize: "10px",
                            fontWeight: "bold",
                            zIndex: 1,
                        }}
                    >
                        {activeFiltersCount}
                    </span>
                )} */}
                <Sidebar visible={visible} onHide={() => setVisible(false)} position="right" style={{ width: "80vw" }}>
                    <div className="justify-content-center align-items-center" style={
                        {
                            position: "absolute",
                            top: "0px",
                            width: "85%"
                        }
                    }>
                        <div className=" text-center mt-3 mb-3 w-full">
                            <h3>Filtros</h3>
                        </div>
                    </div>
                    <FilterFormatter filters={filters} setFilters={setFilters} handleKeyUp={handleKeyUp} />
                </Sidebar>
            </div>
        );
    }

    // ---- desktop: typeFilter=1 y hay externos -> externos izq, botón der, internos al sidebar
    if (typeFilter === 1 && externos.length > 0) {
        return (
            <>
                {/* misma línea: externos (izq) + botón Filtros (der) */}
                <div className={`flex align-items-center justify-content-${isMobile ? 'end' : 'between'} gap-2`}>
                    {/* externos alineados a la izquierda con wrap */}
                    <div className="flex-1">
                        <div className="flex flex-wrap gap-2">
                            <FilterFormatter filters={externos} setFilters={setFilters} handleKeyUp={handleKeyUp} />
                        </div>
                    </div>

                    {/* botón alineado a la derecha */}
                    {internos.length > 0 && (
                        <div className="flex justify-content-end">
                            <Button
                                icon="pi pi-filter"
                                label="Filtros"
                                className="p-button-outlined"
                                onClick={() => setVisible(true)}
                                badge={activeFiltersCount > 0 ? String(activeFiltersCount) : null}
                            />
                            {/* {activeFiltersCount > 0 && (
                                <span
                                    className="fade-in"
                                    style={{
                                        position: "absolute",
                                        top: "-8px",
                                        right: "-8px",
                                        backgroundColor: "#f44336",
                                        color: "#fff",
                                        borderRadius: "50%",
                                        padding: "3px 7px",
                                        fontSize: "10px",
                                        fontWeight: "bold",
                                        zIndex: 1,
                                    }}
                                >
                                    {activeFiltersCount}
                                </span>
                            )} */}
                        </div>
                    )}
                </div>

                {/* sidebar con internos */}
                <Sidebar
                    visible={visible}
                    onHide={() => setVisible(false)}
                    position="right"
                    style={{ width: "30vw", maxWidth: 480 }}
                >
                    <div className="justify-content-center align-items-center" style={
                        {
                            position: "absolute",
                            top: "0px",
                            width: "85%"
                        }
                    }>
                        <div className=" text-center mt-3 mb-3 w-full">
                            <h3>Filtros</h3>
                        </div>
                    </div>

                    <FilterFormatter filters={internos} setFilters={setFilters} handleKeyUp={handleKeyUp} />
                    <div className="grid p-fluid">

                        <div className={`col-12 md:col-4 mt-2`}>
                            <Button
                                label="Limpiar filtros"
                                className="p-button-secondary ml-auto"
                                onClick={clearFilters}
                            />
                            {/* {isMobile && (
                                <Button
                                    label="Cancelar"
                                    className="p-button-secondary ml-auto mt-2"
                                    onClick={(e) => overlayRef?.current?.hide()}
                                />
                            )} */}
                        </div>
                    </div>
                </Sidebar>
            </>
        );
    }

    // ---- comportamiento normal (sin externos o typeFilter !== 1)
      return typeFilter === 2 ? (
      // inline “tal cual me lo mandes”
      <FilterFormatter filters={filters} setFilters={setFilters} handleKeyUp={handleKeyUp} />
    ) : (
        <Panel
            {...(headerTemplateFilter
                ? { headerTemplate: headerTemplateFilter }
                : { header: <span>Filtros <i className="pi pi-search ml-2" /></span> })}
            toggleable
            collapsed
        >
            <FilterFormatter filters={internos} setFilters={setFilters} handleKeyUp={handleKeyUp} />
        </Panel>
    );
};


FilterGeneric.propTypes = {
    filters: PropTypes.arrayOf(
        PropTypes.shape({
            type: PropTypes.oneOf([
                "dropdown",
                "input",
                "calendar",
                "multiSelect",
                "chips",
                "selectButton",
                "calendar-range",
            ]).isRequired,
            key: PropTypes.string.isRequired,
            label: PropTypes.string.isRequired,
            filtro: PropTypes.oneOfType([
                PropTypes.string,
                PropTypes.number,
                PropTypes.object,
                PropTypes.array,
                PropTypes.bool,
                PropTypes.null,
            ]),
            props: PropTypes.object,
            showClear: PropTypes.bool,
            externo: PropTypes.bool, // <-- nuevo flag
        })
    ).isRequired,
    setFilters: PropTypes.func.isRequired,
    headerTemplateFilter: PropTypes.oneOfType([PropTypes.node, PropTypes.func]),
    typeFilter: PropTypes.number,
    isMobile: PropTypes.bool,
};

export default FilterGeneric;
