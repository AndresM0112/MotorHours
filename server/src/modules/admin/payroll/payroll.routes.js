import { Router } from "express";
import { verifyToken } from "../../../common/middlewares/authjwt.middleware.js";
import {
  getAll,
  getById,
  getPaginated,
  save,
  remove,
  importPayroll,
  importBudget,
  getBudgetExecution,
  getPayrollHeader,
  savePayrollHeader,
  paginatePayrollDetail,
  upsertPayrollDetail,
  deletePayrollDetail,
  paginatePayrollBudget,
  upsertPayrollBudget,
  deletePayrollBudget,
  deleteAllPayrollData,
  getReporteEmpleado,
  upsertPayrollEmployees,
  getPayrollMatrix,
} from "./payroll.controller.js";

const payrollRoutes = Router();

payrollRoutes.get("/all", verifyToken, getAll);
payrollRoutes.get("/getById/:nomId", verifyToken, getById);
payrollRoutes.post("/paginate", verifyToken, getPaginated);
payrollRoutes.post("/save", verifyToken, save);
payrollRoutes.post("/delete", verifyToken, remove);

payrollRoutes.post("/import/payroll", verifyToken, importPayroll);
payrollRoutes.post("/import/budget", verifyToken, importBudget);

payrollRoutes.get("/execution", verifyToken, getBudgetExecution);

// Obtener cabecera de nómina por ID
payrollRoutes.get("/header/:nomId", verifyToken, getPayrollHeader);
// Crear/actualizar cabecera de nómina
payrollRoutes.post("/header/save", verifyToken, savePayrollHeader);

/* ========== NUEVOS: DETALLE ========== */
// Paginación de detalle por nómina
payrollRoutes.post("/detail/paginate", verifyToken, paginatePayrollDetail);
// Upsert de una fila del detalle
payrollRoutes.post("/detail/save", verifyToken, upsertPayrollDetail);
// Eliminar una fila del detalle
payrollRoutes.post("/detail/delete", verifyToken, deletePayrollDetail);

/* ========== NUEVOS: PRESUPUESTO ========== */
// Paginación de presupuesto por nómina
payrollRoutes.post("/budget/paginate", verifyToken, paginatePayrollBudget);
// Upsert de una partida de presupuesto
payrollRoutes.post("/budget/save", verifyToken, upsertPayrollBudget);
// Eliminar una partida de presupuesto
payrollRoutes.post("/budget/delete", verifyToken, deletePayrollBudget);

/* ========== NUEVO: ELIMINAR TODO (detalle + presupuesto) ========== */
payrollRoutes.post("/data/delete-all", verifyToken, deleteAllPayrollData);

payrollRoutes.get("/report/employee/:nomId", verifyToken, getReporteEmpleado);

payrollRoutes.post(
  "/employees/upsert/:nomId",
  verifyToken,
  upsertPayrollEmployees
);

payrollRoutes.get("/matrix/:nomId", verifyToken, getPayrollMatrix);

export default payrollRoutes;
