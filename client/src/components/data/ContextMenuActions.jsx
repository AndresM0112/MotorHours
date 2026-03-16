import React, { useRef } from "react";
import PropTypes from "prop-types";
import { Button } from "primereact/button";
import { Menu } from "primereact/menu";

const ContextMenuActions = ({ menuItems, itemId }) => {
    const menu = useRef(null);

    // Personaliza los items para incluir el estilo dinámico y el manejo de clics
    const customizedMenuItems = menuItems.filter((item) => item.visible !== false).map((item) => ({
        ...item,
        template: (item, options) => (
            <span
                className={options.className}
                style={{ color: item.color || "black" }}
                onClick={(e) => {
                    e.stopPropagation(); // Previene la propagación del evento
                    item.command(); // Ejecuta el comando del item
                    menu.current.hide(); // Cierra el menú después de ejecutar el comando
                }}
            >
                <i className={item.icon} style={{ fontWeight: 700 }}></i>
                <span className="ml-2 p-menuitem-text">{item.label}</span>
            </span>
        ),
    }));

    return (
        <div className="actions">
            <Menu ref={menu} model={customizedMenuItems} popup id={`menu_${itemId}`} />
            <Button
                onClick={(event) => {
                    event.stopPropagation();
                    menu.current.toggle(event);

                }}
                className="p-button-rounded p-button-text p-button-plain"
                icon="pi pi-ellipsis-v"
                aria-controls={`menu_${itemId}`}
                aria-haspopup
            />
        </div>
    );
};

ContextMenuActions.propTypes = {
    menuItems: PropTypes.arrayOf(
        PropTypes.shape({
            label: PropTypes.string.isRequired,
            icon: PropTypes.string,
            command: PropTypes.func,
            disabled: PropTypes.bool,
            color: PropTypes.string, // Añade la definición para el color
        })
    ).isRequired,
    itemId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
};

export default ContextMenuActions;
