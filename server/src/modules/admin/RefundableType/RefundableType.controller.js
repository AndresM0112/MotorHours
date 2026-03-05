import {
  getAll,
  getById,
  pagination,
  save,
  remove,
} from "./RefundableType.service.js";

export const getAllController = async (_, res) => {
  try {
    const result = await getAll();
    res.status(200).json(result);
  } catch (err) {
    res.status(500).json({
      message: err?.message ?? "Error al obtener tipo de reembolsable",
      error: err.message,
    });
  }
};

export const getByIdController = async (req, res) => {
  try {
    const { tirId } = req.params;
    const result = await getById(tirId);
    if (!result)
      return res
        .status(404)
        .json({ message: "tipo de reembolsable no encontrada" });
    res.status(200).json(result);
  } catch (err) {
    res.status(500).json({
      message: err?.message ?? "Error al obtener el tipo de reembolsable",
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
      message: err?.message ?? "Error al paginar tipo de reembolsable",
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
      message: err?.message ?? "Error al guardar el tipo de reembolsable",
      error: err.message,
    });
  }
};

export const removeController = async (req, res) => {
  try {
    const { tirIds, usuario } = req.body;
    if (!tirIds || !usuario)
      return res.status(400).json({ message: "Faltan datos para eliminar" });

    await remove(tirIds, usuario);
    res
      .status(200)
      .json({ message: "tipo de reembolsable(s) eliminada(s) correctamente" });
  } catch (err) {
    res.status(500).json({
      message: err?.message ?? "Error al eliminar tipo de reembolsable(s)",
      error: err.message,
    });
  }
};
