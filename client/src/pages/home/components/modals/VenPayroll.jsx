import React, {
    forwardRef,
    useImperativeHandle,
    useState,
    useEffect,
    useCallback,
    useMemo,
} from "react";
import { Dialog } from "primereact/dialog";
import { TabView, TabPanel } from "primereact/tabview";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { ColumnGroup } from "primereact/columngroup";
import { Row } from "primereact/row";

import useHandleApiError from "@hook/useHandleApiError";
import {
    getPayrollHeaderAPI,
    paginatePayrollDetailAPI,
    paginatePayrollBudgetAPI,
    getPayrollEmployeeReportAPI,
} from "@api/requests/payrollApi";
import EmployeeReportVGrid from "./EmployeeReportVGrid";
import Presupuesto from "./Presupuesto";
import EmployeeView from "./EmployeeView";

const commonTableProps = {
    className: "venpay-table p-datatable-sm",
    stripedRows: true,
    showGridlines: false,
    rowHover: true,
    responsiveLayout: "scroll",
};

const moneyFmt = new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
});

const VenPayroll = forwardRef((_, ref) => {
    const handleApiError = useHandleApiError();

    // UI
    const [visible, setVisible] = useState(false);
    const [activeIndex, setActiveIndex] = useState(0);
    const [loading, setLoading] = useState({
        header: false,
        detail: false,
        budget: false,
        report: false,
    });

    // Nómina (solo lectura)
    const [nomId, setNomId] = useState(null);
    const [header, setHeader] = useState(null);

    // Detalle
    const [detailRows, setDetailRows] = useState([]);
    const [detailTotal, setDetailTotal] = useState(0);
    const [detailPage, setDetailPage] = useState({ first: 0, rows: 20 });

    // Presupuesto
    const [budgetRows, setBudgetRows] = useState([]);
    const [budgetTotal, setBudgetTotal] = useState(0);
    const [budgetPage, setBudgetPage] = useState({ first: 0, rows: 20 });

    // Reporte por empleado (SP)
    const [rptCols, setRptCols] = useState([]); // ['empNit','empNombre',...,'TOTAL','CALLE FLORA (12.23%)', ...]
    const [rptRows, setRptRows] = useState([]);

    const money = (v) =>
        Number.isFinite(Number(v)) ? moneyFmt.format(Number(v)) : "-";
    const dateBody = (v) => (v ? new Date(v).toLocaleString("es-CO") : "-");
    const numberBody = (v) =>
        v !== null && v !== undefined ? Number(v).toLocaleString("es-CO") : "-";

    /* ===================== FETCH ===================== */
    const fetchHeader = useCallback(
        async (id) => {
            setLoading((s) => ({ ...s, header: true }));
            try {
                const { data } = await getPayrollHeaderAPI({ nomId: id });
                setHeader(data?.item || data || null);
            } catch (e) {
                handleApiError(e);
            } finally {
                setLoading((s) => ({ ...s, header: false }));
            }
        },
        [handleApiError]
    );

    // Cargar DETALLE
    useEffect(() => {
        let mounted = true;
        (async () => {
            if (!nomId) return;
            setLoading((s) => ({ ...s, detail: true }));
            try {
                const { data } = await paginatePayrollDetailAPI({
                    nomId,
                    first: detailPage.first,
                    rows: detailPage.rows,
                });
                if (!mounted) return;
                setDetailRows(Array.isArray(data?.items) ? data.items : []);
                setDetailTotal(Number(data?.total) || 0);
            } catch (e) {
                if (mounted) handleApiError(e);
            } finally {
                if (mounted) setLoading((s) => ({ ...s, detail: false }));
            }
        })();
        return () => {
            mounted = false;
        };
    }, [nomId, detailPage.first, detailPage.rows, handleApiError]);

    // Cargar PRESUPUESTO
    useEffect(() => {
        let mounted = true;
        (async () => {
            if (!nomId) return;
            setLoading((s) => ({ ...s, budget: true }));
            try {
                const { data } = await paginatePayrollBudgetAPI({
                    nomId,
                    first: budgetPage.first,
                    rows: budgetPage.rows,
                });
                if (!mounted) return;
                setBudgetRows(Array.isArray(data?.items) ? data.items : []);
                setBudgetTotal(Number(data?.total) || 0);
            } catch (e) {
                if (mounted) handleApiError(e);
            } finally {
                if (mounted) setLoading((s) => ({ ...s, budget: false }));
            }
        })();
        return () => {
            mounted = false;
        };
    }, [nomId, budgetPage.first, budgetPage.rows, handleApiError]);

    // Cargar REPORTE por empleado (al abrir el tab)
    const fetchReport = useCallback(
        async (id) => {
            setLoading((s) => ({ ...s, report: true }));
            try {
                const { data } = await getPayrollEmployeeReportAPI({ nomId: id });
                const cols = Array.isArray(data?.columns) ? data.columns : [];
                const rows = Array.isArray(data?.rows) ? data.rows : [];
                setRptCols(cols);
                setRptRows(rows);
            } catch (e) {
                handleApiError(e);
            } finally {
                setLoading((s) => ({ ...s, report: false }));
            }
        },
        [handleApiError]
    );

    // Cuando cambias de tab, si entras al reporte y no está cargado, lo trae
    useEffect(() => {
        if (visible && nomId && activeIndex === 2 && rptCols.length === 0) {
            fetchReport(nomId);
        }
    }, [activeIndex, visible, nomId, rptCols.length, fetchReport]);

    /* ===================== REF (abrir) ===================== */
    const openReadOnly = async (id) => {
        setNomId(id);
        setVisible(true);
        setActiveIndex(0);
        setRptCols([]);
        setRptRows([]); // limpia reporte
        await fetchHeader(id);
    };
    useImperativeHandle(ref, () => ({
        editPayroll: openReadOnly,
        onClose: () => setVisible(false),
    }));

    /* ===================== HEADER VIEW ===================== */
    const HeaderStyles = () => (
        <style>{`
      .payroll-head {
        border: 1px solid #eef0f3; border-radius: 10px; padding: 12px 16px;
        background: #fafbfc; margin-bottom: .75rem;
      }
      .payroll-head .row { display: grid; gap: 10px; }
      @media(min-width: 768px){
        .payroll-head .row.cols-6 { grid-template-columns: repeat(6, minmax(0,1fr)); }
        .payroll-head .row.cols-4 { grid-template-columns: repeat(4, minmax(0,1fr)); }
      }
      .ph-item { display:flex; flex-direction:column; gap:4px; }
      .ph-label { font-size:.8rem; color:#6b7280; font-weight:600; }
      .ph-value { font-size: .95rem; color:#111827; }
      .chips { display:flex; gap:8px; flex-wrap: wrap; justify-content:flex-end; }
      .chip {
        display:inline-flex; align-items:center; gap:6px; font-weight:700;
        font-size:.8rem; padding:6px 10px; border-radius:8px;
        background:#eef6ff; color:#2563eb;
      }
      .chip.secondary { background:#eef2ff; color:#4f46e5; }
      .chip.warn { background:#fff7ed; color:#d97706; }
      /* ===== estilo para subtotal del reporte ===== */
      .row-subtotal { background:#f8fafc !important; font-weight:700; }
    `}</style>
    );

    const HeaderInfo = () => {
        const h = header || {};
        return (
            <>
                <HeaderStyles />
                <div className="payroll-head">
                    {/* Línea 1 */}
                    <div className="row cols-6" style={{ alignItems: "center" }}>
                        <div className="ph-item">
                            <span className="ph-label">Código</span>
                            <span className="ph-value">{h.codigo ?? "-"}</span>
                        </div>
                        <div className="ph-item" style={{ gridColumn: "span 2" }}>
                            <span className="ph-label">Nombre</span>
                            <span className="ph-value">{h.nomNombre ?? "-"}</span>
                        </div>
                        <div className="ph-item">
                            <span className="ph-label">Año</span>
                            <span className="ph-value">{h.anio ?? "-"}</span>
                        </div>
                        <div className="ph-item">
                            <span className="ph-label">Mes</span>
                            <span className="ph-value">{h.mes ?? "-"}</span>
                        </div>
                        <div className="ph-item">
                            <span className="ph-label">Ítems</span>
                            <span className="ph-value">{numberBody(h.items)}</span>
                        </div>
                    </div>

                    {/* Línea 2 */}
                    <div className="row cols-4" style={{ marginTop: 8, alignItems: "center" }}>
                        <div className="ph-item" style={{ gridColumn: "span 2" }}>
                            <span className="ph-label">Fecha Registro</span>
                            <span className="ph-value">{dateBody(h.fechaRegistro)}</span>
                        </div>
                        <div className="ph-item">
                            <span className="ph-label">Fecha Actualización</span>
                            <span className="ph-value">{dateBody(h.fechaActualizacion)}</span>
                        </div>
                        <div className="chips">
                            <span className="chip">Σ Débito: {money(h.totalDebito)}</span>
                            <span className="chip secondary">Σ Crédito: {money(h.totalCredito)}</span>
                            <span className="chip warn">Σ Neto (D−C): {money(h.totalNeto)}</span>
                        </div>
                    </div>
                </div>
            </>
        );
    };

    /* ===================== TOTALES (memorizados) ===================== */
    const sumField = (rows, field) =>
        rows.reduce((acc, r) => acc + (Number(r[field]) || 0), 0);

    const detailTotals = useMemo(
        () => ({
            debito: sumField(detailRows, "debito"),
            credito: sumField(detailRows, "credito"),
            base: sumField(detailRows, "baseImpuesto"),
        }),
        [detailRows]
    );

    const budgetTotals = useMemo(
        () => ({
            valor: sumField(budgetRows, "valor"),
            porcentaje: sumField(budgetRows, "porcentaje"),
        }),
        [budgetRows]
    );

    const footerRight = useMemo(() => ({ textAlign: "right", fontWeight: 600 }), []);
    // Footers de DataTable usando ColumnGroup (Detalle)
    const detailFooter = (
        <ColumnGroup>
            <Row>
                {/* 12 columnas antes de Débito en esta grilla */}
                <Column footer="" colSpan={12} />
                <Column footer={money(detailTotals.debito)} footerStyle={footerRight} />
                <Column footer={money(detailTotals.credito)} footerStyle={footerRight} />
                <Column footer={numberBody(detailTotals.base)} footerStyle={footerRight} />
            </Row>
        </ColumnGroup>
    );

    // Footers de DataTable (Presupuesto)
    const budgetFooter = (
        <ColumnGroup>
            <Row>
                <Column footer="" colSpan={1} />
                <Column footer={money(budgetTotals.valor)} footerStyle={footerRight} />
                <Column
                    footer={`${Number(budgetTotals.porcentaje || 0).toFixed(2)} %`}
                    footerStyle={footerRight}
                />
            </Row>
        </ColumnGroup>
    );

    /** ===== Helpers para el tab de Reporte ===== **/
    const isMoneyCol = (name) =>
        name === "TOTAL" || /\(\s*\d+(?:[.,]\d+)?\s*%\)/.test(name); // detecta columnas con "(%)"

    const baseColsOrderFirst = [
        "empNit",
        "empNombre",
        "terceroNit",
        "terceroNombre",
        "cuenta",
        "nombreCuenta",
        "ccoCodigo",
        "ccoNombre",
        "planCuenta",
        "datosCuenta",
        "TOTAL",
    ];

    const orderedRptCols = useMemo(() => {
        if (!rptCols?.length) return [];
        const set = new Set(rptCols);
        const first = baseColsOrderFirst.filter((c) => set.has(c));
        const rest = rptCols.filter((c) => !first.includes(c) && c !== "isSubtotal");
        return [...first, ...rest];
    }, [rptCols]);

    // ===== NUEVO: Totales dinámicos para el Reporte por empleado =====
    const rptTotals = useMemo(() => {
        if (!rptRows?.length) return {};
        const totals = {};
        // si no quieres excluir subtotales del SP, elimina el filter
        const rows = rptRows.filter((r) => !r.isSubtotal);
        orderedRptCols.forEach((c) => {
            if (isMoneyCol(c)) {
                totals[c] = rows.reduce((acc, r) => acc + (Number(r[c]) || 0), 0);
            }
        });
        return totals;
    }, [rptRows, orderedRptCols]);

    return (
        <Dialog
            header="Detalle de Reembolso"
            visible={visible}
            onHide={() => {
                setVisible(false);
                setNomId(null);
                setDetailRows([]);
                setBudgetRows([]);
                setHeader(null);
                setDetailPage({ first: 0, rows: 20 });
                setBudgetPage({ first: 0, rows: 20 });
                setRptCols([]);
                setRptRows([]);
            }}
            style={{ width: "100%", maxWidth: "2100px" }}
            modal
            maximizable
            maximized
            draggable={false}
            resizable={false}
        >
            {/* CABECERA */}
            <HeaderInfo />

            {/* Pestañas */}
            <TabView activeIndex={activeIndex} onTabChange={(e) => setActiveIndex(e.index)}>
                {/* ===== Detalle ===== */}
                <TabPanel header="Detalle">
                    <DataTable
                        value={detailRows}
                        dataKey="nodId"
                        paginator
                        first={detailPage.first}
                        rows={detailPage.rows}
                        onPage={(e) => setDetailPage((p) => ({ ...p, first: e.first, rows: e.rows }))}
                        totalRecords={detailTotal}
                        lazy
                        loading={loading.detail}
                        {...commonTableProps}
                        scrollable
                        scrollHeight="70vh"
                        footerColumnGroup={detailFooter}
                        paginatorTemplate="RowsPerPageDropdown FirstPageLink PrevPageLink CurrentPageReport NextPageLink LastPageLink"
                        currentPageReportTemplate="Mostrando {first}-{last} de {totalRecords} filas"
                        rowsPerPageOptions={[10, 20, 50, 100]}
                    >
                        <Column header="#" body={(_, o) => o.rowIndex + 1} style={{ width: 70 }} />

                        {/* Textos descriptivos */}
                        <Column field="usuario" header="Usuario" style={{ width: 220 }} />
                        <Column field="periodo" header="Periodo" style={{ width: 220 }} />
                        <Column field="tipoDoc" header="Tipo Doc." style={{ width: 160 }} />
                        <Column field="concepto" header="Concepto" style={{ width: 220 }} />
                        <Column field="planCuenta" header="Plan Cta" style={{ width: 180 }} />
                        <Column field="centroCosto" header="Centro Costo" style={{ width: 260 }} />

                        {/* Campos contables */}
                        <Column field="PUC" header="PUC" style={{ width: 120 }} />
                        <Column field="cuentaContable" header="# Cuenta" style={{ width: 140 }} />
                        <Column field="tipoTercero" header="Tipo Tercero" style={{ width: 140 }} />
                        <Column field="tercero" header="Tercero" style={{ width: 220 }} />

                        {/* Montos */}
                        <Column
                            field="debito"
                            header="Débito"
                            style={{ width: 140, textAlign: "right" }}
                            body={(r) => money(r.debito)}
                        />
                        <Column
                            field="credito"
                            header="Crédito"
                            style={{ width: 140, textAlign: "right" }}
                            body={(r) => money(r.credito)}
                        />
                        <Column
                            field="baseImpuesto"
                            header="Base Impuesto"
                            style={{ width: 160, textAlign: "right" }}
                            body={(r) => numberBody(r.baseImpuesto)}
                        />

                        {/* Datos Cuenta */}
                        <Column field="datosCuenta" header="Datos Cuenta" style={{ width: 260 }} />
                    </DataTable>
                </TabPanel>

                {/* ===== Empleados ===== */}
                <TabPanel header="Empleados">
                    <EmployeeView nomId={nomId} />
                </TabPanel>

                {/* ===== Presupuesto ===== */}
                <TabPanel header="Presupuesto">
                    <Presupuesto
                        nomId={nomId}

                    />
                </TabPanel>

                {/* ===== Reporte por empleado (SP) ===== */}
                <TabPanel header="Reporte por empleado">
                    <EmployeeReportVGrid nomId={nomId} />

                </TabPanel>

                {/* <TabPanel header="Reporte por Proyecto"></TabPanel>
                <TabPanel header="Reporte por Gerencia"></TabPanel> */}
            </TabView>
        </Dialog>
    );
});

export default VenPayroll;
