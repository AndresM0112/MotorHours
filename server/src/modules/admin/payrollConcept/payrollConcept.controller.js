import {
  getAll,
  getById,
  pagination,
  save,
  remove,
} from "./payrollConcept.service.js";

export const getAllController = async (_, res) => {
  try {
    const result = await getAll();
    res.status(200).json(result);
  } catch (err) {
    res.status(500).json({
      message: err?.message ?? "Error al obtener registro",
      error: err.message,
    });
  }
};

export const getByIdController = async (req, res) => {
  try {
    const { conId } = req.params;
    const result = await getById(conId);
    if (!result)
      return res.status(404).json({ message: "registro no encontrada" });
    res.status(200).json(result);
  } catch (err) {
    res.status(500).json({
      message: err?.message ?? "Error al obtener el registro",
      error: err.message,
    });
  }
};

export const paginationController = async (req, res) => {
  try {
    const result = await pagination(req.body);
    res.status(200).json(result);
  } catch (err) {
    res.status(500).json({
      message: err?.message ?? "Error al paginar registro",
      error: err.message,
    });
  }
};

export const saveController = async (req, res) => {
  try {
    const result = await save(req.body);
    res.status(200).json(result);
  } catch (err) {
    res.status(400).json({
      message: err?.message ?? "Error al guardar el registro",
      error: err.message,
    });
  }
};

export const removeController = async (req, res) => {
  try {
    const { conIds, usuario } = req.body;
    if (!conIds || !usuario)
      return res.status(400).json({ message: "Faltan datos para eliminar" });

    await remove(conIds, usuario);
    res.status(200).json({ message: "registro(s) eliminada(s) correctamente" });
  } catch (err) {
    res.status(500).json({
      message: err?.message ?? "Error al eliminar registro(s)",
      error: err.message,
    });
  }
};
