import React from "react";

export const AppFooter = (props) => {
    return (
        <div className="layout-footer" id="divfooter">
            <img
                src={
                    props.layoutColorMode === "light"
                        ? `${process.env.PUBLIC_URL}/images/logos/logoStayMini.png`
                        : `${process.env.PUBLIC_URL}/assets/layout/images/logo-white.svg`
                }
                alt="Logo"
                height="20"
                className="mr-2"
            />
            by
            <span className="font-medium ml-2">Andres Murillo</span>
        </div>
    );
};
