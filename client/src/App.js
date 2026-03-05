import React, { useContext, useEffect } from "react";
import { Route, Switch } from "react-router-dom";
import PrivateRoute from "@components/PrivateRoute";
import PublicRoute from "@components/PublicRoute";
import Layout from "@components/layout/Layout";
import { publicRoutes, privateAdminRoutes, errorRoute } from "./routes";
import { AuthContext } from "@context/auth/AuthContext";
import socket from "socket/socket";

const App = () => {
    const { idusuario } = useContext(AuthContext);

    useEffect(() => {
        if (idusuario && socket.connected) {
            socket.emit("joinRoom", `user:${idusuario}`);
            console.log("Unido a sala:", `user:${idusuario}`);
        }

        // En caso de que el socket aún no esté conectado
        socket.on("connect", () => {
            if (idusuario) {
                socket.emit("joinRoom", `user:${idusuario}`);
                console.log("Unido a sala tras reconexión:", `user:${idusuario}`);
            }
        });

        return () => {
            socket.off("connect");
        };
    }, [idusuario]);

    return (
        <Switch>
            {/* RUTAS PÚBLICAS */}
            {publicRoutes.map((route, index) => (
                <PublicRoute
                    key={index}
                    exact={route.exact}
                    path={route.path}
                    component={route.component}
                />
            ))}

            {/* RUTAS CON LAYOUT (ADMINISTRATIVO) */}
            <Route path="/">
                <Layout>
                    <Switch>
                        {privateAdminRoutes.map((route, index) => (
                            <PrivateRoute
                                key={index}
                                path={route.path}
                                component={route.component}
                            />
                        ))}

                        {/* RUTA DE ERROR */}
                        <Route path={errorRoute.path} component={errorRoute.component} />
                    </Switch>
                </Layout>
            </Route>
        </Switch>
    );
};

export default App;
