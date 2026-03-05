import { cronTicketsVencidos, cronTicketsRecordatorio24h } from "./tickets.tasks.js";

export const startAllCrons = () => {
  console.log("🕒 Iniciando tareas programadas...");

  // Agrega aquí cada tarea programada
  cronTicketsVencidos();
  cronTicketsRecordatorio24h();
};
