import {
  getLocalizaciones,
  getLocalizacionById,
  paginateLocalizaciones,
  saveLocalizacion,
  deleteLocalizacion,
  getUbicacionesDropdown
} from "./location.service.js";

// GET /localizaciones
export const getAll = async (_req, res) => {
  try {
    const result = await getLocalizaciones();
    res.status(200).json(result);
  } catch (err) {
    res.status(500).json({
      message: err?.message ?? "Error al obtener las localizaciones",
      error: err.message,
    });
  }
};

// GET /localizaciones/:id
export const getById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await getLocalizacionById(id);
    if (!result) {
      return res.status(404).json({ message: "Localización no encontrada" });
    }
    res.status(200).json(result);
  } catch (err) {
    res.status(500).json({
      message: err?.message ?? "Error al obtener la localización",
      error: err.message,
    });
  }
};

// POST /localizaciones/paginate
export const getPaginated = async (req, res) => {
  try {
    const result = await paginateLocalizaciones(req.body);
    res.status(200).json(result);
  } catch (err) {
    res.status(500).json({
      message: err?.message ?? "Error al paginar localizaciones",
      error: err.message,
    });
  }
};

// POST /localizaciones   (crear)
// PUT  /localizaciones/:id  (editar)
export const save = async (req, res) => {
  try {
    const body = { ...req.body };

    // // Si viene id por params (PUT /:id), lo ponemos en el payload como lcaId
    // if (req.params?.id) {
    //   body.lcaId = Number(req.params.id);
    // }

    const result = await saveLocalizacion(body);
    res.status(200).json(result);
  } catch (err) {
    res.status(400).json({
      message: err?.message ?? "Error al guardar la localización",
      error: err.message,
    });
  }
};

// DELETE /localizaciones/:id
export const remove = async (req, res) => {
  try {
    const id = req.params.id || req.body.id;

     if (!id) {
      return res.status(400).json({
        message: "El id de la localización es obligatorio",
      });
    }

    const result = await deleteLocalizacion(id);
    res.status(200).json(result);
  } catch (err) {
    res.status(400).json({
      message: err?.message ?? "Error al eliminar la localización",
      error: err.message,
    });
  }
};

export const getUbicaciones = async (_req, res) => {
  try {
    const result = await getUbicacionesDropdown();
    res.status(200).json(result);
  } catch (err) {
    console.error("Error al obtener ubicaciones unificadas:", err);
    res.status(500).json({
      message: err?.message ?? "Error al obtener las ubicaciones",
      error: err.message,
    });
  }
};
