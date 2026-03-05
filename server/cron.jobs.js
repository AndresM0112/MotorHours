import cron from "node-cron";

function loadAllJobs(io) {
  cron.schedule(
    "*/1 * * * 0-6",
    () => {
      import("./src/tasks/Recordatorios_citas.js").then(module => module.default());
    },
    { scheduled: true, timezone: "America/Bogota" }
  );
}

export { loadAllJobs };
