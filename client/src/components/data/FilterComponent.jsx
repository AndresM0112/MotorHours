import React from "react";
import { Accordion, AccordionTab } from "primereact/accordion";
import { Dropdown } from "primereact/dropdown";
import { InputText } from "primereact/inputtext";
import { Calendar } from "primereact/calendar";
import PropTypes from "prop-types";

const FilterComponent = ({ filters, setFilters }) => {
    const handleKeyUp = (event, inputName) => {
        if (event.keyCode === 13) {
            const { value } = event.target;
            setFilters((prevState) => ({ ...prevState, [inputName]: value }));
        }
    };

    return (
        <div className="grid">
            <div className="col-12 md:col-12">
                <Accordion className="accordion-custom">
                    <AccordionTab
                        header={
                            <span>
                                Filtros <i className="pi pi-search ml-2"></i>
                            </span>
                        }
                    >
                        <div className="grid p-fluid">
                            {filters.map((filter, index) => (
                                <div key={index} className={`col-12 md:col-3 mt-2`}>
                                    <span className="p-float-label">
                                        {filter.type === "dropdown" && (
                                            <Dropdown
                                                {...filter.props}
                                                value={filter.filtro}
                                                showClear={
                                                    filter.showClear ? filter.showClear : false
                                                }
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
                                                defaultValue={filter.value}
                                                onKeyUp={(event) => handleKeyUp(event, filter.key)}
                                            />
                                        )}
                                        {filter.type === "calendar" && (
                                            <Calendar
                                                {...filter.props}
                                                value={filter.filtro}
                                                onChange={(e) => {
                                                    setFilters((prev) => ({
                                                        ...prev,
                                                        [filter.key]: e.value ? e.value : null,
                                                    }));
                                                }}
                                                selectionMode="range"
                                            />
                                        )}
                                        <label>{filter.label}</label>
                                    </span>
                                </div>
                            ))}
                        </div>
                    </AccordionTab>
                </Accordion>
            </div>
        </div>
    );
};

FilterComponent.propTypes = {
    filters: PropTypes.arrayOf(
        PropTypes.shape({
            type: PropTypes.oneOf(["dropdown", "input", "calendar"]).isRequired, // Tipo del filtro, obligatorio.
            key: PropTypes.string.isRequired, // Clave única para identificar el filtro.
            label: PropTypes.string.isRequired, // Etiqueta del filtro.
            filtro: PropTypes.oneOfType([
                PropTypes.string,
                PropTypes.number,
                PropTypes.object,
                null,
            ]), // Valor del filtro, puede ser de varios tipos.
            props: PropTypes.object, // Props adicionales para el componente del filtro.
            showClear: PropTypes.bool, // Si se permite limpiar el filtro.
        })
    ).isRequired, // La lista de filtros es obligatoria.
    setFilters: PropTypes.func.isRequired, // Función para actualizar los filtros.
};

export default FilterComponent;
