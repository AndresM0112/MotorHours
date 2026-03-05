// import React, { useState, useEffect, useLayoutEffect, useRef } from "react";
// import { InputText } from "primereact/inputtext";
// import { Sidebar } from "primereact/sidebar";
// import { FaSearch, FaPlus, FaEraser } from "react-icons/fa";
// import { useFormContext, Controller } from "react-hook-form";
// import classNames from "classnames";
// import { useMediaQueryContext } from "@context/mediaQuery/mediaQueryContext";
// import { FixedSizeList as List } from "react-window";
// import "./styles/genericSelector.css";

// const GenericSelector = ({
//     name,
//     label = "Seleccionar...",
//     titulo = "",
//     items = [],
//     multiSelect = false,
//     onCreateNew,
//     renderItem,
//     renderValue,
//     renderActions,
//     rules = {},
//     filterBy = "nombre",
//     disabled = false,
//     showClear = false,
// }) => {
//     const {
//         control,
//         setValue,
//         formState: { errors },
//     } = useFormContext();
//     const { isMobile, isTablet } = useMediaQueryContext();

//     const listWrapperRef = useRef(null);
//     const [listHeight, setListHeight] = useState(530);

//     useLayoutEffect(() => {
//         const resizeObserver = new ResizeObserver((entries) => {
//             for (let entry of entries) {
//                 setListHeight(entry.contentRect.height);
//             }
//         });

//         if (listWrapperRef.current) {
//             resizeObserver.observe(listWrapperRef.current);
//         }

//         return () => resizeObserver.disconnect();
//     }, []);

//     const [sidebarVisible, setSidebarVisible] = useState(false);
//     const [query, setQuery] = useState("");
//     const [filteredItems, setFilteredItems] = useState(items);

//     useEffect(() => {
//         const q = query.toLowerCase();
//         const fields = filterBy.split(",").map((f) => f.trim());

//         const filtered = items.filter((item) =>
//             fields.some((field) => {
//                 const value = item?.[field];
//                 return typeof value === "string" && value.toLowerCase().includes(q);
//             })
//         );

//         setFilteredItems(filtered);
//     }, [query, items, filterBy]);

//     const getItemById = (id) => items.find((item) => item.id === id);

//     const isSelected = (value, item) => {
//         if (multiSelect) return Array.isArray(value) && value.includes(item.id);
//         return value === item.id;
//     };

//     const handleSelect = (value, item) => {
//         if (multiSelect) {
//             const list = Array.isArray(value) ? value : [];
//             const exists = list.includes(item.id);
//             const updated = exists ? list.filter((id) => id !== item.id) : [...list, item.id];
//             setValue(name, updated);
//         } else {
//             setValue(name, item.id);
//             setSidebarVisible(false);
//         }
//     };

//     const handleClear = () => {
//         setValue(name, multiSelect ? [] : null);
//     };

//     const renderDisplay = (value) => {
//         if (!value || (Array.isArray(value) && value.length === 0)) {
//             return "Sin asignar";
//         }

//         if (renderValue) return renderValue(value, items);

//         if (multiSelect) {
//             return Array.isArray(value)
//                 ? value
//                       .map((id) => getItemById(id)?.nombre || "")
//                       .filter(Boolean)
//                       .join(", ")
//                 : "";
//         }

//         return getItemById(value)?.nombre || label;
//     };

//     return (
//         <Controller
//             name={name}
//             control={control}
//             rules={rules}
//             render={({ field: { value } }) => (
//                 <div className="selector-modal-container">
//                     <div
//                         className={classNames("selector-display-box", {
//                             "p-invalid": errors[name],
//                             "selector-disabled": disabled,
//                         })}
//                         onClick={() => !disabled && setSidebarVisible(true)}
//                     >
//                         <div className="selector-custom-display">{renderDisplay(value)}</div>
//                     </div>

//                     <Sidebar
//                         visible={sidebarVisible}
//                         position="right"
//                         className="p-sidebar-md"
//                         style={{
//                             width: isMobile ? "100%" : isTablet ? 550 : 400,
//                         }}
//                         onHide={() => setSidebarVisible(false)}
//                     >
//                         <div className="selector-header">
//                             <h4>{titulo}</h4>
//                             <div className="selector-header-actions">
//                                 {value && showClear && (
//                                     <button className="selector-clear-button" onClick={handleClear}>
//                                         <FaEraser />
//                                     </button>
//                                 )}
//                             </div>
//                         </div>

//                         <div className="selector-search-row">
//                             <div className="selector-search-container">
//                                 <FaSearch className="selector-search-icon" />
//                                 <InputText
//                                     value={query}
//                                     onChange={(e) => setQuery(e.target.value)}
//                                     placeholder="Buscar..."
//                                     className="selector-search-input"
//                                 />
//                             </div>
//                             <button
//                                 className="selector-add-button"
//                                 onClick={() => onCreateNew?.(query)}
//                             >
//                                 <FaPlus style={{ marginRight: 5 }} />
//                                 Agregar
//                             </button>
//                         </div>

//                         {/* <div className="selector-list">
//                             {filteredItems.map((item) => (
//                                 <div
//                                     key={item.id}
//                                     className={`selector-list-item ${
//                                         isSelected(value, item) ? "selector-item-selected" : ""
//                                     }`}
//                                 >
//                                     <div
//                                         className="selector-item-info"
//                                         onClick={() => handleSelect(value, item)}
//                                     >
//                                         {renderItem ? renderItem(item) : item.nombre}
//                                     </div>
//                                     <div className="selector-item-actions">
//                                         {renderActions && renderActions(item)}
//                                     </div>
//                                 </div>
//                             ))}
//                         </div> */}

//                         <div ref={listWrapperRef} className="selector-list">
//                             <List
//                                 height={listHeight}
//                                 itemCount={filteredItems.length}
//                                 itemSize={60}
//                                 width={"100%"}
//                             >
//                                 {({ index, style }) => {
//                                     const item = filteredItems[index];
//                                     return (
//                                         <div
//                                             key={item.id}
//                                             style={style}
//                                             className={`selector-list-item ${
//                                                 isSelected(value, item)
//                                                     ? "selector-item-selected"
//                                                     : ""
//                                             }`}
//                                         >
//                                             <div
//                                                 className="selector-item-info"
//                                                 onClick={() => handleSelect(value, item)}
//                                             >
//                                                 {renderItem ? renderItem(item) : item.nombre}
//                                             </div>
//                                             <div className="selector-item-actions">
//                                                 {renderActions && renderActions(item)}
//                                             </div>
//                                         </div>
//                                     );
//                                 }}
//                             </List>
//                         </div>
//                     </Sidebar>
//                 </div>
//             )}
//         />
//     );
// };

// export default GenericSelector;

// // import React, { useState, useEffect, useLayoutEffect, useRef } from "react";
// // import ReactDOM from "react-dom";
// // import { InputText } from "primereact/inputtext";
// // import { Sidebar } from "primereact/sidebar";
// // import { FaSearch, FaPlus, FaEraser } from "react-icons/fa";
// // import { useFormContext, Controller } from "react-hook-form";
// // import classNames from "classnames";
// // import { useMediaQueryContext } from "@context/mediaQuery/mediaQueryContext";
// // import { FixedSizeList as List } from "react-window";
// // import "./styles/genericSelector.css";
// // import "../../pages/home/components/styles/Tickets.css";

// // const GenericSelector = ({
// //   name,
// //   label = "Seleccionar...",
// //   titulo = "",
// //   items = [],
// //   multiSelect = false,
// //   onCreateNew,
// //   renderItem,
// //   renderValue,
// //   renderActions,
// //   rules = {},
// //   filterBy = "nombre",
// //   disabled = false,
// //   showClear = false,

// //   // Props opcionales (pero ya no necesarias por la autodetección)
// //   selectorInlineInDialog = false,
// //   selectorHostWithin = ".tickets-modal",
// // }) => {
// //   const {
// //     control,
// //     setValue,
// //     formState: { errors },
// //   } = useFormContext();
// //   const { isMobile, isTablet } = useMediaQueryContext();

// //   const listWrapperRef = useRef(null);
// //   const [listHeight, setListHeight] = useState(530);

// //   useLayoutEffect(() => {
// //     const resizeObserver = new ResizeObserver((entries) => {
// //       for (let entry of entries) setListHeight(entry.contentRect.height);
// //     });
// //     if (listWrapperRef.current) resizeObserver.observe(listWrapperRef.current);
// //     return () => resizeObserver.disconnect();
// //   }, []);

// //   const [panelVisible, setPanelVisible] = useState(false);
// //   const [query, setQuery] = useState("");
// //   const [filteredItems, setFilteredItems] = useState(items);

// //   useEffect(() => {
// //     const q = query.toLowerCase();
// //     const fields = filterBy.split(",").map((f) => f.trim());
// //     const filtered = items.filter((item) =>
// //       fields.some((field) => {
// //         const value = item?.[field];
// //         return typeof value === "string" && value.toLowerCase().includes(q);
// //       })
// //     );
// //     setFilteredItems(filtered);
// //   }, [query, items, filterBy]);

// //   const getItemById = (id) => items.find((item) => item.id === id);

// //   const isSelected = (value, item) => {
// //     if (multiSelect) return Array.isArray(value) && value.includes(item.id);
// //     return value === item.id;
// //   };

// //   const handleSelect = (value, item) => {
// //     if (multiSelect) {
// //       const list = Array.isArray(value) ? value : [];
// //       const exists = list.includes(item.id);
// //       const updated = exists ? list.filter((id) => id !== item.id) : [...list, item.id];
// //       setValue(name, updated);
// //     } else {
// //       setValue(name, item.id);
// //       setPanelVisible(false);
// //     }
// //   };

// //   const handleClear = () => {
// //     setValue(name, multiSelect ? [] : null);
// //   };

// //   const renderDisplay = (value) => {
// //     if (!value || (Array.isArray(value) && value.length === 0)) return "Sin asignar";

// //     if (renderValue) return renderValue(value, items);

// //     if (multiSelect) {
// //       return Array.isArray(value)
// //         ? value
// //             .map((id) => getItemById(id)?.nombre || "")
// //             .filter(Boolean)
// //             .join(", ")
// //         : "";
// //     }

// //     return getItemById(value)?.nombre || label;
// //   };

// //   // --- UI reutilizable del panel ---
// //   const PanelBody = ({ value }) => (
// //     <>
// //       <div className="selector-header">
// //         {/* <h4>{titulo}</h4> */}
// //         <div className="selector-header-actions">
// //           {value && showClear && (
// //             <button
// //               className="selector-clear-button"
// //               onClick={handleClear}
// //               title="Limpiar selección"
// //             >
// //               <FaEraser />
// //             </button>
// //           )}
// //         </div>
// //       </div>

// //       <div className="selector-search-row">
// //         <div className="selector-search-container">
// //           <FaSearch className="selector-search-icon" />
// //           <InputText
// //             value={query}
// //             onChange={(e) => setQuery(e.target.value)}
// //             placeholder="Buscar..."
// //             className="selector-search-input"
// //           />
// //         </div>
// //         <button className="selector-add-button" onClick={() => onCreateNew?.(query)}>
// //           <FaPlus style={{ marginRight: 5 }} />
// //           Agregar
// //         </button>
// //       </div>

// //       <div
// //         ref={listWrapperRef}
// //         className="selector-list"
// //         style={{ position: "relative", height: 530 }}
// //       >
// //         <List height={listHeight} itemCount={filteredItems.length} itemSize={60} width={"100%"}>
// //           {({ index, style }) => {
// //             const item = filteredItems[index];
// //             return (
// //               <div
// //                 key={item.id}
// //                 style={style}
// //                 className={`selector-list-item ${isSelected(value, item) ? "selector-item-selected" : ""}`}
// //               >
// //                 <div className="selector-item-info" onClick={() => handleSelect(value, item)}>
// //                   {renderItem ? renderItem(item) : item.nombre}
// //                 </div>
// //                 <div className="selector-item-actions">
// //                   {renderActions && renderActions(item)}
// //                 </div>
// //               </div>
// //             );
// //           }}
// //         </List>
// //       </div>
// //     </>
// //   );

// //   return (
// //     <Controller
// //       name={name}
// //       control={control}
// //       rules={rules}
// //       render={({ field: { value } }) => {
// //         const trigger = (
// //           <div
// //             className={classNames("selector-display-box", {
// //               "p-invalid": errors[name],
// //               "selector-disabled": disabled,
// //             })}
// //             onClick={() => !disabled && setPanelVisible(true)}
// //           >
// //             <div className="selector-custom-display">{renderDisplay(value)}</div>
// //           </div>
// //         );

// //         // 🔎 Autodetección de host dentro del Dialog
// //         const autoHost =
// //           typeof document !== "undefined"
// //             ? document.querySelector(".tickets-modal")
// //             : null;

// //         const effectiveInline = selectorInlineInDialog || !!autoHost;

// //         const host =
// //           typeof document !== "undefined"
// //             ? document.querySelector(selectorHostWithin) || autoHost
// //             : null;

// //         // --- MODO INLINE (dentro del Dialog) ---
// //         if (effectiveInline) {
// //           const inlinePanel = (
// //             <>
// //               {/* máscara interna del Dialog */}
// //               <div
// //                 className="inline-inside-dialog-mask show"
// //                 onClick={() => setPanelVisible(false)}
// //               />
// //               {/* panel pegado a la derecha */}
// //               <div className="inline-inside-dialog show" style={{ width: "clamp(380px,58%,720px)" }}>
// //                 <div className="inline-header">
// //                   <div className="flex align-items-center justify-content-between">
// //                     <h4 className="m-0">{titulo}</h4>
// //                     <button
// //                       className="p-button p-button-text p-button-sm"
// //                       onClick={() => setPanelVisible(false)}
// //                     >
// //                       Cerrar
// //                     </button>
// //                   </div>
// //                 </div>
// //                 <div className="inline-body">
// //                   <PanelBody value={value} />
// //                 </div>
// //               </div>
// //             </>
// //           );

// //           return (
// //             <div className="selector-modal-container">
// //               {trigger}
// //               {panelVisible &&
// //                 (host
// //                   ? ReactDOM.createPortal(inlinePanel, host) // monta dentro del Dialog
// //                   : inlinePanel /* fallback inline si por alguna razón no hay host */)}
// //             </div>
// //           );
// //         }

// //         // --- MODO Sidebar clásico (global) ---
// //         return (
// //           <div className="selector-modal-container">
// //             {trigger}
// //             <Sidebar
// //               visible={panelVisible}
// //               position="right"
// //               className="p-sidebar-md"
// //               style={{ width: isMobile ? "100%" : isTablet ? 550 : 400 }}
// //               onHide={() => setPanelVisible(false)}
// //             >
// //               <PanelBody value={value} />
// //             </Sidebar>
// //           </div>
// //         );
// //       }}
// //     />
// //   );
// // };

// // export default GenericSelector;

import React, { useState, useEffect, useLayoutEffect, useRef } from "react";
import { InputText } from "primereact/inputtext";
import { Sidebar } from "primereact/sidebar";
import { FaSearch, FaPlus, FaEraser } from "react-icons/fa";
import { useFormContext, Controller } from "react-hook-form";
import classNames from "classnames";
import { useMediaQueryContext } from "@context/mediaQuery/mediaQueryContext";
import { FixedSizeList as List } from "react-window";
import "./styles/genericSelector.css";

const GenericSelector = ({
    name,
    label = "Seleccionar...",
    titulo = "",
    items = [],
    multiSelect = false,
    onCreateNew,
    renderItem,
    renderValue,
    renderActions,
    rules = {},
    filterBy = "nombre",
    disabled = false,
    showClear = false,
}) => {
    const {
        control,
        setValue,
        formState: { errors },
    } = useFormContext();
    const { isMobile, isTablet } = useMediaQueryContext();

    const listWrapperRef = useRef(null);
    const [listHeight, setListHeight] = useState(530);

    useLayoutEffect(() => {
        const resizeObserver = new ResizeObserver((entries) => {
            for (let entry of entries) {
                setListHeight(entry.contentRect.height);
            }
        });

        if (listWrapperRef.current) {
            resizeObserver.observe(listWrapperRef.current);
        }

        return () => resizeObserver.disconnect();
    }, []);

    const [sidebarVisible, setSidebarVisible] = useState(false);
    const [query, setQuery] = useState("");
    const [filteredItems, setFilteredItems] = useState(items);

    useEffect(() => {
        const q = query.toLowerCase();
        const fields = filterBy.split(",").map((f) => f.trim());

        const filtered = items.filter((item) =>
            fields.some((field) => {
                const value = item?.[field];
                return typeof value === "string" && value.toLowerCase().includes(q);
            })
        );

        setFilteredItems(filtered);
    }, [query, items, filterBy]);

    const getItemById = (id) => items.find((item) => item.id === id);

    const isSelected = (value, item) => {
        if (multiSelect) return Array.isArray(value) && value.includes(item.id);
        return value === item.id;
    };

    const handleSelect = (value, item) => {
        if (multiSelect) {
            const list = Array.isArray(value) ? value : [];
            const exists = list.includes(item.id);
            const updated = exists ? list.filter((id) => id !== item.id) : [...list, item.id];
            setValue(name, updated);
        } else {
            setValue(name, item.id);
            setSidebarVisible(false);
        }
    };

    const handleClear = () => {
        setValue(name, multiSelect ? [] : null);
    };

    const renderDisplay = (value) => {
        if (!value || (Array.isArray(value) && value.length === 0)) {
            return "Sin asignar";
        }

        if (renderValue) return renderValue(value, items);

        if (multiSelect) {
            return Array.isArray(value)
                ? value
                      .map((id) => getItemById(id)?.nombre || "")
                      .filter(Boolean)
                      .join(", ")
                : "";
        }

        return getItemById(value)?.nombre || label;
    };

    return (
        <Controller
            name={name}
            control={control}
            rules={rules}
            render={({ field: { value } }) => (
                <div className="selector-modal-container">
                    <div
                        className={classNames("selector-display-box", {
                            "p-invalid": errors[name],
                            "selector-disabled": disabled,
                        })}
                        onClick={() => !disabled && setSidebarVisible(true)}
                    >
                        <div className="selector-custom-display">{renderDisplay(value)}</div>
                    </div>

                    <Sidebar
                        visible={sidebarVisible}
                        position="right"
                        className="p-sidebar-md"
                        style={{
                            width: isMobile ? "100%" : isTablet ? 550 : 400,
                        }}
                        onHide={() => setSidebarVisible(false)}
                    >
                        <div className="selector-header">
                            <h4>{titulo}</h4>
                            <div className="selector-header-actions">
                                {value && showClear && (
                                    <button className="selector-clear-button" onClick={handleClear}>
                                        <FaEraser />
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="selector-search-row">
                            <div className="selector-search-container">
                                <FaSearch className="selector-search-icon" />
                                <InputText
                                    value={query}
                                    onChange={(e) => setQuery(e.target.value)}
                                    placeholder="Buscar..."
                                    className="selector-search-input"
                                />
                            </div>
                            <button
                                className="selector-add-button"
                                onClick={() => onCreateNew?.(query)}
                            >
                                <FaPlus style={{ marginRight: 5 }} />
                                Agregar
                            </button>
                        </div>

                        {/* <div className="selector-list">
                            {filteredItems.map((item) => (
                                <div
                                    key={item.id}
                                    className={`selector-list-item ${
                                        isSelected(value, item) ? "selector-item-selected" : ""
                                    }`}
                                >
                                    <div
                                        className="selector-item-info"
                                        onClick={() => handleSelect(value, item)}
                                    >
                                        {renderItem ? renderItem(item) : item.nombre}
                                    </div>
                                    <div className="selector-item-actions">
                                        {renderActions && renderActions(item)}
                                    </div>
                                </div>
                            ))}
                        </div> */}

                        <div ref={listWrapperRef} className="selector-list">
                            <List
                                height={listHeight}
                                itemCount={filteredItems.length}
                                itemSize={60}
                                width={"100%"}
                            >
                                {({ index, style }) => {
                                    const item = filteredItems[index];
                                    return (
                                        <div
                                            key={item.id}
                                            style={style}
                                            className={`selector-list-item ${
                                                isSelected(value, item)
                                                    ? "selector-item-selected"
                                                    : ""
                                            }`}
                                        >
                                            <div
                                                className="selector-item-info"
                                                onClick={() => handleSelect(value, item)}
                                            >
                                                {renderItem ? renderItem(item) : item.nombre}
                                            </div>
                                            <div className="selector-item-actions">
                                                {renderActions && renderActions(item)}
                                            </div>
                                        </div>
                                    );
                                }}
                            </List>
                        </div>
                    </Sidebar>
                </div>
            )}
        />
    );
};

export default GenericSelector;
