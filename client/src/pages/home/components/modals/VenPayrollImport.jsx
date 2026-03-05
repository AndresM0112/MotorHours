import React, {
    forwardRef,
    useImperativeHandle,
    useMemo,
    useRef,
    useState,
    useCallback,
    useEffect,
} from "react";
import { Dialog } from "primereact/dialog";
import { Button } from "primereact/button";
import { Tag } from "primereact/tag";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { FileUpload } from "primereact/fileupload";
import { ProgressBar } from "primereact/progressbar";
import { Dropdown } from "primereact/dropdown";
import { InputText } from "primereact/inputtext";
import { Tooltip } from "primereact/tooltip";
import { SelectButton } from "primereact/selectbutton";
import ExcelJS from "exceljs";
import { getAllBlocksAPI } from "@api/requests/blocksApi";
import { InputNumber } from "primereact/inputnumber";

const commonTableProps = {
    className: "venpay-table p-datatable-sm",
    stripedRows: true,
    showGridlines: false,
    rowHover: true,
    responsiveLayout: "scroll",
};

/* ================= helpers ================= */
function truncate(s, max = 140) {
    if (!s) return "";
    const str = String(s);
    return str.length > max ? str.slice(0, max - 1) + "…" : str;
}
const clean = (s) =>
    (s ?? "")
        .toString()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/\s+/g, " ")
        .trim()
        .toUpperCase();

const parseNumber = (v) => {
    if (v === null || v === undefined || v === "") return 0;
    const n =
        typeof v === "number"
            ? v
            : Number(
                String(v)
                    .replace(/\s+/g, "")
                    .replace(/[^\d,.-]/g, "")
                    .replace(/\.(?=.*\.)/g, "")
                    .replace(",", ".")
            );
    return Number.isFinite(n) ? n : NaN;
};

// Nueva: parser de fecha flexible
const parseFlexibleDate = (v) => {
    if (v === null || v === undefined || v === "") return null;

    // 1) Excel serial (número de días desde 1899-12-30)
    const asNum = Number(v);
    if (Number.isFinite(asNum) && asNum > 25569) {
        const jsDate = new Date(Math.round((asNum - 25569) * 86400 * 1000));
        return isNaN(jsDate.getTime()) ? null : jsDate;
    }

    // 2) Date nativo
    if (v instanceof Date && !isNaN(v.getTime())) return v;

    const s = String(v).trim();

    // 3) YYYY-MM-DD o YYYY/MM/DD
    let m = s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
    if (m) {
        const [_, yy, mm, dd] = m;
        const d = new Date(Number(yy), Number(mm) - 1, Number(dd));
        return isNaN(d.getTime()) ? null : d;
    }

    // 4) DD/MM/YYYY o DD-MM-YYYY
    m = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
    if (m) {
        const [_, dd, mm, yy] = m;
        const d = new Date(Number(yy), Number(mm) - 1, Number(dd));
        return isNaN(d.getTime()) ? null : d;
    }

    // 5) MM/DD/YYYY (fallback)
    m = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
    if (m) {
        const [_, mm, dd, yy] = m;
        const d = new Date(Number(yy), Number(mm) - 1, Number(dd));
        return isNaN(d.getTime()) ? null : d;
    }

    // 6) Date parseable por el motor
    const d = new Date(s);
    return isNaN(d.getTime()) ? null : d;
};

const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

export function notifyImportSummaryPayroll(toast, raw) {
    const s = raw?.summary ?? raw ?? {};
    const sheet = s.sheetName ? `“${s.sheetName}”` : "Importación Nómina";
    const scope = s.scope ? ` (${s.scope})` : "";
    const header = `${sheet}${scope}`;

    const procesados = s.procesados ?? 0;
    const creados = s.creados ?? 0;
    const actualizados = s.actualizados ?? 0;
    const saltados = s.saltados ?? 0;
    const erroresArr = Array.isArray(s.errores) ? s.errores : [];
    const erroresN = erroresArr.length;
    const totalDebito = s.totalDebito ?? s?.totals?.debito ?? 0;
    const totalCredito = s.totalCredito ?? s?.totals?.credito ?? 0;

    const infoParts = [
        `Procesados: ${procesados}`,
        `Creados: ${creados}`,
        `Actualizados: ${actualizados}`,
        `Saltados: ${saltados}`,
        `Σ Débito: ${Number(totalDebito).toLocaleString()}`,
        `Σ Crédito: ${Number(totalCredito).toLocaleString()}`,
    ];
    const info = infoParts.join(" · ");

    const previewErrores = (limit = 5) => {
        if (!erroresN) return "";
        const top = erroresArr
            .slice(0, limit)
            .map((e) => {
                const fila = e?.fila != null ? `#${e.fila}` : "#?";
                const idEmp = e?.Identificacion ? ` (${e.Identificacion})` : "";
                const msg = truncate(e?.error || "Error desconocido");
                return `• ${fila}${idEmp}: ${msg}`;
            })
            .join("\n");
        const more = erroresN > limit ? `\n… y ${erroresN - limit} más.` : "";
        return `\n\nErrores (${erroresN}):\n${top}${more}`;
    };

    const ok = (creados ?? 0) + (actualizados ?? 0);
    if (erroresN === 0) {
        void toast?.success?.(`${header} completada.\n${info}`);
    } else if (ok > 0) {
        void toast?.warn?.(`${header} completada con errores.\n${info}${previewErrores(5)}`);
    } else {
        void toast?.error?.(`${header} fallida.\n${info}${previewErrores(7)}`);
    }
}

/* ========= estilos mínimos ========= */
const InlineStyles = () => (
    <style>{`
    .venpay-table .p-datatable-thead > tr > th {
      background: #fafafa; font-weight: 600; border: 0;
    }
    .venpay-table .p-datatable-wrapper {
      border: 1px solid #eee; border-radius: 8px;
    }
    .venpay-table .p-datatable-tbody > tr:nth-child(odd) {
      background: #fcfcfc;
    }
    .venpay-toolbar .p-inputgroup-addon {
      background: #f6f7f9; border: 1px solid #e5e7eb;
    }
    .venpay-tag { margin-left: 2px; font-size: .95rem; font-weight: 600; padding: .35rem .75rem; border-radius: 6px; cursor: pointer; }
    .venpay-tag .p-tag-value { line-height: 1.4; }
    .venpay-footer { padding-top: .5rem; }
    .venpay-section-title { font-size: 1.3rem; font-weight: 600; color: #444; margin: 0 0 1rem 0; display: flex; align-items: center; gap: .5rem; }
  `}</style>
);

/* ============== mapeo de encabezados ============== */
const HEADERS = {
    IdEmpleado: ["IdEmpleado", "ID EMPLEADO", "ID_EMPLEADO", "EmpleadoId"],
    Identificacion: ["Identificacion", "Identificación", "Documento", "NITEmpleado"],
    NombreCompleto: ["NombreCompleto", "Nombre Completo", "Empleado", "Nombre Empleado"],
    IdNomina: ["IdNomina", "ID NOMINA", "ID_NOMINA"],
    NominaNombre: ["NominaNombre", "Nombre Nómina", "Nómina"],
    IdSede: ["IdSede", "ID SEDE", "ID_SEDE"],
    NombreSede: ["NombreSede", "Sede"],
    IdPeriodo: ["IdPeriodo", "ID PERIODO", "ID_PERIODO"],
    TipoPeriodo: ["TipoPeriodo", "Tipo de Periodo"],
    FechaInicialPeriodo: ["FechaInicialPeriodo", "Fecha Inicial Periodo", "FecIni", "FechaInicio"],
    FechaFinalPeriodo: ["FechaFinalPeriodo", "Fecha Final Periodo", "FecFin", "FechaFin"],
    IdTipoDocumento: ["IdTipoDocumento", "ID TIPO DOCUMENTO", "ID_TIPO_DOCUMENTO"],
    TipoDocumento: ["TipoDocumento", "Tipo Comprobante", "Comprobante"],
    IdItem: ["IdItem", "ID ITEM", "ID_ITEM"],
    Item: ["Item", "Código Item"],
    IdPlanCuentaContable: ["IdPlanCuentaContable", "ID PLAN CUENTA CONTABLE", "ID_PLAN_CUENTA"],
    PlanCuentaContable: ["PlanCuentaContable", "Plan de Cuentas"],
    IdCentroDeCostos: ["IdCentroDeCostos", "ID CENTRO DE COSTOS", "ID_CENTRO_COSTO"],
    CentroDeCostos: ["CentroDeCostos", "Centro de Costos", "C.Costo Nombre"],
    PUC: ["PUC", "Código PUC"],
    IdCuentaContable: ["IdCuentaContable", "ID CUENTA CONTABLE", "ID_CUENTA"],
    NIT: ["NIT", "NitTercero", "DocumentoTercero"],
    Tercero: ["Tercero", "Nombre Tercero"],
    ValorDebito: ["ValorDebito", "Débito", "Debito"],
    ValorCredito: ["ValorCredito", "Crédito", "Credito"],
    DebitoMenosCredito: ["DebitoMenosCredito", "Debito - Credito", "D-C"],
    BaseImpuesto: ["BaseImpuesto", "Base Impuesto", "Base"],
    DatosCuenta: ["DatosCuenta", "Detalle Cuenta"],
    TerceroNit: ["TerceroNit", "NIT Tercero", "Tercero NIT"],
    Empleado: ["Empleado", "Empleado Nombre"],
    ItemDescripcion: ["ItemDescripcion", "Descripción Item", "Item Desc"],
};
function buildHeaderMap(headers) {
    const map = {};
    const cleaned = headers.map((h) => clean(h));
    Object.entries(HEADERS).forEach(([key, variants]) => {
        for (const candidate of variants) {
            const idx = cleaned.indexOf(clean(candidate));
            if (idx !== -1) {
                map[key] = headers[idx];
                break;
            }
        }
    });
    return map;
}

// Orden A→AD para llave compuesta
const FIELDS_A_AD = [
    "IdEmpleado",
    "Identificacion",
    "NombreCompleto",
    "IdNomina",
    "NominaNombre",
    "IdSede",
    "NombreSede",
    "IdPeriodo",
    "TipoPeriodo",
    "FechaInicialPeriodo",
    "FechaFinalPeriodo",
    "IdTipoDocumento",
    "TipoDocumento",
    "IdItem",
    "Item",
    "IdPlanCuentaContable",
    "PlanCuentaContable",
    "IdCentroDeCostos",
    "CentroDeCostos",
    "PUC",
    "IdCuentaContable",
    "NIT",
    "Tercero",
    "ValorDebito",
    "ValorCredito",
    "BaseImpuesto",
    "DatosCuenta",
    "TerceroNit",
    "Empleado",
    "ItemDescripcion",
];

/* ============== parsing Excel ============== */
function parseWorksheet(ws) {
    if (!ws) return { rows: [], headers: [] };
    const headerRow = ws.getRow(1);
    const colCount = ws.actualColumnCount || ws.columnCount || headerRow.cellCount || 0;
    const headers = [];
    for (let c = 1; c <= colCount; c++) {
        headers.push((headerRow.getCell(c).text || "").trim());
    }
    const rows = [];
    const lastRow = ws.actualRowCount || ws.rowCount || 1;
    for (let r = 2; r <= lastRow; r++) {
        const row = ws.getRow(r);
        if (!row) continue;
        const obj = {};
        for (let c = 1; c <= colCount; c++) {
            const h = headers[c - 1] || `COL_${c}`;
            const cell = row.getCell(c);
            let val = cell.text;
            if (val === undefined || val === null || val === "") {
                if (typeof cell.value === "number" || cell.value instanceof Date) val = cell.value;
                else val = null;
            }
            obj[h] = val;
        }
        if (Object.values(obj).some((v) => v !== null && v !== "")) rows.push(obj);
    }
    return { rows, headers };
}

/* ============== normalización y validación ============== */
function normalizeRow(row, H) {
    const pick = (k) => (H[k] ? row[H[k]] : null);

    const Identificacion = (pick("Identificacion") ?? "").toString().trim();
    const NombreCompleto = (pick("NombreCompleto") ?? "").toString().trim();

    const ValorDebito = parseNumber(pick("ValorDebito"));
    const ValorCredito = parseNumber(pick("ValorCredito"));
    const DebitoMenosCredito_src = parseNumber(pick("DebitoMenosCredito"));
    const DebitoMenosCredito = Number.isFinite(DebitoMenosCredito_src)
        ? DebitoMenosCredito_src
        : Number.isFinite(ValorDebito) && Number.isFinite(ValorCredito)
            ? ValorDebito - ValorCredito
            : NaN;

    const FechaInicialPeriodo = parseFlexibleDate(pick("FechaInicialPeriodo"));
    const FechaFinalPeriodo = parseFlexibleDate(pick("FechaFinalPeriodo"));

    return {
        raw: row,
        _rowIndex: -1,

        IdEmpleado: pick("IdEmpleado"),
        Identificacion,
        NombreCompleto,
        IdNomina: pick("IdNomina"),
        NominaNombre: pick("NominaNombre"),
        IdSede: pick("IdSede"),
        NombreSede: pick("NombreSede"),
        IdPeriodo: pick("IdPeriodo"),
        TipoPeriodo: pick("TipoPeriodo"),
        FechaInicialPeriodo,
        FechaFinalPeriodo,
        IdTipoDocumento: pick("IdTipoDocumento"),
        TipoDocumento: pick("TipoDocumento"),
        IdItem: pick("IdItem"),
        Item: pick("Item"),
        IdPlanCuentaContable: pick("IdPlanCuentaContable"),
        PlanCuentaContable: pick("PlanCuentaContable"),
        IdCentroDeCostos: pick("IdCentroDeCostos"),
        CentroDeCostos: pick("CentroDeCostos"),
        PUC: pick("PUC"),
        IdCuentaContable: pick("IdCuentaContable"),
        NIT: pick("NIT"),
        Tercero: pick("Tercero"),
        ValorDebito,
        ValorCredito,
        DebitoMenosCredito,
        BaseImpuesto: parseNumber(pick("BaseImpuesto")),
        DatosCuenta: pick("DatosCuenta") ?? "",
        TerceroNit: pick("TerceroNit"),
        Empleado: pick("Empleado"),
        ItemDescripcion: pick("ItemDescripcion"),
    };
}

// Crea una llave compuesta A→AD con normalización básica
function makeCompositeKey(r) {
    return FIELDS_A_AD.map((k) => {
        const v = r[k];
        if (v == null) return "";
        if (v instanceof Date) return v.toISOString().slice(0, 10);
        if (typeof v === "number") return String(v);
        return clean(String(v));
    }).join("|");
}

function validateRows(list) {
    const keyToFirstIdx = new Map(); // para detectar duplicados por llave compuesta A→AD

    return list.map((r, i) => {
        const errors = [];
        const warns = [];

        // === Reglas obligatorias ===
        if (!r.Identificacion) errors.push("Identificación es obligatoria.");
        if (!r.NombreCompleto) warns.push("Sin nombre completo.");
        if (!r.IdPeriodo) errors.push("IdPeriodo es obligatorio.");
        if (!r.TipoDocumento) errors.push("TipoDocumento es obligatorio.");

        // === Fechas del periodo ===
        if (!r.FechaInicialPeriodo || !r.FechaFinalPeriodo) {
            errors.push("Fechas de periodo incompletas.");
        } else if (r.FechaInicialPeriodo > r.FechaFinalPeriodo) {
            errors.push("Fecha inicial es mayor que la final.");
        }

        // === Valores numéricos (Débito/Crédito) ===
        const vd = r.ValorDebito;
        const vc = r.ValorCredito;
        if (!Number.isFinite(vd) || !Number.isFinite(vc)) {
            errors.push("Débito/Crédito no numéricos.");
        } else if (vd < 0 || vc < 0) {
            errors.push("Débito/Crédito no pueden ser negativos.");
        } else if (vd === 0 && vc === 0) {
            warns.push("Débito y Crédito en cero.");
        }

        // === Consistencia D - C ===
        if (Number.isFinite(vd) && Number.isFinite(vc) && Number.isFinite(r.DebitoMenosCredito)) {
            const expected = vd - vc;
            const diff = Math.abs(expected - r.DebitoMenosCredito);
            if (diff > 0.005) {
                warns.push(`D-C (${r.DebitoMenosCredito}) no coincide con cálculo (${expected}).`);
            }
        }

        // === Duplicidad por TODAS las columnas A→AD ===
        const key = makeCompositeKey(r);
        if (keyToFirstIdx.has(key)) {
            const firstIdx = keyToFirstIdx.get(key);
            errors.push(`Fila duplicada con la ${firstIdx + 2} (misma llave compuesta A→AD).`);
        } else {
            keyToFirstIdx.set(key, i);
        }

        // === Otras advertencias de contexto ===
        if (!r.CentroDeCostos && !r.IdCentroDeCostos) warns.push("Sin Centro de Costos.");
        if (!r.IdCuentaContable && !r.PUC) warns.push("Sin cuenta contable (IdCuenta o PUC).");

        // === Clasificación de errores: bloqueantes vs duplicados ===
        const isDup = (msg) => /duplicad/i.test(msg);
        const blockingErrors = errors.filter((e) => !isDup(e));
        const hasBlocking = blockingErrors.length > 0;
        const hasAnyError = errors.length > 0;

        return {
            ...r,
            _rowIndex: i,
            _errors: errors,
            _blockingErrors: blockingErrors,
            _hasOnlyDuplicateErrors: hasAnyError && !hasBlocking,
            _warns: warns,
            // si hay bloqueantes => "error"; si no, y hay warns o solo duplicados => "warn"; si nada => "ok"
            _status: hasBlocking ? "error" : warns.length ? "warn" : hasAnyError ? "warn" : "ok",
        };
    });
}


/* ============== Componente principal ============== */
const VenPayrollImport = forwardRef(({ permissions, importApi, toast, onImported }, ref) => {
    const [visible, setVisible] = useState(false);

    // archivo/hojas
    const fileRef = useRef(null);
    const [uploaderKey, setUploaderKey] = useState(0);
    const [workbook, setWorkbook] = useState(null);
    const [sheetOptions, setSheetOptions] = useState([]);
    const [activeSheet, setActiveSheet] = useState(null);

    // tabla / filtros
    const [reading, setReading] = useState(false);
    const [rows, setRows] = useState([]);
    const [statusFilter, setStatusFilter] = useState("all"); // all|ok|warn|error
    const [globalQuery, setGlobalQuery] = useState("");

    // arriba, con otros useState:
    const [tableFirst, setTableFirst] = useState(0);
    const [tableRowsPerPage, setTableRowsPerPage] = useState(20);


    // alcance (por defecto TODO hoja actual)
    const [importScope, setImportScope] = useState("all");
    const scopeOptions = [
        { label: "Sólo lo filtrado (hoja actual)", value: "filtered" },
        { label: "Todo (hoja actual)", value: "all" },
    ];

    // métricas
    const [stats, setStats] = useState({
        total: 0,
        ok: 0,
        warn: 0,
        error: 0,
        sumDeb: 0,
        sumCred: 0,
    });
    const [importing, setImporting] = useState(false);

    // ==== Presupuesto por proyecto ====
    const ADMIN_ID = 10; // Administración de La Mayorista
    const [projects, setProjects] = useState([]); // [{id, nombre,...}]
    const [budgetRows, setBudgetRows] = useState([]); // [{ projectId, projectNombre, presupuesto } ]
    const [loadingProjects, setLoadingProjects] = useState(false);

    const loadProjects = useCallback(async () => {
        try {
            setLoadingProjects(true);
            const { data } = await getAllBlocksAPI();
            const list = Array.isArray(data) ? data : data?.projects ?? [];
            setProjects(list);
        } catch (e) {
            console.error(e);
            void toast?.error?.("No se pudieron cargar los proyectos.");
        } finally {
            setLoadingProjects(false);
        }
    }, [toast]);

    useEffect(() => {
        if (visible) loadProjects();
    }, [visible, loadProjects]);

    // Inicializa budgetRows con 100% a ADMIN_ID (cuando tenga proyectos)
    const initBudgetsAllToAdmin = useCallback(
        (base) => {
            setBudgetRows((prev) => {
                const map = new Map(projects.map((p) => [p.id, p]));
                if (!map.size) return [];
                const total = Math.max(0, Number(base) || 0);
                return Array.from(map.values()).map((p) => ({
                    projectId: p.id,
                    projectNombre: p.nombre ?? `Proyecto ${p.id}`,
                    presupuesto: p.id === ADMIN_ID ? round2(total) : 0,
                }));
            });
        },
        [projects]
    );

    // totales / porcentajes de presupuesto
    const totalPresupuesto = useMemo(
        () =>
            budgetRows.reduce(
                (acc, r) => acc + (Number.isFinite(r.presupuesto) ? Number(r.presupuesto) : 0),
                0
            ),
        [budgetRows]
    );

    // ==== lectura/validación de Excel ====
    const recomputeStats = useCallback((list) => {
        const total = list.length;
        const ok = list.filter((r) => r._status === "ok").length;
        const warn = list.filter((r) => r._status === "warn").length;
        const error = list.filter((r) => r._status === "error").length;
        const sumDeb = list.reduce(
            (acc, r) => acc + (Number.isFinite(r.ValorDebito) ? r.ValorDebito : 0),
            0
        );
        const sumCred = list.reduce(
            (acc, r) => acc + (Number.isFinite(r.ValorCredito) ? r.ValorCredito : 0),
            0
        );
        setStats({ total, ok, warn, error, sumDeb, sumCred });
    }, []);

    const refreshFromSheet = useCallback(
        (ws) => {
            const { rows: rawRows, headers } = parseWorksheet(ws);
            if (!rawRows.length) {
                setRows([]);
                setStatusFilter("all");
                setGlobalQuery("");
                setStats({ total: 0, ok: 0, warn: 0, error: 0, sumDeb: 0, sumCred: 0 });
                void toast?.warn?.("La hoja seleccionada está vacía.");
                return;
            }
            const headerMap = buildHeaderMap(headers);
            if (!headerMap.Identificacion || !headerMap.IdPeriodo) {
                void toast?.error?.(
                    "La hoja no tiene columnas mínimas: Identificación e IdPeriodo."
                );
            }
            const norm = rawRows.map((r) => normalizeRow(r, headerMap));
            const validated = validateRows(norm);
            setRows(validated);
            setStatusFilter("all");
            setGlobalQuery("");
            recomputeStats(validated);
        },
        [toast, recomputeStats]
    );

    const handleSelect = async ({ files }) => {
        const f = files?.[0];
        if (!f) return;
        setReading(true);
        try {
            const wb = new ExcelJS.Workbook();
            const buffer = await f.arrayBuffer();
            await wb.xlsx.load(buffer);
            setWorkbook(wb);
            const opts = wb.worksheets.map((ws) => ({
                label: `${ws.name} (${ws.actualRowCount || ws.rowCount || 0} filas)`,
                value: ws.name,
            }));
            const nonEmpty = wb.worksheets.find(
                (ws) => (ws.actualRowCount || ws.rowCount || 0) > 1
            );
            const defaultSheet = (nonEmpty || wb.worksheets[0])?.name;
            setSheetOptions(opts);
            setActiveSheet(defaultSheet || null);
            refreshFromSheet(nonEmpty || wb.worksheets[0]);
            setTimeout(() => setUploaderKey((k) => k + 1), 0);
        } catch (e) {
            console.error(e);
            void toast?.error?.("No se pudo leer el Excel. Verifica el formato.");
        } finally {
            setReading(false);
        }
    };

    const onChangeSheet = (e) => {
        const name = e.value;
        setActiveSheet(name);
        const ws = workbook?.getWorksheet(name);
        if (ws) {
            refreshFromSheet(ws);
        }
    };

    const clearAll = useCallback(() => {
        setWorkbook(null);
        setSheetOptions([]);
        setActiveSheet(null);
        setRows([]);
        setStatusFilter("all");
        setGlobalQuery("");
        setStats({ total: 0, ok: 0, warn: 0, error: 0, sumDeb: 0, sumCred: 0 });
        setImportScope("all"); // por defecto TODO hoja actual
        setUploaderKey((k) => k + 1);
        setBudgetRows([]);
        setProjects([]);
    }, []);

    /* ====== edición + revalidación ====== */
    const revalidateRow = (idx, newRow) => {
        const r = validateRows([newRow])[0];
        setRows((prev) => {
            const clone = [...prev];
            clone[idx] = r;
            recomputeStats(clone);
            return clone;
        });
    };

    const onCellEditComplete = (e, field) => {
        const { rowIndex, newValue } = e;
        const r = { ...rows[rowIndex] };
        if (["ValorDebito", "ValorCredito", "BaseImpuesto", "DebitoMenosCredito"].includes(field)) {
            r[field] = parseNumber(newValue);
            if (
                (field === "ValorDebito" || field === "ValorCredito") &&
                !Number.isFinite(r.DebitoMenosCredito)
            ) {
                r.DebitoMenosCredito =
                    Number.isFinite(r.ValorDebito) && Number.isFinite(r.ValorCredito)
                        ? r.ValorDebito - r.ValorCredito
                        : r.DebitoMenosCredito;
            }
        } else if (field === "FechaInicialPeriodo" || field === "FechaFinalPeriodo") {
            // usa parser flexible y conserva null si vacío
            r[field] = newValue === "" ? null : parseFlexibleDate(newValue);
        } else {
            r[field] = (newValue ?? "").toString().trim();
        }
        revalidateRow(rowIndex, r);
    };
    const textEditor = (options, field) => (
        <InputText
            value={
                options.value instanceof Date
                    ? new Date(options.value).toISOString().slice(0, 10)
                    : options.value ?? ""
            }
            onChange={(e) => options.editorCallback(e.target.value)}
            onBlur={() =>
                onCellEditComplete({ rowIndex: options.rowIndex, newValue: options.value }, field)
            }
            placeholder={field.includes("Fecha") ? "YYYY-MM-DD o DD/MM/YYYY" : ""}
        />
    );

    /* ====== filtrado y búsqueda ====== */
    const filteredRows = useMemo(() => {
        let list = [...rows];
        if (statusFilter !== "all") list = list.filter((r) => r._status === statusFilter);
        if (globalQuery.trim()) {
            const q = globalQuery.toLowerCase();
            list = list.filter((r) =>
                [
                    r.Identificacion,
                    r.NombreCompleto,
                    r.Tercero,
                    r.NIT,
                    r.CentroDeCostos,
                    r.PUC,
                    r.Item,
                    r.ItemDescripcion,
                    r.TipoDocumento,
                    r.DatosCuenta,
                    r.NominaNombre,
                    r.NombreSede,
                ]
                    .join(" | ")
                    .toLowerCase()
                    .includes(q)
            );
        }
        return list;
    }, [rows, statusFilter, globalQuery]);

    const chosenRows = useMemo(
        () => (importScope === "filtered" ? filteredRows : rows),
        [importScope, filteredRows, rows]
    );

    const chosenStats = useMemo(() => {
        const total = chosenRows.length;
        const ok = chosenRows.filter((r) => r._status === "ok").length;
        const warn = chosenRows.filter((r) => r._status === "warn").length;
        const error = chosenRows.filter((r) => r._status === "error").length;
        const sumDeb = chosenRows.reduce(
            (acc, r) => acc + (Number.isFinite(r.ValorDebito) ? r.ValorDebito : 0),
            0
        );
        const sumCred = chosenRows.reduce(
            (acc, r) => acc + (Number.isFinite(r.ValorCredito) ? r.ValorCredito : 0),
            0
        );
        return { total, ok, warn, error, sumDeb, sumCred };
    }, [chosenRows]);

    const hasBlockingErrors = useMemo(
        () => chosenRows.some((r) => (r._blockingErrors?.length || 0) > 0),
        [chosenRows]
    );

    const onlyDupErrors = useMemo(
        () =>
            chosenRows.length > 0 &&
            !hasBlockingErrors &&
            chosenRows.some((r) => (r._errors?.length || 0) > 0),
        [chosenRows, hasBlockingErrors]
    );

    const canImportRows = useMemo(
        () => chosenRows.length > 0 && !hasBlockingErrors,
        [chosenRows, hasBlockingErrors]
    );


    /* ====== formato monetario ====== */
    const moneyFmt = new Intl.NumberFormat("es-CO", {
        style: "currency",
        currency: "COP",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
    const moneyBody = (v) => (Number.isFinite(v) ? moneyFmt.format(v) : "");

    /* ====== periodo del alcance ====== */
    const periodFromRows = useCallback((list) => {
        const counts = new Map();
        for (const r of list) {
            const d = r?.FechaFinalPeriodo || r?.FechaInicialPeriodo;
            if (!d) continue;
            const dt = new Date(d);
            if (isNaN(dt)) continue;
            const y = dt.getFullYear();
            const m = dt.getMonth() + 1;
            const key = `${y}-${String(m).padStart(2, "0")}`;
            counts.set(key, (counts.get(key) || 0) + 1);
        }
        if (counts.size === 0) return null;
        let best = null,
            max = -1;
        for (const [k, v] of counts.entries()) {
            if (v > max) {
                max = v;
                best = k;
            }
        }
        return best; // "YYYY-MM"
    }, []);
    const periodLabel = useMemo(() => {
        const p = periodFromRows(chosenRows);
        if (!p) return "—";
        const [y, m] = p.split("-");
        const monthName = new Date(Number(y), Number(m) - 1, 1).toLocaleDateString("es-CO", {
            month: "long",
        });
        const nice = monthName.charAt(0).toUpperCase() + monthName.slice(1);
        return `${nice} ${y}`;
    }, [chosenRows, periodFromRows]);

    // Total real del alcance (D - C) y base de distribución
    const totalReal = useMemo(() => chosenStats.sumDeb - chosenStats.sumCred, [chosenStats]);
    const baseDistribucion = useMemo(() => Math.abs(totalReal), [totalReal]);

    // Inicializar budgets a 100% Admin al tener proyectos y base calculada
    useEffect(() => {
        if (visible && projects.length) {
            initBudgetsAllToAdmin(baseDistribucion);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [visible, projects, baseDistribucion]);

    // ===== Bidireccional: valor ↔ porcentaje con ajuste automático sobre ADMIN_ID
    const redistributeAdmin = useCallback(
        (nextList) => {
            const base = Math.max(0, baseDistribucion || 0);
            if (!base) return nextList;

            const sumOthers = nextList
                .filter((r) => r.projectId !== ADMIN_ID)
                .reduce((acc, r) => acc + (Number.isFinite(r.presupuesto) ? r.presupuesto : 0), 0);

            const adminIdx = nextList.findIndex((r) => r.projectId === ADMIN_ID);
            if (adminIdx === -1) return nextList;

            const adminVal = round2(Math.max(0, base - sumOthers));
            const clone = [...nextList];
            clone[adminIdx] = { ...clone[adminIdx], presupuesto: adminVal };
            return clone;
        },
        [baseDistribucion]
    );

    const setBudgetByValue = useCallback(
        (projectId, rawValue) => {
            setBudgetRows((prev) => {
                const pedido = Number.isFinite(rawValue) ? Math.max(0, rawValue) : 0;
                const base = Math.max(0, baseDistribucion || 0);
                if (base === 0) return prev;

                // Límite máximo para ese proyecto considerando el resto:
                const sumOthersExcludingThis = prev
                    .filter((r) => r.projectId !== projectId)
                    .reduce((acc, r) => acc + (Number.isFinite(r.presupuesto) ? r.presupuesto : 0), 0);
                const maxForThis = Math.max(0, round2(base - sumOthersExcludingThis));
                const finalValue = Math.min(pedido, maxForThis);

                let next = prev.map((r) =>
                    r.projectId === projectId ? { ...r, presupuesto: round2(finalValue) } : r
                );

                // Ajusta Admin para completar 100%
                next = redistributeAdmin(next);
                return next;
            });
        },
        [baseDistribucion, redistributeAdmin]
    );

    const setBudgetByPercent = useCallback(
        (projectId, rawPercent) => {
            const pct = Number.isFinite(rawPercent) ? Math.max(0, rawPercent) : 0;
            const pedido = round2((baseDistribucion * pct) / 100);
            setBudgetByValue(projectId, pedido);
        },
        [baseDistribucion, setBudgetByValue]
    );

    // Con % calculado para mostrar en tabla
    const withPercentages = useMemo(() => {
        const base = baseDistribucion || 0;
        return budgetRows.map((r) => ({
            ...r,
            porcentaje:
                base > 0 && Number.isFinite(r.presupuesto) ? (r.presupuesto / base) * 100 : 0,
        }));
    }, [budgetRows, baseDistribucion]);

    // Métricas/validaciones de presupuesto
    const diffPresupuestoVsReal = useMemo(
        () => totalPresupuesto - baseDistribucion,
        [totalPresupuesto, baseDistribucion]
    );
    const porcentajeDistribuido = useMemo(
        () => (baseDistribucion > 0 ? (totalPresupuesto / baseDistribucion) * 100 : 0),
        [totalPresupuesto, baseDistribucion]
    );
    const isExact100 = Math.abs(diffPresupuestoVsReal) < 0.5; // tolerancia 50 centavos
    const isOverBudget = diffPresupuestoVsReal > 0.5;

    /* ====== celdas / renderers ====== */
    const statusBody = (row) => {
        const map = {
            ok: { value: "OK", severity: "success", tip: "Sin errores ni advertencias." },
            warn: {
                value: "ALERTA",
                severity: "warning",
                tip: "Tiene advertencias no bloqueantes.",
            },
            error: { value: "ERROR", severity: "danger", tip: "Contiene errores bloqueantes." },
        };
        const m = map[row._status] || map.ok;
        return (
            <Tag
                value={m.value}
                severity={m.severity}
                className="tip-badge"
                data-pr-tooltip={m.tip}
                data-pr-position="top"
            />
        );
    };
    const msgsBody = (row) => (
        <div style={{ minWidth: 260 }}>
            {row._errors.map((e, i) => (
                <div key={`e-${i}`} style={{ color: "#e53935" }}>
                    • {e}
                </div>
            ))}
            {row._warns.map((w, i) => (
                <div key={`w-${i}`} style={{ color: "#f57c00" }}>
                    • {w}
                </div>
            ))}
        </div>
    );
    const numberBody = (v) => (Number.isFinite(v) ? v.toLocaleString() : "");

    // Click en tags del footer: además de filtrar, mostrar resumen
    const handleStatusTagClick = useCallback((type) => {
        setGlobalQuery("");
        setStatusFilter(type);
        setTableFirst(0);
    }, [rows, toast]);

    useEffect(() => {
        setTableFirst(0);
    }, [statusFilter, globalQuery, activeSheet, importScope]);

    /* ====== footer ====== */
    const footer = (
        <div className="venpay-footer flex gap-2 justify-content-end w-full">
            <div className="flex align-items-center gap-2 mr-auto">
                <Button
                    type="button"
                    label={`Total: ${stats.total}`}
                    className="venpay-pill tip-btn p-button-sm p-button-rounded p-button-secondary"
                    onClick={() => handleStatusTagClick("all")}
                    data-pr-tooltip="Mostrar todas las filas"
                />
                <Button
                    type="button"
                    label={`OK: ${stats.ok}`}
                    className="venpay-pill tip-btn p-button-sm p-button-rounded p-button-success"
                    onClick={() => handleStatusTagClick("ok")}
                    data-pr-tooltip="Filtrar filas correctas (OK)"
                />
                <Button
                    type="button"
                    label={`Alertas: ${stats.warn}`}
                    className="venpay-pill tip-btn p-button-sm p-button-rounded p-button-warning"
                    onClick={() => handleStatusTagClick("warn")}
                    data-pr-tooltip="Filtrar filas con advertencias"
                />
                <Button
                    type="button"
                    label={`Errores: ${stats.error}`}
                    className="venpay-pill tip-btn p-button-sm p-button-rounded p-button-danger"
                    onClick={() => handleStatusTagClick("error")}
                    data-pr-tooltip="Filtrar filas con errores"
                />
            </div>

            <Tooltip target=".tip-badge" position="top" />

            <div
                className="flex align-items-center gap-2 mr-3 tip-badge"
                data-pr-tooltip="Elige si importas toda la hoja actual o sólo lo filtrado en pantalla."
            >
                <SelectButton
                    value={importScope}
                    options={scopeOptions}
                    onChange={(e) => setImportScope(e.value)}
                />
            </div>

            <Button
                label="Cancelar"
                className="p-button-text"
                onClick={() => {
                    clearAll();
                    setVisible(false);
                }}
            />
            <Button
                label={`Importar (${chosenStats.total})`}
                icon="pi pi-upload"
                disabled={
                    !canImportRows || importing || !isExact100 || isOverBudget || baseDistribucion <= 0
                }
                loading={importing}
                onClick={async () => {
                    if (baseDistribucion <= 0) {
                        void toast?.error?.("No hay Total Real (D−C) para distribuir.");
                        return;
                    }
                    if (isOverBudget) {
                        void toast?.error?.("La suma de presupuestos supera el Total Real.");
                        return;
                    }
                    if (!isExact100) {
                        const restante = round2(baseDistribucion - totalPresupuesto);
                        void toast?.warn?.(
                            `Debes repartir 100%. Restante por asignar: ${moneyFmt.format(restante)}.`
                        );
                        return;
                    }

                    if (hasBlockingErrors) {
                        void toast?.error?.("Hay errores bloqueantes (no de duplicidad). Corrige antes de importar.");
                        return;
                    }

                    if (onlyDupErrors) {
                        const dupCount = chosenRows.filter(r => (r._errors || []).some(e => /duplicad/i.test(e))).length;
                        void toast?.warn?.(
                            `Se detectaron ${dupCount} filas con duplicidad. Se permitirá importar; el backend deberá decidir si omite/actualiza/crea según tu lógica.`
                        );
                    }

                    try {
                        setImporting(true);
                        const payload = {
                            sheetName: activeSheet,
                            scope: importScope,
                            counts: chosenStats,
                            totals: { debito: chosenStats.sumDeb, credito: chosenStats.sumCred },
                            budgets: withPercentages.map((r) => ({
                                projectId: r.projectId,
                                presupuesto: Number.isFinite(r.presupuesto) ? r.presupuesto : 0,
                                porcentaje: Number.isFinite(r.porcentaje)
                                    ? Number(r.porcentaje.toFixed(6))
                                    : 0,
                            })),
                            rows: chosenRows.map((r) => ({
                                IdEmpleado: r.IdEmpleado,
                                Identificacion: r.Identificacion,
                                NombreCompleto: r.NombreCompleto,
                                IdNomina: r.IdNomina,
                                NominaNombre: r.NominaNombre,
                                IdSede: r.IdSede,
                                NombreSede: r.NombreSede,
                                IdPeriodo: r.IdPeriodo,
                                TipoPeriodo: r.TipoPeriodo,
                                FechaInicialPeriodo: r.FechaInicialPeriodo
                                    ? new Date(r.FechaInicialPeriodo).toISOString()
                                    : null,
                                FechaFinalPeriodo: r.FechaFinalPeriodo
                                    ? new Date(r.FechaFinalPeriodo).toISOString()
                                    : null,
                                IdTipoDocumento: r.IdTipoDocumento,
                                TipoDocumento: r.TipoDocumento,
                                IdItem: r.IdItem,
                                Item: r.Item,
                                IdPlanCuentaContable: r.IdPlanCuentaContable,
                                PlanCuentaContable: r.PlanCuentaContable,
                                IdCentroDeCostos: r.IdCentroDeCostos,
                                CentroDeCostos: r.CentroDeCostos,
                                PUC: r.PUC,
                                IdCuentaContable: r.IdCuentaContable,
                                NIT: r.NIT,
                                Tercero: r.Tercero,
                                ValorDebito: Number.isFinite(r.ValorDebito) ? r.ValorDebito : 0,
                                ValorCredito: Number.isFinite(r.ValorCredito) ? r.ValorCredito : 0,
                                // DebitoMenosCredito: Number.isFinite(r.DebitoMenosCredito)
                                //     ? r.DebitoMenosCredito
                                //     : null,
                                DebitoMenosCredito: Number.isFinite((r.ValorDebito - r.ValorCredito).toFixed(2)) ? Number((r.ValorDebito - r.ValorCredito).toFixed(2)) : 0,
                                BaseImpuesto: Number.isFinite(r.BaseImpuesto) ? r.BaseImpuesto : 0,
                                DatosCuenta: r.DatosCuenta,
                                TerceroNit: r.TerceroNit,
                                Empleado: r.Empleado,
                                ItemDescripcion: r.ItemDescripcion,
                            })),
                        };

                        const { data } = await importApi(payload);
                        if (data?.message) void toast?.info?.(data.message);
                        notifyImportSummaryPayroll(toast, data);
                        clearAll();
                        void onImported?.();
                        setVisible(false);
                    } catch (e) {
                        console.error(e);
                        void toast?.error?.(e?.message || "Error importando los datos.");
                    } finally {
                        setImporting(false);
                    }
                }}
            />
        </div>
    );

    /* ====== exposición por ref ====== */
    const newImport = () => setVisible(true);
    const viewImport = () => setVisible(true);
    useImperativeHandle(ref, () => ({ newImport, viewImport, onClose: () => setVisible(false) }));

    const parseLooseNumber = (raw) => {
        if (raw == null) return 0;
        const s = String(raw)
            .replace(/\s+/g, "")
            .replace(/[^\d,.-]/g, "")
            .replace(/\.(?=.*\.)/g, "")
            .replace(",", ".");
        const n = Number(s);
        return Number.isFinite(n) ? n : 0;
    };

    const tableRef = useRef(null);

    const focusCell = (rowIdx, colKey) => {
        const root = tableRef.current?.getElement?.() || tableRef.current?.container || document;
        const td = root.querySelector(
            `[data-p-rowindex="${rowIdx}"] [data-p-column-key="${colKey}"]`
        );
        void td?.dispatchEvent(new MouseEvent("click", { bubbles: true })); // entra a edición
        setTimeout(() => td?.querySelector("input, .p-inputtext")?.focus?.(), 0);
    };

    // pega “multi-línea” hacia abajo
    const handleMultiPaste = (e, startRowIdx, applyFn) => {
        const txt = (e.clipboardData || window.clipboardData)?.getData("text") || "";
        const lines = txt
            .split(/\r?\n/)
            .map((l) => l.trim())
            .filter(Boolean);
        if (lines.length <= 1) return false;

        e.preventDefault();
        lines.forEach((line, k) => {
            const idx = startRowIdx + k;
            const row = withPercentages[idx];
            if (!row) return;
            const n = parseLooseNumber(line);
            applyFn(row.projectId, n);
        });
        return true;
    };

    return (
        <Dialog
            header="Previsualizar Importación de Nómina (VE)"
            visible={visible}
            style={{ width: "100vw", maxWidth: 2100 }}
            modal
            onHide={() => {
                clearAll();
                setVisible(false);
            }}
            footer={footer}
            maximizable
            maximized
        >
            <InlineStyles />
            <Tooltip target=".tip-badge" position="top" />

            <div className="grid venpay-toolbar">
                <div className="col-12">
                    <FileUpload
                        key={uploaderKey}
                        ref={fileRef}
                        mode="basic"
                        name="file"
                        accept=".xlsx,.xls"
                        customUpload
                        auto
                        chooseLabel="Seleccionar Excel"
                        maxFileSize={20 * 1024 * 1024}
                        uploadHandler={handleSelect}
                    />
                </div>

                {workbook && (
                    <>
                        <div className="col-12 md:col-6">
                            <div className="p-inputgroup">
                                <span className="p-inputgroup-addon">
                                    <i className="pi pi-file" />
                                </span>
                                <Dropdown
                                    value={activeSheet}
                                    options={sheetOptions}
                                    onChange={onChangeSheet}
                                    placeholder="Selecciona la hoja"
                                    className="w-full"
                                />
                            </div>
                        </div>
                        <div className="col-12 md:col-6">
                            <span className="p-input-icon-right w-full">
                                <InputText
                                    className="w-full"
                                    placeholder="Búsqueda global..."
                                    value={globalQuery}
                                    onChange={(e) => setGlobalQuery(e.target.value)}
                                />
                                <i className="pi pi-search" />
                            </span>
                        </div>

                        {/* Bloque informativo de periodo, totales y total real */}
                        <div className="col-12">
                            <div className="flex align-items-center gap-2">
                                <Tag
                                    severity="info"
                                    value={`Periodo: ${periodLabel}`}
                                    className="venpay-tag"
                                />
                                <Tag
                                    severity="info"
                                    value={`Σ Débito (alcance): ${moneyFmt.format(
                                        chosenStats.sumDeb
                                    )}`}
                                    className="venpay-tag"
                                />
                                <Tag
                                    severity="info"
                                    value={`Σ Crédito (alcance): ${moneyFmt.format(
                                        chosenStats.sumCred
                                    )}`}
                                    className="venpay-tag"
                                />
                                <Tag
                                    severity="warning"
                                    value={`Total Real (D − C): ${moneyFmt.format(totalReal)}`}
                                    className="venpay-tag"
                                />
                            </div>
                        </div>

                        {rows.length > 0 && (
                            <>
                                <div className="col-12">
                                    <h2 className="venpay-section-title">📑 Datos a guardar</h2>

                                    <DataTable
                                        key={`tbl-${activeSheet}-${statusFilter}-${globalQuery}-${filteredRows.length}`}
                                        value={filteredRows}
                                        dataKey="_rowIndex"
                                        paginator
                                        rows={tableRowsPerPage}
                                        first={tableFirst}
                                        onPage={(e) => {
                                            setTableFirst(e.first);
                                            setTableRowsPerPage(e.rows);
                                        }}
                                        scrollable
                                        scrollHeight="70vh"
                                        className="venpay-table p-datatable-sm"
                                        showGridlines={false}
                                        stripedRows
                                        editMode="cell"
                                    >

                                        <Column
                                            header="#"
                                            body={(r, o) => o.rowIndex + 2}
                                            style={{ width: 70 }}
                                            frozen
                                        />
                                        <Column
                                            header="Estado"
                                            body={statusBody}
                                            style={{ width: 120 }}
                                            frozen
                                        />
                                        <Column
                                            header="Mensajes"
                                            body={msgsBody}
                                            style={{ width: 320 }}
                                        />
                                        <Column
                                            field="Identificacion"
                                            header="Identificación"
                                            style={{ width: 160 }}
                                            editor={(opts) => textEditor(opts, "Identificacion")}
                                            frozen
                                        />
                                        <Column
                                            field="IdEmpleado"
                                            header="ID Empleado"
                                            style={{ width: 160 }}
                                            editor={(opts) => textEditor(opts, "IdEmpleado")}
                                            frozen
                                        />
                                        <Column
                                            field="NombreCompleto"
                                            header="Nombre Empleado"
                                            style={{ width: 220 }}
                                            editor={(opts) => textEditor(opts, "NombreCompleto")}
                                        />
                                        <Column
                                            field="IdPeriodo"
                                            header="IdPeriodo"
                                            style={{ width: 120 }}
                                            editor={(opts) => textEditor(opts, "IdPeriodo")}
                                        />
                                        <Column
                                            field="TipoDocumento"
                                            header="TipoDocumento"
                                            style={{ width: 180 }}
                                            editor={(opts) => textEditor(opts, "TipoDocumento")}
                                        />
                                        <Column
                                            field="FechaInicialPeriodo"
                                            header="F. Inicial"
                                            style={{ width: 160 }}
                                            body={(r) =>
                                                r.FechaInicialPeriodo
                                                    ? new Date(
                                                        r.FechaInicialPeriodo
                                                    ).toLocaleDateString()
                                                    : ""
                                            }
                                            editor={(opts) =>
                                                textEditor(opts, "FechaInicialPeriodo")
                                            }
                                        />
                                        <Column
                                            field="FechaFinalPeriodo"
                                            header="F. Final"
                                            style={{ width: 160 }}
                                            body={(r) =>
                                                r.FechaFinalPeriodo
                                                    ? new Date(
                                                        r.FechaFinalPeriodo
                                                    ).toLocaleDateString()
                                                    : ""
                                            }
                                            editor={(opts) => textEditor(opts, "FechaFinalPeriodo")}
                                        />
                                        <Column
                                            field="CentroDeCostos"
                                            header="Centro de Costos"
                                            style={{ width: 220 }}
                                            editor={(opts) => textEditor(opts, "CentroDeCostos")}
                                        />
                                        <Column
                                            field="PUC"
                                            header="PUC"
                                            style={{ width: 140 }}
                                            editor={(opts) => textEditor(opts, "PUC")}
                                        />
                                        <Column
                                            field="IdCuentaContable"
                                            header="IdCuenta"
                                            style={{ width: 140 }}
                                            editor={(opts) => textEditor(opts, "IdCuentaContable")}
                                        />
                                        <Column
                                            field="Item"
                                            header="Item"
                                            style={{ width: 140 }}
                                            editor={(opts) => textEditor(opts, "Item")}
                                        />
                                        <Column
                                            field="ItemDescripcion"
                                            header="Descripción Item"
                                            style={{ width: 240 }}
                                            editor={(opts) => textEditor(opts, "ItemDescripcion")}
                                        />
                                        <Column
                                            field="NIT"
                                            header="NIT"
                                            style={{ width: 160 }}
                                            editor={(opts) => textEditor(opts, "NIT")}
                                        />
                                        <Column
                                            field="Tercero"
                                            header="Tercero"
                                            style={{ width: 220 }}
                                            editor={(opts) => textEditor(opts, "Tercero")}
                                        />
                                        <Column
                                            field="ValorDebito"
                                            header="Débito"
                                            style={{ width: 160, textAlign: "right" }}
                                            body={(r) => moneyBody(r.ValorDebito)}
                                            editor={(opts) => textEditor(opts, "ValorDebito")}
                                        />
                                        <Column
                                            field="ValorCredito"
                                            header="Crédito"
                                            style={{ width: 160, textAlign: "right" }}
                                            body={(r) => moneyBody(r.ValorCredito)}
                                            editor={(opts) => textEditor(opts, "ValorCredito")}
                                        />
                                        <Column
                                            field="DebitoMenosCredito"
                                            header="D - C"
                                            style={{ width: 140, textAlign: "right" }}
                                            body={(r) => moneyBody(r.DebitoMenosCredito)}
                                            editor={(opts) =>
                                                textEditor(opts, "DebitoMenosCredito")
                                            }
                                        />
                                        <Column
                                            field="BaseImpuesto"
                                            header="Base Impuesto"
                                            style={{ width: 160 }}
                                            body={(r) => numberBody(r.BaseImpuesto)}
                                            editor={(opts) => textEditor(opts, "BaseImpuesto")}
                                        />
                                        <Column
                                            field="DatosCuenta"
                                            header="Datos Cuenta"
                                            style={{ width: 260 }}
                                            editor={(opts) => textEditor(opts, "DatosCuenta")}
                                        />
                                    </DataTable>
                                </div>
                                {/*
                                <hr />

                                <h2 className="venpay-section-title">💰 Presupuesto</h2>

                                <div className="col-12">
                                    <div className="flex align-items-center justify-content-between mb-2">
                                        <div className="flex align-items-center gap-2">
                                            <Tag
                                                severity="info"
                                                value={`Proyectos: ${projects.length}`}
                                                className="venpay-tag"
                                            />
                                            <Tag
                                                severity={isOverBudget ? "danger" : "info"}
                                                value={`Total Presupuesto: ${moneyFmt.format(
                                                    totalPresupuesto
                                                )}`}
                                                className="venpay-tag"
                                            />
                                            <Tag
                                                severity={
                                                    Math.abs(diffPresupuestoVsReal) < 0.5
                                                        ? "success"
                                                        : diffPresupuestoVsReal > 0
                                                            ? "danger"
                                                            : "warning"
                                                }
                                                value={`Δ vs Total Real: ${moneyFmt.format(
                                                    diffPresupuestoVsReal
                                                )}`}
                                                className="venpay-tag"
                                            />
                                            <Tag
                                                severity={isExact100 ? "success" : "warning"}
                                                value={`Distribuido: ${(
                                                    porcentajeDistribuido || 0
                                                ).toFixed(2)} %`}
                                                className="venpay-tag"
                                            />
                                            <Tag
                                                severity="warning"
                                                value={`Base: ${moneyFmt.format(baseDistribucion)}`}
                                                className="venpay-tag"
                                            />
                                        </div>
                                        {loadingProjects && (
                                            <ProgressBar
                                                mode="indeterminate"
                                                style={{ height: 3, width: 220 }}
                                            />
                                        )}
                                    </div>

                                     <DataTable
                                        ref={tableRef}
                                        value={withPercentages}
                                        dataKey="projectId"
                                        {...commonTableProps}
                                        scrollable
                                        scrollHeight="30vh"
                                        className="venpay-table p-datatable-sm"
                                        showGridlines={false}
                                        stripedRows
                                        editMode="cell"
                                    >
                                        <Column
                                            header="#"
                                            body={(_, opt) => opt.rowIndex + 1}
                                            style={{ width: 70, minWidth: 70, textAlign: "center" }}
                                            frozen
                                        />
                                        <Column
                                            field="projectNombre"
                                            header="Proyecto"
                                            style={{ width: 360, minWidth: 300 }}
                                        />

                                        {/* Presupuesto (COP) editable, con navegación y pegado hacia abajo 
                                        <Column
                                            field="presupuesto"
                                            columnKey="presupuesto"
                                            header="Presupuesto (COP)"
                                            style={{
                                                width: 260,
                                                minWidth: 220,
                                                textAlign: "right",
                                            }}
                                            body={(r) =>
                                                moneyBody(
                                                    Number.isFinite(r.presupuesto)
                                                        ? r.presupuesto
                                                        : 0
                                                )
                                            }
                                            editor={(options) => (
                                                <InputNumber
                                                    value={
                                                        Number.isFinite(options.value)
                                                            ? options.value
                                                            : 0
                                                    }
                                                    mode="currency"
                                                    currency="COP"
                                                    locale="es-CO"
                                                    inputStyle={{
                                                        textAlign: "right",
                                                        width: "100%",
                                                    }}
                                                    onValueChange={(e) => {
                                                        options.editorCallback(e.value ?? 0);
                                                        setBudgetByValue(
                                                            options.rowData.projectId,
                                                            Number(e.value) ?? 0
                                                        );
                                                    }}
                                                    onFocus={(e) => e.target?.select?.()}
                                                    onKeyDown={(e) => {
                                                        const rowIdx = options.rowIndex;
                                                        if (e.key === "Enter") {
                                                            e.preventDefault();
                                                            setBudgetByValue(
                                                                options.rowData.projectId,
                                                                Number(options.value) ?? 0
                                                            );
                                                            e.currentTarget.blur();
                                                            focusCell(rowIdx + 1, "presupuesto");
                                                        } else if (e.key === "Tab") {
                                                            e.preventDefault();
                                                            const nextKey = "porcentaje";
                                                            const nextRow = rowIdx;
                                                            e.currentTarget.blur();
                                                            focusCell(nextRow, nextKey);
                                                        } else if (e.key === "Escape") {
                                                            e.currentTarget.blur();
                                                        } else if (e.key === "ArrowDown") {
                                                            e.preventDefault();
                                                            focusCell(rowIdx + 1, "presupuesto");
                                                        } else if (e.key === "ArrowUp") {
                                                            e.preventDefault();
                                                            focusCell(rowIdx - 1, "presupuesto");
                                                        }
                                                    }}
                                                    onPaste={(e) => {
                                                        const handled = handleMultiPaste(
                                                            e,
                                                            options.rowIndex,
                                                            (projectId, val) =>
                                                                setBudgetByValue(projectId, val)
                                                        );
                                                        if (!handled) {
                                                            const txt =
                                                                (
                                                                    e.clipboardData ||
                                                                    window.clipboardData
                                                                )?.getData("text") || "";
                                                            const n = parseLooseNumber(txt);
                                                            options.editorCallback(n);
                                                            setBudgetByValue(
                                                                options.rowData.projectId,
                                                                n
                                                            );
                                                            e.preventDefault();
                                                        }
                                                    }}
                                                    onBlur={() =>
                                                        setBudgetByValue(
                                                            options.rowData.projectId,
                                                            Number(options.value) ?? 0
                                                        )
                                                    }
                                                    placeholder="0"
                                                />
                                            )}
                                        />

                                        {/* % editable 
                                        <Column
                                            field="porcentaje"
                                            columnKey="porcentaje"
                                            header="% sobre total"
                                            style={{
                                                width: 160,
                                                minWidth: 140,
                                                textAlign: "right",
                                            }}
                                            body={(r) =>
                                                `${(Number(r.porcentaje) || 0).toFixed(2)} %`
                                            }
                                            editor={(options) => (
                                                <InputNumber
                                                    value={
                                                        Number.isFinite(options.value)
                                                            ? Number(options.value)
                                                            : 0
                                                    }
                                                    mode="decimal"
                                                    minFractionDigits={2}
                                                    maxFractionDigits={2}
                                                    suffix=" %"
                                                    inputStyle={{
                                                        textAlign: "right",
                                                        width: "100%",
                                                    }}
                                                    onValueChange={(e) => {
                                                        const v = Number(e.value) ?? 0;
                                                        options.editorCallback(v);
                                                        setBudgetByPercent(
                                                            options.rowData.projectId,
                                                            v
                                                        );
                                                    }}
                                                    onFocus={(e) => e.target?.select?.()}
                                                    onKeyDown={(e) => {
                                                        const rowIdx = options.rowIndex;
                                                        if (e.key === "Enter") {
                                                            e.preventDefault();
                                                            setBudgetByPercent(
                                                                options.rowData.projectId,
                                                                Number(options.value) ?? 0
                                                            );
                                                            e.currentTarget.blur();
                                                            focusCell(rowIdx + 1, "porcentaje");
                                                        } else if (e.key === "Tab") {
                                                            e.preventDefault();
                                                            const nextKey = "presupuesto";
                                                            const nextRow = rowIdx;
                                                            e.currentTarget.blur();
                                                            focusCell(nextRow, nextKey);
                                                        } else if (e.key === "Escape") {
                                                            e.currentTarget.blur();
                                                        } else if (e.key === "ArrowDown") {
                                                            e.preventDefault();
                                                            focusCell(rowIdx + 1, "porcentaje");
                                                        } else if (e.key === "ArrowUp") {
                                                            e.preventDefault();
                                                            focusCell(rowIdx - 1, "porcentaje");
                                                        }
                                                    }}
                                                    onPaste={(e) => {
                                                        const handled = handleMultiPaste(
                                                            e,
                                                            options.rowIndex,
                                                            (projectId, val) =>
                                                                setBudgetByPercent(projectId, val)
                                                        );
                                                        if (!handled) {
                                                            const txt =
                                                                (
                                                                    e.clipboardData ||
                                                                    window.clipboardData
                                                                )?.getData("text") || "";
                                                            const n = parseLooseNumber(txt);
                                                            options.editorCallback(n);
                                                            setBudgetByPercent(
                                                                options.rowData.projectId,
                                                                n
                                                            );
                                                            e.preventDefault();
                                                        }
                                                    }}
                                                    onBlur={() =>
                                                        setBudgetByPercent(
                                                            options.rowData.projectId,
                                                            Number(options.value) ?? 0
                                                        )
                                                    }
                                                    placeholder="0 %"
                                                />
                                            )}
                                        />
                                    </DataTable> 
                                </div>*/}
                            </>
                        )}
                    </>
                )}

                {reading && (
                    <div className="col-12">
                        <ProgressBar mode="indeterminate" style={{ height: 3 }} />
                    </div>
                )}
            </div>
        </Dialog>
    );
});

export default VenPayrollImport;
