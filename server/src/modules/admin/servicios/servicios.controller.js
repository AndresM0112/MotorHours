import {
  getServicios,
  getServicioById,
  paginateServicios,
  saveServicio,
  deleteServicio,
  getServiciosDropdown,
  changeServicioStatus,
} from "./servicios.service.js";

// GET /servicios
export const getAll = async (_req, res) => {
  try {
    const result = await getServicios();
    res.status(200).json(result);
  } catch (err) {
    res.status(500).json({
      message: err?.message ?? "Error al obtener los servicios",
      error: err.message,
    });
  }
};

// GET /servicios/:id
export const getById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await getServicioById(id);
    if (!result) {
      return res.status(404).json({ message: "Servicio no encontrado" });
    }
    res.status(200).json(result);
  } catch (err) {
    res.status(500).json({
      message: err?.message ?? "Error al obtener el servicio",
      error: err.message,
    });
  }
};

// POST /servicios/paginate
export const getPaginated = async (req, res) => {
  try {
    const result = await paginateServicios(req.body);
    res.status(200).json(result);
  } catch (err) {
    res.status(500).json({
      message: err?.message ?? "Error al paginar servicios",
      error: err.message,
    });
  }
};

// POST /servicios/save (crear o editar)
export const save = async (req, res) => {
  try {
    const body = { ...req.body };

    // Si viene id por params (PUT /:id), lo ponemos en el payload
    if (req.params?.id) {
      body.id = Number(req.params.id);
    }

    body.updatedBy = req.user?.nombre ?? null;

    const result = await saveServicio(body);
    res.status(200).json(result);
  } catch (err) {
    res.status(400).json({
      message: err?.message ?? "Error al guardar el servicio",
      error: err.message,
    });
  }
};

// DELETE /servicios/:id
export const remove = async (req, res) => {
  try {
    const id = req.params.id || req.body.id;

    if (!id) {
      return res.status(400).json({
        message: "El id del servicio es obligatorio",
      });
    }

    const result = await deleteServicio(id);
    res.status(200).json(result);
  } catch (err) {
    res.status(400).json({
      message: err?.message ?? "Error al eliminar el servicio",
      error: err.message,
    });
  }
};

// GET /servicios/dropdown
export const getDropdown = async (req, res) => {
  try {
    const filters = req.query || {};
    const result = await getServiciosDropdown(null, filters);
    res.status(200).json(result);
  } catch (err) {
    console.error("Error al obtener servicios para dropdown:", err);
    res.status(500).json({
      message: err?.message ?? "Error al obtener los servicios",
      error: err.message,
    });
  }
};

// PUT /servicios/:id/status
export const changeStatus = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { statusId, description } = req.body;
    const changedById = req.user?.usuId ?? null;
    const changedByName = req.user?.nombre ?? null;

    if (!id || id <= 0) {
      return res.status(400).json({ message: "ID de servicio inválido" });
    }

    const result = await changeServicioStatus(id, statusId, description, changedById, changedByName);
    res.status(200).json(result);
  } catch (err) {
    res.status(400).json({
      message: err?.message ?? "Error al cambiar el estado del servicio",
      error: err.message,
    });
  }
};
