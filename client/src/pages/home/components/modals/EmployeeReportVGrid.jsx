import React, { useEffect, useMemo, useRef, useState, useLayoutEffect } from "react";
import { VariableSizeGrid as Grid } from "react-window";
import { TabView, TabPanel } from "primereact/tabview";
import { getPayrollEmployeeReportAPI } from "@api/requests/payrollApi";
import { getAllAPI } from "@api/requests/RefundableTypeApi";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";

/* ==================== Utils ==================== */
function useElementSize(ref) {
    const [size, setSize] = useState({ width: 0, height: 0 });
    useLayoutEffect(() => {
        const el = ref.current;
        if (!el) return;
        const ro = new ResizeObserver(([entry]) => {
            const r = entry.contentRect;
            setSize({ width: Math.floor(r.width), height: Math.floor(r.height) });
        });
        ro.observe(el);
        return () => ro.disconnect();
    }, [ref]);
    return size;
}

const moneyFmt = new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
});
const toNumber = (v) => {
    if (v === null || v === undefined || v === "") return 0;
    if (typeof v === "number") return v;
    const s = String(v).trim();
    if (/^-?\d+(\.\d+)?$/.test(s)) return Number(s);
    const norm = s.replace(/\./g, "").replace(",", ".");
    const n = Number(norm);
    return Number.isNaN(n) ? 0 : n;
};
const money = (v) => moneyFmt.format(toNumber(v));
const sanitize = (s) => String(s).replace(/\u00A0/g, " ").trim();

const ROW_H = 36;
const HEADER_H = 42;
const FOOTER_H = 42;

const TOTAL_LABEL = "TOTAL";
const TOTAL_COLOR = "#2563eb";
const FALLBACK_PROJECT_COLORS = [
    "#ca8a04",
    "#059669",
    "#0ea5e9",
    "#8b5cf6",
    "#ef4444",
    "#14b8a6",
    "#f97316",
];
const stripe = (hex, rowIndex) => {
    const alpha = rowIndex % 2 === 0 ? 0.08 : 0.16;
    const n = parseInt(hex.replace("#", ""), 16);
    const r = (n >> 16) & 255,
        g = (n >> 8) & 255,
        b = n & 255;
    return `rgba(${r},${g},${b},${alpha})`;
};

/* ==================== Componente ==================== */
export default function EmployeeReportVGrid({ nomId }) {
    /* ---- Tabs / tipos de reembolso ---- */
    const [tirId, setTirId] = useState(null); // null = Todos
    const [types, setTypes] = useState([]); // [{id, nombre}]
    const [typesLoading, setTypesLoading] = useState(false);
    const [typesErr, setTypesErr] = useState(null);
    const [activeIndex, setActiveIndex] = useState(0); // 0 = "Todos"

    /* ---- Reporte ---- */
    const [loading, setLoading] = useState(false);
    const [err, setErr] = useState(null);
    const [columns, setColumns] = useState([]); // labels del back
    const [rows, setRows] = useState([]); // objetos con keys EXACTAS
    const [projectColors, setProjectColors] = useState({});

    const gridRef = useRef(null);
    const outerRef = useRef(null);

    const [globalQuery, setGlobalQuery] = useState("");

    /* ---- Cargar tipos para tabs ---- */
    useEffect(() => {
        let mounted = true;
        (async () => {
            try {
                setTypesLoading(true);
                setTypesErr(null);
                const resp = await getAllAPI();
                const list = Array.isArray(resp?.data) ? resp.data : [];
                if (!mounted) return;
                setTypes(list);
            } catch (e) {
                if (mounted) setTypesErr(e?.message || "No fue posible cargar los tipos de reembolso.");
            } finally {
                if (mounted) setTypesLoading(false);
            }
        })();
        return () => {
            mounted = false;
        };
    }, []);

    /* ---- Sincronizar tab -> tirId ---- */
    useEffect(() => {
        if (activeIndex === 0) setTirId(null);
        else {
            const idx = activeIndex - 1;
            const tipo = Array.isArray(types) ? types[idx] : null;
            setTirId(tipo?.id ?? null);
        }
    }, [activeIndex, types]);

    /* ---- Cargar reporte ---- */
    useEffect(() => {
        let mounted = true;
        if (!nomId) {
            setColumns([]);
            setRows([]);
            setProjectColors({});
            return;
        }
        (async () => {
            try {
                setLoading(true);
                setErr(null);
                const { data } = await getPayrollEmployeeReportAPI({ nomId, tirId });
                const cols = Array.isArray(data?.columns) ? data.columns : [];
                const rws = Array.isArray(data?.rows) ? data.rows : [];
                const colors =
                    data?.projectColors && typeof data.projectColors === "object" ? data.projectColors : {};
                if (!mounted) return;
                setColumns(cols);
                setRows(rws);
                setProjectColors(colors);
            } catch (e) {
                if (mounted) setErr(e?.message || "Error al cargar el reporte.");
            } finally {
                if (mounted) setLoading(false);
            }
        })();
        return () => {
            mounted = false;
        };
    }, [nomId, tirId]);

    /* ---- Definiciones de columnas visibles ---- */
    const HIDDEN = new Set(["PUC", "ISSUBTOTAL", "IS SUBTOTAL", "SUBTOTAL"]);
    const isHidden = (s) => HIDDEN.has(sanitize(String(s)).toUpperCase());

    const colDefs = useMemo(() => {
        const rowKeys = rows[0] ? Object.keys(rows[0]) : [];
        const defs = [];
        rowKeys.forEach((key, i) => {
            const rawLabel = Array.isArray(columns) ? columns[i] : null;
            const label = rawLabel ? sanitize(rawLabel) : key;
            if (isHidden(key) || isHidden(label)) return;
            defs.push({ key, label });
        });
        if (Array.isArray(columns)) {
            for (let i = rowKeys.length; i < columns.length; i++) {
                const label = sanitize(columns[i]);
                if (isHidden(label)) continue;
                defs.push({ key: `__col_${i}`, label });
            }
        }
        return defs;
    }, [columns, rows]);

    const baseOrder = [
        "Nit",
        "Nombre",
        "NitTercero",
        "NombreTercero",
        "Cuenta",
        "NombreCuenta",
        "CentroCosto",
        "NombreCentroCosto",
        TOTAL_LABEL,
    ];

    const defs = useMemo(() => {
        if (!colDefs.length) return [];
        const byLabel = new Map(colDefs.map((d) => [d.label, d]));
        const byKey = new Map(colDefs.map((d) => [d.key, d]));
        const first = [];
        for (const w of baseOrder) {
            if (byLabel.has(w)) first.push(byLabel.get(w));
            else if (byKey.has(w)) first.push(byKey.get(w));
        }
        const taken = new Set(first.map((d) => d.key));
        const rest = colDefs.filter((d) => !taken.has(d.key));
        return first.concat(rest);
    }, [colDefs]);

    /* ---- Información de proyectos / colores ---- */
    const totalIx = useMemo(() => defs.findIndex((d) => d.label === TOTAL_LABEL), [defs]);
    const totalKey = useMemo(() => (totalIx >= 0 ? defs[totalIx].key : null), [defs, totalIx]);

    const projectLabels = useMemo(() => {
        return totalIx >= 0 ? defs.slice(totalIx + 1).map((d) => d.label) : [];
    }, [defs, totalIx]);

    const colorByLabel = useMemo(() => {
        const map = { ...projectColors };
        if (defs.find((d) => d.label === TOTAL_LABEL)) map[TOTAL_LABEL] = TOTAL_COLOR;
        let i = 0;
        for (const lbl of projectLabels) {
            if (!map[lbl]) {
                map[lbl] = FALLBACK_PROJECT_COLORS[i % FALLBACK_PROJECT_COLORS.length];
                i++;
            }
        }
        return map;
    }, [projectColors, defs, projectLabels]);

    const isProjectLabel = (label) => projectLabels.includes(label);
    const isMoneyLabel = (label) => label === TOTAL_LABEL || isProjectLabel(label);

    /* ---- Filtro global ---- */
    const filteredRows = useMemo(() => {
        if (!globalQuery) return rows;
        const q = globalQuery.toLowerCase();
        return rows.filter((r) =>
            defs.some((d) =>
                String(r[d.key] ?? "")
                    .toLowerCase()
                    .includes(q)
            )
        );
    }, [rows, defs, globalQuery]);

    /* ---- Totales sobre el conjunto filtrado (excluyendo subtotales) ---- */
    const totals = useMemo(() => {
        const t = {};
        const data = Array.isArray(filteredRows) ? filteredRows.filter((r) => !r?.isSubtotal) : [];
        for (const d of defs) {
            if (isMoneyLabel(d.label))
                t[d.label] = data.reduce((acc, r) => acc + toNumber(r[d.key]), 0);
        }
        return t;
    }, [filteredRows, defs]);

    const totalEmpleados = useMemo(() => {
        const set = new Set();
        for (const r of filteredRows) {
            if (r?.isSubtotal) continue;
            const id = r.empNit ?? r.empNombre ?? JSON.stringify([r.empNit, r.empNombre]);
            if (id != null) set.add(String(id));
        }
        return set.size;
    }, [filteredRows]);

    /* ---- Anchos auto-ajustados ---- */
    const measureColWidth = (label, key) => {
        const base = 120; // base mínimo
        const labelW = Math.max(100, Math.min(360, label.length * 9 + 24));
        // muestreamos hasta 200 filas para estimar
        const sample = filteredRows.slice(0, 200);
        let maxLen = 0;
        for (const r of sample) {
            const v = r[key];
            if (v === undefined || v === null || v === "") continue;
            let s = String(v);
            if (isMoneyLabel(label)) s = money(v); // aproximación
            // si es proyecto, también mostramos " ($) (xx.xx%)" -> +9 chars aprox
            if (isProjectLabel(label)) s += " (100.00%)";
            maxLen = Math.max(maxLen, s.length);
        }
        const valueW = Math.min(420, Math.max(80, maxLen * 8 + 24));
        return Math.max(base, labelW, valueW);
    };

    const colWidths = useMemo(
        () => defs.map((d) => measureColWidth(d.label, d.key)),
        [defs, filteredRows]
    );
    const totalWidth = useMemo(() => colWidths.reduce((a, b) => a + b, 0), [colWidths]);

    /* ---- refs / scroll sync ---- */
    const headerRef = useRef(null);
    const headerInnerRef = useRef(null);
    const footerRef = useRef(null);
    const footerInnerRef = useRef(null);

    /* ---- Celdas ---- */
    const BASE_CELL_TEXT = {
        color: "#111827",
        WebkitTextFillColor: "#111827",
        fontSize: "13px",
        lineHeight: `${ROW_H}px`,
        whiteSpace: "nowrap",
        overflow: "hidden",
        textOverflow: "ellipsis",
    };

    const Cell = ({ columnIndex, rowIndex, style }) => {
        const def = defs[columnIndex];
        const row = filteredRows[rowIndex] || {};
        const raw = row[def.key];
        const alignRight = isMoneyLabel(def.label);
        const isSubtotal = !!row.isSubtotal;

        // valor monetario
        const num = toNumber(raw);
        const asMoney = alignRight ? money(num) : String(raw ?? "");

        // ---------- SOLO mostrar (%) en SUBTOTALES por empleado ----------
        let decorated = asMoney;
        if (isSubtotal && isProjectLabel(def.label) && totalKey) {
            const totalRow = toNumber(row[totalKey]);
            const pct = totalRow !== 0 ? (num / totalRow) * 100 : 0;
            decorated = `${asMoney} (${pct.toFixed(2)}%)`;
        }
        // -----------------------------------------------------------------

        // Fondo
        const bgBase = colorByLabel[def.label];
        const bg = isSubtotal ? "#f8fafc" : bgBase ? stripe(bgBase, rowIndex) : "#fff";

        return (
            <div
                data-cell
                style={{
                    ...style,
                    boxSizing: "border-box",
                    borderBottom: "1px solid #eef0f3",
                    padding: "0 8px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: alignRight ? "flex-end" : "flex-start",
                    fontWeight: isSubtotal ? 700 : 400,
                    background: bg,
                    color: "#111827",
                    WebkitTextFillColor: "#111827",
                    fontSize: "13px",
                    lineHeight: `${ROW_H}px`,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                }}
                title={decorated}
            >
                {decorated}
            </div>
        );
    };


    /* ---- Medidas del viewport ---- */
    const viewportRef = useRef(null);
    const { width, height } = useElementSize(viewportRef);

    const Outer = React.forwardRef(function Outer(props, ref) {
        const onScroll = (e) => {
            const sl = e.currentTarget.scrollLeft;
            if (headerInnerRef.current) headerInnerRef.current.style.transform = `translateX(${-sl}px)`;
            if (footerInnerRef.current) footerInnerRef.current.style.transform = `translateX(${-sl}px)`;
            props?.onScroll && props.onScroll(e);
        };
        return (
            <div
                ref={ref}
                {...props}
                onScroll={onScroll}
                style={{ ...props.style, overflowX: "auto", overflowY: "auto" }}
            />
        );
    });

    const bodyHeight = Math.max(0, height - HEADER_H - FOOTER_H - 48 /* filtro */);
    const contentHeight = Math.max(0, filteredRows.length * ROW_H);
    const gridHeight = Math.min(bodyHeight, contentHeight);
    const safeGridHeight = filteredRows.length === 0 ? 0 : gridHeight;

    /* ---- reset scroll cuando cambian datos ---- */
    useEffect(() => {
        if (gridRef.current) {
            gridRef.current.scrollTo({ scrollLeft: 0, scrollTop: 0 });
            gridRef.current.resetAfterRowIndex(0, true);
            gridRef.current.resetAfterColumnIndex(0, true);
        }
        if (headerInnerRef.current) headerInnerRef.current.style.transform = "translateX(0px)";
        if (footerInnerRef.current) footerInnerRef.current.style.transform = "translateX(0px)";
    }, [filteredRows.length, defs.length, totalWidth, safeGridHeight]);

    /* ---- Estados globales ---- */
    if (!nomId) {
        return (
            <div
                style={{
                    border: "1px solid #e5e7eb",
                    borderRadius: 8,
                    height: "60vh",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#6b7280",
                }}
            >
                Selecciona una nómina para ver el reporte.
            </div>
        );
    }
    if (err) {
        return (
            <div
                style={{
                    border: "1px solid #fecaca",
                    background: "#fff1f2",
                    color: "#991b1b",
                    borderRadius: 8,
                    padding: 16,
                }}
            >
                {err}
            </div>
        );
    }

    const gridKey = `${defs.length}-${filteredRows.length}-${totalWidth}-${safeGridHeight}`;

    /* ------------ Excel helpers ------------ */
    const hexToRgb = (hex) => {
        const h = String(hex || "").replace("#", "");
        const n = parseInt(h.length === 6 ? h : "999999", 16);
        return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
    };
    const blendWithWhite = (hex, alpha = 0.1) => {
        const { r, g, b } = hexToRgb(hex);
        const A = Math.max(0, Math.min(1, alpha));
        const rb = Math.round(255 * (1 - A) + r * A);
        const gb = Math.round(255 * (1 - A) + g * A);
        const bb = Math.round(255 * (1 - A) + b * A);
        return `#${rb.toString(16).padStart(2, "0")}${gb
            .toString(16)
            .padStart(2, "0")}${bb.toString(16).padStart(2, "0")}`.toUpperCase();
    };
    const toOpaqueARGB = (hex) => `FF${String(hex || "#999999").replace("#", "").toUpperCase()}`;

    /** Helpers básicos (idénticos a los que ya usas) */
    const EXCEL_CURRENCY_FMT = '"$" #,##0.00;[Red]-"$" #,##0.00';
    const EXCEL_PERCENT_FMT = '0.00%';

    /** Nº -> letra de columna (1->A) */
    const colLetter = (n) => {
        let s = '', num = n;
        while (num > 0) {
            const m = (num - 1) % 26;
            s = String.fromCharCode(65 + m) + s;
            num = Math.floor((num - 1) / 26);
        }
        return s;
    };

    /** Carga un asset de /public como base64 (PNG/JPG/SVG) */
    async function fetchAsBase64(url) {
        const res = await fetch(url);
        const buf = await res.arrayBuffer();
        const bytes = new Uint8Array(buf);
        // Deducción simple de mime; ajusta si tu logo es JPG/SVG.
        const mime = url.toLowerCase().endsWith('.jpg') || url.toLowerCase().endsWith('.jpeg')
            ? 'image/jpeg'
            : url.toLowerCase().endsWith('.svg')
                ? 'image/svg+xml'
                : 'image/png';
        let binary = '';
        for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
        const b64 = btoa(binary);
        return `data:${mime};base64,${b64}`;
    }


    const exportToExcel = async () => {
        try {
            const wb = new ExcelJS.Workbook();
            wb.created = new Date();
            const ws = wb.addWorksheet('Reporte');

            /* ========= 0) Banner con logo en A1:…:2 ========= */
            // Prepara un ancho básico para que el banner se vea ancho.
            const MIN_COLS_FOR_BANNER = 14; // A..N
            for (let i = 1; i <= MIN_COLS_FOR_BANNER; i++) {
                if (!ws.getColumn(i).width) ws.getColumn(i).width = 14;
            }
            const endColForBanner = MIN_COLS_FOR_BANNER;
            const endColLetter = colLetter(endColForBanner);
            ws.mergeCells(`A1:${endColLetter}2`);
            const bannerCell = ws.getCell('A1');
            bannerCell.alignment = { vertical: 'middle', horizontal: 'center' };
            bannerCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF9FAFB' } };
            bannerCell.border = {
                top: { style: 'thin', color: { argb: 'FFE5E7EB' } },
                left: { style: 'thin', color: { argb: 'FFE5E7EB' } },
                bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
                right: { style: 'thin', color: { argb: 'FFE5E7EB' } },
            };

            // Cargar e insertar logo desde /public (ajusta la ruta)
            try {
                const base64Logo = await fetchAsBase64('/images/logos/lamayoristanew.png');
                const imgId = wb.addImage({ base64: base64Logo, extension: 'png' });
                // Anclar imagen abarcando el área A1:…:2 (se ajusta al merge)
                ws.addImage(imgId, {
                    tl: { col: 0, row: 0 },           // A1 (0-based)
                    br: { col: endColForBanner, row: 2 }, // (exclusivo) -> cubre filas 1–2, cols A..N
                    editAs: 'oneCell',
                });
            } catch (e) {
                // Si falla el logo, no rompemos la exportación
                // console.warn('Logo no disponible:', e);
                bannerCell.value = 'Reporte de Nómina'; // título fallback
                bannerCell.font = { bold: true, size: 16, color: { argb: 'FF111827' } };
            }

            /* ========= 1) Armar columnas: texto + TOTAL, y por proyecto (Valor, %) ========= */
            // Ejemplo de helpers que ya deberías tener:
            // - measureColWidth(label, key) si lo usas para calcular widths
            const excelCols = [];
            for (const d of defs) {
                const label = d.label;
                const isMoney = isMoneyLabel(label);
                const isTotal = label === TOTAL_LABEL;

                // Texto y TOTAL en una única columna
                if (!isMoney || isTotal) {
                    excelCols.push({
                        header: label,
                        key: d.key,
                        width: Math.max(14, Math.round((160) / 7)), // ajusta si usas measureColWidth
                    });
                } else if (isProjectLabel(label)) {
                    // Proyecto: Valor y %
                    excelCols.push({
                        header: label,
                        key: `${d.key}__VAL`,
                        width: 16,
                    });
                    excelCols.push({
                        header: `${label} %`,
                        key: `${d.key}__PCT`,
                        width: 10,
                    });
                }
            }
            ws.columns = excelCols;


            /* ========= 2) Doble cabecera (fila 3 y 4), combinando Valor/% por proyecto ========= */
            // Fila 3: headers principales; Fila 4: subheaders (Valor / % para proyectos; vacío para texto/TOTAL)
            const rowHdr1 = [];
            const rowHdr2 = [];

            for (const col of excelCols) {
                const isPct = / %$/.test(String(col.header));
                if (isPct) {
                    // Para sub-columna %, en la fila 3 no ponemos texto (lo pondrá el merge desde la col de Valor)
                    rowHdr1.push('');
                    rowHdr2.push('%');
                } else if (projectLabels.includes(String(col.header))) {
                    // Es la columna de Valor de un proyecto => fila 3: nombre proyecto, fila 4: "Valor"
                    rowHdr1.push(col.header);
                    rowHdr2.push('Valor');
                } else {
                    // Texto/TOTAL
                    rowHdr1.push(col.header);
                    rowHdr2.push('');
                }
            }

            // Escribir fila 3 y 4
            ws.getRow(3).values = rowHdr1;
            ws.getRow(4).values = rowHdr2;
            ws.getRow(3).height = 20;
            ws.getRow(4).height = 20;

            // Estilos encabezados
            [3, 4].forEach(rn => {
                ws.getRow(rn).eachCell((cell) => {
                    cell.font = { bold: true, color: { argb: 'FF111827' } };
                    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
                    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3F4F6' } };
                    cell.border = {
                        top: { style: 'thin', color: { argb: 'FFE5E7EB' } },
                        left: { style: 'thin', color: { argb: 'FFE5E7EB' } },
                        bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
                        right: { style: 'thin', color: { argb: 'FFE5E7EB' } },
                    };
                });
            });

            // Merge por cada par (Proyecto Valor + Proyecto %)
            let colIdx = 1;
            while (colIdx <= excelCols.length) {
                const h1 = String(ws.getRow(3).getCell(colIdx).value || '');
                const h2 = String(ws.getRow(4).getCell(colIdx + 1).value || '');
                const isProjectBlock = projectLabels.includes(h1) && h2 === '%';
                if (isProjectBlock) {
                    // Merge del título del proyecto a lo ancho de dos columnas (fila 3)
                    const l = colLetter(colIdx);
                    const r = colLetter(colIdx + 1);
                    ws.mergeCells(`${l}3:${r}3`);
                    colIdx += 2;
                } else {
                    // No proyecto: fusionar verticalmente la cabecera (fila 3 y 4)
                    const c = colLetter(colIdx);
                    ws.mergeCells(`${c}3:${c}4`);
                    colIdx += 1;
                }
            }

            /* ========= 3) Cuerpo de datos a partir de fila 5 ========= */
            const startRow = 5;
            filteredRows.forEach((r) => {
                const obj = {};

                for (const d of defs) {
                    const label = d.label;
                    const isMoney = isMoneyLabel(label);
                    const isTotal = label === TOTAL_LABEL;

                    if (!isMoney || isTotal) {
                        // Texto y TOTAL (moneda)
                        obj[d.key] = isTotal ? toNumber(r[d.key]) : r[d.key];
                    } else if (isProjectLabel(label)) {
                        // Valor siempre, % SOLO en subtotales por empleado
                        const val = toNumber(r[d.key]);
                        obj[`${d.key}__VAL`] = val;

                        if (r.isSubtotal) {
                            const totalRow = toNumber(r[totalKey] || 0);
                            const pct = totalRow !== 0 ? val / totalRow : 0;
                            obj[`${d.key}__PCT`] = pct;     // ← mostrar %
                        } else {
                            obj[`${d.key}__PCT`] = null;    // ← detalle: celda vacía
                        }
                    }
                }

                const eRow = ws.addRow(obj);

                // Estilos por celda (sin cambios)
                eRow.eachCell((cell, i) => {
                    const header1 = String(ws.getRow(3).getCell(i).value || '');
                    const header2 = String(ws.getRow(4).getCell(i).value || '');
                    const isPct = header2 === '%';
                    const isVal = header2 === 'Valor' || header1 === TOTAL_LABEL;
                    const colHex = colorByLabel[header1];

                    cell.alignment = { vertical: 'middle', horizontal: (isPct || isVal) ? 'right' : 'left' };
                    if (isVal) cell.numFmt = EXCEL_CURRENCY_FMT;
                    if (isPct) cell.numFmt = EXCEL_PERCENT_FMT;

                    if (!r.isSubtotal && colHex) {
                        const bg = blendWithWhite(colHex, (eRow.number % 2 === 0 ? 0.08 : 0.16));
                        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: toOpaqueARGB(bg) } };
                    } else if (r.isSubtotal) {
                        cell.font = { bold: true };
                        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
                    }

                    cell.border = {
                        top: { style: 'thin', color: { argb: 'FFEEF0F3' } },
                        left: { style: 'thin', color: { argb: 'FFEEF0F3' } },
                        bottom: { style: 'thin', color: { argb: 'FFEEF0F3' } },
                        right: { style: 'thin', color: { argb: 'FFEEF0F3' } },
                    };
                });

                eRow.height = 20;
            });


            /* ========= 4) Fila de totales (con % por proyecto) ========= */
            if (filteredRows.length > 0) {
                const tObj = {};
                for (const d of defs) {
                    const label = d.label;
                    const isMoney = isMoneyLabel(label);
                    const isTotal = label === TOTAL_LABEL;

                    if (!isMoney || isTotal) {
                        if (isTotal) tObj[d.key] = toNumber(totals[TOTAL_LABEL] || 0);
                        else if (defs[0] && d.key === defs[0].key) {
                            tObj[d.key] = `Totales — Empleados: ${totalEmpleados}`;
                        }
                    } else if (isProjectLabel(label)) {
                        const val = toNumber(totals[label] || 0);
                        const gt = toNumber(totals[TOTAL_LABEL] || 0);
                        const pct = gt !== 0 ? val / gt : 0;
                        tObj[`${d.key}__VAL`] = val;
                        tObj[`${d.key}__PCT`] = pct;
                    }
                }
                const tRow = ws.addRow(tObj);
                tRow.eachCell((cell, i) => {
                    const header1 = String(ws.getRow(3).getCell(i).value || '');
                    const header2 = String(ws.getRow(4).getCell(i).value || '');
                    const isPct = header2 === '%';
                    const isVal = header2 === 'Valor' || header1 === TOTAL_LABEL;
                    const colHex = colorByLabel[header1];

                    cell.font = { bold: true, color: { argb: 'FF111827' } };
                    cell.alignment = { vertical: 'middle', horizontal: (isVal || isPct) ? 'right' : 'left' };
                    if (isVal) cell.numFmt = EXCEL_CURRENCY_FMT;
                    if (isPct) cell.numFmt = EXCEL_PERCENT_FMT;

                    cell.border = {
                        top: { style: 'medium', color: { argb: 'FFE11D48' } },
                        left: { style: 'thin', color: { argb: 'FFEEF0F3' } },
                        bottom: { style: 'thin', color: { argb: 'FFEEF0F3' } },
                        right: { style: 'thin', color: { argb: 'FFEEF0F3' } },
                    };
                    if (colHex) {
                        const bg = blendWithWhite(colHex, 0.10);
                        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: toOpaqueARGB(bg) } };
                    }
                });
                tRow.height = 22;
            }

            /* ========= 5) Congelar panes =========
               ySplit = 4  => congela banner (1–2) + doble header (3–4)
               xSplit = 2  => congela las dos primeras columnas (Nit, Nombre)
            */
            ws.views = [{ state: 'frozen', xSplit: 2, ySplit: 4 }];

            /* ========= 6) Header/Footer impreso (opcional) ========= */
            ws.headerFooter.oddHeader =
                `&LNomina: ${String(nomId || '')}&CtirId: ${tirId ?? 'Todos'}&RGenerado: &D &T`;

            const fname = `reporte_empleados.xlsx`;
            const buf = await wb.xlsx.writeBuffer();
            saveAs(new Blob([buf], {
                type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            }), fname);

        } catch (err) {
            console.error('Export Excel error:', err);
            alert('No fue posible generar el Excel.');
        }
    };

    /* ==================== Render ==================== */
    return (
        <div
            className="employee-report-vgrid"
            style={{
                display: "flex",
                flexDirection: "column",
                height: "70vh",
                minHeight: 0,
                width: "100%",
                border: "1px solid #e5e7eb",
                borderRadius: 8,
                overflow: "hidden",
                position: "relative",
                flex: "1 1 auto",
            }}
        >
            {loading && (
                <div
                    style={{
                        position: "absolute",
                        inset: 0,
                        background: "rgba(255,255,255,.6)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        zIndex: 3,
                    }}
                >
                    Cargando…
                </div>
            )}

            {/* Tabs PrimeReact */}
            <div style={{ borderBottom: "1px solid #e5e7eb", background: "#fff" }}>
                {typesLoading && <div style={{ padding: "6px 10px", color: "#6b7280" }}>Cargando tipos…</div>}
                {typesErr && (
                    <div
                        style={{
                            color: "#991b1b",
                            background: "#fee2e2",
                            padding: "6px 10px",
                            borderRadius: 6,
                            margin: 8,
                            display: "inline-block",
                        }}
                    >
                        {typesErr}
                    </div>
                )}

                {!typesLoading && (
                    <TabView activeIndex={activeIndex} onTabChange={(e) => setActiveIndex(e.index)} scrollable>
                        <TabPanel header="Todos" />
                        {Array.isArray(types) && types.map((t) => <TabPanel key={t.id} header={t.nombre} />)}
                    </TabView>
                )}
            </div>

            {/* Viewport */}
            <div
                ref={viewportRef}
                style={{ flex: 1, width: "100%", minWidth: 0, minHeight: 0, display: "flex", flexDirection: "column" }}
            >
                {width > 0 && height > 0 && (
                    <>
                        {/* Filtro + export */}
                        <div
                            style={{
                                height: 48,
                                minHeight: 48,
                                display: "flex",
                                alignItems: "center",
                                gap: 8,
                                padding: "0 8px",
                                borderBottom: "1px solid #e5e7eb",
                                background: "#fff",
                            }}
                        >
                            <span
                                className="p-inputgroup-addon"
                                style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    width: 34,
                                    height: 30,
                                    border: "1px solid #e5e7eb",
                                    borderRadius: 6,
                                    background: "#f6f7f9",
                                }}
                                title="Buscar"
                            >
                                🔎
                            </span>
                            <input
                                type="text"
                                value={globalQuery}
                                onChange={(e) => setGlobalQuery(e.target.value)}
                                placeholder="Búsqueda global…"
                                style={{
                                    height: 32,
                                    lineHeight: "32px",
                                    flex: 1,
                                    border: "1px solid #e5e7eb",
                                    borderRadius: 6,
                                    padding: "0 10px",
                                    outline: "none",
                                }}
                            />
                            {globalQuery && (
                                <button
                                    type="button"
                                    onClick={() => setGlobalQuery("")}
                                    style={{
                                        height: 32,
                                        border: "1px solid #e5e7eb",
                                        background: "#f9fafb",
                                        borderRadius: 6,
                                        padding: "0 10px",
                                        cursor: "pointer",
                                    }}
                                    title="Limpiar"
                                >
                                    Limpiar
                                </button>
                            )}
                            <button
                                type="button"
                                onClick={exportToExcel}
                                style={{
                                    height: 32,
                                    border: "1px solid #1d4ed8",
                                    background: "#dbeafe",
                                    color: "#1d4ed8",
                                    borderRadius: 6,
                                    padding: "0 10px",
                                    cursor: "pointer",
                                    fontWeight: 600,
                                }}
                                title="Exportar a Excel"
                            >
                                Exportar
                            </button>
                        </div>

                        {/* Header */}
                        <div
                            ref={headerRef}
                            style={{ width, borderBottom: "1px solid #e5e7eb", background: "#f9fafb", overflow: "hidden" }}
                        >
                            <div ref={headerInnerRef} style={{ width: totalWidth, display: "flex", willChange: "transform" }}>
                                {defs.map((d, i) => {
                                    const alignRight = isMoneyLabel(d.label);
                                    const color = colorByLabel[d.label] || "#111827";
                                    return (
                                        <div
                                            key={`h-${d.key}`}
                                            style={{
                                                width: colWidths[i],
                                                minWidth: colWidths[i],
                                                height: HEADER_H,
                                                lineHeight: `${HEADER_H}px`,
                                                boxSizing: "border-box",
                                                padding: "0 8px",
                                                fontWeight: 700,
                                                borderRight: "1px solid #eef0f3",
                                                whiteSpace: "nowrap",
                                                overflow: "hidden",
                                                textOverflow: "ellipsis",
                                                textAlign: alignRight ? "right" : "left",
                                                color,
                                            }}
                                            title={d.label}
                                        >
                                            {d.label}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Body */}
                        <Grid
                            key={gridKey}
                            ref={gridRef}
                            outerRef={outerRef}
                            columnCount={defs.length}
                            columnWidth={(i) => colWidths[i]}
                            height={safeGridHeight}
                            rowCount={filteredRows.length}
                            rowHeight={() => ROW_H}
                            width={width}
                            outerElementType={Outer}
                            itemKey={({ columnIndex, rowIndex }) => `c-${columnIndex}-${rowIndex}`}
                        >
                            {Cell}
                        </Grid>

                        {/* Footer (totales + %) */}
                        <div ref={footerRef} style={{ width, borderTop: "2px solid #e11d48", background: "#fff", overflow: "hidden" }}>
                            <div ref={footerInnerRef} style={{ width: totalWidth, display: "flex", willChange: "transform" }}>
                                {defs.map((d, i) => {
                                    const alignRight = isMoneyLabel(d.label);
                                    const val = totals[d.label];
                                    const color = colorByLabel[d.label] || "#111827";
                                    let content = "";
                                    if (i === 0) content = `Totales — Empleados: ${totalEmpleados}`;

                                    if (d.label === TOTAL_LABEL) {
                                        content = money(val);
                                    } else if (isProjectLabel(d.label)) {
                                        const gt = toNumber(totals[TOTAL_LABEL] || 0);
                                        const pct = gt !== 0 ? (toNumber(val) / gt) * 100 : 0;
                                        content = `${money(val)} (${pct.toFixed(2)}%)`;
                                    }

                                    return (
                                        <div
                                            key={`f-${d.key}`}
                                            style={{
                                                width: colWidths[i],
                                                minWidth: colWidths[i],
                                                height: FOOTER_H,
                                                lineHeight: `${FOOTER_H}px`,
                                                boxSizing: "border-box",
                                                padding: "0 8px",
                                                fontWeight: 800,
                                                borderRight: "1px solid #eef0f3",
                                                textAlign: alignRight ? "right" : "left",
                                                color,
                                                background: "#fff",
                                                whiteSpace: "nowrap",
                                                overflow: "hidden",
                                                textOverflow: "ellipsis",
                                            }}
                                            title={content}
                                        >
                                            {content}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </>
                )}
            </div>

            {!loading && filteredRows.length === 0 && (
                <div
                    style={{
                        position: "absolute",
                        inset: 0,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#6b7280",
                        pointerEvents: "none",
                    }}
                >
                    Sin datos para mostrar.
                </div>
            )}
        </div>
    );
}
