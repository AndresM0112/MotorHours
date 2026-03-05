import {
  getMotos,
  getMotoById,
  paginateMotos,
  saveMoto,
  deleteMoto,
  getMotosDropdown
} from "./motos.service.js";

// GET /motos
export const getAll = async (_req, res) => {
  try {
    const result = await getMotos();
    res.status(200).json(result);
  } catch (err) {
    res.status(500).json({
      message: err?.message ?? "Error al obtener las motos",
      error: err.message,
    });
  }
};

// GET /motos/:id
export const getById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await getMotoById(id);
    if (!result) {
      return res.status(404).json({ message: "Moto no encontrada" });
    }
    res.status(200).json(result);
  } catch (err) {
    res.status(500).json({
      message: err?.message ?? "Error al obtener la moto",
      error: err.message,
    });
  }
};

// POST /motos/paginate
export const getPaginated = async (req, res) => {
  try {
    const result = await paginateMotos(req.body);
    res.status(200).json(result);
  } catch (err) {
    res.status(500).json({
      message: err?.message ?? "Error al paginar motos",
      error: err.message,
    });
  }
};

// POST /motos/save   (crear)
// PUT  /motos/:id    (editar)
export const save = async (req, res) => {
  try {
    const body = { ...req.body };

    // Si viene id por params (PUT /:id), lo ponemos en el payload
    if (req.params?.id) {
      body.id = Number(req.params.id);
    }

    const result = await saveMoto(body);
    res.status(200).json(result);
  } catch (err) {
    res.status(400).json({
      message: err?.message ?? "Error al guardar la moto",
      error: err.message,
    });
  }
};

// DELETE /motos/:id
export const remove = async (req, res) => {
  try {
    const id = req.params.id || req.body.id;

    if (!id) {
      return res.status(400).json({
        message: "El id de la moto es obligatorio",
      });
    }

    const result = await deleteMoto(id);
    res.status(200).json(result);
  } catch (err) {
    res.status(400).json({
      message: err?.message ?? "Error al eliminar la moto",
      error: err.message,
    });
  }
};

// GET /motos/dropdown
export const getDropdown = async (req, res) => {
  try {
    const filters = req.query || {};
    const result = await getMotosDropdown(null, filters);
    res.status(200).json(result);
  } catch (err) {
    console.error("Error al obtener motos para dropdown:", err);
    res.status(500).json({
      message: err?.message ?? "Error al obtener las motos",
      error: err.message,
    });
  }
};
