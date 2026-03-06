import React, { useEffect, useState, useRef, useContext } from "react";
import { Link } from "react-router-dom";
import classNames from "classnames";
import { RiUserSettingsLine, RiSearchLine, RiNotification2Line } from "react-icons/ri";
import UserMenuSidebar from "./UserMenuSidebar";
import SearchModal from "./SearchModal";
import Axios from "axios";
import { updateNotificationView } from "@utils/observables";
import { AuthContext } from "@context/auth/AuthContext";
import useHandleApiError from "@hook/useHandleApiError";
import Notifications from "@components/ui/Notifications";
import { useMediaQueryContext } from "@context/mediaQuery/mediaQueryContext";
import usePermissions from "@context/permissions/usePermissions";

import socket from "socket/socket";

export const AppTopbar = (props) => {
    const [visibleUserMenuSidebar, setVisibleUserMenuSidebar] = useState(false);
    const [visibleSearchModal, setVisibleSearchModal] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);
    const [shouldShake, setShouldShake] = useState(false);
    const [visibleNotifications, setVisibleNotifications] = useState(false);

    const { hasPermission } = usePermissions();
    // TODO: Sistema de tickets eliminado para taller de motos
    // const canCreate = hasPermission("home", "tickets", "create");
    // const venTicketsRef = useRef();

    const { idusuario } = useContext(AuthContext);
    const { isMobile } = useMediaQueryContext();
    const handleApiError = useHandleApiError();

    const usuarioRef = useRef(idusuario);

    // Mantener actualizado el ref del usuario
    useEffect(() => {
        usuarioRef.current = idusuario;
    }, [idusuario]);

    // Animación de shake para botón
    const shakeAnimation = (times) => {
        let count = 0;
        const shake = () => {
            setShouldShake(true);
            setTimeout(() => {
                setShouldShake(false);
                if (++count < times) setTimeout(shake, 50);
            }, 2000);
        };
        shake();
    };

    // Obtener conteo de notificaciones no leídas
    useEffect(() => {
        const getNotificationsCount = async () => {
            try {
                const { data } = await Axios.get("api/notifications/get_notification_count", {
                    params: { userId: idusuario },
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem("tokenCAJEROSSOPORTICA")}`,
                    },
                });
                setUnreadCount(data);
                if (data > 0) shakeAnimation(3);
            } catch (error) {
                handleApiError(error);
            }
        };

        if (idusuario) getNotificationsCount();
    }, [idusuario, handleApiError]);

    // Reacción a lecturas desde observables
    useEffect(() => {
        const subscription = updateNotificationView.getNotification().subscribe((tipo) => {
            if (tipo === "allRead") {
                setUnreadCount(0);
            } else if (tipo === "singleRead") {
                setUnreadCount((prev) => Math.max(prev - 1, 0));
            }
        });
        return () => subscription.unsubscribe();
    }, []);

    useEffect(() => {
        const handleNotification = (data) => {
            console.log({ socketIo: data });

            if (Number(data.usu_id) === Number(usuarioRef.current)) {
                setUnreadCount((prev) => prev + 1);
                shakeAnimation(3);
            }
        };

        socket.on("notification:new", handleNotification);

        return () => {
            socket.off("notification:new", handleNotification);
        };
    }, []);

    // Atajo para abrir buscador (Ctrl+B)
    // useEffect(() => {
    //     const handleKeyDown = (e) => {
    //         if (e.ctrlKey && e.key.toLowerCase() === "b") {
    //             setVisibleSearchModal((prev) => !prev);
    //         }
    //     };
    //     document.addEventListener("keydown", handleKeyDown);
    //     return () => document.removeEventListener("keydown", handleKeyDown);
    // }, []);

    // Atajo para abrir buscador (Ctrl+B)
    useEffect(() => {
        const onKey = (e) => {
            if (e.ctrlKey && e.key.toLowerCase() === "b") {
                e.preventDefault();
                setVisibleSearchModal((p) => !p);
            }
        };

        document.addEventListener("keydown", onKey);
        return () => document.removeEventListener("keydown", onKey);
    }, []);

    // TODO: Sistema de tickets eliminado para taller de motos
    // const handleNuevaTarea = () => {
    //     if (venTicketsRef.current?.newTicket) {
    //         venTicketsRef.current.newTicket();
    //     }
    // };

    return (
        <>
            <div className="layout-topbar">
                <Link to="/" className="layout-topbar-logo">
                    <img
                        src={`${process.env.PUBLIC_URL}/images/logos/miniLogoMotorHours.png`}
                        alt="Logo MotorHours"
                        width={30}
                    />
                </Link>

                <div className="layout-topbar-menu-button">
                    <div className="notification-wrapper">
                        {/* <button
                            className={`p-link layout-topbar-button notification-button ${
                                shouldShake ? "shake" : ""
                            }`}
                            onClick={() => setVisibleNotifications((prev) => !prev)}
                            aria-label="Abrir notificaciones"
                        >
                            <RiNotification2Line size={18} />
                            <span>Notificaciones</span>
                        </button> */}
                        {unreadCount > 0 && <span className="dot-notification" />}
                    </div>

                    <button
                        className="p-link layout-topbar-button"
                        onClick={() => setVisibleUserMenuSidebar(true)}
                        type="button"
                    >
                        <i className="pi pi-ellipsis-v" />
                    </button>
                </div>

                <div className="layout-menu-button">
                    <button
                        type="button"
                        className="p-link link-button layout-topbar-button"
                        onClick={props.onToggleMenuClick}
                    >
                        <i className="pi pi-bars" />
                    </button>
                    <button
                        className="p-link layout-topbar-button"
                        onClick={() => setVisibleSearchModal(true)}
                        aria-label="Abrir buscador"
                    >
                        <RiSearchLine size={18} />
                        <span>Buscar</span>
                    </button>
                </div>

                <ul
                    className={classNames("layout-topbar-menu lg:flex origin-top", {
                        "layout-topbar-menu-mobile-active": props.mobileTopbarMenuActive,
                    })}
                >
                    {/* TODO: Botón "Nueva Tarea" eliminado para taller de motos
                    <li>
                        {!isMobile && canCreate && (
                            <button
                                className="p-link layout-topbar-button"
                                onClick={handleNuevaTarea}
                                type="button"
                            >
                                <i className="pi pi-plus" />
                                <span>Nueva Tarea</span>
                            </button>
                        )}
                    </li>
                    */}
                    <li>
                        <div className="notification-wrapper">
                            {/* <button
                                className={`p-link layout-topbar-button notification-button ${
                                    shouldShake ? "shake" : ""
                                }`}
                                onClick={() => setVisibleNotifications((prev) => !prev)}
                                aria-label="Abrir notificaciones"
                            >
                                <RiNotification2Line size={18} />
                                <span>Notificaciones</span>
                            </button> */}
                            {unreadCount > 0 && <span className="dot-notification" />}
                        </div>
                    </li>
                    <li>
                        <button
                            className="p-link layout-topbar-button"
                            onClick={() => setVisibleUserMenuSidebar(true)}
                        >
                            <RiUserSettingsLine size={18} />
                            <span>Menú de Usuario</span>
                        </button>
                    </li>
                </ul>

                {visibleSearchModal && (
                    <SearchModal
                        onClose={() => setVisibleSearchModal(false)}
                        menureal={props.menureal}
                    />
                )}

                {visibleNotifications && (
                    <Notifications
                        visible={visibleNotifications}
                        onClose={() => setVisibleNotifications(false)}
                        unreadCount={unreadCount}
                    />
                )}

                {visibleUserMenuSidebar && (
                    <UserMenuSidebar
                        visible={visibleUserMenuSidebar}
                        onClose={() => setVisibleUserMenuSidebar(false)}
                    />
                )}
            </div>

            {/* TODO: Botón flotante "Nueva Tarea" eliminado para taller de motos
            {isMobile && canCreate && (
                <button
                    className="floating-new-task-btn"
                    onClick={handleNuevaTarea}
                    aria-label="Nueva Tarea"
                >
                    <i className="pi pi-plus" />
                </button>
            )}
            */}

            {/* TODO: Sistema de tickets eliminado para taller de motos
            <VenTickets
                ref={venTicketsRef}
                addItem={() => {}}
                updateItem={() => {}}
                onRefresh={props.onRefresh}
            />
            */}
        </>
    );
};
