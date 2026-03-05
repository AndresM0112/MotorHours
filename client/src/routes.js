import MainDashboard from "@pages/home/MainDashboard";
import Reasons from "@pages/admin/Reasons";
import Perfiles from "@pages/security/Perfiles";
import Usuarios from "@pages/security/Usuarios";
import Login from "@pages/auth/LoginPage";
import ResetPassword from "@pages/auth/ResetPassword";
import NotFoundPage from "@pages/app/NotFoundPage";
import Areas from "@pages/admin/Areas";
import Blocks from "@pages/admin/Blocks";
import Motos from "@pages/admin/Motos";
import Alistamientos from "@pages/admin/Alistamientos";
import Pilotos from "@pages/admin/Pilotos";
import Servicios from "@pages/admin/Servicios";

// import Projects from "@pages/admin/Projects";
import Tickets from "@pages/home/Tickets";
import InsureTypes from "@pages/admin/InsureTypes";
import RefundableTypes from "@pages/admin/RefundableTypes";
import PayrollNature from "@pages/admin/PayrollNature";
import PayrollConceptType from "@pages/admin/PayrollConceptType";
import Insure from "@pages/admin/Insure";
import PayrollConcept from "@pages/admin/PayrollConcept";
import CenterCost from "@pages/admin/CenterCost";
import Management from "@pages/admin/Management";
import Position from "@pages/admin/Position";
import Payroll from "@pages/home/Payroll";


// RUTAS CON LAYOUT
export const privateAdminRoutes = [
    { path: "/dashboard", component: MainDashboard },
    { path: "/reasons", component: Reasons },
    { path: "/profiles", component: Perfiles },
    { path: "/users", component: Usuarios },
    { path: "/areas", component: Areas },
    { path: "/blocks", component: Blocks },
    { path: "/motos", component: Motos },
    { path: "/alistamientos", component: Alistamientos },
    { path: "/pilotos", component: Pilotos },
    { path: "/servicios", component: Servicios },
    { path: "/tickets/:estadoId?", component: Tickets },
    { path: "/clients", component: Usuarios },
    { path: "/insurer-type", component: InsureTypes },
    { path: "/refundable", component: RefundableTypes },
    { path: "/payroll-nature", component: PayrollNature },
    { path: "/payroll-concept-type", component: PayrollConceptType },
    { path: "/payroll-concept", component: PayrollConcept },
    { path: "/insurer", component: Insure },
    { path: "/center-cost", component: CenterCost },
    { path: "/management", component: Management },
    { path: "/position", component: Position },
    { path: "/employees", component: Usuarios },
    { path: "/refunds", component: Payroll },
];

// RUTAS SIN LAYOUT

export const publicRoutes = [
    { path: "/", component: Login, exact: true },
    { path: "/restore-password/:token", component: ResetPassword },
];

export const errorRoute = { path: "*", component: NotFoundPage };
