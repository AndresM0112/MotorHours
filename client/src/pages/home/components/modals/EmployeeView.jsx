import React, { useContext, useEffect, useRef, useState } from 'react'
import { DataTable } from 'primereact/datatable'
import { Column } from 'primereact/column'
import { Dropdown } from 'primereact/dropdown'
import { MultiSelect } from 'primereact/multiselect'
import { InputText } from 'primereact/inputtext'
import { Button } from 'primereact/button'
import { FilterMatchMode } from 'primereact/api'
import { FiUploadCloud } from 'react-icons/fi'

import { getAllAPI as getRefundTypeAPI } from '@api/requests/RefundableTypeApi'
import { getAllBlocksAPI } from '@api/requests/blocksApi'
import { getPayrollEmployeesAPI } from '@api/requests/usersApi'
import { upsertPayrollEmployeesAPI } from '@api/requests/payrollApi'

import useHandleApiError from '@hook/useHandleApiError'
import { AuthContext } from '@context/auth/AuthContext'
import { ToastContext } from '@context/toast/ToastContext'

const EmployeeView = ({ nomId }) => {
    const handleApiError = useHandleApiError()
    const { idusuario } = useContext(AuthContext);
    const { showSuccess, showInfo } = useContext(ToastContext);

    const [lists, setLists] = useState({ projects: [], refundType: [] })
    const [employees, setEmployees] = useState([])
    const [loading, setLoading] = useState(false)

    // Filtros
    const [globalValue, setGlobalValue] = useState('')
    const [tableFilters, setTableFilters] = useState({
        global: { value: null, matchMode: FilterMatchMode.CONTAINS },
        tirId: { value: null, matchMode: FilterMatchMode.IN },
    })
    const [projectFilterIds, setProjectFilterIds] = useState([])

    // Selección
    const [selectedRows, setSelectedRows] = useState([])

    // Acciones masivas
    const [bulkTirId, setBulkTirId] = useState(null)
    const [bulkProIds, setBulkProIds] = useState(null) // array o null
    const [savingBulk, setSavingBulk] = useState(false)

    const rowDebounceRef = useRef(new Map())
    useEffect(() => {
        const fetchAll = async () => {
            try {
                setLoading(true)
                const [refundTypeRes, projectsRes, employeesRes] = await Promise.all([
                    getRefundTypeAPI(),
                    getAllBlocksAPI(),
                    getPayrollEmployeesAPI(nomId),
                ])

                const projects = (projectsRes.data || []).map(p => ({
                    ...p,
                    // disabled: p.id === 10, // <- lo dejamos comentado por ahora
                }))

                const emps = (employeesRes.data || []).map(e => ({
                    ...e,
                    proIds: Array.isArray(e.proIds)
                        ? e.proIds
                        : (Number.isFinite(Number(e.proId)) ? [Number(e.proId)] : []),
                }))

                setLists({ refundType: refundTypeRes.data || [], projects })
                setEmployees(emps)
                setSelectedRows([])
                setBulkTirId(null)
                setBulkProIds(null)
                setProjectFilterIds([])
            } catch (error) {
                handleApiError(error)
            } finally {
                setLoading(false)
            }
        }
        if (nomId) fetchAll()
    }, [nomId])

    /* ---------- Helpers UI ---------- */
    const ProjectDot = ({ color }) => (
        <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 999, background: color || '#999' }} />
    )
    const projectOptionTemplate = (option) => (
        <div className="flex items-center gap-2">
            <ProjectDot color={option.color} />
            <span>{option.nombre}</span>
        </div>
    )
    const cedulaBody = (row) => (
        <div className="flex items-center gap-2">
            <span>{row.cedula}</span>
        </div>
    )

    /* ---------- Autosave por fila (optimista + debounce + rollback) ---------- */
    const saveOne = async (usuId, patch) => {
        if (!idusuario) return

        const prevRow = employees.find(e => e.id === usuId)
        if (!prevRow) return
        const prev = { tirId: prevRow.tirId, proIds: prevRow.proIds }

        setEmployees(list => list.map(e => (e.id === usuId ? { ...e, ...patch } : e)))

        try {
            await upsertPayrollEmployeesAPI(nomId, {
                usuarioId: idusuario,
                usuId,
                tirId: patch.tirId ?? prevRow.tirId ?? 0,
                proIds: Array.isArray(patch.proIds) ? patch.proIds : (prevRow.proIds ?? []),
            })
        } catch (err) {
            setEmployees(list => list.map(e => (e.id === usuId ? { ...e, ...prev } : e)))
            handleApiError(err)
        }
    }

    const debouncedSaveOne = (usuId, patch, delay = 350) => {
        const m = rowDebounceRef.current
        const t = m.get(usuId)
        if (t) clearTimeout(t)

        const timeoutId = setTimeout(() => {
            saveOne(usuId, patch)
            m.delete(usuId)
        }, delay)

        m.set(usuId, timeoutId)
    }

    const onChangeRefundType = (row, value) => {
        debouncedSaveOne(row.id, { tirId: value ?? null })
    }

    const onChangeProjects = (row, values) => {
        const next = Array.isArray(values) ? values : []
        setEmployees(list => list.map(e => (e.id === row.id ? { ...e, proIds: next } : e)))
        debouncedSaveOne(row.id, { proIds: next })
    }

    /* ---------- Guardado MASIVO ---------- */
    const canBulkSave =
        selectedRows.length > 0 &&
        (bulkTirId !== null || (Array.isArray(bulkProIds) && bulkProIds.length > 0))

    const handleBulkSave = async () => {
        if (selectedRows.length === 0) return showInfo('Selecciona al menos un empleado')
        if (bulkTirId === null && !Array.isArray(bulkProIds)) return showInfo('Selecciona reembolso y/o proyectos a asignar')
        if (!idusuario) return showInfo('No hay usuario autenticado')

        const safeBulkProIds = Array.isArray(bulkProIds) ? bulkProIds /* .filter(v => v !== 10) */ : null

        const items = selectedRows.map(r => ({
            usuId: r.id,
            tirId: (bulkTirId !== null ? bulkTirId : (r.tirId || 0)),
            proIds: Array.isArray(safeBulkProIds) ? safeBulkProIds : (r.proIds || []),
        }))

        const selectedIds = new Set(selectedRows.map(r => r.id))
        const prevEmployees = employees
        const nextEmployees = employees.map(e =>
            selectedIds.has(e.id)
                ? { ...e, tirId: bulkTirId !== null ? bulkTirId : e.tirId, proIds: Array.isArray(safeBulkProIds) ? safeBulkProIds : e.proIds }
                : e
        )
        setEmployees(nextEmployees)

        try {
            setSavingBulk(true)
            await upsertPayrollEmployeesAPI(nomId, { usuarioId: idusuario, items })
            showSuccess(`Se actualizaron ${items.length} empleados`)
            setSelectedRows([])
            setBulkTirId(null)
            setBulkProIds(null)
        } catch (err) {
            setEmployees(prevEmployees) // rollback
            handleApiError(err)
        } finally {
            setSavingBulk(false)
        }
    }

    /* ---------- Filtro por proyectos (manual, porque proIds es array) ---------- */
    const passesProjectFilter = (emp) => {
        if (!projectFilterIds || projectFilterIds.length === 0) return true
        const set = new Set(emp.proIds || [])
        return projectFilterIds.some(pid => set.has(pid))
    }
    const tableValue = (employees || []).filter(passesProjectFilter)

    /* ---------- TopBar ---------- */
    const TopBar = (
        <div className="flex justify-content-between">
            <div className="flex flex-col gap-2 mb-2 mt-2">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                    {/* Buscar */}
                    <InputText
                        value={globalValue}
                        onChange={(e) => {
                            const v = e.target.value
                            setGlobalValue(v)
                            setTableFilters(prev => ({ ...prev, global: { ...prev.global, value: v } }))
                        }}
                        placeholder="Buscar (nombre, cédula)"
                        style={{ paddingLeft: 32, width: 280 }}
                    />
                </div>

                {/* Filtros por listas */}
                <div className="flex gap-2">
                    <MultiSelect
                        value={tableFilters.tirId.value || []}
                        options={lists.refundType}
                        optionLabel="nombre"
                        optionValue="id"
                        onChange={(e) =>
                            setTableFilters(prev => ({
                                ...prev,
                                tirId: { ...prev.tirId, value: e.value?.length ? e.value : null }
                            }))
                        }
                        placeholder="Filtrar reembolsos"
                        display="chip"
                        className="w-56"
                        showClear
                        maxSelectedLabels={3}
                        selectedItemsLabel="{0} seleccionados"
                    />
                    <MultiSelect
                        value={projectFilterIds}
                        options={lists.projects}
                        optionLabel="nombre"
                        optionValue="id"
                        onChange={(e) => setProjectFilterIds(e.value || [])}
                        placeholder="Filtrar proyectos"
                        display="chip"
                        className="w-64"
                        showClear
                        itemTemplate={projectOptionTemplate}
                        maxSelectedLabels={3}
                        selectedItemsLabel="{0} seleccionados"
                    // optionDisabled={(opt) => opt.id === 10}
                    />
                </div>
            </div>

            {/* Acciones MASIVAS (alineadas a la derecha) */}
            <div className="flex items-center gap-2 ml-auto">
                <Dropdown
                    value={bulkTirId}
                    options={lists.refundType}
                    optionLabel="nombre"
                    optionValue="id"
                    placeholder="Asignar reembolso"
                    className="w-56"
                    showClear
                    onChange={(e) => setBulkTirId(e.value ?? null)}
                />
                <MultiSelect
                    value={bulkProIds || []}
                    options={lists.projects}
                    optionLabel="nombre"
                    optionValue="id"
                    placeholder="Asignar proyectos"
                    className="w-64"
                    display="chip"
                    showClear
                    onChange={(e) => setBulkProIds(e.value?.length ? e.value : null)}
                    itemTemplate={projectOptionTemplate}
                    maxSelectedLabels={3}
                    selectedItemsLabel="{0} seleccionados"
                // selectedItemTemplate: no lo usamos (evita que se oculte)
                // optionDisabled={(opt) => opt.id === 10}
                />
                <Button
                    icon={<FiUploadCloud />}
                    label={`Guardar (${selectedRows.length})`}
                    onClick={handleBulkSave}
                    loading={savingBulk}
                    disabled={!canBulkSave}
                    className="p-button-sm"
                />
            </div>
        </div>
    )

    return (
        <>
            {TopBar}

            <DataTable
                value={tableValue}
                dataKey="id"
                loading={loading}
                responsiveLayout="scroll"
                showGridlines
                scrollable
                scrollHeight="50vh"
                className="narrow-rows"
                filters={tableFilters}
                globalFilterFields={['nombre', 'cedula']}
                selection={selectedRows}
                onSelectionChange={(e) => setSelectedRows(e.value)}
                footer={
                    <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                        <span>Seleccionados: <b>{selectedRows.length}</b></span>
                        <span>Total empleados: <b>{employees.length}</b></span>
                    </div>
                }
                emptyMessage="Sin empleados"
                selectionMode="checkbox"
            >
                <Column selectionMode="multiple" headerStyle={{ width: '1rem' }} style={{ maxWidth: '4rem' }} />
                <Column field="cedula" header="Cédula" body={cedulaBody} style={{ minWidth: 160 }} />
                <Column field="nombre" header="Nombre" style={{ minWidth: 220 }} />
                <Column
                    header="Tipo de reembolso"
                    style={{ minWidth: 260 }}
                    body={(row) => (
                        <Dropdown
                            value={row.tirId ?? null}
                            options={lists.refundType}
                            optionLabel="nombre"
                            optionValue="id"
                            placeholder="Seleccione"
                            className="w-full"
                            onChange={(e) => onChangeRefundType(row, e.value ?? null)}
                            showClear
                        />
                    )}
                />
                <Column
                    header="Proyectos"
                    style={{ minWidth: 320 }}
                    body={(row) => (
                        <MultiSelect
                            value={row.proIds || []}
                            options={lists.projects}
                            optionLabel="nombre"
                            optionValue="id"
                            placeholder="Seleccione"
                            className="w-full"
                            onChange={(e) => onChangeProjects(row, e.value)}
                            display="chip"
                            showClear
                            itemTemplate={projectOptionTemplate}
                            maxSelectedLabels={3}
                            selectedItemsLabel="{0} seleccionados"
                        // optionDisabled={(opt) => opt.id === 10}
                        />
                    )}
                />
            </DataTable>
        </>
    )
}

export default EmployeeView
