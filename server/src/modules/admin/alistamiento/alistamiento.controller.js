import {
  getAlistamientos,
  getAlistamientoById,
  paginateAlistamientos,
  saveAlistamiento,
  deleteAlistamiento,
  getAlistamientosDropdown
} from "./alistamiento.service.js";

// GET /alistamientos
export const getAll = async (_req, res) => {
  try {
    const result = await getAlistamientos();
    res.status(200).json(result);
  } catch (err) {
    res.status(500).json({
      message: err?.message ?? "Error al obtener los alistamientos",
      error: err.message,
    });
  }
};

// GET /alistamientos/:id
export const getById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await getAlistamientoById(id);
    if (!result) {
      return res.status(404).json({ message: "Alistamiento no encontrado" });
    }
    res.status(200).json(result);
  } catch (err) {
    res.status(500).json({
      message: err?.message ?? "Error al obtener el alistamiento",
      error: err.message,
    });
  }
};

// POST /alistamientos/paginate
export const getPaginated = async (req, res) => {
  try {
    const result = await paginateAlistamientos(req.body);
    res.status(200).json(result);
  } catch (err) {
    res.status(500).json({
      message: err?.message ?? "Error al paginar alistamientos",
      error: err.message,
    });
  }
};

// POST /alistamientos/save   (crear)
// PUT  /alistamientos/:id    (editar)
export const save = async (req, res) => {
  try {
    const body = { ...req.body };

    // Si viene id por params (PUT /:id), lo ponemos en el payload
    if (req.params?.id) {
      body.id = Number(req.params.id);
    }

    body.updatedBy = req.user?.nombre ?? null;

    const result = await saveAlistamiento(body);
    res.status(200).json(result);
  } catch (err) {
    res.status(400).json({
      message: err?.message ?? "Error al guardar el alistamiento",
      error: err.message,
    });
  }
};

// DELETE /alistamientos/:id
export const remove = async (req, res) => {
  try {
    const id = req.params.id || req.body.id;

    if (!id) {
      return res.status(400).json({
        message: "El id del alistamiento es obligatorio",
      });
    }

    const result = await deleteAlistamiento(id);
    res.status(200).json(result);
  } catch (err) {
    res.status(400).json({
      message: err?.message ?? "Error al eliminar el alistamiento",
      error: err.message,
    });
  }
};

// GET /alistamientos/dropdown
export const getDropdown = async (req, res) => {
  try {
    const filters = req.query || {};
    const result = await getAlistamientosDropdown(null, filters);
    res.status(200).json(result);
  } catch (err) {
    console.error("Error al obtener alistamientos para dropdown:", err);
    res.status(500).json({
      message: err?.message ?? "Error al obtener los alistamientos",
      error: err.message,
    });
  }
};
