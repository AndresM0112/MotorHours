import React, { useMemo, useRef, useState, useCallback } from "react";
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


function truncate(s, max = 140) {
    if (!s) return "";
    const str = String(s);
    return str.length > max ? str.slice(0, max - 1) + "…" : str;
}

export function notifyImportSummary(toast, raw) {
    // admite { message, ...summary } o { summary: { ... } }
    const s = raw?.summary ?? raw ?? {};

    const sheet = s.sheetName ? `“${s.sheetName}”` : "Importación";
    const scope = s.scope ? ` (${s.scope})` : "";

    const procesados = s.procesados ?? 0;
    const creados = s.creados ?? 0;
    const actualizados = s.actualizados ?? 0;
    const saltados = s.saltados ?? 0;
    const relUPR = s.relacionesUPR ?? 0; // Usuario <-> Proyecto
    const relPTR = s.relacionesPTR ?? 0; // Proyecto <-> Tipo Reembolsable
    const erroresArr = Array.isArray(s.errores) ? s.errores : [];
    const erroresN = erroresArr.length;
    const ok = creados + actualizados;

    const header = `${sheet}${scope}`;
    const infoParts = [
        `Procesados: ${procesados}`,
        `Creados: ${creados}`,
        `Actualizados: ${actualizados}`,
    ];
    if (saltados) infoParts.push(`Saltados: ${saltados}`);
    if (relUPR) infoParts.push(`Rel. U↔P: ${relUPR}`);
    if (relPTR) infoParts.push(`Rel. PTR: ${relPTR}`);

    const info = infoParts.join(" · ");

    const previewErrores = (limit = 3) => {
        if (!erroresN) return "";
        const top = erroresArr.slice(0, limit).map((e, i) => {
            const fila = e?.fila != null ? `#${e.fila}` : "#?";
            const doc = e?.documento ? ` (${e.documento})` : "";
            const msg = truncate(e?.error || "Error desconocido");
            return `• ${fila}${doc}: ${msg}`;
        }).join("\n");
        const more = erroresN > limit ? `\n… y ${erroresN - limit} más.` : "";
        return `\n\nErrores (${erroresN}):\n${top}${more}`;
    };

    // Severidad y mensaje
    if (erroresN === 0) {
        // Éxito total
        void toast?.success?.(`${header} completada.\n${info}`);
    } else if (ok > 0) {
        // Parcial con errores
        void toast?.warn?.(`${header} completada con errores.\n${info}${previewErrores(3)}`);
    } else {
        // Fallida (todo errores)
        void toast?.error?.(`${header} fallida.\n${info}${previewErrores(5)}`);
    }
}

/* ========= estilos mínimos (zebra + header) ========= */
const InlineStyles = () => (
    <style>{`
    .preimp-table .p-datatable-thead > tr > th {
      background: #fafafa;
      font-weight: 600;
      border: 0;
    }
    .preimp-table .p-datatable-wrapper {
      border: 1px solid #eee;
      border-radius: 8px;
    }
    .preimp-table .p-datatable-tbody > tr:nth-child(odd) {
      background: #fcfcfc; /* zebra */
    }
    .preimp-toolbar .p-inputgroup-addon {
      background: #f6f7f9;
      border: 1px solid #e5e7eb;
    }
    .preimp-tag { margin-right: 8px; cursor: pointer; }
    .preimp-footer { padding-top: .5rem; }
  `}</style>
);

/* ================== helpers ================== */
const clean = (s) =>
    (s ?? "")
        .toString()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/\s+/g, " ")
        .trim()
        .toUpperCase();

function splitNombreCompleto(full) {
    const p = (full || "").trim().split(/\s+/);
    if (p.length === 0) return { nombres: null, apellidos: null };
    if (p.length === 1) return { nombres: p[0], apellidos: null };
    const apellidos = p.slice(-2).join(" ");
    const nombres = p.slice(0, -2).join(" ");
    return { nombres, apellidos };
}

const pick = (row, ...keys) => {
    for (const k of keys) if (row[k] !== undefined && row[k] !== null) return row[k];
    return null;
};

/** Encabezados esperados (incluye columnas de tu imagen) */
const HEADERS = {
    fullName: ["NOMBRE EMPLEADO", "NOMBRE", "EMPLEADO", "Nombre Empleado"],
    documento: ["IDENTIFICACION", "IDENTIFICACIÓN", "DOCUMENTO", "ID", "NIT", "Nit"],
    valorNomina: ["VALOR NOMINA", "VALOR NÓMINA", "VALOR DE NOMINA"],
    cargo: ["CARGO"],
    gerencia: ["GERENCIA"],
    ccCodigo: ["COSTO COD", "C.COSTO COD", "CCOSTO COD", "COSTO_COD", "Centro de Costo"],
    ccNombre: ["C.COSTO NOMBRE", "CCOSTO NOMBRE", "COSTO NOMBRE", "COSTO_NOMBRE", "Nombre Centro de Costos"],
    tipoReembolso: ["PO DE REEMB", "TIPO DE REEMBOLSO", "TIPO REEMBOLSO", "TIPO"],
    proyectos: ["PROYECTO A REEMBOLSAR", "PROYECTOS A REEMBOLSAR", "PROYECTO", "PROYECTOS"],
    nota: ["NOTA", "OBSERVACION", "OBSERVACIÓN", "COMENTARIO"],
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

function normalizeRow(row, headerMap) {
    const fullName = pick(row, headerMap.fullName);
    const documento = pick(row, headerMap.documento);
    const valorNomina = pick(row, headerMap.valorNomina);
    const cargoNombre = pick(row, headerMap.cargo);
    const gerenciaNombre = pick(row, headerMap.gerencia);
    const ccCodigo = pick(row, headerMap.ccCodigo);
    const ccNombre = pick(row, headerMap.ccNombre);
    const tipoReembolsoNombre = pick(row, headerMap.tipoReembolso);
    const proyectosCell = pick(row, headerMap.proyectos);
    const nota = pick(row, headerMap.nota);

    const { nombres, apellidos } = splitNombreCompleto(fullName || "");
    const proyectos = (proyectosCell || "")
        .toString()
        .split("-")
        .map((p) => p.trim())
        .filter((p) => p.length > 0);

    return {
        raw: row,
        fullName,
        documento: documento?.toString().trim() || "",
        valorNomina: valorNomina?.toString().trim() || "",
        cargoNombre: cargoNombre?.toString().trim() || "",
        gerenciaNombre: gerenciaNombre?.toString().trim() || "",
        ccCodigo: ccCodigo?.toString().trim() || "",
        ccNombre: ccNombre?.toString().trim() || "",
        tipoReembolsoNombre: tipoReembolsoNombre?.toString().trim() || "",
        proyectos,
        nota: (nota ?? "").toString().trim(),
        nombres: nombres || "",
        apellidos: apellidos || "",
    };
}

function validateRows(normRows) {
    return normRows.map((r, i, arr) => {
        const errors = [];
        const warns = [];

        if (!r.documento) errors.push("Documento es obligatorio.");
        if (!r.fullName) errors.push("Nombre completo es obligatorio.");
        if (r.documento && !/^[A-Za-z0-9\-\.]+$/.test(r.documento))
            errors.push("Documento tiene caracteres inválidos.");

        // Duplicados en el archivo
        if (r.documento) {
            const firstIdx = arr.findIndex((x) => x.documento === r.documento);
            if (firstIdx !== i) errors.push(`Documento duplicado (ya aparece en fila ${firstIdx + 2}).`);
        }

        if (!r.ccCodigo && !r.ccNombre)
            warns.push("Sin Centro de Costo (se creará/ligará según backend).");

        if (r.proyectos.length === 0)
            warns.push("Sin proyectos (se importará sin asignaciones de proyecto).");

        if (r.proyectos.length > 0 && !r.tipoReembolsoNombre)
            warns.push("Proyectos sin 'Tipo de Reembolso' asociado.");

        return {
            ...r,
            _rowIndex: i,
            _errors: errors,
            _warns: warns,
            _status: errors.length ? "error" : warns.length ? "warn" : "ok",
        };
    });
}

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
                if (typeof cell.value === "number") val = cell.value;
                else val = null;
            }
            obj[h] = val;
        }
        if (Object.values(obj).some((v) => v !== null && v !== "")) rows.push(obj);
    }
    return { rows, headers };
}

/* ================== componente ================== */
const PreImportEmpleados = ({
    visible,
    onHide,
    onImported,     // callback al terminar
    importApi,      // (payload) => Promise
    toast,          // { success, error, warn }
}) => {
    const fileRef = useRef(null);

    // archivo/hojas
    const [uploaderKey, setUploaderKey] = useState(0); // reset para volver a elegir el mismo archivo
    const [file, setFile] = useState(null);
    const [workbook, setWorkbook] = useState(null);
    const [sheetOptions, setSheetOptions] = useState([]);
    const [activeSheet, setActiveSheet] = useState(null);

    // tabla / filtros
    const [reading, setReading] = useState(false);
    const [rows, setRows] = useState([]);
    const [statusFilter, setStatusFilter] = useState("all"); // all|ok|warn|error
    const [globalQuery, setGlobalQuery] = useState("");

    // alcance de importación
    const [importScope, setImportScope] = useState("filtered");
    const scopeOptions = [
        { label: "Sólo lo filtrado (hoja actual)", value: "filtered" },
        { label: "Todo (hoja actual)", value: "all" },
    ];

    // métricas
    const [stats, setStats] = useState({ total: 0, ok: 0, warn: 0, error: 0 });
    const [importing, setImporting] = useState(false);

    const recomputeStats = useCallback((list) => {
        const total = list.length;
        const ok = list.filter((r) => r._status === "ok").length;
        const warn = list.filter((r) => r._status === "warn").length;
        const error = list.filter((r) => r._status === "error").length;
        setStats({ total, ok, warn, error });
    }, []);

    // Recontruye desde una hoja
    const refreshFromSheet = useCallback(
        (ws) => {
            const { rows: rawRows, headers } = parseWorksheet(ws);

            if (!rawRows.length) {
                setRows([]);
                setStatusFilter("all");
                setGlobalQuery("");
                setStats({ total: 0, ok: 0, warn: 0, error: 0 });
                void toast?.warn?.("La hoja seleccionada está vacía.");
                return;
            }

            const headerMap = buildHeaderMap(headers);
            if (!headerMap.documento || !headerMap.fullName) {
                void toast?.error?.("La hoja no tiene columnas mínimas: Nombre y Documento.");
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

    // Selección de archivo
    const handleSelect = async ({ files }) => {
        const f = files?.[0];
        if (!f) return;
        setFile(f);
        setReading(true);
        try {
            const wb = new ExcelJS.Workbook();
            const buffer = await f.arrayBuffer();
            await wb.xlsx.load(buffer);
            setWorkbook(wb);

            const opts = wb.worksheets.map((ws, idx) => ({
                label: `${ws.name} (${ws.actualRowCount || ws.rowCount || 0} filas)`,
                value: ws.name,
                index: idx,
            }));

            const nonEmpty = wb.worksheets.find((ws) => (ws.actualRowCount || ws.rowCount || 0) > 1);
            const defaultSheet = (nonEmpty || wb.worksheets[0])?.name;

            setSheetOptions(opts);
            setActiveSheet(defaultSheet);
            refreshFromSheet(nonEmpty || wb.worksheets[0]);

            // permitir volver a cargar el MISMO archivo después
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
        if (ws) refreshFromSheet(ws);
    };

    const clearAll = useCallback(() => {
        setFile(null);
        setWorkbook(null);
        setSheetOptions([]);
        setActiveSheet(null);
        setRows([]);
        setStatusFilter("all");
        setGlobalQuery("");
        setStats({ total: 0, ok: 0, warn: 0, error: 0 });
        setImportScope("filtered");
        setUploaderKey((k) => k + 1);
    }, []);

    /* ====== edición en línea + revalidación ====== */
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

        if (field === "proyectos") {
            r.proyectos = (newValue || "")
                .toString()
                .split("-")
                .map((p) => p.trim())
                .filter(Boolean);
        } else {
            r[field] = (newValue ?? "").toString().trim();
            if (field === "fullName") {
                const { nombres, apellidos } = splitNombreCompleto(r.fullName || "");
                r.nombres = nombres || "";
                r.apellidos = apellidos || "";
            }
        }
        revalidateRow(rowIndex, r);
    };

    const textEditor = (options, field) => (
        <InputText
            value={options.value ?? ""}
            onChange={(e) => options.editorCallback(e.target.value)}
            onBlur={() => onCellEditComplete({ rowIndex: options.rowIndex, newValue: options.value }, field)}
        />
    );

    /* ====== filtrado por estado + búsqueda global ====== */
    const filteredRows = useMemo(() => {
        let list = [...rows];
        if (statusFilter !== "all") {
            list = list.filter((r) => r._status === statusFilter);
        }
        if (globalQuery.trim()) {
            const q = globalQuery.toLowerCase();
            list = list.filter((r) =>
                [
                    r.documento,
                    r.fullName,
                    r.valorNomina,
                    r.cargoNombre,
                    r.gerenciaNombre,
                    r.ccCodigo,
                    r.ccNombre,
                    r.tipoReembolsoNombre,
                    r.proyectos.join(" - "),
                    r.nota,
                ]
                    .join(" | ")
                    .toLowerCase()
                    .includes(q)
            );
        }
        return list;
    }, [rows, statusFilter, globalQuery]);

    // conjunto elegido para importar
    const chosenRows = useMemo(
        () => (importScope === "filtered" ? filteredRows : rows),
        [importScope, filteredRows, rows]
    );

    const chosenStats = useMemo(() => {
        const total = chosenRows.length;
        const ok = chosenRows.filter((r) => r._status === "ok").length;
        const warn = chosenRows.filter((r) => r._status === "warn").length;
        const error = chosenRows.filter((r) => r._status === "error").length;
        return { total, ok, warn, error };
    }, [chosenRows]);

    // habilita importar si el conjunto ELEGIDO no tiene errores
    const canImport = useMemo(
        () => chosenRows.length > 0 && chosenStats.error === 0,
        [chosenRows, chosenStats]
    );

    /* ====== celdas / badges ====== */
    const statusBody = (row) => {
        // Compacto para poder achicar la columna (usamos iconos + tooltip)
        const map = {
            ok: { value: "✓", severity: "success", tip: "Sin errores ni advertencias." },
            warn: { value: "⚠", severity: "warning", tip: "Tiene advertencias no bloqueantes." },
            error: { value: "⛔", severity: "danger", tip: "Contiene errores bloqueantes." },
        };
        const m = map[row._status] || map.ok;
        return (
            <Tag
                value={m.value}
                severity={m.severity}
                className="tip-badge"
                data-pr-tooltip={m.tip}
                data-pr-position="top"
                style={{ minWidth: 36, justifyContent: "center" }}
            />
        );
    };
    const msgsBody = (row) => (
        <div style={{ minWidth: 220 }}>
            {row._errors.map((e, i) => (
                <div key={`e-${i}`} style={{ color: "#e53935" }}>• {e}</div>
            ))}
            {row._warns.map((w, i) => (
                <div key={`w-${i}`} style={{ color: "#f57c00" }}>• {w}</div>
            ))}
        </div>
    );

    const proyectosBody = (row) => row.proyectos.join(" - ");

    /* ====== footer ====== */
    const footer = (
        <div className="preimp-footer flex gap-2 justify-content-end w-full">
            <div className="flex align-items-center gap-2 mr-auto">
                <Tag
                    value={`Total: ${stats.total}`}
                    className="preimp-tag tip-badge"
                    data-pr-tooltip="Mostrar todas las filas"
                    onClick={() => setStatusFilter("all")}
                />
                <Tag
                    severity="success"
                    value={`OK: ${stats.ok}`}
                    className="preimp-tag tip-badge"
                    data-pr-tooltip="Filtrar filas correctas (OK)"
                    onClick={() => setStatusFilter("ok")}
                />
                <Tag
                    severity="warning"
                    value={`Alertas: ${stats.warn}`}
                    className="preimp-tag tip-badge"
                    data-pr-tooltip="Filtrar filas con advertencias (no bloquean)"
                    onClick={() => setStatusFilter("warn")}
                />
                <Tag
                    severity="danger"
                    value={`Errores: ${stats.error}`}
                    className="preimp-tag tip-badge"
                    data-pr-tooltip="Filtrar filas con errores (bloquean)"
                    onClick={() => setStatusFilter("error")}
                />
            </div>

            {/* Declarar el Tooltip global */}
            <Tooltip target=".tip-badge" position="top" />


            <div className="flex align-items-center gap-2 mr-3 tip-badge" data-pr-tooltip="Elige si importas toda la hoja actual o sólo lo filtrado en pantalla.">
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
                    void onHide?.();
                }}
            />
            <Button
                label={`Importar (${chosenStats.total})`}
                icon="pi pi-upload"
                disabled={!canImport || importing}
                loading={importing}
                onClick={async () => {
                    try {
                        setImporting(true);
                        const payload = {
                            sheetName: activeSheet,
                            scope: importScope, // 'filtered' | 'all'
                            counts: chosenStats,
                            rows: chosenRows.map((r) => ({
                                documento: r.documento,
                                fullName: r.fullName,
                                nombres: r.nombres,
                                apellidos: r.apellidos,
                                valorNomina: r.valorNomina,
                                cargoNombre: r.cargoNombre,
                                gerenciaNombre: r.gerenciaNombre,
                                ccCodigo: r.ccCodigo,
                                ccNombre: r.ccNombre,
                                tipoReembolsoNombre: r.tipoReembolsoNombre,
                                proyectos: r.proyectos,
                                nota: r.nota,
                            })),
                        };

                        const { data } = await importApi(payload);
                        if (data?.message) void toast?.info?.(data.message);
                        notifyImportSummary(toast, data);
                        clearAll();
                        void onImported?.();
                        void onHide?.();
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

    return (
        <Dialog
            header="Previsualizar Importación de Empleados"
            visible={visible}
            style={{ width: "95vw", maxWidth: 1200 }}
            modal
            onHide={() => {
                clearAll();
                void onHide?.();
            }}
            footer={footer}
        >
            <InlineStyles />
            <Tooltip target=".tip-badge" position="top" />

            <div className="grid preimp-toolbar">
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
                        maxFileSize={10 * 1024 * 1024}
                        uploadHandler={handleSelect}
                    />
                </div>

                {workbook && (
                    <>
                        <div className="col-12 md:col-6">
                            <div className="p-inputgroup">
                                <span className="p-inputgroup-addon">
                                    <i className="pi pi-file"></i>
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
                    </>
                )}

                {reading && (
                    <div className="col-12">
                        <ProgressBar mode="indeterminate" style={{ height: 3 }} />
                    </div>
                )}

                {rows.length > 0 && (
                    <div className="col-12">
                        <DataTable
                            value={filteredRows}
                            dataKey="_rowIndex"
                            paginator rows={20}
                            scrollable scrollHeight="60vh"
                            className="preimp-table p-datatable-sm"
                            showGridlines={false}
                            stripedRows
                            editMode="cell"
                        >
                            {/* ==== FROZEN: todas consecutivas y al inicio ==== */}
                            <Column
                                header="#"
                                body={(r, o) => o.rowIndex + 2}
                                style={{ width: 60 }}
                                frozen
                                alignFrozen="left"
                            />
                            <Column
                                header="Est."
                                body={statusBody}
                                style={{ width: 70, textAlign: "center" }}
                                frozen
                                alignFrozen="left"
                            />
                            <Column
                                field="documento"
                                header="Identificación"
                                style={{ width: 160 }}
                                editor={(opts) => textEditor(opts, "documento")}
                                frozen
                                alignFrozen="left"
                            />
                            <Column
                                field="fullName"
                                header="Nombre Empleado"
                                style={{ width: 240 }}
                                editor={(opts) => textEditor(opts, "fullName")}
                                frozen
                                alignFrozen="left"
                            />

                            {/* ==== NO FROZEN: resto de columnas ==== */}
                            <Column
                                field="valorNomina"
                                header="Valor Nómina"
                                style={{ width: 160 }}
                                editor={(opts) => textEditor(opts, "valorNomina")}
                            />
                            <Column
                                field="cargoNombre"
                                header="Cargo"
                                style={{ width: 200 }}
                                editor={(opts) => textEditor(opts, "cargoNombre")}
                            />
                            <Column
                                field="gerenciaNombre"
                                header="Gerencia"
                                style={{ width: 200 }}
                                editor={(opts) => textEditor(opts, "gerenciaNombre")}
                            />
                            <Column
                                field="ccCodigo"
                                header="C.Costo Cod"
                                style={{ width: 130 }}
                                editor={(opts) => textEditor(opts, "ccCodigo")}
                            />
                            <Column
                                field="ccNombre"
                                header="C.Costo Nombre"
                                style={{ width: 220 }}
                                editor={(opts) => textEditor(opts, "ccNombre")}
                            />
                            <Column
                                field="tipoReembolsoNombre"
                                header="Tipo de Reembolso"
                                style={{ width: 200 }}
                                editor={(opts) => textEditor(opts, "tipoReembolsoNombre")}
                            />
                            <Column
                                field="proyectos"
                                header="Proyecto a Reembolsar"
                                body={proyectosBody}
                                style={{ width: 280 }}
                                editor={(opts) => textEditor(opts, "proyectos")}
                            />
                            <Column
                                field="nota"
                                header="Nota"
                                style={{ width: 220 }}
                                editor={(opts) => textEditor(opts, "nota")}
                            />

                            {/* Mensajes al final para no romper el bloque frozen */}
                            <Column
                                header="Mensajes"
                                body={msgsBody}
                                style={{ width: 300 }}
                            />
                        </DataTable>
                    </div>
                )}
            </div>
        </Dialog>
    );
};

export default PreImportEmpleados;
