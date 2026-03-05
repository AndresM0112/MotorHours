import express from "express";
import notificationsRoutes from "./app/notifications/notifications.routes.js";
import authRoutes from "./auth/auth.routes.js";
import appRoutes from "./app/general/app.routes.js";
import mailRoutes from "../common/mails/mails.routes.js";
import microsoftGraphRoutes from "./microsoftGraph/microsoftGraph.routes.js";
import masterTemplateRoutes from "./template/template.routes.js";

import ticketsRoutes from "./admin/tickets/tickets.routes.js";
// management
import reasonsRoutes from "./admin/reasons/reasons.routes.js";
import areasRoutes from "./admin/areas/areas.routes.js";
// import projectsRoutes from "./admin/projects/projects.routes.js";
import blocksRoutes from "./admin/blocks/blocks.routes.js";
import locationRoutes from "./admin/location/location.routes.js";
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
import insureTypeRoutes from "./admin/insurerTypeService/insurerTypeService.routes.js";
import RefundableTypeRoutes from "./admin/RefundableType/RefundableType.routes.js";
import payrollNatureRoutes from "./admin/payrollNature/payrollNature.routes.js";
import payrollConceptTypeRoutes from "./admin/payrollConceptType/payrollConceptType.routes.js";
import insurerRoutes from "./admin/insurer/insurer.routes.js";
import payrollConceptRoutes from "./admin/payrollConcept/payrollConcept.routes.js";
import positionRoutes from "./admin/position/position.routes.js";
import managementRoutes from "./admin/management/management.routes.js";
import centerCostRoutes from "./admin/centerCost/centerCost.routes.js";
// import dataioRoutes from "./dataio/dataio.routes.js";
import payrollRoutes from "./admin/payroll/payroll.routes.js";

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

// App process
mainRoutes.use("/tickets", ticketsRoutes);

// Reports
mainRoutes.use("/reports/dashboard", dashboardRoutes);

// Management tickets
mainRoutes.use("/management/reasons", reasonsRoutes);
mainRoutes.use("/management/areas", areasRoutes);
mainRoutes.use("/management/blocks", blocksRoutes);
mainRoutes.use("/management/location", locationRoutes);
mainRoutes.use("/management/motos", MotosRoutes);
mainRoutes.use("/management/alistamientos", AlistamientoRoutes);
mainRoutes.use("/management/pilotos", PilotosRoutes);
mainRoutes.use("/management/servicios", serviciosRoutes);

// Management refunds
mainRoutes.use("/management-refunds/refundable-types", RefundableTypeRoutes);
mainRoutes.use("/management-refunds/insure-types", insureTypeRoutes);
mainRoutes.use("/management-refunds/payroll-nature", payrollNatureRoutes);
mainRoutes.use("/management-refunds/payroll-concept", payrollConceptRoutes);
mainRoutes.use(
  "/management-refunds/payroll-concept-type",
  payrollConceptTypeRoutes
);
mainRoutes.use("/management-refunds/insurer", insurerRoutes);
mainRoutes.use("/management-refunds/position", positionRoutes);
mainRoutes.use("/management-refunds/management", managementRoutes);
mainRoutes.use("/management-refunds/center-cost", centerCostRoutes);
mainRoutes.use("/management-refunds/payroll", payrollRoutes);

// Security
mainRoutes.use("/security/profiles", profilesRoutes);
mainRoutes.use("/security/users", usersRoutes);
mainRoutes.use("/security/permissions", permissionsRoutes);
mainRoutes.use("/security/microsoft-graph", microsoftGraphRoutes);

export default mainRoutes;
