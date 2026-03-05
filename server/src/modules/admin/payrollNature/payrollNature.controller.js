import {
  getAll,
  getById,
  pagination,
  save,
  remove,
} from "./payrollNature.service.js";

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
    const { nanId } = req.params;
    const result = await getById(nanId);
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
    const { nanIds, usuario } = req.body;
    if (!nanIds || !usuario)
      return res.status(400).json({ message: "Faltan datos para eliminar" });

    await remove(nanIds, usuario);
    res.status(200).json({ message: "registro(s) eliminada(s) correctamente" });
  } catch (err) {
    res.status(500).json({
      message: err?.message ?? "Error al eliminar registro(s)",
      error: err.message,
    });
  }
};
