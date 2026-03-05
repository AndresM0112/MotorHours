import {
  getAll,
  getById,
  pagination,
  save,
  remove,
} from "./centerCost.service.js";

export const getAllController = async (_, res) => {
  try {
    const result = await getAll();
    res.status(200).json(result);
  } catch (err) {
    res.status(500).json({
      message: err?.message ?? "Error al obtener centro de costos",
      error: err.message,
    });
  }
};

export const getByIdController = async (req, res) => {
  try {
    const { ccoId } = req.params;
    const result = await getById(ccoId);
    if (!result)
      return res.status(404).json({ message: "centro de costo no encontrada" });
    res.status(200).json(result);
  } catch (err) {
    res.status(500).json({
      message: err?.message ?? "Error al obtener el centro de costo",
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
      message: err?.message ?? "Error al paginar centro de costos",
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
      message: err?.message ?? "Error al guardar el centro de costo",
      error: err.message,
    });
  }
};

export const removeController = async (req, res) => {
  try {
    const { ccoIds, usuario } = req.body;
    if (!ccoIds || !usuario)
      return res.status(400).json({ message: "Faltan datos para eliminar" });

    await remove(ccoIds, usuario);
    res
      .status(200)
      .json({ message: "centro de costo(s) eliminada(s) correctamente" });
  } catch (err) {
    res.status(500).json({
      message: err?.message ?? "Error al eliminar centro de costo(s)",
      error: err.message,
    });
  }
};
