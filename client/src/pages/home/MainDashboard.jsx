import React, { useState } from "react";
import { Card } from "primereact/card";
import { Button } from "primereact/button";
import "./styles/MainDashboard.css";

const MainDashboard = () => {
    const header = (
        <span>
            <i className="pi pi-wrench mr-2"></i>
            MOTORHOURS - Dashboard del Taller
        </span>
    );

    // Datos de ejemplo para el dashboard
    const stats = {
        motosEnTaller: 12,
        citasHoy: 8,
        serviciosCompletados: 5,
        ventasHoy: 850000
    };

    const citasHoy = [
        { id: 1, cliente: "Carlos Rodríguez", moto: "KTM 250 SX-F", servicio: "Mantenimiento general", hora: "09:00" },
        { id: 2, cliente: "Ana Martínez", moto: "Honda CRF450R", servicio: "Cambio de aceite", hora: "10:30" },
        { id: 3, cliente: "Luis García", moto: "Yamaha YZ125", servicio: "Reparación motor", hora: "14:00" },
    ];

    const motosEnTaller = [
        { id: 1, moto: "Suzuki RM-Z450", cliente: "Pedro Silva", estado: "En diagnóstico", dias: 2 },
        { id: 2, moto: "Kawasaki KX250", cliente: "María López", estado: "Esperando repuestos", dias: 5 },
        { id: 3, moto: "Husqvarna TC 125", cliente: "Juan Pérez", estado: "Lista para entrega", dias: 1 },
    ];

    const serviciosPopulares = [
        { servicio: "Mantenimiento general", cantidad: 15 },
        { servicio: "Cambio de aceite", cantidad: 12 },
        { servicio: "Ajuste de cadena", cantidad: 8 },
        { servicio: "Cambio de filtros", cantidad: 6 },
    ];

    return (
        <div className="main-dashboard">
            <Card title={header} className="dashboard-header-card">
                
                {/* Tarjetas de estadísticas */}
                <div className="stats-grid">
                    <div className="stat-card stat-card-blue">
                        <div className="stat-content">
                            <div className="stat-number">{stats.motosEnTaller}</div>
                            <div className="stat-label">Motos en Taller</div>
                        </div>
                        <i className="pi pi-cog stat-icon"></i>
                    </div>
                    
                    <div className="stat-card stat-card-green">
                        <div className="stat-content">
                            <div className="stat-number">{stats.citasHoy}</div>
                            <div className="stat-label">Citas Hoy</div>
                        </div>
                        <i className="pi pi-calendar stat-icon"></i>
                    </div>
                    
                    <div className="stat-card stat-card-orange">
                        <div className="stat-content">
                            <div className="stat-number">{stats.serviciosCompletados}</div>
                            <div className="stat-label">Servicios Completados</div>
                        </div>
                        <i className="pi pi-check-circle stat-icon"></i>
                    </div>
                    
                    <div className="stat-card stat-card-purple">
                        <div className="stat-content">
                            <div className="stat-number">${stats.ventasHoy.toLocaleString()}</div>
                            <div className="stat-label">Ingresos Hoy</div>
                        </div>
                        <i className="pi pi-dollar stat-icon"></i>
                    </div>
                </div>

                {/* Grid de contenido principal */}
                <div className="dashboard-content">
                    
                    {/* Citas del día */}
                    <Card title="📅 Citas de Hoy" className="dashboard-card">
                        <div className="citas-list">
                            {citasHoy.map(cita => (
                                <div key={cita.id} className="cita-item">
                                    <div className="cita-time">{cita.hora}</div>
                                    <div className="cita-info">
                                        <div className="cliente-name">{cita.cliente}</div>
                                        <div className="moto-model">{cita.moto}</div>
                                        <div className="servicio-type">{cita.servicio}</div>
                                    </div>
                                    <Button icon="pi pi-eye" className="p-button-text p-button-sm" />
                                </div>
                            ))}
                        </div>
                        <Button label="Ver todas las citas" className="p-button-link mt-3" />
                    </Card>

                    {/* Motos en el taller */}
                    <Card title="🏍️ Motos en el Taller" className="dashboard-card">
                        <div className="motos-list">
                            {motosEnTaller.map(moto => (
                                <div key={moto.id} className="moto-item">
                                    <div className="moto-info">
                                        <div className="moto-model">{moto.moto}</div>
                                        <div className="cliente-name">{moto.cliente}</div>
                                    </div>
                                    <div className="moto-status">
                                        <span className={`status-badge status-${moto.estado.toLowerCase().replace(/\s+/g, '-')}`}>
                                            {moto.estado}
                                        </span>
                                        <div className="dias-taller">{moto.dias} día(s)</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <Button label="Ver estado de todas las motos" className="p-button-link mt-3" />
                    </Card>

                    {/* Servicios más solicitados */}
                    <Card title="🔧 Servicios Más Solicitados" className="dashboard-card">
                        <div className="servicios-chart">
                            {serviciosPopulares.map(item => (
                                <div key={item.servicio} className="servicio-bar">
                                    <div className="servicio-info">
                                        <span className="servicio-name">{item.servicio}</span>
                                        <span className="servicio-count">{item.cantidad}</span>
                                    </div>
                                    <div className="servicio-progress">
                                        <div 
                                            className="progress-fill" 
                                            style={{ width: `${(item.cantidad / 15) * 100}%` }}
                                        ></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </Card>

                    {/* Acciones rápidas */}
                    <Card title="⚡ Acciones Rápidas" className="dashboard-card">
                        <div className="quick-actions">
                            <Button 
                                icon="pi pi-plus" 
                                label="Nueva Cita" 
                                className="p-button-success quick-action-btn"
                            />
                            <Button 
                                icon="pi pi-car" 
                                label="Ingresar Moto" 
                                className="p-button-info quick-action-btn"
                            />
                            <Button 
                                icon="pi pi-shopping-cart" 
                                label="Vender Repuesto" 
                                className="p-button-warning quick-action-btn"
                            />
                            <Button 
                                icon="pi pi-file-pdf" 
                                label="Generar Reporte" 
                                className="p-button-secondary quick-action-btn"
                            />
                        </div>
                    </Card>

                </div>
            </Card>
        </div>
    );
};

export default MainDashboard;
