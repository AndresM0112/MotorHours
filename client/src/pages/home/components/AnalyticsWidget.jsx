import React from "react";
import Chart from "react-apexcharts";
import "./styles/AnalyticsWidget.css";

export default function AnalyticsWidget({
    icon,
    title,
    total,
    percent,
    chartData,
    color = "#1976d2",
    background = "#ffffff",
    onClick,
    href,
}) {
    // Etiquetas para los meses
    const monthLabels = [
        "Ene", "Feb", "Mar", "Abr", "May", "Jun",
        "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"
    ];

    const chartOptions = {
        chart: {
            sparkline: { enabled: true },
        },
        stroke: {
            width: 2,
            curve: "smooth",
        },
        tooltip: {
            x: {
                formatter: (val, opts) => monthLabels[val] || "",
            },
            y: {
                formatter: (val) => val.toLocaleString(),
                title: {
                    formatter: () => "Tickets",
                },
            },
        },
        xaxis: {
            categories: monthLabels,
            labels: {
                show: true,
                style: {
                    fontSize: "10px",
                    colors: "#999"
                }
            }
        },
        colors: [color],
        markers: {
            size: 0,
        },
        grid: {
            padding: { top: 0, right: 0, bottom: 0, left: 0 },
        },
    };

    const content = (
        <div
            className="analytics-card"
            style={{
                "--color": color,
                "--background": background,
                cursor: onClick || href ? "pointer" : "default",
            }}
        >
            <div className="info">
                <div className="icon">{icon}</div>

                <div className="title">{title}</div>
                <div className="total">{formatNumber(total)}</div>

                {/* {typeof percent === "number" && (
                    <div className="trend">
                        <span className={`icon-trend ${percent < 0 ? "down" : "up"}`}>
                            {percent < 0 ? "↓" : "↑"}
                        </span>
                        <span className="percent">
                            {percent > 0 ? "+" : ""}
                            {percent}% último mes
                        </span>
                    </div>
                )} */}
            </div>

            {chartData && (
                <div className="chart-container">
                    <Chart
                        type="line"
                        height={80}
                        width={130}
                        series={[{ name: "Tickets", data: chartData }]}
                        options={chartOptions}
                    />
                </div>
            )}
        </div>
    );

    if (href) {
        return (
            <a href={href} style={{ textDecoration: "none" }}>
                {content}
            </a>
        );
    }

    if (onClick) {
        return <div onClick={onClick}>{content}</div>;
    }

    return content;
}

function formatNumber(num) {
    if (num >= 1e9) return (num / 1e9).toFixed(1) + "B";
    if (num >= 1e6) return (num / 1e6).toFixed(1) + "M";
    if (num >= 1e3) return (num / 1e3).toFixed(1) + "K";
    return num.toString();
}
