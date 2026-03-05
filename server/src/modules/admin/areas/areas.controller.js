import {
  getAllAreas,
  getAreaById,
  paginationAreas,
  saveArea,
  deleteAreas,
  getAllManagerByIdArea,
  getAreasWithEncargadosByProject,
  getAllAreasByProject,
} from "./areas.service.js";

export const getAllByProject = async (req, res) => {
  try {
    const { projectId } = req.params;

    const result = await getAllAreasByProject(projectId);
    res.status(200).json(result);
  } catch (err) {
    res.status(500).json({
      message: err?.message ?? "Error al obtener áreas",
      error: err.message,
    });
  }
};

export const getAll = async (_, res) => {
  try {
    const result = await getAllAreas();
    res.status(200).json(result);
  } catch (err) {
    res.status(500).json({
      message: err?.message ?? "Error al obtener áreas",
      error: err.message,
    });
  }
};

export const getById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await getAreaById(id);
    if (!result) return res.status(404).json({ message: "Área no encontrada" });
    res.status(200).json(result);
  } catch (err) {
    res.status(500).json({
      message: err?.message ?? "Error al obtener el área",
      error: err.message,
    });
  }
};

export const getPaginated = async (req, res) => {
  try {
    const result = await paginationAreas(req.body);
    res.status(200).json(result);
  } catch (err) {
    res.status(500).json({
      message: err?.message ?? "Error al paginar áreas",
      error: err.message,
    });
  }
};

export const save = async (req, res) => {
  try {
    const result = await saveArea(req.body);
    res.status(200).json(result);
  } catch (err) {
    res.status(400).json({
      message: err?.message ?? "Error al guardar el área",
      error: err.message,
    });
  }
};

export const remove = async (req, res) => {
  try {
    const { ids, usuario } = req.body;
    if (!ids || !usuario)
      return res.status(400).json({ message: "Faltan datos para eliminar" });

    await deleteAreas(ids, usuario);
    res.status(200).json({ message: "Área(s) eliminada(s) correctamente" });
  } catch (err) {
    res.status(500).json({
      message: err?.message ?? "Error al eliminar área(s)",
      error: err.message,
    });
  }
};



export const getAllManagerByArea = async (req, res) => {
  try {
    const { ids } = req.body;
    const result = await getAllManagerByIdArea(ids);
    res.status(200).json(result || []);
  } catch (err) {
    res.status(500).json({
      message: err?.message ?? "Error al obtener encargados de área",
      error: err.message,
    });
  }
};


export const getAreasWithEncargados = async (req, res) => {
  try {
    const { proId } = req.body;
    if (!proId)
      return res.status(400).json({ message: "Falta el ID del proyecto" });

    const result = await getAreasWithEncargadosByProject(proId);
    res.status(200).json(result);
  } catch (err) {
    res.status(500).json({
      message:
        err?.message ?? "Error al obtener las áreas y encargados del proyecto",
      error: err.message,
    });
  }
};
