import {
  getPilotos,
  getPilotoById,
  paginatePilotos,
  savePiloto,
  deletePiloto,
  getPilotosDropdown
} from "./pilotos.service.js";

// GET /pilotos
export const getAll = async (_req, res) => {
  try {
    const result = await getPilotos();
    res.status(200).json(result);
  } catch (err) {
    res.status(500).json({
      message: err?.message ?? "Error al obtener los pilotos",
      error: err.message,
    });
  }
};

// GET /pilotos/:id
export const getById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await getPilotoById(id);
    if (!result) {
      return res.status(404).json({ message: "Piloto no encontrado" });
    }
    res.status(200).json(result);
  } catch (err) {
    res.status(500).json({
      message: err?.message ?? "Error al obtener el piloto",
      error: err.message,
    });
  }
};

// POST /pilotos/paginate
export const getPaginated = async (req, res) => {
  try {
    const result = await paginatePilotos(req.body);
    res.status(200).json(result);
  } catch (err) {
    res.status(500).json({
      message: err?.message ?? "Error al paginar pilotos",
      error: err.message,
    });
  }
};

// POST /pilotos/save (crear o editar)
export const save = async (req, res) => {
  try {
    const body = { ...req.body };

    // Si viene id por params (PUT /:id), lo ponemos en el payload
    if (req.params?.id) {
      body.id = Number(req.params.id);
    }

    const result = await savePiloto(body);
    res.status(200).json(result);
  } catch (err) {
    res.status(400).json({
      message: err?.message ?? "Error al guardar el piloto",
      error: err.message,
    });
  }
};

// DELETE /pilotos/:id
export const remove = async (req, res) => {
  try {
    const id = req.params.id || req.body.id;

    if (!id) {
      return res.status(400).json({
        message: "El id del piloto es obligatorio",
      });
    }

    const result = await deletePiloto(id);
    res.status(200).json(result);
  } catch (err) {
    res.status(400).json({
      message: err?.message ?? "Error al eliminar el piloto",
      error: err.message,
    });
  }
};

// GET /pilotos/dropdown
export const getDropdown = async (req, res) => {
  try {
    const filters = req.query || {};
    const result = await getPilotosDropdown(null, filters);
    res.status(200).json(result);
  } catch (err) {
    console.error("Error al obtener pilotos para dropdown:", err);
    res.status(500).json({
      message: err?.message ?? "Error al obtener los pilotos",
      error: err.message,
    });
  }
};
