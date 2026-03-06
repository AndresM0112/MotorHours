import MainDashboard from "@pages/home/MainDashboard";
import Perfiles from "@pages/security/Perfiles";
import Usuarios from "@pages/security/Usuarios";
import Login from "@pages/auth/LoginPage";
import ResetPassword from "@pages/auth/ResetPassword";
import NotFoundPage from "@pages/app/NotFoundPage";
import Motos from "@pages/admin/Motos";
import Alistamientos from "@pages/admin/Alistamientos";
import Pilotos from "@pages/admin/Pilotos";
import Servicios from "@pages/admin/Servicios";


// RUTAS CON LAYOUT
export const privateAdminRoutes = [
    { path: "/dashboard", component: MainDashboard },
    { path: "/profiles", component: Perfiles },
    { path: "/users", component: Usuarios },
    { path: "/motos", component: Motos },
    { path: "/alistamientos", component: Alistamientos },
    { path: "/pilotos", component: Pilotos },
    { path: "/servicios", component: Servicios },
];

// RUTAS SIN LAYOUT

export const publicRoutes = [
    { path: "/", component: Login, exact: true },
    { path: "/restore-password/:token", component: ResetPassword },
];

export const errorRoute = { path: "*", component: NotFoundPage };
