import React, { useContext } from "react";
import { Route, Redirect } from "react-router-dom";
import { AuthContext } from "../context/auth/AuthContext";
import Cookies from "js-cookie";

const PrivateRoute = ({ component: Component, ...rest }) => {
    const { autentificado } = useContext(AuthContext);
    const isAuthenticated = autentificado || Cookies.get("autentificadoMOTORHOURS") === "true";

    return (
        <Route
            {...rest}
            render={(props) => {
                if (!isAuthenticated) return <Redirect to="/" />;
                return <Component {...props} />;
            }}
        />
    );
};

export default PrivateRoute;
