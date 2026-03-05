import React, { useState, useMemo, useCallback, useRef, useEffect } from "react";
import "./styles/searchModal.css";
import PropTypes from "prop-types";
import { FaArrowUp, FaArrowDown, FaLevelDownAlt } from "react-icons/fa";

const SearchModal = ({ onClose, menureal }) => {
    const [searchTerm, setSearchTerm] = useState("");
    const [highlightedIndex, setHighlightedIndex] = useState(-1);
    const flattenMenu = useCallback((menuItems) => {
        const result = [];

        menuItems.forEach((item) => {
            if (item.items && Array.isArray(item.items)) {
                const childItems = item.items.map((child) => ({
                    title: child.label,
                    description: child.description || "",
                    path: `/${child.toa}`,
                    parent: item.label,
                }));

                result.push({
                    title: item.label,
                    description: item.description || "",
                    path: `/${item.toa}`,
                    isParent: true,
                    children: childItems,
                });
            } else if (item.label && item.toa) {
                result.push({
                    title: item.label,
                    description: item.description || "",
                    path: `/${item.toa}`,
                    isParent: true,
                    children: [],
                });
            }
        });

        return result;
    }, []);

    const menuPages = useMemo(() => flattenMenu(menureal), [menureal, flattenMenu]);

    const flattenedChildren = useMemo(
        () => menuPages.flatMap((page) => page.children || []),
        [menuPages]
    );

    const [filteredChildren, setFilteredChildren] = useState(flattenedChildren);

    const modalRef = useRef(null);
    const suggestionRefs = useRef([]);

    useEffect(() => {
        const handleKeyDown = (event) => {
            if (event.key === "Escape") {
                onClose();
            }
        };

        document.addEventListener("keydown", handleKeyDown);
        return () => {
            document.removeEventListener("keydown", handleKeyDown);
        };
    }, [onClose]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (modalRef.current && !modalRef.current.contains(event.target)) {
                onClose();
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [onClose]);

    const [suggestions, setSuggestions] = useState(menuPages);

    const highlightText = (text, query) => {
        if (!query) return text;
        const regex = new RegExp(`(${query})`, "gi");
        return text.replace(regex, '<span class="highlight-text">$1</span>');
    };

    const handleSearch = (event) => {
        const value = event.target.value.toLowerCase();
        setSearchTerm(value);

        if (value) {
            const filtered = menuPages
                .map((page) => {
                    const filteredChildren = page.children.filter(
                        (child) =>
                            child.title.toLowerCase().includes(value) ||
                            child.description.toLowerCase().includes(value)
                    );

                    if (filteredChildren.length > 0) {
                        return {
                            ...page,
                            children: filteredChildren,
                        };
                    }
                    return null;
                })
                .filter(Boolean);

            const flatChildren = filtered.flatMap((page) => page.children || []);

            setSuggestions(filtered);
            setFilteredChildren(flatChildren);
            setHighlightedIndex(flatChildren.length > 0 ? 0 : -1);
        } else {
            setSuggestions(menuPages);
            const flatChildren = menuPages.flatMap((page) => page.children || []);
            setFilteredChildren(flatChildren);
            setHighlightedIndex(flatChildren.length > 0 ? 0 : -1);
        }
    };

    const handleSelectSuggestion = (path) => {
        window.location.href = `#${path}`;
        onClose();
    };

    // 🚨 CORRECCIÓN: Resetear referencias cada vez que se actualizan las sugerencias
    useEffect(() => {
        suggestionRefs.current = [];
    }, [filteredChildren, suggestions]);

    const handleKeyDown = (event) => {
        const activeList = filteredChildren.length > 0 ? filteredChildren : flattenedChildren;

        if (activeList.length === 0) return;

        if (event.key === "ArrowDown") {
            const newIndex = (highlightedIndex + 1) % activeList.length;
            setHighlightedIndex(newIndex);

            requestAnimationFrame(() => {
                if (suggestionRefs.current[newIndex]) {
                    suggestionRefs.current[newIndex].scrollIntoView({
                        behavior: "smooth",
                        block: "nearest",
                    });
                }
            });
        } else if (event.key === "ArrowUp") {
            const newIndex = highlightedIndex === 0 ? activeList.length - 1 : highlightedIndex - 1;
            setHighlightedIndex(newIndex);

            requestAnimationFrame(() => {
                if (suggestionRefs.current[newIndex]) {
                    suggestionRefs.current[newIndex].scrollIntoView({
                        behavior: "smooth",
                        block: "nearest",
                    });
                }
            });
        } else if (event.key === "Enter") {
            event.preventDefault();
            if (highlightedIndex >= 0 && highlightedIndex < activeList.length) {
                handleSelectSuggestion(activeList[highlightedIndex].path);
            }
        }
    };

    return (
        <div className="search-modal-overlay">
            <div className="search-header" ref={modalRef}>
                <div className="search-modal">
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={handleSearch}
                        onKeyDown={handleKeyDown}
                        placeholder="Buscar ..."
                        className="search-input"
                        autoFocus
                    />

                    {/* Footer de navegación fijo debajo del buscador */}
                    <div className="search-footer">
                        <div className="footer-item">
                            <FaArrowUp />
                            <FaArrowDown />
                            <span>para navegar</span>
                        </div>

                        <div className="footer-item">
                            <FaLevelDownAlt />
                            <span>para seleccionar</span>
                        </div>

                        <div className="footer-item">
                            ESC <span>para cerrar</span>
                        </div>
                    </div>
                </div>

                {/* Separación visual clara */}
                <div className="separator"></div>

                {/* Cambié la clase de este contenedor para evitar conflictos */}
                <div className="search-content">
                    <div className="suggestions-list">
                        <>
                            {filteredChildren.map((child, index) => {
                                const parent = menuPages.find((page) =>
                                    page.children.some((c) => c.path === child.path)
                                );

                                return (
                                    <React.Fragment key={index}>
                                        {index === 0 ||
                                        filteredChildren[index - 1].parent !== child.parent ? (
                                            <span className="parent-title">
                                                {parent?.title || "Sin padre"}
                                            </span>
                                        ) : null}

                                        <li
                                            ref={(el) => (suggestionRefs.current[index] = el)}
                                            className={`suggestion-item ${
                                                index === highlightedIndex ? "highlighted" : ""
                                            }`}
                                            onClick={() => handleSelectSuggestion(child.path)}
                                        >
                                            <div
                                                className="suggestion-item-title"
                                                dangerouslySetInnerHTML={{
                                                    __html: highlightText(child.title, searchTerm),
                                                }}
                                            />
                                            <div
                                                className="suggestion-item-description"
                                                dangerouslySetInnerHTML={{
                                                    __html: highlightText(
                                                        child.description,
                                                        searchTerm
                                                    ),
                                                }}
                                            />
                                        </li>
                                    </React.Fragment>
                                );
                            })}
                        </>
                    </div>
                </div>
            </div>
        </div>
    );
};

SearchModal.propTypes = {
    onClose: PropTypes.func.isRequired,
    menureal: PropTypes.arrayOf(
        PropTypes.shape({
            label: PropTypes.string.isRequired,
            toa: PropTypes.string,
            description: PropTypes.string,
            items: PropTypes.array,
        })
    ).isRequired,
};

export default SearchModal;
