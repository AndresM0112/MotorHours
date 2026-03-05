// MediaQueryContext.js
import React, { createContext, useContext } from "react";
import { useMediaQuery } from "react-responsive";

// Crear el contexto
const MediaQueryContext = createContext();

// Crear el proveedor del contexto
export const MediaQueryProvider = ({ children }) => {
    const isMobile = useMediaQuery({ query: "(max-width: 768px)" });
    const isTablet = useMediaQuery({
        query: "(min-width: 769px) and (max-width: 1024px)",
    });
    const isDesktop = useMediaQuery({ query: "(min-width: 1025px)" });

    return <MediaQueryContext.Provider value={{ isMobile, isTablet, isDesktop }}>{children}</MediaQueryContext.Provider>;
};

// Hook para usar el contexto
export const useMediaQueryContext = () => {
    return useContext(MediaQueryContext);
};
