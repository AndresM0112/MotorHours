import React, { useEffect, useMemo, useState, useCallback, useContext } from "react";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { ProgressBar } from "primereact/progressbar";
import { InputNumber } from "primereact/inputnumber";
import { Button } from "primereact/button";
import { ColumnGroup } from "primereact/columngroup";
import { Row } from "primereact/row";
import { getPayrollMatrixAPI, upsertPayrollBudgetAPI } from "@api/requests/payrollApi";
import { rowClassNew } from "@utils/converAndConst";
import { AuthContext } from "@context/auth/AuthContext";
import { ToastContainer } from "react-toastify";
import { ToastContext } from "@context/toast/ToastContext";
import useHandleApiError from "@hook/useHandleApiError";

const moneyFmt = new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
});
const pctFmt = (n) => `${Number(n || 0).toFixed(2)} %`;

const W = { proyecto: 260, tipo: 280, totalFila: 160 };
const FULL_blo_id = 10;

function recomputeBagAndExcess(draftRows, tiposList) {
    if (!tiposList?.length || !draftRows?.length) return { rows: draftRows, excesoPorTipo: {} };
    const bagIdx = draftRows.findIndex((r) => r.proId === FULL_blo_id);
    if (bagIdx === -1) return { rows: draftRows, excesoPorTipo: {} };

    const bagRow = { ...draftRows[bagIdx], cells: { ...draftRows[bagIdx].cells } };
    const exceso = {};

    for (const tp of tiposList) {
        const tipoId = tp.id;
        const totalTipo = Number(tp.totalNeto || 0);
        let sumaOtros = 0;
        for (let i = 0; i < draftRows.length; i++) {
            if (i === bagIdx) continue;
            sumaOtros += Number(draftRows[i].cells?.[tipoId] || 0);
        }
        const rem = totalTipo - sumaOtros;
        if (rem >= 0) {
            bagRow.cells[tipoId] = rem;
            exceso[tipoId] = 0;
        } else {
            bagRow.cells[tipoId] = 0;
            exceso[tipoId] = Math.abs(rem);
        }
    }

    const newRows = draftRows.slice();
    newRows[bagIdx] = bagRow;
    return { rows: newRows, excesoPorTipo: exceso };
}

export default function Presupuesto({ nomId }) {
    const { idusuario } = useContext(AuthContext);
    const { showSuccess } = useContext(ToastContext);
    const handleApiError = useHandleApiError();

    const [loading, setLoading] = useState(true);
    const [tipos, setTipos] = useState([]);
    const [rows, setRows] = useState([]);
    const [totalNomina, setTotalNomina] = useState(0);
    const [excesoPorTipo, setExcesoPorTipo] = useState({});

    // ===== Carga
    useEffect(() => {
        if (!nomId) return;
        let cancelled = false;

        (async () => {
            setLoading(true);
            try {
                const { data } = await getPayrollMatrixAPI(nomId);

                const columnsRaw = Array.isArray(data?.columns) ? data.columns : [];
                const rowsRaw = Array.isArray(data?.rows) ? data.rows : [];
                const total = Number(data?.totals?.totalNomina || 0);

                const tiposNorm = columnsRaw.map((c) => ({
                    id: Number(c.tirId),
                    nombre: c.nombre,
                    totalNeto: Number(c.totalNeto || 0),
                    disabled: Boolean(c.disabled),
                }));

                let rowsNorm = rowsRaw.map((p) => {
                    const cells = {};
                    tiposNorm.forEach((tp) => (cells[tp.id] = Number(p?.cells?.[tp.id] || 0)));
                    return {
                        proId: Number(p.proId),
                        proNombre: p.nombre,
                        color: p.color ?? null,
                        cells,
                        cellMeta: p.cellMeta || {},
                        disabled: Boolean(p.disabled),
                    };
                });

                const { rows: balanced, excesoPorTipo: ex } = recomputeBagAndExcess(rowsNorm, tiposNorm);
                if (!cancelled) {
                    setTipos(tiposNorm);
                    setRows(balanced);
                    setExcesoPorTipo(ex);
                    setTotalNomina(total);
                }
            } catch (e) {
                if (!cancelled) console.error(e);
                handleApiError(e)
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [nomId]);

    // ===== Columnas
    const columnModel = useMemo(
        () => [
            { key: "proyecto", header: "Proyecto", width: W.proyecto },
            ...tipos.map((tp) => ({ key: `tipo-${tp.id}`, header: tp.nombre, width: W.tipo, tipoId: tp.id })),
            { key: "totalFila", header: "Total fila", width: W.totalFila },
        ],
        [tipos]
    );

    const dataTableKey = useMemo(() => `dt-${tipos.map((t) => t.id).join("_")}`, [tipos]);

    // ===== Helpers
    const totalFilaCalc = useCallback(
        (r) => Object.values(r?.cells || {}).reduce((acc, v) => acc + Number(v || 0), 0),
        []
    );

    // ===== Edición
    const setValor = useCallback(
        (proId, tipoId, newVal) => {
            const col = tipos.find((t) => t.id === tipoId);
            const base = Number(col?.totalNeto || 0);
            if (base <= 0) return;

            setRows((prev) => {
                const draft = prev.map((r) => ({ ...r, cells: { ...r.cells } }));
                const idx = draft.findIndex((r) => r.proId === proId);
                if (idx === -1) return prev;
                const val = Math.max(0, Number(newVal || 0));
                draft[idx].cells[tipoId] = val;

                const { rows: balanced, excesoPorTipo: ex } = recomputeBagAndExcess(draft, tipos);
                setExcesoPorTipo(ex);
                return balanced;
            });
        },
        [tipos]
    );

    const setPorcentaje = useCallback(
        (proId, tipoId, pct) => {
            const col = tipos.find((x) => x.id === tipoId);
            const base = Number(col?.totalNeto || 0);
            if (base <= 0) return;
            const value = (Number(pct || 0) * base) / 100;
            setValor(proId, tipoId, value);
        },
        [tipos, setValor]
    );

    // ===== Renderers
    const proyectoRenderer = useCallback(
        (r) => <div style={{ padding: "2px 0" }}>{r.proNombre}</div>,
        []
    );

    const totalFilaRenderer = useCallback(
        (r) => <div style={{ textAlign: "right", fontWeight: 700 }}>{moneyFmt.format(totalFilaCalc(r))}</div>,
        [totalFilaCalc]
    );

    const commonInputProps = {
        inputClassName: "cell-input",
        inputStyle: { width: "100%", textAlign: "right", fontWeight: 700, color: "#111827", border: 0 },
        onFocus: (e) => e?.target?.select?.(),
    };

    const cellRenderer = useCallback(
        (c) => (r) => {
            const valor = Number(r?.cells?.[c.tipoId] || 0);
            const col = tipos.find((t) => t.id === c.tipoId);
            const totalCol = Number(col?.totalNeto || 0);
            const pct = totalCol > 0 ? (valor * 100) / totalCol : 0;

            const isBag = r.proId === FULL_blo_id;
            const editable = !isBag && !r.disabled;
            const hayExcesoCol = Number(excesoPorTipo[c.tipoId] || 0) > 0;
            const disabledCol = totalCol <= 0 || col?.disabled;

            if (!editable) {
                return (
                    <div style={{ textAlign: "right", lineHeight: 1.15 }}>
                        <span style={{ display: "block", fontWeight: 700, color: hayExcesoCol ? "#dc2626" : undefined }}>
                            {moneyFmt.format(valor)}
                        </span>
                        <small style={{ color: hayExcesoCol ? "#dc2626" : "#6b7280" }}>
                            {pctFmt(pct)}
                            {hayExcesoCol ? " (exceso)" : ""}
                        </small>
                    </div>
                );
            }

            return (
                <div style={{ textAlign: "right", lineHeight: 1.05, opacity: disabledCol ? 0.5 : 1 }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 110px", gap: 8 }}>
                        <InputNumber
                            value={valor}
                            onValueChange={(e) => setValor(r.proId, c.tipoId, e.value)}
                            mode="currency"
                            currency="COP"
                            locale="es-CO"
                            min={0}
                            disabled={disabledCol}
                            {...commonInputProps}
                        />
                        <InputNumber
                            value={pct}
                            onValueChange={(e) => setPorcentaje(r.proId, c.tipoId, e.value)}
                            mode="decimal"
                            minFractionDigits={2}
                            maxFractionDigits={2}
                            suffix=" %"
                            min={0}
                            disabled={disabledCol}
                            {...commonInputProps}
                        />
                    </div>
                    <small style={{ color: hayExcesoCol ? "#dc2626" : "#6b7280" }}>
                        {pctFmt(pct)}
                        {hayExcesoCol ? " (exceso)" : ""}
                        {disabledCol ? " · sin base" : ""}
                    </small>
                </div>
            );
        },
        [tipos, excesoPorTipo, setValor, setPorcentaje]
    );

    // ===== Footer
    const footerColumnGroup = useMemo(() => {
        const sumTipo = (tipoId) => rows.reduce((acc, r) => acc + Number(r.cells?.[tipoId] || 0), 0);

        const firstFooter = (
            <Column footer={<div style={{ fontWeight: 700, textAlign: "left" }}>Totales</div>} style={{ width: W.proyecto }} />
        );

        const tipoFooters = tipos.map((tp) => {
            const totalTipo = Number(tp.totalNeto || 0);
            const sumaCol = sumTipo(tp.id);
            const hayExceso = Number(excesoPorTipo[tp.id] || 0) > 0;
            const desalineado = Math.round(sumaCol) !== Math.round(totalTipo);

            const node = (
                <div
                    title={
                        desalineado
                            ? `Suma filas: ${moneyFmt.format(sumaCol)} | Total nómina: ${moneyFmt.format(totalTipo)}`
                            : "Total por tipo"
                    }
                    style={{
                        textAlign: "right",
                        fontWeight: 700,
                        lineHeight: 1.15,
                        color: hayExceso ? "#dc2626" : desalineado ? "#6b7280" : undefined,
                    }}
                >
                    <div>{moneyFmt.format(totalTipo)}</div>
                    <small style={{ color: hayExceso ? "#dc2626" : "#6b7280" }}>
                        {hayExceso ? `exceso: ${moneyFmt.format(excesoPorTipo[tp.id])}` : "100.00 %"}
                    </small>
                </div>
            );

            return <Column key={`f-${tp.id}`} footer={node} style={{ width: W.tipo }} />;
        });

        const totalFinal = moneyFmt.format(
            rows.reduce(
                (acc, r) => acc + Object.values(r.cells || {}).reduce((a, v) => a + Number(v || 0), 0),
                0
            )
        );

        const lastFooter = (
            <Column footer={<div style={{ textAlign: "right", fontWeight: 700 }}>{totalFinal}</div>} style={{ width: W.totalFila }} />
        );

        return (
            <ColumnGroup>
                <Row>
                    {firstFooter}
                    {tipoFooters}
                    {lastFooter}
                </Row>
            </ColumnGroup>
        );
    }, [tipos, rows, excesoPorTipo]);

    // ===== Guardar
    const hayExcesoGlobal = useMemo(
        () => Object.values(excesoPorTipo).some((n) => Number(n) > 0),
        [excesoPorTipo]
    );
    const round = (n, d = 2) => Number(Math.round((Number(n) || 0) * 10 ** d) / 10 ** d);

    const handleGuardar = useCallback(async () => {

        const items = [];
        for (const r of rows) {
            for (const tp of tipos) {
                const tirId = tp.id;
                const base = Number(tp.totalNeto || 0);
                const valor = Number(r?.cells?.[tirId] || 0);
                const porcentaje = base > 0 ? (valor * 100) / base : 0;

                items.push({
                    preId: r?.cellMeta?.[tirId]?.preId ?? null,
                    nomId,
                    proId: r.proId,
                    tirId,
                    valor: round(valor, 2),
                    porcentaje: round(porcentaje, 6),
                });
            }
        }

        const totalesPorTipo = {};
        for (const tp of tipos) {
            const tirId = tp.id;
            const baseNomina = Number(tp.totalNeto || 0);
            const distribuido = rows.reduce((acc, r) => acc + Number(r?.cells?.[tirId] || 0), 0);
            const porcentaje = baseNomina > 0 ? (distribuido * 100) / baseNomina : 0;
            totalesPorTipo[tirId] = {
                tirId,
                baseNomina: round(baseNomina, 2),
                distribuido: round(distribuido, 2),
                porcentaje: round(porcentaje, 6),
            };
        }

        const sumaBases = tipos.reduce((acc, t) => acc + Number(t.totalNeto || 0), 0);
        const sumaDistribuida = items.reduce((acc, it) => acc + it.valor, 0);
        const global = {
            baseNominaTotal: round(sumaBases, 2),
            distribuidoTotal: round(sumaDistribuida, 2),
            diferencia: round(sumaDistribuida - sumaBases, 2),
        };

        const payload = {
            nomId,
            items,
            totales: { porTipo: totalesPorTipo, global },
            idusuario
        };
        try {

            // console.log("[PRESUPUESTO] Guardar payload →", payload);
            const { data } = await upsertPayrollBudgetAPI(payload);
            showSuccess(data.message)
        } catch (error) {
            handleApiError(error)
        }



    }, [rows, tipos, nomId]);

    return (
        <>
            <style>{`
        .matrix-header { display:flex; align-items:center; justify-content:space-between; gap:12px; margin-bottom:8px; }
        .chip { background:#eef2ff; color:#3730a3; border-radius:20px; padding:6px 10px; font-weight:600; }
        .matrix-table .p-datatable-table { table-layout: fixed; } /* alinea columnas/footers */

      `}</style>

            <div className="matrix-header">
                <h5 style={{ margin: 0 }}>Distribución por proyecto y tipo de reembolso</h5>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <div className="chip">Total nómina: {moneyFmt.format(totalNomina)}</div>
                    <Button label="Guardar" icon="pi pi-save" disabled={loading || hayExcesoGlobal} onClick={handleGuardar} />
                </div>
            </div>

            {loading && <ProgressBar mode="indeterminate" style={{ height: 4, marginBottom: 8 }} />}

            <DataTable
                key={dataTableKey}
                value={rows}
                dataKey="proId"
                scrollable
                scrollHeight="65vh"
                showGridlines
                stripedRows
                className="p-datatable-sm matrix-table"
                emptyMessage={loading ? "Cargando..." : "Sin datos"}
                rowClassName={(rowData) => rowClassNew(rowData, 0.9)}
                footerColumnGroup={footerColumnGroup}
            >
                {columnModel.map((c) => {
                    if (c.key === "proyecto") {
                        return (
                            <Column key={c.key} header={c.header} body={proyectoRenderer} style={{ maxWidth: c.width }} frozen />
                        );
                    }
                    if (c.key === "totalFila") {
                        return (
                            <Column key={c.key} header={c.header} body={totalFilaRenderer} style={{ maxWidth: c.width, textAlign: "right" }} />
                        );
                    }
                    return <Column key={c.key} header={c.header} body={cellRenderer(c)} style={{ maxWidth: c.width }} />;
                })}
            </DataTable>
        </>
    );
}
