import React, { useContext, useState } from "react";
import { Sidebar } from "primereact/sidebar";
import { VenAjusteCuenta } from "../generales/VenAjusteCuenta";
import { VenReglas } from "../generales/VenReglas";
import { AuthContext } from "@context/auth/AuthContext";
import "@styles/usermenu.css";
import PropTypes from "prop-types";

const UserMenuSidebar = ({ visible, onClose }) => {
    const { logout, nombreusuario } = useContext(AuthContext);
    const [visibleRules, setVisibleRules] = useState(false);
    const [visibleTopbar, setVisibleTopbar] = useState(false);

    const menuItems = [
        // {
        //     label: "Reglas de Negocio",
        //     icon: "pi pi-key",
        //     description: "Configura tus reglas de negocio",
        //     command: () => setVisibleRules(true),
        // },
        // {
        //     label: "Ajuste de Cuenta",
        //     icon: "pi pi-fw pi-cog",
        //     description: "Configura tu cuenta",
        //     command: () => setVisibleTopbar(true),
        // },
        {
            label: "Cerrar Sesión",
            icon: "pi pi-power-off",
            command: () => logout(),
        },
    ];

    return (
        <Sidebar
            visible={visible}
            position="right"
            onHide={onClose}
            style={{ width: 320 }}
            dismissable={true}
            baseZIndex={2000} 
        >
            <div className="user-sidebar-header">
                <span>¡Hola! Qué gusto verte de nuevo</span>
                <h4>{nombreusuario}</h4>
            </div>

            <div className="user-sidebar-menu">
                {menuItems.map((item, index) => (
                    <div key={index} className="user-sidebar-menu-item" onClick={item.command}>
                        <div className="menu-item-content">
                            <i className={`${item.icon} menu-item-icon`} />
                            <div className="menu-item-text">
                                <div className="menu-item-label">{item.label}</div>
                                {item.description && (
                                    <div className="menu-item-description">{item.description}</div>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <VenAjusteCuenta visible={visibleTopbar} setVisible={setVisibleTopbar} />
            {visibleRules && <VenReglas visible={visibleRules} setVisible={setVisibleRules} />}
        </Sidebar>
    );
};

UserMenuSidebar.propTypes = {
    visible: PropTypes.bool.isRequired, // Controla si el sidebar es visible.
    onClose: PropTypes.func.isRequired, // Función para manejar el cierre del sidebar.
};

export default UserMenuSidebar;
