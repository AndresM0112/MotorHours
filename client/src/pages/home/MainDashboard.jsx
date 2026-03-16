import React, { useState, useEffect, useRef, useMemo } from "react";
import { Card } from "primereact/card";
import { Button } from "primereact/button";
import { useHistory } from "react-router-dom";
import ReactApexChart from "react-apexcharts";
import { getAllPilotosAPI } from "../../api/requests/pilotosAPI";
import { getAllServiciosAPI } from "../../api/requests/ServiciosAPI";
import { getAllAlistamientosAPI } from "../../api/requests/AlistamientoAPI";
import VenPilotos from "../admin/components/modals/VenPilotos";
import VenServicios from "../admin/components/modals/VenServicios";
import VenAlistamiento from "../admin/components/modals/VenAlistamiento";
import "./styles/MainDashboard.css";

const MainDashboard = () => {
    const history = useHistory();
    
    // Referencias para los modales
    const pilotoModalRef = useRef(null);
    const servicioModalRef = useRef(null);
    const alistamientoModalRef = useRef(null);
    
    const [stats, setStats] = useState({
        totalPilotos: 0,
        totalServicios: 0
    });
    const [serviciosRecientes, setServiciosRecientes] = useState([]);
    const [serviciosPorEstado, setServiciosPorEstado] = useState({ OPEN: 0, IN_PROGRESS: 0, CLOSED: 0 });
    const [alistamientosMasSolicitados, setAlistamientosMasSolicitados] = useState([]);
    const [loading, setLoading] = useState(true);

    const header = (
        <span>
            <i className="pi pi-wrench mr-2"></i>
            MOTORHOURS - Dashboard del Taller
        </span>
    );

    // Cargar datos reales al montar el componente
    useEffect(() => {
        const loadData = async () => {
            try {
                setLoading(true);
                
                // Cargar pilotos, servicios y alistamientos en paralelo
                const [pilotosResponse, serviciosResponse, alistamientosResponse] = await Promise.all([
                    getAllPilotosAPI(),
                    getAllServiciosAPI(),
                    getAllAlistamientosAPI()
                ]);

                // Actualizar stats con datos reales
                setStats({
                    totalPilotos: pilotosResponse?.data?.length || 0,
                    totalServicios: serviciosResponse?.data?.length || 0
                });

                // Procesar servicios recientes (últimos 5)
                const servicios = serviciosResponse?.data || [];
                const serviciosFormateados = servicios
                    .slice(0, 3) // Tomar solo los primeros 3 (ya vienen ordenados por fecha desc)
                    .map(servicio => ({
                        id: servicio.id,
                        tipo: servicio.serviceType === 'ALISTAMIENTO' ? 'Alistamiento' : 'Reparación',
                        piloto: servicio.pilotName || 'Sin asignar',
                        fecha: new Date(servicio.createdAt).toLocaleDateString('es-ES'),
                        estado: 'Completado',
                        bikeType: servicio.bikeType || 'N/A',
                        hours: servicio.hours,
                        _raw: servicio
                    }));
                
                setServiciosRecientes(serviciosFormateados);

                // Contar servicios por estado
                const porEstado = { OPEN: 0, IN_PROGRESS: 0, CLOSED: 0 };
                servicios.forEach(s => {
                    const code = s.statusCode || "OPEN";
                    if (porEstado[code] !== undefined) porEstado[code]++;
                });
                setServiciosPorEstado(porEstado);

                // Procesar alistamientos más solicitados
                const alistamientos = alistamientosResponse?.data || [];
                const serviciosAlistamiento = servicios.filter(s => s.serviceType === 'ALISTAMIENTO');
                
                // Contar frecuencia de cada item de alistamiento
                const contadorAlistamientos = {};
                serviciosAlistamiento.forEach(servicio => {
                    if (servicio.items && Array.isArray(servicio.items)) {
                        servicio.items.forEach(item => {
                            if (item.completed || item.realizada) { // Considerar items completados
                                contadorAlistamientos[item.id] = (contadorAlistamientos[item.id] || 0) + 1;
                            }
                        });
                    }
                });

                // Crear array de alistamientos con su frecuencia y descripción
                const alistamientosConFrecuencia = alistamientos
                    .map(alistamiento => ({
                        id: alistamiento.id,
                        servicio: alistamiento.description || `Alistamiento #${alistamiento.id}`,
                        cantidad: contadorAlistamientos[alistamiento.id] || 0
                    }))
                    .filter(item => item.cantidad > 0) // Solo mostrar los que tienen uso
                    .sort((a, b) => b.cantidad - a.cantidad) // Ordenar por más utilizados
                    .slice(0, 5); // Tomar los top 5

                // Si no hay datos suficientes, mostrar todos los alistamientos disponibles
                if (alistamientosConFrecuencia.length === 0) {
                    const alistamientosDefault = alistamientos
                        .slice(0, 5)
                        .map(alistamiento => ({
                            id: alistamiento.id,
                            servicio: alistamiento.description || `Alistamiento #${alistamiento.id}`,
                            cantidad: 0
                        }));
                    setAlistamientosMasSolicitados(alistamientosDefault);
                } else {
                    setAlistamientosMasSolicitados(alistamientosConFrecuencia);
                }
            } catch (error) {
                console.error('Error cargando datos del dashboard:', error);
                // Mantener valores en 0 si hay error
                setStats({
                    totalPilotos: 0,
                    totalServicios: 0
                });
                setServiciosRecientes([]);
                setAlistamientosMasSolicitados([]);
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, []);

    // Funciones de navegación y modales
    const handleNavigateToServicios = () => {
        history.push('/servicios');
    };

    const handleNavigateToPilotos = () => {
        history.push('/pilotos');
    };

    const handleOpenPilotoModal = () => {
        if (pilotoModalRef.current) {
            pilotoModalRef.current.newPiloto();
        }
    };

    const handleOpenServicioModal = () => {
        if (servicioModalRef.current) {
            servicioModalRef.current.newServicio();
        }
    };

    const handleOpenAlistamientoModal = () => {
        if (alistamientoModalRef.current) {
            alistamientoModalRef.current.newAlistamiento();
        }
    };

    return (
        <div className="main-dashboard">
            <Card title={header} className="dashboard-header-card">
                
                {/* Tarjetas de estadísticas */}
                <div className="stats-grid">
                    <div className="stat-card stat-card-blue" style={{ cursor: 'pointer' }} onClick={handleNavigateToPilotos}>
                        <div className="stat-content">
                            <div className="stat-number">
                                {loading ? '...' : stats.totalPilotos}
                            </div>
                            <div className="stat-label">Total Pilotos</div>
                        </div>
                        <i className="pi pi-users stat-icon"></i>
                    </div>
                    
                    <div className="stat-card stat-card-green" style={{ cursor: 'pointer' }} onClick={handleNavigateToServicios}>
                        <div className="stat-content">
                            <div className="stat-number">
                                {loading ? '...' : stats.totalServicios}
                            </div>
                            <div className="stat-label">Total Servicios</div>
                        </div>
                        <i className="pi pi-wrench stat-icon"></i>
                    </div>
                </div>

                {/* Grid de contenido principal */}
                <div className="dashboard-content">

                    {/* Columna izquierda: Servicios (ocupa 2 filas) */}
                    <div className="dashboard-col-main">
                    {/* Servicios Recientes + Gráfico por Estado */}
                    <Card title="🔄 Servicios" className="dashboard-card">

                        {/* Gráfico donut por estado */}
                        <div className="status-chart-wrapper">
                            {loading ? (
                                <div className="text-center p-3">
                                    <i className="pi pi-spin pi-spinner" style={{ fontSize: '1.5rem' }}></i>
                                </div>
                            ) : (
                                <ReactApexChart
                                    type="donut"
                                    height={220}
                                    series={[
                                        serviciosPorEstado.OPEN,
                                        serviciosPorEstado.IN_PROGRESS,
                                        serviciosPorEstado.CLOSED,
                                    ]}
                                    options={{
                                        labels: ["Abierto", "En proceso", "Cerrado"],
                                        colors: ["#3b82f6", "#f97316", "#22c55e"],
                                        legend: { position: "bottom", fontSize: "12px" },
                                        dataLabels: { enabled: true },
                                        plotOptions: {
                                            pie: {
                                                donut: {
                                                    size: "65%",
                                                    labels: {
                                                        show: true,
                                                        total: {
                                                            show: true,
                                                            label: "Total",
                                                            fontSize: "13px",
                                                            fontWeight: 600,
                                                            color: "#374151",
                                                            formatter: (w) =>
                                                                w.globals.seriesTotals.reduce((a, b) => a + b, 0),
                                                        },
                                                    },
                                                },
                                            },
                                        },
                                        tooltip: { y: { formatter: (v) => `${v} servicio(s)` } },
                                        noData: { text: "Sin datos" },
                                    }}
                                />
                            )}
                        </div>

                        <div className="status-legend-row">
                            <div className="status-legend-item" style={{ borderLeft: "3px solid #3b82f6" }}>
                                <span className="status-legend-num">{serviciosPorEstado.OPEN}</span>
                                <span className="status-legend-label">Abiertos</span>
                            </div>
                            <div className="status-legend-item" style={{ borderLeft: "3px solid #f97316" }}>
                                <span className="status-legend-num">{serviciosPorEstado.IN_PROGRESS}</span>
                                <span className="status-legend-label">En proceso</span>
                            </div>
                            <div className="status-legend-item" style={{ borderLeft: "3px solid #22c55e" }}>
                                <span className="status-legend-num">{serviciosPorEstado.CLOSED}</span>
                                <span className="status-legend-label">Cerrados</span>
                            </div>
                        </div>

                        {/* Lista de recientes */}
                        <div className="servicios-recientes-list mt-3">
                            {loading ? (
                                <div className="text-center p-4">
                                    <i className="pi pi-spin pi-spinner" style={{ fontSize: '2rem' }}></i>
                                    <p>Cargando servicios...</p>
                                </div>
                            ) : serviciosRecientes.length > 0 ? (
                                serviciosRecientes.map(servicio => (
                                    <div key={servicio.id} className="servicio-card mb-3">
                                        {/* Header con tipo de servicio y estado */}
                                        <div className="flex justify-content-between align-items-center mb-2">
                                            <div className="flex align-items-center gap-2">
                                                <i className={`pi ${servicio.tipo === 'Alistamiento' ? 'pi-list' : 'pi-wrench'} text-primary`}></i>
                                                <span className="servicio-tipo font-semibold text-900">{servicio.tipo}</span>
                                            </div>
                                            <span className={`status-badge status-${servicio.estado.toLowerCase().replace(/\s+/g, '-')} px-2 py-1 border-round text-xs font-semibold`}>
                                                {servicio.estado}
                                            </span>
                                        </div>
                                        
                                        {/* Información principal */}
                                        <div className="grid">
                                            <div className="col-12 md:col-8">
                                                {/* Piloto */}
                                                <div className="flex align-items-center gap-2 mb-2">
                                                    <i className="pi pi-user text-600 text-sm"></i>
                                                    <span className="piloto-name text-900">{servicio.piloto}</span>
                                                </div>
                                                
                                                {/* Moto y horas */}
                                                <div className="flex align-items-center gap-2 mb-2">
                                                    <span style={{ fontSize: '14px' }}>🏍️</span>
                                                    <span className="bike-info text-700 text-sm">{servicio.bikeType}</span>
                                                    <span className="text-600 text-sm">•</span>
                                                    <span className="hours-info text-700 text-sm font-medium">{servicio.hours}h</span>
                                                </div>
                                                
                                                {/* Fecha */}
                                                <div className="flex align-items-center gap-2">
                                                    <i className="pi pi-calendar text-600 text-sm"></i>
                                                    <span className="fecha text-600 text-sm">{servicio.fecha}</span>
                                                </div>
                                            </div>
                                            
                                            <div className="col-12 md:col-4 flex justify-content-end align-items-center">
                                                <Button 
                                                    icon="pi pi-eye" 
                                                    className="p-button-text p-button-rounded p-button-sm"
                                                    tooltipOptions={{ position: 'top' }}
                                                    onClick={() => servicioModalRef.current?.viewServicio(servicio._raw)}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center p-4">
                                    <i className="pi pi-info-circle" style={{ fontSize: '2rem', color: '#6c757d' }}></i>
                                    <p>No hay servicios registrados</p>
                                </div>
                            )}
                        </div>
                        <Button 
                            label="Ver todos los servicios" 
                            className="p-button-link mt-3" 
                            onClick={handleNavigateToServicios}
                        />
                    </Card>
                    </div>{/* fin columna izquierda */}

                    {/* Columna derecha: Alistamientos + Acciones rápidas */}
                    <div className="dashboard-col-side">
                    <Card title="🔧 Alistamientos Más Solicitados" className="dashboard-card">
                        <div className="servicios-chart">
                            {loading ? (
                                <div className="text-center p-4">
                                    <i className="pi pi-spin pi-spinner" style={{ fontSize: '2rem' }}></i>
                                    <p>Cargando alistamientos...</p>
                                </div>
                            ) : alistamientosMasSolicitados.length > 0 ? (
                                alistamientosMasSolicitados.map(item => {
                                    // Calcular el ancho de la barra basado en el máximo valor
                                    const maxCantidad = Math.max(...alistamientosMasSolicitados.map(a => a.cantidad)) || 1;
                                    const widthPercentage = (item.cantidad / maxCantidad) * 100;
                                    
                                    return (
                                        <div key={item.id} className="servicio-bar">
                                            <div className="servicio-info">
                                                <span className="servicio-name">{item.servicio}</span>
                                                <span className="servicio-count">{item.cantidad}</span>
                                            </div>
                                            <div className="servicio-progress">
                                                <div 
                                                    className="progress-fill" 
                                                    style={{ width: `${widthPercentage}%` }}
                                                ></div>
                                            </div>
                                        </div>
                                    );
                                })
                            ) : (
                                <div className="text-center p-4">
                                    <i className="pi pi-info-circle" style={{ fontSize: '2rem', color: '#6c757d' }}></i>
                                    <p>No hay datos de alistamientos utilizados</p>
                                </div>
                            )}
                        </div>
                    </Card>

                    {/* Acciones rápidas */}
                    <Card title="⚡ Acciones Rápidas" className="dashboard-card">
                        <div className="quick-actions">
                            <Button 
                                icon="pi pi-user-plus" 
                                label="Crear Piloto" 
                                className="p-button-success quick-action-btn"
                                onClick={handleOpenPilotoModal}
                            />
                            <Button 
                                icon="pi pi-cog" 
                                label="Crear Servicio" 
                                className="p-button-info quick-action-btn"
                                onClick={handleOpenServicioModal}
                            />
                            <Button 
                                icon="pi pi-list" 
                                label="Crear Alistamiento" 
                                className="p-button-warning quick-action-btn"
                                onClick={handleOpenAlistamientoModal}
                            />
                        </div>
                    </Card>

                    </div>{/* fin columna derecha */}

                </div>
            </Card>
            
            {/* Modales */}
            <VenPilotos ref={pilotoModalRef} />
            <VenServicios ref={servicioModalRef} />
            <VenAlistamiento ref={alistamientoModalRef} />
        </div>
    );
};

export default MainDashboard;
