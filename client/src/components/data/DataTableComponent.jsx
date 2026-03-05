
import React, { useEffect, useMemo, useRef, useState } from "react";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { propsDataTable } from "@utils/converAndConst";
import NoDataInformation from "./NoDataInformation";
import { OverlayPanel } from "primereact/overlaypanel";
import { Button } from "primereact/button";
import { Checkbox } from "primereact/checkbox";
import { useMediaQueryContext } from "@context/mediaQuery/mediaQueryContext";

const DataTableComponent = ({
  KeyModule = null,
  editMode,
  dataKey,
  header,
  datos,
  columns = [],
  loading,
  totalRecords,
  pagination,
  onCustomPage,
  setPagination,
  actionBodyTemplate,
  isPagination = true,
  isChecked = false,
  isRowSelectable = false,
  selection,
  onSelectionChange,
  hasfooter = false,
  footerColumnGroup,
  width = null,
  rowClassName,
  emptyMessage = null,
  rowsPerPageOptions,

  // >>> NUEVO: props de expansión (se pasan desde Blocks.jsx)
  expandedRows,
  onRowToggle,
  rowExpansionTemplate,

  fullHeight = false,

  onRowExpand,
  onRowCollapse,
  scrollable,
  scrollHeight,
  classNameTableWrapper,
}) => {
  const { isMobile } = useMediaQueryContext();
  const [isLoaded, setIsLoaded] = useState(false);
  const overlayPanelRef = useRef(null);

  // --- columnas: separamos expander vs normales ---
  const expanderColumns = useMemo(
    () => columns.filter((c) => c.expander === true),
    [columns]
  );
  // Solo columnas "visibles" administrables: con field definido
  const baseVisibleColumns = useMemo(
    () => columns.filter((c) => !c.expander && !!c.field),
    [columns]
  );

  // Estado para columnas visibles (solo las con field)
  const [visibleColumns, setVisibleColumns] = useState(baseVisibleColumns);

  const storageKey = `visibleColumns_${KeyModule}`;
  const hasLoadedFromStorage = useRef(false);

  // Filtrado por móvil: si es móvil, usa solo las marcadas mobile===true
  const filteredColumns = useMemo(() => {
    if (isMobile) return baseVisibleColumns.filter((col) => col.mobile === true);
    return baseVisibleColumns;
  }, [baseVisibleColumns, isMobile]);

  // Cargar de localStorage (solo columnas con field); ignorar expander/acciones
  useEffect(() => {
    if (!isMobile) {
      const savedColumns = localStorage.getItem(storageKey);
      if (savedColumns) {
        try {
          const parsed = JSON.parse(savedColumns);
          // Mantener orden del array "columns" original, pero solo con field y no expander
          const ordered = baseVisibleColumns.filter((col) =>
            parsed.some((sc) => sc.field === col.field)
          );
          setVisibleColumns(ordered.length ? ordered : filteredColumns);
        } catch {
          setVisibleColumns(filteredColumns);
        }
      } else {
        setVisibleColumns(filteredColumns);
      }
      hasLoadedFromStorage.current = true;
    } else {
      setVisibleColumns(filteredColumns);
    }
  }, [KeyModule, baseVisibleColumns, isMobile, filteredColumns, storageKey]);

  // Guardar cambios de columnas visibles
  useEffect(() => {
    if (!isMobile && hasLoadedFromStorage.current) {
      localStorage.setItem(storageKey, JSON.stringify(visibleColumns));
    }
  }, [visibleColumns, storageKey, isMobile]);

  // Alternar visibilidad de una columna (solo con field)
  const toggleColumn = (col) => {
    setVisibleColumns((prev) => {
      const exists = prev.some((c) => c.field === col.field);
      if (exists) {
        return prev.filter((c) => c.field !== col.field);
      } else {
        // reconstruye respetando el orden de filteredColumns
        const next = [...prev, col];
        return filteredColumns.filter((original) =>
          next.some((sel) => sel.field === original.field)
        );
      }
    });
  };

  // Restablecer columnas al estado base (solo con field)
  const resetColumns = () => {
    setVisibleColumns(baseVisibleColumns);
    localStorage.removeItem(storageKey);
  };

  // Botón + Overlay de columnas (solo con field)
  const dynamicColumns = (
    <>
      <Button
        label="Opciones"
        icon="pi pi-microsoft"
        iconPos="left"
        onClick={(e) => overlayPanelRef.current.toggle(e)}
        className="p-button-rounded p-button-secondary p-button-sm"
      />
      <OverlayPanel ref={overlayPanelRef}>
        <div style={{ padding: "15px", width: "230px", textAlign: "left" }}>
          <h5 style={{ marginBottom: "10px", textAlign: "center" }}>
            Seleccionar Columnas
          </h5>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {baseVisibleColumns.map((col) => (
              <div key={col.field} style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <Checkbox
                  inputId={col.field}
                  checked={visibleColumns.some((c) => c.field === col.field)}
                  onChange={() => toggleColumn(col)}
                />
                <label htmlFor={col.field} style={{ cursor: "pointer", flexGrow: 1 }}>
                  {col.header}
                </label>
              </div>
            ))}
          </div>
          <hr style={{ margin: "12px 0", border: "0.5px solid #ccc" }} />
          <Button
            label="Restablecer"
            icon="pi pi-refresh"
            className="p-button-text p-button-sm"
            onClick={resetColumns}
            style={{ width: "100%", marginTop: "5px" }}
          />
        </div>
      </OverlayPanel>
    </>
  );

  useEffect(() => {
    if (!loading) setTimeout(() => setIsLoaded(true), 100);
  }, [loading]);

  const selectionColumn = {
    selectionMode: "multiple",
    headerStyle: { width: "3rem" },
    style: { width: "3rem" },
  };

  const paginationProps = useMemo(() => {
    return isPagination
      ? {
        paginator: true,
        totalRecords: totalRecords,
        rows: pagination.rows,
        first: pagination.first,
        sortOrder: pagination.sortOrder,
        sortField: pagination.sortField,
        onPage: onCustomPage,
        onSort: (e) =>
          setPagination({
            ...pagination,
            sortField: e.sortField,
            sortOrder: e.sortOrder,
          }),
        // si te interesa exponer rowsPerPageOptions
        rowsPerPageOptions: rowsPerPageOptions || [10, 20, 50],
      }
      : { paginator: false };
  }, [isPagination, totalRecords, onCustomPage, setPagination, pagination, rowsPerPageOptions]);

  const selectionMode = useMemo(() => {
    if (isChecked) return "multiple";
    if (isRowSelectable) return "single";
    return null;
  }, [isChecked, isRowSelectable]);

  return (
    // <div className={`datatable-container ${isLoaded ? "show" : ""}`}>
    <div
      className={`datatable-container ${isLoaded ? "show" : ""} ${classNameTableWrapper || ""}`}
      style={fullHeight ? { height: "100%", display: "flex", flexDirection: "column", minHeight: 0 } : undefined}
    >
      <DataTable
        {...propsDataTable}
        {...paginationProps}
        stripedRows
        dataKey={dataKey}
        header={
          KeyModule ? (
            <div className="col-12" style={{ display: "flex", justifyContent: "space-between" }}>
              {dynamicColumns}
              {header}
            </div>
          ) : (
            <>{header}</>
          )
        }
        value={datos}
        // scrollHeight={width || window.innerHeight - 320}
        loading={loading}
        selectionMode={selectionMode}
        selection={selection}
        onSelectionChange={onSelectionChange}
        footerColumnGroup={hasfooter ? footerColumnGroup() : <></>}
        rowClassName={rowClassName}
        emptyMessage={
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              height: "100%",
              width: "100%",
            }}
          >
            {emptyMessage ? (
              emptyMessage
            ) : (
              <NoDataInformation
                img="nodata.svg"
                text="Vaya! Pero al parecer no hay información disponible"
              />
            )}
          </div>
        }
        editMode={editMode || null}
        responsiveLayout="scroll"
        // >>> EXPANSIÓN POR FILA
        rowExpansionTemplate={rowExpansionTemplate}
        expandedRows={expandedRows}
        onRowToggle={onRowToggle}
        // >>> NUEVO: scroll flexible en modo fullHeight
        // {...(fullHeight ? { scrollable: true, scrollHeight: "flex" } : {})}
        // style={fullHeight ? { flex: 1, minHeight: 0 } : undefined}
        /* === Scroll FINAL: prioridad a props; si no, usa fullHeight === */
        scrollable={typeof scrollable === "boolean" ? scrollable : !!fullHeight}
        scrollHeight={
          scrollHeight ??
          (fullHeight ? "flex" : undefined)
        }
        style={fullHeight ? { flex: 1, minHeight: 0 } : undefined}
        // NUEVO:
        onRowExpand={onRowExpand}
        onRowCollapse={onRowCollapse}
      >
        {/* 1) Columna(s) expansoras SIEMPRE al inicio */}
        {expanderColumns.map((col, idx) => (
          <Column key={`expander-${idx}`} expander style={col.style || { width: "3rem" }} />
        ))}

        {/* 2) Columna de selección (cuando no hay paginación y check múltiple) */}
        {!isPagination && isChecked && (
          <Column
            {...selectionColumn}
            header={<></>}
            frozen
            alignFrozen="left"
            style={{ flexGrow: 1, flexBasis: "3rem", maxWidth: "3rem", minWidth: "3rem" }}
          />
        )}

        {/* 3) Columnas visibles (solo con field) */}
        {visibleColumns.map((col) => (
          <Column
            key={col.field}
            field={col.field}
            header={col.header}
            sortable={col.sortable ?? true}
            style={col.style}
            body={col.body}
            bodyStyle={col.bodyStyle ? col.bodyStyle : null}
            frozen={!!col.frozen}
            alignFrozen={col.alignFrozen ? col.alignFrozen : "right"}
          />
        ))}

        {/* 4) Columna de acciones (si existe) */}
        {actionBodyTemplate && (
          <Column
            body={actionBodyTemplate}
            frozen
            alignFrozen="right"
            style={{ flexGrow: 1, flexBasis: "5rem", maxWidth: "5rem", minWidth: "5rem" }}
            align="center"
          />
        )}
      </DataTable>
    </div>
  );
};

export default DataTableComponent;
