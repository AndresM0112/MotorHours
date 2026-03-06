import express from "express";
import notificationsRoutes from "./app/notifications/notifications.routes.js";
import authRoutes from "./auth/auth.routes.js";
import appRoutes from "./app/general/app.routes.js";
import mailRoutes from "../common/mails/mails.routes.js";
import microsoftGraphRoutes from "./microsoftGraph/microsoftGraph.routes.js";
import masterTemplateRoutes from "./template/template.routes.js";

import MotosRoutes from "./admin/motos/motos.routes.js";
import AlistamientoRoutes from "./admin/alistamiento/alistamiento.routes.js";
import PilotosRoutes from "./admin/pilotos/pilotos.routes.js";
import serviciosRoutes from "./admin/servicios/servicios.routes.js";

// security
import usersRoutes from "./security/users/users.routes.js";
import profilesRoutes from "./security/profiles/profiles.routes.js";
import permissionsRoutes from "./security/permissions/permissions.routes.js";
import reportsRoutes from "./reports/inventory/reports.routes.js";
import dashboardRoutes from "./reports/dashboard/dahsboard.routes.js";
import chatAiRoutes from "./admin/ai-chat/chat.routes.js";
import whatsappRoutes from "./app/whatsapp/whatsapp.routes.js";
// import dataioRoutes from "./dataio/dataio.routes.js";

const mainRoutes = express.Router();

mainRoutes.use("/template", masterTemplateRoutes);
mainRoutes.use("/ai-pavas", chatAiRoutes);
mainRoutes.use("/whatsapp", whatsappRoutes);

// reports
mainRoutes.use("/", reportsRoutes);

// App
mainRoutes.use("/notifications", notificationsRoutes);
mainRoutes.use("/auth", authRoutes);
mainRoutes.use("/mails", mailRoutes);
mainRoutes.use("/app", appRoutes);

// mainRoutes.use("/dataio", dataioRoutes);

// Reports
mainRoutes.use("/reports/dashboard", dashboardRoutes);

// Management taller de motos
mainRoutes.use("/management/motos", MotosRoutes);
mainRoutes.use("/management/alistamientos", AlistamientoRoutes);
mainRoutes.use("/management/pilotos", PilotosRoutes);
mainRoutes.use("/management/servicios", serviciosRoutes);

// Security
mainRoutes.use("/security/profiles", profilesRoutes);
mainRoutes.use("/security/users", usersRoutes);
mainRoutes.use("/security/permissions", permissionsRoutes);
mainRoutes.use("/security/microsoft-graph", microsoftGraphRoutes);

export default mainRoutes;
