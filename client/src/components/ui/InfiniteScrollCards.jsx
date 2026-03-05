import React, { useRef, useEffect, useCallback } from "react";
import { useMediaQueryContext } from "@context/mediaQuery/mediaQueryContext";
import { ScrollPanel } from "primereact/scrollpanel";
import { Skeleton } from "primereact/skeleton";
import { formatNotificationDateTime } from "@utils/formatTime";
import "./styles/InfiniteScrollCards.css";

const InfiniteScrollCards = ({
    data = [],
    total = 0,
    loading = false,
    onScrollEnd = () => {},
    renderActions = () => null,
    onCardClick = () => {},
    showFooter = true,
    headerTemplate = null,
    bodyTemplate = null,
    footerTemplate = null,
    cardStyle = {},
    dataTable = true,
}) => {
    const { isMobile, isTablet } = useMediaQueryContext();
    const observer = useRef();

    const hasMore = data.length < total;

    const lastItemObserver = useCallback(
        (node) => {
            if (loading) return;
            if (observer.current) observer.current.disconnect();
            observer.current = new IntersectionObserver((entries) => {
                if (entries[0].isIntersecting && hasMore) {
                    onScrollEnd();
                }
            });
            if (node) observer.current.observe(node);
        },
        [loading, hasMore, onScrollEnd]
    );

    const renderCardItem = (item, idx) => {
        const card = (
            <div
                className="card-item"
                key={item.id || item.usuId || item.motId || idx}
                onClick={(e) => onCardClick({ value: item, originalEvent: e })}
                style={cardStyle}
            >
                <div className="card-header-top">
                    {headerTemplate ? headerTemplate(item) : null}
                </div>

                <div className="card-body">
                    <div className="card-content">{bodyTemplate ? bodyTemplate(item) : null}</div>
                </div>

                {showFooter && (
                    <>
                        {!footerTemplate ? (
                            <div className="card-footer">
                                <div className="footer-left">
                                    <span className="footer-text">
                                        <strong>{item.usuact}</strong>
                                        <br />
                                        {formatNotificationDateTime(item.fecact)}
                                    </span>
                                </div>
                                <div className="footer-right">{renderActions(item)}</div>
                            </div>
                        ) : (
                            <>{footerTemplate ? footerTemplate(item) : null}</>
                        )}
                    </>
                )}
            </div>
        );

        if (idx === data.length - 1) {
            return (
                <div ref={lastItemObserver} key={`card-last-${idx}`}>
                    {card}
                </div>
            );
        }
        return card;
    };

    const renderContent = () => {
        if (loading) {
            return Array.from({ length: 5 }).map((_, idx) => renderSkeletonCard(idx));
        }

        if (data.length === 0) {
            return <div className="p-text-center p-mt-6">No hay datos disponibles</div>;
        }

        return data.map((item, idx) => renderCardItem(item, idx));
    };

    const renderSkeletonCard = (idx) => (
        <div className="card-item skeleton-card" key={`skeleton-${idx}`}>
            <div className="card-header-top">
                <Skeleton width="60%" height="1.2rem" borderRadius="8px" />
                <Skeleton
                    width="30%"
                    height="1rem"
                    borderRadius="8px"
                    style={{ marginLeft: "auto" }}
                />
            </div>
            <div className="card-body">
                <div className="card-content">
                    <Skeleton width="90%" height="1rem" borderRadius="6px" className="mb-2" />
                    <Skeleton width="70%" height="1rem" borderRadius="6px" className="mb-2" />
                    <Skeleton width="50%" height="1rem" borderRadius="6px" />
                </div>
            </div>
            <div className="card-footer">
                <div className="footer-left">
                    <Skeleton width="40%" height="1rem" borderRadius="6px" />
                </div>
                <div className="footer-right">
                    <Skeleton width="2rem" height="2rem" shape="circle" />
                </div>
            </div>
        </div>
    );

    if (!(isMobile || isTablet)) return null;

    return (
        <ScrollPanel style={{ height: `${dataTable ? "calc(100vh - 220px)" : ""}` }}>
            <div className="infinite-scroll-card-list">
                {renderContent()}
                {loading && data.length > 0 && (
                    <div style={{ textAlign: "center", padding: "1rem" }}>Cargando...</div>
                )}
            </div>
        </ScrollPanel>
    );
};

export default InfiniteScrollCards;
