import React from "react";
import PropTypes from "prop-types";
import { IoIosArrowForward } from "react-icons/io";
import { Tooltip } from "primereact/tooltip";

const PageHeader = ({ page, title, description = null, descriptionDashboard = null }) => {
    return (
        <div style={{ marginTop: "2px", padding: "16px 24px" }}>
            {description && <Tooltip target=".title-tooltip" position="right" />}

            <h4
                style={{
                    margin: 0,
                    fontWeight: "bold",
                    fontSize: "1.2rem",
                    color: "#333",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                }}
            >
                <span
                    style={{
                        fontWeight: "normal",
                        color: "#6c757d",
                        display: "flex",
                        alignItems: "center",
                    }}
                >
                    {page} <IoIosArrowForward style={{ marginLeft: "4px" }} />
                </span>

                <span
                    className="title-tooltip"
                    data-pr-tooltip={description}
                    data-pr-position="right"
                    style={{ cursor: description ? "help" : "default" }}
                >
                    {title}
                </span>
            </h4>

            {descriptionDashboard && (
                <p style={{ margin: "8px 0 0", fontSize: "1.2rem", color: "#555" }}>
                    <strong style={{ fontWeight: 900 }}>BIENVENIDO </strong>
                    {descriptionDashboard}
                </p>
            )}
        </div>
    );
};

PageHeader.propTypes = {
    page: PropTypes.string.isRequired,
    title: PropTypes.string.isRequired,
    description: PropTypes.string,
    descriptionDashboard: PropTypes.string,
};

export default PageHeader;
