import React, { useEffect, useState } from "react";
import { FaFolderOpen, FaHourglassHalf, FaCheck, FaBan } from "react-icons/fa";

import AnalyticsWidget from "./components/AnalyticsWidget";
import { getResumenPorEstadosAPI } from "@api/requests/ticketsApi";
import { Skeleton } from "primereact/skeleton";
import { ticketEvents } from "@utils/observables/ticketEvents";

// Mapeo de íconos según slug de estado
const iconsMap = {
    abierto: <FaFolderOpen />,
    en_proceso: <FaHourglassHalf />,
    cerrado: <FaCheck />,
    anulado: <FaBan />,
};

const TicketsDashboard = () => {
    const [statusCards, setStatusCards] = useState([]);
    const [loading, setLoading] = useState(true);

    const loadResumen = async () => {
        try {
            const response = await getResumenPorEstadosAPI();
            const resumen = response?.data?.data || [];

            const cards = resumen.map((item) => ({
                ...item,
                icon: iconsMap[item.id] || <FaFolderOpen />,
            }));

            setStatusCards(cards);
        } catch (err) {
            console.error("Error al cargar resumen por estados", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadResumen();
    }, []);

    useEffect(() => {
        const subscription = ticketEvents.on().subscribe((action) => {
            if (action === "refresh") {
                loadResumen();
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    return (
        <div style={{ marginBottom: "50px" }}>
            <div className="grid">
                <div className="col-12 grid">
                    {loading ? (
                        Array.from({ length: 4 }).map((_, index) => (
                            <div key={index} className="col-12 sm:col-6 md:col-4 lg:col-3">
                                <div className="p-3 border-round shadow-1">
                                    <Skeleton height="2rem" width="40%" className="mb-2" />
                                    <Skeleton height="1.5rem" width="60%" className="mb-1" />
                                    <Skeleton height="1.5rem" width="30%" />
                                </div>
                            </div>
                        ))
                    ) : (
                        <>
                            {statusCards.map((status, index) => (
                                <div key={index} className="col-12 sm:col-6 md:col-4 lg:col-3">
                                    <AnalyticsWidget
                                        icon={status.icon}
                                        title={status.title}
                                        total={status.total}
                                        percent={status.percent}
                                        chartData={status.chartData}
                                        color={status.color}
                                        // background={status.background}
                                        href={`#/tickets/${status.id}`}
                                    />
                                </div>
                            ))}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default TicketsDashboard;
