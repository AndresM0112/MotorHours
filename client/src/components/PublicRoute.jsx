import React from "react";
import { Redirect, Route, useLocation } from "react-router-dom";
import Cookies from "js-cookie";

const PublicRoute = ({ component: Component, ...rest }) => {
    const location = useLocation();
    const path = location.pathname;
    const isAuthenticated = Cookies.get("autentificadoMOTORHOURS");

    return (
        <Route
            {...rest}
            render={(props) =>
                isAuthenticated && path === "/" ? (
                    <Redirect to="/dashboard" />
                ) : (
                    <Component {...props} />
                )
            }
        />
    );
};

export default PublicRoute;
