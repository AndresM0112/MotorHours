import { useMediaQueryContext } from "@context/mediaQuery/mediaQueryContext";
import React, { createContext } from "react";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { FaCheckCircle, FaInfoCircle, FaExclamationTriangle, FaTimesCircle } from "react-icons/fa";

export const ToastContext = createContext({});

const defaultToastConfig = {
    autoClose: 3000,
    hideProgressBar: false,
    closeOnClick: true,
    pauseOnHover: true,
    draggable: true,
    theme: "light",
};

const getIcon = (type) => {
    const iconMap = {
        success: <FaCheckCircle />,
        info: <FaInfoCircle />,
        warn: <FaExclamationTriangle />,
        error: <FaTimesCircle />,
    };

    const colors = {
        success: "#2ecc71",
        info: "#3498db",
        warn: "#f1c40f",
        error: "#e74c3c",
    };

    return (
        <span style={{ color: colors[type], fontSize: "1.4rem", marginRight: "8px" }}>
            {iconMap[type]}
        </span>
    );
};

const getGlassStyle = (type) => {
    const colors = {
        success: "#2ecc71",
        info: "#3498db",
        warn: "#f1c40f",
        error: "#e74c3c",
    };

    return {
        style: {
            background: "#ffff",
            color: "#1a1a1a",
            borderRadius: "16px",
            boxShadow: "0 8px 32px rgba(0,0,0,0.2)",
            fontSize: "1rem",
            padding: "16px 24px",
            maxWidth: "90vw",
            minWidth: "260px",
        },
        bodyStyle: {
            fontWeight: 500,
            letterSpacing: "0.02em",
        },
        progressStyle: {
            background: colors[type],
        },
        theme: "colored",
        closeButton: true,
        hideProgressBar: false,
        pauseOnHover: true,
        draggable: true,
    };
};

export const ToastProvider = ({ children }) => {
    const { isDesktop } = useMediaQueryContext();

    const showSuccess = (message, sticky = false) => {
        toast.success(message, {
            ...defaultToastConfig,
            autoClose: sticky ? false : defaultToastConfig.autoClose,
            theme: "colored",
            icon: getIcon("success"),
            ...getGlassStyle("success"),
        });
    };

    const showInfo = (message, sticky = false) => {
        toast.info(message, {
            ...defaultToastConfig,
            autoClose: sticky ? false : defaultToastConfig.autoClose,
            icon: getIcon("info"),
            ...getGlassStyle("info"),
        });
    };

    const showInfoBottomLeft = (message, sticky = false) => {
        toast.info(message, {
            ...defaultToastConfig,
            autoClose: sticky ? false : defaultToastConfig.autoClose,
            position: "bottom-left",
            theme: "colored",
            style: {
                background: "rgba(44, 62, 80, 0.85)",
                color: "#fff",
                borderRadius: "12px",
                boxShadow: "0 4px 24px rgba(44,62,80,0.12)",
                fontSize: "1rem",
                padding: "16px 20px",
                maxWidth: "90vw",
                minWidth: "220px",
                backdropFilter: "blur(2px)",
            },
            bodyStyle: {
                fontWeight: 500,
                letterSpacing: "0.01em",
            },
            progressStyle: {
                background: "#00b894",
            },
            closeButton: true,
            hideProgressBar: false,
            pauseOnHover: true,
            draggable: true,
        });
    };

    const showWarn = (message, sticky = false) => {
        toast.warn(message, {
            ...defaultToastConfig,
            autoClose: sticky ? false : defaultToastConfig.autoClose,
            icon: getIcon("warn"),
            ...getGlassStyle("warn"),
        });
    };

    const showError = (message, sticky = false) => {
        toast.error(message, {
            ...defaultToastConfig,
            autoClose: sticky ? false : defaultToastConfig.autoClose,
            icon: getIcon("error"),
            ...getGlassStyle("error"),
        });
    };

    const showObligatorios = (isValid) => {
        if (!isValid) {
            showInfo("Hay información obligatoria por ingresar. Verificar");
        }
    };

    const showPromise = (promise, { pending, success, error }) => {
        return toast.promise(promise, {
            pending: {
                icon: getIcon("info"),
                ...getGlassStyle("info"),
                render: pending,
            },
            success: {
                icon: getIcon("success"),
                ...getGlassStyle("success"),
                render: success,
            },
            error: {
                icon: getIcon("error"),
                ...getGlassStyle("error"),
                render: error,
            },
        });
    };

    return (
        <ToastContext.Provider
            value={{
                showSuccess,
                showInfo,
                showInfoBottomLeft,
                showWarn,
                showError,
                showObligatorios,
                showPromise,
            }}
        >
            {children}
            <ToastContainer position={isDesktop ? "top-right" : "top-center"} />
        </ToastContext.Provider>
    );
};
