import "react-app-polyfill/ie11";
import React from "react";
import ReactDOM from "react-dom";
import App from "./App";
import { HashRouter } from "react-router-dom";
import ScrollToTop from "./ScrollToTop";
import { locale, addLocale } from "primereact/api";
import { AuthProvider } from "./context/auth/AuthContext";
import { ToastProvider } from "./context/toast/ToastContext";
import { MediaQueryProvider } from "./context/mediaQuery/mediaQueryContext";
import { SocketProvider } from "./context/socket/SocketContext";
import ErrorBoundary from "@utils/ErrorBoundary";
import "../src/styles/styles.css";

addLocale("es", {
    firstDayOfWeek: 1,
    dayNames: ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"],
    dayNamesShort: ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"],
    dayNamesMin: ["D", "L", "M", "X", "J", "V", "S"],
    monthNames: [
        "enero",
        "febrero",
        "marzo",
        "abril",
        "mayo",
        "junio",
        "julio",
        "agosto",
        "septiembre",
        "octubre",
        "noviembre",
        "diciembre",
    ],
    monthNamesShort: [
        "ene",
        "feb",
        "mar",
        "abr",
        "may",
        "jun",
        "jul",
        "ago",
        "sep",
        "oct",
        "nov",
        "dic",
    ],
    today: "Hoy",
    clear: "Limpiar",
});

locale("es");

const AppState = ({ children }) => {
    return <AuthProvider>{children}</AuthProvider>;
};

ReactDOM.render(
    <React.StrictMode>
        <ErrorBoundary>
            <SocketProvider>
                <MediaQueryProvider>
                    <ToastProvider>
                        <AppState>
                            <HashRouter>
                                <ScrollToTop>
                                    <App />
                                </ScrollToTop>
                            </HashRouter>
                        </AppState>
                    </ToastProvider>
                </MediaQueryProvider>
            </SocketProvider>
        </ErrorBoundary>
    </React.StrictMode>,
    document.getElementById("root")
);

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: http://bit.ly/CRA-PWA
//serviceWorker.unregister();
