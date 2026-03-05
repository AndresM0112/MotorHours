import React, { useState, useEffect, useContext, useRef } from "react";
import { useSocket } from "@context/socket/SocketContext";
import { AuthContext } from "@context/auth/AuthContext";
import InfiniteScroll from "react-infinite-scroll-component";
import { TabView, TabPanel } from "primereact/tabview";
import { Sidebar } from "primereact/sidebar";
import { Button } from "primereact/button";
import { Badge } from "primereact/badge";
import Axios from "axios";
import { updateNotificationView } from "@utils/observables";
import { headers } from "@utils/converAndConst";
import { formatNotificationDate, formatNotificationTime } from "@utils/formatTime";
import { format } from "date-fns";
import "@styles/notification.css";
import { useMediaQueryContext } from "@context/mediaQuery/mediaQueryContext";
import emptyNotification from "@assets/ui/emptyNotification.json";
import Lottie from "lottie-react";

const Notifications = ({ visible, onClose, unreadCount: initialUnreadCount }) => {
    const socket = useSocket();
    const { idusuario } = useContext(AuthContext);
    const [notifications, setNotifications] = useState([]);
    const [activeIndex, setActiveIndex] = useState(0);
    const [filtros, setFiltros] = useState({ estado: 0, prioridad: 0 });
    const [selectedNotification, setSelectedNotification] = useState(null);
    const { isMobile, isTablet, isDesktop } = useMediaQueryContext();
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [loading, setLoading] = useState(true);
    const [unreadCount, setUnreadCount] = useState(initialUnreadCount);
    const [, setCurrentTime] = useState(new Date());
    const usuarioRef = useRef(idusuario);

    useEffect(() => {
        usuarioRef.current = idusuario;
    }, [idusuario]);

    useEffect(() => {
        if (!socket) return;

        socket.on("newNotification", (data) => {
            if (Number(idusuario) === Number(data.usu_id)) {
                // setNotifications((prev) => [data, ...prev]);
                setUnreadCount((prev) => prev + 1);
            }
        });

        return () => {
            socket.disconnect();
        };
    }, [socket, idusuario]);

    const fetchNotifications = async (page = 1) => {
        try {
            const params = {
                userId: idusuario,
                page: page,
                limit: 10,
                ...filtros,
            };

            const response = await Axios.post(
                "api/notifications/pagination_notifications",
                params,
                {
                    headers: {
                        ...headers,
                        Authorization: `Bearer ${localStorage.getItem("tokenMOTORHOURS")}`,
                    },
                }
            );

            if (!Array.isArray(response.data)) {
                console.error("❌ Formato de respuesta inválido");
                return;
            }

            if (response.data.length === 0) {
                setHasMore(false);
            } else {
                setNotifications((prev) => {
                    // Si es la primera página, reemplaza todo
                    if (page === 1) return response.data;
                    // Si es paginación, agrega solo los que no están ya
                    const existingIds = new Set(prev.map((n) => n.not_id));
                    const nuevos = response.data.filter((n) => !existingIds.has(n.not_id));
                    return [...prev, ...nuevos];
                });
            }
        } catch (error) {
            console.error("Error fetching notifications:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchNotifications(page);
        // eslint-disable-next-line
    }, [page, filtros]);

    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentTime(new Date());
        }, 60000); // Actualiza cada 60 segundos

        return () => clearInterval(interval);
    }, []);

    const markAllAsRead = async () => {
        try {
            await Axios.post(
                "api/notifications/markAsRead",
                { userId: idusuario },
                {
                    headers: {
                        ...headers,
                        Authorization: `Bearer ${localStorage.getItem("tokenMOTORHOURS")}`,
                    },
                }
            );

            setNotifications(
                notifications.map((notification) => ({ ...notification, not_visto: true }))
            );
            setUnreadCount(0);
            updateNotificationView.setNotification("allRead");
        } catch (error) {
            console.error("Error marking all notifications as read:", error);
        }
    };

    const markAsRead = async (id) => {
        try {
            await Axios.post(
                `api/notifications/${id}/markAsRead`,
                {},
                {
                    headers: {
                        ...headers,
                        Authorization: `Bearer ${localStorage.getItem("tokenMOTORHOURS")}`,
                    },
                }
            );

            setNotifications(
                notifications.map((notification) =>
                    notification.not_id === id ? { ...notification, not_visto: true } : notification
                )
            );
            setSelectedNotification(null);
            setUnreadCount((prev) => prev - 1);
            updateNotificationView.setNotification("singleRead");
        } catch (error) {
            console.error("Error marking notification as read:", error);
        }
    };

    const groupedNotifications = notifications.reduce((groups, notification) => {
        const rawDate = notification.not_fec_env;

        if (!rawDate || typeof rawDate !== "string") return groups;

        // Si viene en ISO ya parseable
        const parsedDate = new Date(rawDate);

        if (isNaN(parsedDate.getTime())) {
            console.warn("❌ Fecha inválida en notificación:", notification);
            return groups;
        }

        const date = format(parsedDate, "yyyy-MM-dd");

        if (!groups[date]) {
            groups[date] = [];
        }

        groups[date].push(notification);
        return groups;
    }, {});

    const renderNotifications = (filter) => {
        return Object.keys(groupedNotifications).map((date) => {
            const filteredNotifications = groupedNotifications[date].filter(filter);
            if (filteredNotifications.length === 0) return null;
            return (
                <div key={date} className="notification-group">
                    <h5 className="notification-date">{formatNotificationDate(date)}</h5>
                    {filteredNotifications.map((notification, i) => (
                        <div
                            key={`${notification.not_id}-${i}`}
                            className={`notification-item ${
                                notification.not_visto ? "read" : "unread"
                            }`}
                            onClick={() => setSelectedNotification(notification.not_id)}
                        >
                            <div className="notification-header">
                                <h5>{notification.not_titulo}</h5>
                            </div>
                            <div dangerouslySetInnerHTML={{ __html: notification.not_mensaje }} />

                            <div className="notification-info">
                                <small>{formatNotificationTime(notification.not_fec_env)}</small>
                                {notification.not_visto === 0 && (
                                    <Badge
                                        value={`Prioridad: ${notification.not_prioridad}`}
                                        severity={getPrioritySeverity(notification.not_prioridad)}
                                    />
                                )}
                            </div>
                            {selectedNotification === notification.not_id &&
                                !notification.not_visto && (
                                    <div className="notification-buttons">
                                        <Button
                                            label="Marcar como leída"
                                            className="p-button-raised p-button-info"
                                            onClick={() => markAsRead(notification.not_id)}
                                        />
                                    </div>
                                )}
                        </div>
                    ))}
                </div>
            );
        });
    };

    const getPrioritySeverity = (priority) => {
        switch (priority) {
            case "Alta":
                return "danger";
            case "Media":
                return "warning";
            case "Baja":
                return "info";
            default:
                return "secondary";
        }
    };

    return (
        <Sidebar
            visible={visible}
            position="right"
            onHide={onClose}
            dismissable={true}
            style={{
                width: isMobile ? "100%" : isTablet ? 550 : isDesktop ? 500 : 450,
                overflowY: "hidden",
            }} // Solución para el scroll
        >
            <div className="notification-header">
                <h4>Notificaciones</h4>
            </div>

            <div className="notification-actions">
                <span>
                    {unreadCount > 0
                        ? `Tienes ${unreadCount} mensajes sin leer`
                        : "No tienes mensajes sin leer"}
                </span>
                <button
                    className="mark-as-read-button"
                    onClick={markAllAsRead}
                    disabled={unreadCount === 0}
                >
                    Marcar como leídas
                </button>
            </div>
            {loading ? (
                <div className="loader-container">
                    <span className="loader-5"></span>
                    <strong>Obteniendo datos ...</strong>
                </div>
            ) : (
                <>
                    <TabView
                        className="sidebar-content"
                        activeIndex={activeIndex}
                        onTabChange={(e) => {
                            setActiveIndex(e.index);
                            setFiltros({ estado: e.index });
                        }}
                    >
                        <TabPanel header="Todas">
                            {notifications.length > 0 ? (
                                <div id="scrollDiv" className="notification-content">
                                    <InfiniteScroll
                                        dataLength={notifications.length}
                                        next={() => setPage((prev) => prev + 1)}
                                        hasMore={hasMore}
                                        loader={<h4>Cargando más notificaciones...</h4>}
                                        endMessage={<p>No hay más notificaciones</p>}
                                        scrollableTarget={"scrollDiv"}
                                    >
                                        {renderNotifications(() => true)}
                                    </InfiniteScroll>
                                </div>
                            ) : (
                                <div className="text-center" style={{ marginTop: "20px" }}>
                                    <Lottie
                                        animationData={emptyNotification}
                                        style={{
                                            width: "80vw",
                                            height: "auto",
                                            maxWidth: "400px",
                                            minHeight: "200px",
                                        }}
                                    />
                                    <h4
                                        style={{
                                            fontSize: "1.2rem",
                                            fontWeight: "bold",
                                            marginTop: "20px",
                                            color: "#333",
                                            fontFamily: "Arial, sans-serif",
                                        }}
                                    >
                                        Aun no tienes notificaciones. Vuelve mas tarde.
                                    </h4>
                                </div>
                            )}
                        </TabPanel>
                        <TabPanel header={`No Vistas (${unreadCount})`}>
                            {notifications.filter((notification) => !notification.not_visto)
                                .length > 0 ? (
                                <div id="scrollDiv" className="notification-content">
                                    <InfiniteScroll
                                        dataLength={
                                            notifications.filter(
                                                (notification) => !notification.not_visto
                                            ).length
                                        }
                                        next={() => setPage((prev) => prev + 1)}
                                        hasMore={hasMore}
                                        loader={<h4>Cargando más notificaciones...</h4>}
                                        endMessage={<p>No hay más notificaciones</p>}
                                        scrollableTarget={"scrollDiv"}
                                    >
                                        {renderNotifications(
                                            (notification) => !notification.not_visto
                                        )}
                                    </InfiniteScroll>
                                </div>
                            ) : (
                                <div className="text-center" style={{ marginTop: "20px" }}>
                                    <Lottie
                                        animationData={emptyNotification}
                                        style={{
                                            width: "80vw",
                                            height: "auto",
                                            maxWidth: "400px",
                                            minHeight: "200px",
                                        }}
                                    />
                                    <h4
                                        style={{
                                            fontSize: "1.2rem",
                                            fontWeight: "bold",
                                            marginTop: "20px",
                                            color: "#333",
                                            fontFamily: "Arial, sans-serif",
                                        }}
                                    >
                                        Genial! Al parecer no tienes notificaciones pendientes.
                                    </h4>
                                </div>
                            )}
                        </TabPanel>
                        <TabPanel header="Vistas">
                            {notifications.filter((notification) => notification.not_visto).length >
                            0 ? (
                                <div id="scrollDiv" className="notification-content">
                                    <InfiniteScroll
                                        dataLength={
                                            notifications.filter(
                                                (notification) => notification.not_visto
                                            ).length
                                        }
                                        hasMore={hasMore}
                                        loader={<h4>Cargando más notificaciones...</h4>}
                                        endMessage={<p>No hay más notificaciones</p>}
                                        scrollableTarget={"scrollDiv"}
                                    >
                                        {renderNotifications(
                                            (notification) => notification.not_visto
                                        )}
                                    </InfiniteScroll>
                                </div>
                            ) : (
                                <div className="text-center" style={{ marginTop: "20px" }}>
                                    <Lottie
                                        animationData={emptyNotification}
                                        style={{
                                            width: "80vw",
                                            height: "auto",
                                            maxWidth: "400px",
                                            minHeight: "200px",
                                        }}
                                    />
                                    <h4
                                        style={{
                                            fontSize: "1.2rem",
                                            fontWeight: "bold",
                                            marginTop: "20px",
                                            color: "#333",
                                            fontFamily: "Arial, sans-serif",
                                        }}
                                    >
                                        Aun no tienes notificaciones. Vuelve mas tarde.
                                    </h4>
                                </div>
                            )}
                        </TabPanel>
                    </TabView>
                </>
            )}
        </Sidebar>
    );
};

export default Notifications;
