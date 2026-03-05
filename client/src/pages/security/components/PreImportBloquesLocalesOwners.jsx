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

/* ============================ helpers ============================ */
const truncate = (s, max = 140) => (!s ? "" : String(s).length > max ? String(s).slice(0, max - 1) + "…" : String(s));
const clean = (s) =>
    (s ?? "")
        .toString()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/\s+/g, " ")
        .trim()
        .toUpperCase();

const pick = (row, ...keys) => {
    for (const k of keys) if (row[k] !== undefined && row[k] !== null) return row[k];
    return null;
};
const toNullIfEmpty = (v) => {
    if (v === undefined || v === null) return null;
    const t = String(v).trim();
    return t.length ? t : null;
};

export function notifyImportSummaryBlocks(toast, raw) {
    const s = raw?.summary ?? raw ?? {};
    const sheet = s.sheetName ? `“${s.sheetName}”` : "Importación";
    const scope = s.scope ? ` (${s.scope})` : "";

    const infoParts = [
        `Procesados: ${s.procesados ?? 0}`,
        `Bloques +: ${s.bloques_creados ?? 0}`,
        `Bloques ~: ${s.bloques_actualizados ?? 0}`,
        `Locales +: ${s.locales_creados ?? 0}`,
        `Locales ~: ${s.locales_actualizados ?? 0}`,
    ];

    if (s.owners_upsert) infoParts.push(`Propietarios upsert: ${s.owners_upsert}`);
    if (s.owners_inactivos) infoParts.push(`Propietarios inact.: ${s.owners_inactivos}`);
    if (s.saltados) infoParts.push(`Saltados: ${s.saltados}`);

    const info = infoParts.join(" · ");
    const erroresArr = Array.isArray(s.errores) ? s.errores : [];
    const erroresN = erroresArr.length;
    const ok =
        (s.bloques_creados ?? 0) +
        (s.bloques_actualizados ?? 0) +
        (s.locales_creados ?? 0) +
        (s.locales_actualizados ?? 0);

    const previewErrores = (limit = 5) => {
        if (!erroresN) return "";
        const top = erroresArr
            .slice(0, limit)
            .map((e) => {
                const fila = e?.fila != null ? `#${e.fila}` : "#?";
                return `• ${fila}: ${truncate(e?.error || "Error")}`;
            })
            .join("\n");
        const more = erroresN > limit ? `\n… y ${erroresN - limit} más.` : "";
        return `\n\nErrores (${erroresN}):\n${top}${more}`;
    };

    const header = `${sheet}${scope}`;
    if (erroresN === 0) {
        void toast?.success?.(`${header} completada.\n${info}`);
    } else if (ok > 0) {
        void toast?.warn?.(`${header} completada con errores.\n${info}${previewErrores(3)}`);
    } else {
        void toast?.error?.(`${header} fallida.\n${info}${previewErrores(5)}`);
    }
}

/* ========= estilos mínimos ========= */
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
      background: #fcfcfc;
    }
    .preimp-toolbar .p-inputgroup-addon {
      background: #f6f7f9;
      border: 1px solid #e5e7eb;
    }
    .preimp-tag { margin-right: 8px; cursor: pointer; }
    .tip-badge { cursor: help; }
    .preimp-footer { padding-top: .5rem; }
  `}</style>
);

/* ============== mapeo de encabezados esperados (variantes) ============== */
const HEADERS = {
    bloNombre: ["Bloque", "BLOQUE", "Nombre Bloque", "blo_nombre", "BLO_NOMBRE"],
    locNombre: ["Local", "LOCAL", "Nombre Local", "loc_nombre", "LOC_NOMBRE"],
    descripcion: ["DIRECCION", "Dirección", "Descripcion", "Descripción", "descripcion"],

    bloCodigo: ["Codigo bloque", "CÓDIGO BLOQUE", "CODIGO BLOQUE", "Bloque Cod", "blo_codigo", "BLO_CODIGO"],
    locCodigo: ["Codigo Local", "CÓDIGO LOCAL", "CODIGO LOCAL", "Local Cod", "loc_codigo", "LOC_CODIGO"],
};

function ownerHeaderVariants(i) {
  const base = {
    nombre:   [`PROPIETARIO${i}`, `Propietario ${i}`, `PROPIETARIO ${i}`, `Owner ${i}`],
    documento:[`Documento propietario ${i}`, `Documento Propietario ${i}`, `DOC ${i}`, `NIT ${i}`, `NIT${i}`],
    correo:   [`Correo propietario ${i}`, `Correo Propietario ${i}`, `EMAIL ${i}`, `Email ${i}`],
    telefono: [`Telefono propietario ${i}`, `Teléfono propietario ${i}`, `TEL ${i}`, `Telefono ${i}`],
    direccion:[`Direccion propietario ${i}`, `Dirección propietario ${i}`, `DIR ${i}`, `Direccion ${i}`],
  };

  // 👇 si es el primero, acepta también la columna genérica “telefono”
  if (i === 1) {
    base.telefono = [
      ...base.telefono,
      'telefono','Telefono','Teléfono','TEL','Tel','tel'
    ];
  }
  return base;
}

function buildHeaderMap(headers) {
    const map = {};
    const cleaned = headers.map((h) => clean(h));
    const resolveOne = (variants) => {
        for (const candidate of variants) {
            const idx = cleaned.indexOf(clean(candidate));
            if (idx !== -1) return headers[idx];
        }
        return null;
    };

    // básicos
    Object.entries(HEADERS).forEach(([key, variants]) => {
        map[key] = resolveOne(variants);
    });

    // propietarios 1..5
    map.owners = [];
    for (let i = 1; i <= 5; i++) {
        const v = ownerHeaderVariants(i);
        map.owners.push({
            nombre: resolveOne(v.nombre),
            documento: resolveOne(v.documento),
            correo: resolveOne(v.correo),
            telefono: resolveOne(v.telefono),
            direccion: resolveOne(v.direccion),
        });
    }
    return map;
}

/* ============== normalización/validación ============== */
function normalizeRow(row, headerMap) {
    const bloNombre = pick(row, headerMap.bloNombre);
    const locNombre = pick(row, headerMap.locNombre);
    const descripcion = pick(row, headerMap.descripcion);
    const bloCodigo = pick(row, headerMap.bloCodigo);
    const locCodigo = pick(row, headerMap.locCodigo);

    const owners = [];
    for (let i = 0; i < (headerMap.owners?.length || 0); i++) {
        const om = headerMap.owners[i];
        const ow = {
            nombre: toNullIfEmpty(pick(row, om.nombre)),
            documento: toNullIfEmpty(pick(row, om.documento)),
            correo: toNullIfEmpty(pick(row, om.correo)),
            telefono: toNullIfEmpty(pick(row, om.telefono)),
            direccion: toNullIfEmpty(pick(row, om.direccion)),
        };
        const hasAny = Object.values(ow).some((v) => v);
        if (hasAny) owners.push(ow);
        else owners.push({ nombre: null, documento: null, correo: null, telefono: null, direccion: null }); // para index estable
    }

    return {
        raw: row,
        bloNombre: (bloNombre ?? "").toString().trim(),
        locNombre: (locNombre ?? "").toString().trim(),
        descripcion: toNullIfEmpty(descripcion),
        bloCodigo: toNullIfEmpty(bloCodigo),
        locCodigo: toNullIfEmpty(locCodigo),
        owners,
    };
}

function validateRows(normRows) {
    return normRows.map((r, i, arr) => {
        const errors = [];
        const warns = [];

        if (!r.bloNombre) errors.push("Bloque es obligatorio.");
        if (!r.locNombre) errors.push("Local es obligatorio.");

        // Duplicado por (Bloque+Local) en el archivo
        if (r.bloNombre && r.locNombre) {
            const firstIdx = arr.findIndex((x) => x.bloNombre === r.bloNombre && x.locNombre === r.locNombre);
            if (firstIdx !== i) errors.push(`Bloque/Local duplicado (ya aparece en fila ${firstIdx + 2}).`);
        }

        // Validaciones de propietarios (no bloqueantes)
        r.owners.forEach((o, idx) => {
            if (o?.correo && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(o.correo)) {
                warns.push(`Propietario ${idx + 1}: correo inválido (${o.correo}).`);
            }
        });

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
    for (let c = 1; c <= colCount; c++) headers.push((headerRow.getCell(c).text || "").trim());

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

/* ============================ componente ============================ */
const PreImportBloquesLocalesOwners = ({
    visible,
    onHide,
    onImported,     // callback tras importar
    importApi,      // (payload) => Promise  -> endpoint unificado
    toast,          // { success, error, warn, info }
}) => {
    const fileRef = useRef(null);

    // archivo/hojas
    const [uploaderKey, setUploaderKey] = useState(0);
    const [workbook, setWorkbook] = useState(null);
    const [sheetOptions, setSheetOptions] = useState([]);
    const [activeSheet, setActiveSheet] = useState(null);

    // tabla / filtros
    const [reading, setReading] = useState(false);
    const [rows, setRows] = useState([]);
    const [statusFilter, setStatusFilter] = useState("all"); // all|ok|warn|error
    const [globalQuery, setGlobalQuery] = useState("");

    // alcance
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
            if (!headerMap.bloNombre || !headerMap.locNombre) {
                void toast?.error?.("La hoja debe tener, al menos, las columnas Bloque y Local.");
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
        r[field] = (newValue ?? "").toString().trim();
        if (["bloCodigo", "locCodigo", "descripcion"].includes(field)) {
            r[field] = toNullIfEmpty(newValue);
        }
        revalidateRow(rowIndex, r);
    };

    // === helper para leer propietarios con fallback '—'
    const ownerCell = (row, idx, key) => {
        const i = Number(idx) - 1;
        const v = row?.owners?.[i]?.[key];
        return v == null || v === "" ? "—" : String(v);
    };

    const onOwnerCellEdit = (rowIndex, ownerIndex, key, value) => {
        const r = { ...rows[rowIndex] };
        const owners = [...(r.owners || [])];
        const o = { ...(owners[ownerIndex] || {}) };
        o[key] = key === "nombre" ? (value ?? "").toString().trim() : toNullIfEmpty(value);
        owners[ownerIndex] = o;
        r.owners = owners;
        revalidateRow(rowIndex, r);
    };

    const textEditor = (options, field) => (
        <InputText
            value={options.value ?? ""}
            onChange={(e) => options.editorCallback(e.target.value)}
            onBlur={() => onCellEditComplete({ rowIndex: options.rowIndex, newValue: options.value }, field)}
        />
    );

    const ownerEditor = (options, ownerIndex, key) => (
        <InputText
            value={options.value ?? ""}
            onChange={(e) => options.editorCallback(e.target.value)}
            onBlur={() => onOwnerCellEdit(options.rowIndex, ownerIndex, key, options.value)}
        />
    );

    /* ====== filtrado + búsqueda global ====== */
    const filteredRows = useMemo(() => {
        let list = [...rows];
        if (statusFilter !== "all") list = list.filter((r) => r._status === statusFilter);
        if (globalQuery.trim()) {
            const q = globalQuery.toLowerCase();
            list = list.filter((r) =>
                [
                    r.bloNombre,
                    r.locNombre,
                    r.bloCodigo,
                    r.locCodigo,
                    r.descripcion,
                    ...(r.owners || []).flatMap((o) => [o?.documento, o?.nombre, o?.correo]).filter(Boolean),
                ]
                    .join(" | ")
                    .toLowerCase()
                    .includes(q)
            );
        }
        return list;
    }, [rows, statusFilter, globalQuery]);

    const chosenRows = useMemo(() => (importScope === "filtered" ? filteredRows : rows), [importScope, filteredRows, rows]);

    const chosenStats = useMemo(() => {
        const total = chosenRows.length;
        const ok = chosenRows.filter((r) => r._status === "ok").length;
        const warn = chosenRows.filter((r) => r._status === "warn").length;
        const error = chosenRows.filter((r) => r._status === "error").length;
        return { total, ok, warn, error };
    }, [chosenRows]);

    const canImport = useMemo(() => chosenRows.length > 0 && chosenStats.error === 0, [chosenRows, chosenStats]);

    /* ====== celdas / badges ====== */
    const statusBody = (row) => {
        const map = {
            ok: { value: "✓", severity: "success", tip: "Sin errores." },
            warn: { value: "⚠", severity: "warning", tip: "Tiene advertencias." },
            error: { value: "⛔", severity: "danger", tip: "Contiene errores." },
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

    const ownerFieldBody = (row, idx, key) => row?.owners?.[idx]?.[key] || <span style={{ opacity: 0.6 }}>—</span>;

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
                    data-pr-tooltip="Filtrar filas con advertencias"
                    onClick={() => setStatusFilter("warn")}
                />
                <Tag
                    severity="danger"
                    value={`Errores: ${stats.error}`}
                    className="preimp-tag tip-badge"
                    data-pr-tooltip="Filtrar filas con errores"
                    onClick={() => setStatusFilter("error")}
                />
            </div>

            <Tooltip target=".tip-badge" position="top" />

            <div
                className="flex align-items-center gap-2 mr-3 tip-badge"
                data-pr-tooltip="Elige si importas toda la hoja actual o sólo lo filtrado en pantalla."
            >
                <SelectButton value={importScope} options={scopeOptions} onChange={(e) => setImportScope(e.value)} />
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
                // disabled={!canImport || importing}
                loading={importing}
                onClick={async () => {
                    try {
                        setImporting(true);
                        const payload = {
                            sheetName: activeSheet,
                            scope: importScope,
                            counts: chosenStats,
                            rows: chosenRows.map((r) => ({
                                bloCodigo: r.bloCodigo,
                                locCodigo: r.locCodigo,
                                bloNombre: r.bloNombre,
                                locNombre: r.locNombre,
                                descripcion: r.descripcion,
                                owners: (r.owners || []).map((o) => ({
                                    nombre: o?.nombre ?? null,
                                    documento: o?.documento ?? null,
                                    correo: o?.correo ?? null,
                                    telefono: o?.telefono ?? null,
                                    direccion: o?.direccion ?? null,
                                })),
                            })),
                        };

                        const { data } = await importApi(payload);
                        if (data?.message) void toast?.info?.(data.message);
                        notifyImportSummaryBlocks(toast, data);
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
            header="Previsualizar Importación de Bloques, Locales y Propietarios"
            visible={visible}
            style={{ width: "95vw", maxWidth: 1400 }}
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
                        maxFileSize={12 * 1024 * 1024}
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
                            paginator
                            rows={20}
                            scrollable
                            scrollHeight="60vh"
                            scrollDirection="both"
                            className="preimp-table p-datatable-sm"
                            stripedRows
                            editMode="cell"
                            tableStyle={{ minWidth: "2400px" }}  // ancho mínimo para que quepan los headers
                        >
                            {/* ==== FROZEN (siempre visibles a la izquierda) ==== */}
                            <Column header="#" body={(r, o) => o.rowIndex + 2} style={{ width: 70 }} frozen alignFrozen="left" />
                            <Column header="Est." body={statusBody} style={{ width: 70, textAlign: "center" }} frozen alignFrozen="left" />
                            <Column
                                field="bloNombre"
                                header="Bloque"
                                style={{ width: 180, whiteSpace: "nowrap" }}
                                editor={(opts) => textEditor(opts, "bloNombre")}
                                frozen
                                alignFrozen="left"
                            />
                            <Column
                                field="locNombre"
                                header="Local"
                                style={{ width: 180, whiteSpace: "nowrap" }}
                                editor={(opts) => textEditor(opts, "locNombre")}
                                frozen
                                alignFrozen="left"
                            />

                            {/* ==== NO FROZEN (scroll horizontal) ==== */}
                            <Column field="bloCodigo" header="Cód. Bloque" style={{ width: 120 }} editor={(opts) => textEditor(opts, "bloCodigo")} />
                            <Column field="locCodigo" header="Cód. Local" style={{ width: 120 }} editor={(opts) => textEditor(opts, "locCodigo")} />
                            <Column field="descripcion" header="Dirección / Descripción" style={{ width: 260 }} editor={(opts) => textEditor(opts, "descripcion")} />

                            {/* ==== Propietario 1 ==== */}
                            <Column header="Doc. Propietario 1" style={{ width: 160 }} body={(r) => ownerCell(r, 1, "documento")} />
                            <Column header="Propietario 1" style={{ width: 220 }} body={(r) => ownerCell(r, 1, "nombre")} />
                            <Column header="Correo propietario 1" style={{ width: 240 }} body={(r) => ownerCell(r, 1, "correo")} />
                            <Column header="Teléfono 1" style={{ width: 140 }} body={(r) => ownerCell(r, 1, "telefono")} />

                            {/* ==== Propietario 2 ==== */}
                            <Column header="Doc. Propietario 2" style={{ width: 160 }} body={(r) => ownerCell(r, 2, "documento")} />
                            <Column header="Propietario 2" style={{ width: 220 }} body={(r) => ownerCell(r, 2, "nombre")} />
                            <Column header="Correo propietario 2" style={{ width: 240 }} body={(r) => ownerCell(r, 2, "correo")} />
                            <Column header="Teléfono 2" style={{ width: 140 }} body={(r) => ownerCell(r, 2, "telefono")} />

                            {/* ==== Propietario 3 ==== */}
                            <Column header="Doc. Propietario 3" style={{ width: 160 }} body={(r) => ownerCell(r, 3, "documento")} />
                            <Column header="Propietario 3" style={{ width: 220 }} body={(r) => ownerCell(r, 3, "nombre")} />
                            <Column header="Correo propietario 3" style={{ width: 240 }} body={(r) => ownerCell(r, 3, "correo")} />
                            <Column header="Teléfono 3" style={{ width: 140 }} body={(r) => ownerCell(r, 3, "telefono")} />

                            {/* ==== Propietario 4 ==== */}
                            <Column header="Doc. Propietario 4" style={{ width: 160 }} body={(r) => ownerCell(r, 4, "documento")} />
                            <Column header="Propietario 4" style={{ width: 220 }} body={(r) => ownerCell(r, 4, "nombre")} />
                            <Column header="Correo propietario 4" style={{ width: 240 }} body={(r) => ownerCell(r, 4, "correo")} />
                            <Column header="Teléfono 4" style={{ width: 140 }} body={(r) => ownerCell(r, 4, "telefono")} />

                            {/* ==== Propietario 5 ==== */}
                            <Column header="Doc. Propietario 5" style={{ width: 160 }} body={(r) => ownerCell(r, 5, "documento")} />
                            <Column header="Propietario 5" style={{ width: 220 }} body={(r) => ownerCell(r, 5, "nombre")} />
                            <Column header="Correo propietario 5" style={{ width: 240 }} body={(r) => ownerCell(r, 5, "correo")} />
                            <Column header="Teléfono 5" style={{ width: 140 }} body={(r) => ownerCell(r, 5, "telefono")} />

                            <Column header="Mensajes" body={msgsBody} style={{ width: 320 }} />
                        </DataTable>

                    </div>
                )}
            </div>
        </Dialog>
    );
};

export default PreImportBloquesLocalesOwners;
