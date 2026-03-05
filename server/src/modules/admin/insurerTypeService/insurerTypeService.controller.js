import {
  getAll,
  getById,
  pagination,
  save,
  remove,
} from "./insurerTypeService.service.js";

export const getAllController = async (_, res) => {
  try {
    const result = await getAll();
    res.status(200).json(result);
  } catch (err) {
    res.status(500).json({
      message: err?.message ?? "Error al obtener tipo de aseguradoras",
      error: err.message,
    });
  }
};

export const getByIdController = async (req, res) => {
  try {
    const { tiaId } = req.params;
    const result = await getById(tiaId);
    if (!result)
      return res
        .status(404)
        .json({ message: "tipo de aseguradora no encontrada" });
    res.status(200).json(result);
  } catch (err) {
    res.status(500).json({
      message: err?.message ?? "Error al obtener el tipo de aseguradora",
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
      message: err?.message ?? "Error al paginar tipo de aseguradoras",
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
      message: err?.message ?? "Error al guardar el tipo de aseguradora",
      error: err.message,
    });
  }
};

export const removeController = async (req, res) => {
  try {
    const { tiaIds, usuario } = req.body;
    if (!tiaIds || !usuario)
      return res.status(400).json({ message: "Faltan datos para eliminar" });

    await remove(tiaIds, usuario);
    res
      .status(200)
      .json({ message: "tipo de aseguradora(s) eliminada(s) correctamente" });
  } catch (err) {
    res.status(500).json({
      message: err?.message ?? "Error al eliminar tipo de aseguradora(s)",
      error: err.message,
    });
  }
};
