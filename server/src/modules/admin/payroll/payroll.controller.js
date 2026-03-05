import {
  getAll as getAllPayroll,
  getById as getPayrollById,
  paginated as paginatedPayroll,
  save as savePayroll,
  remove as removePayroll,
  importNomina as importNominaService,
  importPresupuestoExcel as importPresupuestoService,
  getEjecucionPresupuesto as getEjecucionPresupuestoService,
  getHeader as getPayrollHeaderService,
  saveHeader as savePayrollHeaderService,
  paginateDetail as paginatePayrollDetailService,
  upsertDetail as upsertPayrollDetailService,
  deleteDetail as deletePayrollDetailService,
  paginateBudget as paginatePayrollBudgetService,
  upsertPayrollBudget as upsertPayrollBudgetService,
  deleteBudget as deletePayrollBudgetService,
  deleteAllData as deleteAllPayrollDataService,
  runReporteEmpleado,
  upsertPayrollEmployeesService,
  getPayrollMatrixService,
} from "./payroll.service.js";

/* ---------------------- EXISTENTES ---------------------- */

export const getAll = async (_req, res) => {
  try {
    const result = await getAllPayroll();
    res.status(200).json(result);
  } catch (err) {
    res.status(500).json({
      message: err?.message ?? "Error al obtener nóminas",
      error: err.message,
    });
  }
};

export const getById = async (req, res) => {
  try {
    const { nomId } = req.params;
    const result = await getPayrollById({ nomId });

    if (!result)
      return res.status(404).json({ message: "Nómina no encontrada" });
    res.status(200).json(result);
  } catch (err) {
    res.status(500).json({
      message: err?.message ?? "Error al obtener la nómina",
      error: err.message,
    });
  }
};

export const getPaginated = async (req, res) => {
  try {
    const result = await paginatedPayroll({ params: req.body });
    res.status(200).json(result);
  } catch (err) {
    res.status(500).json({
      message: err?.message ?? "Error al paginar nóminas",
      error: err.message,
    });
  }
};

export const save = async (req, res) => {
  try {
    const usuario = req.user?.usu_id ?? req.body.usuario ?? null;
    const payload = { ...req.body, usuario };

    const result = await savePayroll({ data: payload });
    res.status(200).json(result);
  } catch (err) {
    res.status(400).json({
      message: err?.message ?? "Error al guardar la nómina",
      error: err.message,
    });
  }
};

export const remove = async (req, res) => {
  try {
    const { ids } = req.body;
    const usuario = req.user?.usu_id ?? req.body.usuario;

    if (!ids || !usuario) {
      return res.status(400).json({ message: "Faltan datos para eliminar" });
    }

    await removePayroll({ nomIds: ids, usuario });
    res.status(200).json({ message: "Nómina(s) eliminada(s) correctamente" });
  } catch (err) {
    res.status(500).json({
      message: err?.message ?? "Error al eliminar nómina(s)",
      error: err.message,
    });
  }
};

export const importPayroll = async (req, res) => {
  try {
    const {
      sheetName = null,
      scope = "filtered",
      counts = null,
      totals = null,
      rows,
      budgets,
      onExisting, // opcional: "diff" | "replace"
      autoSkipIfSame, // opcional: boolean
    } = req.body || {};

    if (!Array.isArray(rows) || rows.length === 0) {
      return res
        .status(400)
        .json({ message: "El payload no contiene filas para importar." });
    }

    const usuario = req.user?.usu_id ?? req.body?.usuario ?? 1;

    const summary = await importNominaService({
      sheetName,
      scope,
      rows,
      budgets,
      usuario,
      counts,
      totals,
      onExisting,
      autoSkipIfSame,
    });

    return res
      .status(200)
      .json({ message: "Importación de nómina finalizada", ...summary });
  } catch (err) {
    return res.status(500).json({
      message: err?.message ?? "Error al importar nómina",
      error: err?.message,
    });
  }
};

export const importBudget = async (req, res) => {
  try {
    const fileObj = req.files?.file || req.files?.archivo || null;
    if (!fileObj) {
      return res
        .status(400)
        .json({ message: "Adjunta el archivo Excel (presupuesto) en 'file'." });
    }

    const usuario = req.user?.usu_id ?? req.body.usuario ?? 1;
    const summary = await importPresupuestoService({ fileObj, usuario });

    res
      .status(200)
      .json({ message: "Importación de presupuesto finalizada", ...summary });
  } catch (err) {
    res.status(500).json({
      message: err?.message ?? "Error al importar presupuesto",
      error: err.message,
    });
  }
};

export const getBudgetExecution = async (req, res) => {
  try {
    const anio = Number(req.query.anio);
    const mes = Number(req.query.mes);
    const proId = Number(req.query.proId);

    if (!anio || !mes || !proId) {
      return res.status(400).json({
        message: "Parámetros inválidos: anio, mes y proId son obligatorios.",
      });
    }

    const data = await getEjecucionPresupuestoService({ anio, mes, proId });
    res.status(200).json(data);
  } catch (err) {
    res.status(500).json({
      message: err?.message ?? "Error al calcular ejecución del presupuesto",
      error: err.message,
    });
  }
};

/* ---------------------- NUEVOS: HEADER ---------------------- */

export const getPayrollHeader = async (req, res) => {
  try {
    const { nomId } = req.params;
    if (!nomId)
      return res.status(400).json({ message: "nomId es obligatorio." });

    const data = await getPayrollHeaderService({ nomId });
    if (!data) return res.status(404).json({ message: "Nómina no encontrada" });

    res.status(200).json({ item: data });
  } catch (err) {
    res.status(500).json({
      message: err?.message ?? "Error al obtener cabecera de nómina",
      error: err.message,
    });
  }
};

export const savePayrollHeader = async (req, res) => {
  try {
    const usuact = req.user?.usu_id ?? req.body.usuact ?? null;
    const usureg = req.user?.usu_id ?? req.body.usureg ?? null;

    const payload = { ...req.body, usuact, usureg };
    const result = await savePayrollHeaderService({ payload });

    res.status(200).json(result);
  } catch (err) {
    res.status(400).json({
      message: err?.message ?? "Error al guardar cabecera de nómina",
      error: err.message,
    });
  }
};

/* ---------------------- NUEVOS: DETALLE ---------------------- */

export const paginatePayrollDetail = async (req, res) => {
  try {
    const result = await paginatePayrollDetailService({ params: req.body });
    res.status(200).json(result);
  } catch (err) {
    res.status(500).json({
      message: err?.message ?? "Error al paginar detalle de nómina",
      error: err.message,
    });
  }
};

export const upsertPayrollDetail = async (req, res) => {
  try {
    const usuact = req.user?.usu_id ?? req.body.usuact ?? null;
    const nod_usu_reg = req.user?.usu_id ?? req.body.nod_usu_reg ?? null;

    const payload = { ...req.body, usuact, nod_usu_reg };
    const result = await upsertPayrollDetailService({ data: payload });

    res.status(200).json(result);
  } catch (err) {
    res.status(400).json({
      message: err?.message ?? "Error al guardar detalle de nómina",
      error: err.message,
    });
  }
};

export const deletePayrollDetail = async (req, res) => {
  try {
    const { nodId, nomId } = req.body;
    const usuact = req.user?.usu_id ?? req.body.usuact ?? null;

    if (!nodId || !nomId) {
      return res
        .status(400)
        .json({ message: "nodId y nomId son obligatorios." });
    }

    const result = await deletePayrollDetailService({ nodId, nomId, usuact });
    res.status(200).json(result);
  } catch (err) {
    res.status(500).json({
      message: err?.message ?? "Error al eliminar detalle de nómina",
      error: err.message,
    });
  }
};

/* ---------------------- NUEVOS: PRESUPUESTO ---------------------- */

export const paginatePayrollBudget = async (req, res) => {
  try {
    const result = await paginatePayrollBudgetService({ params: req.body });
    res.status(200).json(result);
  } catch (err) {
    res.status(500).json({
      message: err?.message ?? "Error al paginar presupuesto de nómina",
      error: err.message,
    });
  }
};



export const deletePayrollBudget = async (req, res) => {
  try {
    const { preId, nomId } = req.body;
    const usuact = req.user?.usu_id ?? req.body.usuact ?? null;

    if (!preId || !nomId) {
      return res
        .status(400)
        .json({ message: "preId y nomId son obligatorios." });
    }

    const result = await deletePayrollBudgetService({ preId, nomId, usuact });
    res.status(200).json(result);
  } catch (err) {
    res.status(500).json({
      message: err?.message ?? "Error al eliminar presupuesto de nómina",
      error: err.message,
    });
  }
};

/* ---------------------- NUEVO: ELIMINAR TODO ---------------------- */

export const deleteAllPayrollData = async (req, res) => {
  try {
    const { nomId, usuId } = req.body;

    if (!nomId)
      return res.status(400).json({ message: "nomId es obligatorio." });

    const result = await deleteAllPayrollDataService({ nomId, usuId });
    res.status(200).json(result);
  } catch (err) {
    res.status(500).json({
      message: err?.message ?? "Error al eliminar datos de la nómina",
      error: err.message,
    });
  }
};

export const getReporteEmpleado = async (req, res, next) => {
  try {
    const nomId = Number(req.params.nomId);
    if (!Number.isFinite(nomId) || nomId <= 0) {
      return res.status(400).json({ message: "nomId inválido." });
    }

    let tirId = null;
    if (req.query.tirId !== undefined && req.query.tirId !== null && req.query.tirId !== "") {
      const parsed = Number(req.query.tirId);
      tirId = Number.isFinite(parsed) && parsed > 0 ? parsed : null;
    }

    const { columns, rows, projectColors } = await runReporteEmpleado({ nomId, tirId });

    return res.status(200).json({
      nomId,
      tirId,        
      columns,
      rows,
      projectColors,
    });
  } catch (err) {
    next(err);
  }
};

export const upsertPayrollEmployees = async (req, res) => {
  try {
    const nomId = Number(req.params.nomId);
    if (!Number.isFinite(nomId) || nomId <= 0) {
      return res.status(400).json({ message: "nomId inválido" });
    }

    const usuarioId = req.body?.usuarioId ?? null;
    if (!Number.isFinite(Number(usuarioId))) {
      return res.status(400).json({ message: "usuarioId inválido" });
    }

    const toNum = (v) => (Number.isFinite(Number(v)) ? Number(v) : null);
    const normalizeIdsArray = (arr) =>
      Array.from(
        new Set(
          (Array.isArray(arr) ? arr : [])
            .map(toNum)
            .filter((n) => Number.isFinite(n))
        )
      );

    const normalizeItem = (raw) => {
      const usuIdNum = toNum(raw?.usuId);
      if (!usuIdNum) return null;

      let tirIds;
      if (Array.isArray(raw?.tirIds) || Number.isFinite(Number(raw?.tirId))) {
        tirIds = Array.isArray(raw.tirIds)
          ? normalizeIdsArray(raw.tirIds)
          : normalizeIdsArray([raw.tirId]);
      }

      let proIds;
      if (Array.isArray(raw?.proIds) || Number.isFinite(Number(raw?.proId))) {
        proIds = Array.isArray(raw.proIds)
          ? normalizeIdsArray(raw.proIds)
          : normalizeIdsArray([raw.proId]);
      }

      return {
        usuId: usuIdNum,
        ...(tirIds !== undefined ? { tirIds } : {}),
        ...(proIds !== undefined ? { proIds } : {}),
      };
    };

    let items;
    if (Array.isArray(req.body?.items)) {
      items = req.body.items.map(normalizeItem).filter(Boolean);
    } else if (req.body?.usuId !== undefined) {
      const single = normalizeItem({
        usuId: req.body.usuId,
        tirIds: Array.isArray(req.body.tirIds) ? req.body.tirIds : undefined,
        tirId: req.body.tirId,
        proIds: Array.isArray(req.body.proIds) ? req.body.proIds : undefined,
        proId: req.body.proId,
      });
      items = single ? [single] : [];
    } else {
      items = [];
    }

    if (!items.length) {
      return res.status(400).json({
        message:
          "Debe enviar items[] o (usuId y al menos uno de tirId(s)/proId(s))",
      });
    }

    const result = await upsertPayrollEmployeesService({
      nomId,
      items,
      usuarioId: Number(usuarioId),
      replaceProjects: true,
      replaceTirs: true,
    });

    return res.status(200).json(result);
  } catch (err) {
    return res.status(500).json({
      message: err?.message ?? "Error al guardar empleados de la nómina",
      error: err?.message,
    });
  }
};

export const getPayrollMatrix = async (req, res) => {
  try {
    const nomId = Number(req.params?.nomId);

    if (!Number.isFinite(nomId) || nomId <= 0) {
      return res
        .status(400)
        .json({ message: "nomId es requerido y debe ser numérico > 0" });
    }

    const result = await getPayrollMatrixService({ nomId });
    return res.status(200).json(result);
  } catch (err) {
    const status = err?.isClient ? 400 : 500;
    return res.status(status).json({
      message: err?.message ?? "Error al obtener la matriz de nómina",
      error: err?.message,
    });
  }
};

export const upsertPayrollBudget = async (req, res) => {
  try {
    const usuario = req.user?.usu_id ?? req.body?.idusuario ?? null;

    const payload = req.body || {};
    const nomId = Number(payload.nomId);

    if (!Number.isFinite(nomId) || nomId <= 0) {
      return res.status(400).json({ message: "nomId es obligatorio y > 0." });
    }
    if (!Array.isArray(payload.items) || payload.items.length === 0) {
      return res.status(400).json({ message: "items[] es obligatorio." });
    }

    // Normaliza por si vienen strings
    payload.items = payload.items.map((it) => ({
      nomId,
      proId: Number(it.proId),
      tirId: Number(it.tirId),
      valor: Number(it.valor || 0),
      porcentaje: Number(it.porcentaje || 0),
    }));

    const result = await upsertPayrollBudgetService({
      payload,
      usuario: Number.isFinite(Number(usuario)) ? Number(usuario) : null,
    });

    return res.status(200).json(result);
  } catch (err) {
    return res.status(400).json({
      message: err?.message ?? "Error al guardar presupuesto de nómina",
      error: err?.message,
    });
  }
};



