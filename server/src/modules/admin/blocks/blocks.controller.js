import {
// BLOQUES
  getAllBlocks,
  getBlockById,
  paginateBlocks,
  saveBlock,
  deleteBlocks,

  // LOCALES
  getLocalesByBlockId,
  saveLocal,
  updateLocal,
  deleteLocal,
  listLocales,

  // PROPIETARIOS / CLIENTES
  getPropietariosByLocal,
  setPropietariosByLocal,

  // CONSULTAS POR CLIENTE
  getBlocksByClientId,
  getLocalesByBlockAndClient,

  //IMPORTACION MASIVA
 importAllPropertiesAndOwners,
  importAllPropertiesAndOwnersExcel,
} from "./blocks.service.js";

export const getAll = async (_req, res) => {
  try {
    const result = await getAllBlocks();
    res.status(200).json(result);
  } catch (err) {
    res.status(500).json({
      message: err?.message ?? "Error al obtener los bloques",
      error: err.message,
    });
  }
};

export const getById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await getBlockById(id);
    if (!result) return res.status(404).json({ message: "Bloque no encontrado" });
    res.status(200).json(result);
  } catch (err) {
    res.status(500).json({
      message: err?.message ?? "Error al obtener el bloque",
      error: err.message,
    });
  }
};



export const getPaginated = async (req, res) => {
  try {
    const result = await paginateBlocks(req.body);
    res.status(200).json(result);
  } catch (err) {
    res.status(500).json({
      message: err?.message ?? "Error al paginar bloques",
      error: err.message,
    });
  }
};

export const save = async (req, res) => {
  try {
    const result = await saveBlock(req.body);
    res.status(200).json(result);
  } catch (err) {
    res.status(400).json({
      message: err?.message ?? "Error al guardar el bloque",
      error: err.message,
    });
  }
};

export const remove = async (req, res) => {
  try {
    const { ids, usuario } = req.body;
    if (!ids || !usuario)
      return res.status(400).json({ message: "Faltan datos para eliminar" });

    await deleteBlocks(ids, usuario);
    res.status(200).json({ message: "Bloque(s) eliminado(s) correctamente" });
  } catch (err) {
    res.status(500).json({
      message: err?.message ?? "Error al eliminar bloque(s)",
      error: err.message,
    });
  }
};

/* ============================
   LOCALES (antes “etapas”)
   ============================ */

export const getLocalesByBlock = async (req, res) => {
  try {
    const { bloId } = req.params; // usa :bloId en tu ruta
    if (!bloId) return res.status(400).json({ message: "Falta el ID del bloque" });

    const result = await getLocalesByBlockId(bloId);
    res.status(200).json(result);
  } catch (err) {
    res.status(500).json({
      message: err?.message ?? "Error al obtener los locales",
      error: err.message,
    });
  }
};

export const createLocal = async (req, res) => {
  try {
    const result = await saveLocal(req.body);
    res.status(201).json(result);
  } catch (err) {
    res.status(400).json({
      message: err?.message ?? "Error al crear el local",
      error: err.message,
    });
  }
};

export const updateLocalById = async (req, res) => {
  try {
    const { id } = req.params; // id = locId
    const result = await updateLocal(id, req.body);
    res.status(200).json(result);
  } catch (err) {
    res.status(400).json({
      message: err?.message ?? "Error al actualizar el local",
      error: err.message,
    });
  }
};


export const deleteLocalById = async (req, res) => {
  try {
    const { id } = req.params; // id = locId
    const { usuarioActualiza } = req.body;
    await deleteLocal(id, usuarioActualiza);
    res.status(200).json({ message: "Local eliminado correctamente" });
  } catch (err) {
    res.status(500).json({
      message: err?.message ?? "Error al eliminar el local",
      error: err.message,
    });
  }
};

export const getAllLocales = async (req, res) => {
  try {
    const data = await listLocales(); // sin filtros → todos los locales activos /no eliminados
    return res.status(200).json(data);
  } catch (err) {
    return res.status(500).json({
      message: err?.message ?? "Error al listar los locales",
      error: String(err?.message || err),
    });
  }
};

/* ============================
   PROPIETARIOS / ENCARGADOS de LOCAL
   ============================ */

export const getPropietarios = async (req, res) => {
  try {
    const { locId } = req.params;
    if (!locId) return res.status(400).json({ message: "Falta el ID del local" });

    const result = await getPropietariosByLocal(locId);
    res.status(200).json(result);
  } catch (err) {
    res.status(500).json({
      message: err?.message ?? "Error al obtener los propietarios del local",
      error: err.message,
    });
  }
};

export const setPropietarios = async (req, res) => {
  try {
    const { locId } = req.params;
    const { propietariosIds = [], usuario, principalUsuId = null  } = req.body;
    if (!locId || usuario == null)
      return res.status(400).json({ message: "Faltan datos para guardar" });

    const result = await setPropietariosByLocal(locId, propietariosIds, usuario, null, principalUsuId );
    res.status(200).json(result);
  } catch (err) {
    res.status(500).json({
      message: err?.message ?? "Error al guardar propietarios del local",
      error: err.message,
    });
  }
};

/* ============================
   CONSULTAS por CLIENTE
   ============================ */

/** Bloques donde el cliente tiene al menos un local asignado */
export const getBlocksByClient = async (req, res) => {
  try {
    const { clientId } = req.params;
    const result = await getBlocksByClientId(clientId);
    res.status(200).json(result);
  } catch (err) {
    res.status(500).json({
      message: err?.message ?? "Error al obtener los bloques del cliente",
      error: err.message,
    });
  }
};

/** Locales por bloque, filtrable por cliente (opcional) */
export const getLocalesByBlockAndClientController = async (req, res) => {
  try {
    const { bloId } = req.params;
    const { clientId = null } = req.query; // ej: /blocks/:bloId/locales?clientId=123
    if (!bloId) return res.status(400).json({ message: "Falta el ID del bloque" });

    const result = await getLocalesByBlockAndClient({ bloId, clientId });
    res.status(200).json(result);
  } catch (err) {
    res.status(500).json({
      message: err?.message ?? "Error al obtener los locales",
      error: err.message,
    });
  }
};

/* ============================
   IMPORTACIÓN UNIFICADA
   ============================ */

// JSON (bloque + local + propietarios)
export const importProperties = async (req, res) => {
  try {
    const {
      rows = [],
      usuario = req?.user?.username || req?.user?.id || null,
    } = req.body || {};
    const result = await importAllPropertiesAndOwners({ rows, usuario });
    return res.status(200).json(result);
  } catch (err) {
    return res.status(400).json({
      message: err?.message ?? "Error en importación unificada",
      error: err?.message,
    });
  }
};

// Excel (multipart) — usa express-fileupload
export const importPropertiesExcel = async (req, res) => {
  try {
    const fileObj =
      req.files?.file ||
      req.files?.archivo ||
      null;

    if (!fileObj) {
      return res.status(400).json({ message: "Adjunta el archivo Excel en el campo 'file'." });
    }

    const usuario = req?.user?.username || req?.user?.id || null;
    const result = await importAllPropertiesAndOwnersExcel({ fileObj, usuario });
    return res.status(200).json(result);
  } catch (err) {
    return res.status(400).json({
      message: err?.message ?? "Error leyendo el Excel",
      error: err?.message,
    });
  }
};