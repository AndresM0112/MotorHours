import {
  microsoftConnection,
  FileUpload,
  LargeFileUploadTask,
  getRulesSharepoint,
} from "../configs/microsoftGraph.config.js";
import { removeAccents } from "../utils/funciones.js";

// 👇 helper recomendado
const sanitizeName = (s = "") =>
  removeAccents(String(s))
    .replace(/[\\/:*?"<>|#%{}~&]+/g, " ") // caracteres prohibidos en SP
    .replace(/\s+/g, " ")
    .trim();

async function ensurePath(graph, driveId, segments = []) {
  let parentId = null;
  for (const raw of segments) {
    const name = String(raw)
      .replace(/[\\:"*?<>|#%{}~&]/g, "_")
      .trim();
    const ep = parentId
      ? `/drives/${driveId}/items/${parentId}/children`
      : `/drives/${driveId}/root/children`;

    // intenta encontrar
    const list = await graph.api(ep).get();
    const hit = (list?.value || []).find((i) => i?.name === name && i?.folder);
    if (hit) {
      parentId = hit.id;
      continue;
    }

    // crea si no existe
    const created = await graph.api(ep).post({
      name,
      folder: {},
      "@microsoft.graph.conflictBehavior": "replace",
    });
    parentId = created.id;
  }
  return parentId;
}

export const eliminarArchivoSharepoint = async (fileId) => {
  try {
    if (!fileId) {
      throw new Error("El ID del archivo es requerido.");
    }

    const client = await microsoftConnection();
    const { biblioteca: driveId } = await getRulesSharepoint();

    // Intentar eliminar el archivo
    await client.api(`/drives/${driveId}/items/${fileId}`).delete();

    return {
      status: 200,
      mensaje: `Archivo con ID ${fileId} eliminado correctamente.`,
    };
  } catch (error) {
    if (error?.statusCode === 404) {
      return {
        status: 404,
        mensaje: "El archivo no existe o ya fue eliminado.",
      };
    }

    console.error("Error al eliminar archivo de SharePoint:", error);
    return {
      status: 500,
      mensaje: error.message || "Error al eliminar archivo de SharePoint",
    };
  }
};

async function resolveModuleFolderId({
  graph,
  driveId,
  moduleName, // p.ej. "Sistema Gestion de tickets La Mayorista"
  dbFolderId, // rules?.carpeta (puede venir null)
}) {
  const rootId = await ensurePath(graph, driveId, ["LA MAYORISTA"]);

  if (dbFolderId) {
    try {
      const item = await graph
        .api(`/drives/${driveId}/items/${dbFolderId}`)
        .select("id,name,folder,parentReference")
        .get();

      const isFolder = !!item?.folder;
      const parentId = item?.parentReference?.id || null;

      if (isFolder && parentId === rootId) {
        // OK: el folder del módulo es válido y cuelga de la raíz global
        return { moduleFolderId: item.id, rootId };
      }
      // Si no cuelga del root o no es folder, se ignora y se recrea abajo.
    } catch (e) {
      // si 404 u otro error, seguimos a crear
    }
  }

  // 3) Crear/asegurar el folder del módulo bajo la raíz global
  const moduleFolderId = await ensurePath(graph, driveId, [
    "LA MAYORISTA",
    moduleName,
  ]);

  return { moduleFolderId, rootId };
}

export async function cargarASharepoint(
  tktId,
  tipo, // 1 = INICIAL, 2 = FINAL
  doc, // { buffer, extension, originalname, mimetype, nombre }
  fileIdPrev = null,
  usuarioId = null, // opcional: útil para auditoría en BD
  metadata = {} // opcional: { clienteNombre, bloqueNombre, localNombre }
) {
  if (!tktId) throw new Error("tktId requerido.");
  if (![1, 2, 3].includes(Number(tipo)))
    throw new Error("tipo inválido (1=inicial, 2 =proceso, 3=final).");

  const { buffer, extension, originalname, nombre } = doc || {};

  if (!buffer) throw new Error("Buffer de archivo requerido.");
  if (!extension) throw new Error("Extensión requerida.");
  if (!originalname && !nombre) {
    throw new Error("El nombre del archivo está vacío o indefinido.");
  }

  //   const nombreOrigin = originalname?.split(".")[0];

  //   let filenameSanitized = nombre
  //     ? `${removeAccents(nombre)}_.${extension}`
  //     : `${removeAccents(nombreOrigin)}_.${extension}`;

  const baseName = sanitizeName((originalname || nombre).split(".")[0]);
  const ext = String(extension || "").toLowerCase();
  let filenameSanitized = `${baseName}_.${ext}`;
  const TIPO_LABEL = Number(tipo) === 1 ? "INICIAL" : Number(tipo)  === 2 ? "PROCESO" : "FINAL";

  try {
    const client = await microsoftConnection();
    const { biblioteca: driveId, carpeta: dbFolderId } =
      await getRulesSharepoint();

    // 0) Resolver/validar el folder del módulo bajo la raíz global
    const MODULE_NAME = "Sistema Gestion de tickets La Mayorista";
    const { moduleFolderId } = await resolveModuleFolderId({
      graph: client,
      driveId,
      moduleName: MODULE_NAME,
      dbFolderId, // opcional: el que tienes en BD
    });

    const basePath = `/drives/${driveId}/items`;

    // 1) Si se pasó un fileId_ eliminar primero (si existe)
    if (fileIdPrev) {
      try {
        await client.api(`/drives/${driveId}/items/${fileIdPrev}`).get();
        await client.api(`/drives/${driveId}/items/${fileIdPrev}`).delete();
      } catch (err) {
        if (err?.statusCode !== 404) {
          console.log(`Error al verificar/eliminar archivo:`, err?.message);
        }
      }
    }

    // 2) Crear/obtener carpeta del Ticket: TICKET_000123
    const ticketFolderName = `TICKET_${String(tktId).padStart(6, "0")}`;
    const moduleChildrenEP = `${basePath}/${moduleFolderId}/children`;

    const ticketFolder = await client
      .api(moduleChildrenEP)
      .get()
      .then((res) => {
        const found = (res?.value || []).find(
          (item) => item?.name === ticketFolderName && item?.folder
        );
        if (found) return found;
        return client.api(moduleChildrenEP).post({
          name: ticketFolderName,
          folder: {},
          "@microsoft.graph.conflictBehavior": "replace",
        });
      });

    // 3) Crear/obtener subcarpeta por tipo (INICIAL / FINAL)
    const tipoChildrenEP = `${basePath}/${ticketFolder.id}/children`;
    const tipoFolder = await client
      .api(tipoChildrenEP)
      .get()
      .then((res) => {
        const found = (res?.value || []).find(
          (item) => item?.name === TIPO_LABEL && item?.folder
        );
        if (found) return found;
        return client.api(tipoChildrenEP).post({
          name: TIPO_LABEL,
          folder: {},
          "@microsoft.graph.conflictBehavior": "replace",
        });
      });

    // 4) Crear upload session
    let uploadSessionUrl = `${basePath}/${tipoFolder.id}:/${encodeURIComponent(
      filenameSanitized
    )}:/createUploadSession`;

    const fileSize = buffer.length;
    const payload = {
      properties: {
        documentName: filenameSanitized,
        contentType: doc?.mimetype,
        size: fileSize,
      },
    };

    let uploadSession;
    try {
      uploadSession = await LargeFileUploadTask.createUploadSession(
        client,
        uploadSessionUrl,
        payload
      );
    } catch (error) {
      if (error?.code === "nameAlreadyExists" || error?.statusCode === 409) {
        const timestamp = Date.now();
        filenameSanitized = `${filenameSanitized.replace(
          `.${extension}`,
          ""
        )}_${timestamp}.${extension}`;
        console.log(
          `⚠️ Archivo ya existía, se renombró a: ${filenameSanitized}`
        );

        uploadSessionUrl = `${basePath}/${tipoFolder.id}:/${encodeURIComponent(
          filenameSanitized
        )}:/createUploadSession`;

        uploadSession = await LargeFileUploadTask.createUploadSession(
          client,
          uploadSessionUrl,
          payload
        );
      } else {
        throw error;
      }
    }

    // 4) Subir archivo
    const fileObject = new FileUpload(buffer, filenameSanitized, fileSize);
    const task = new LargeFileUploadTask(client, fileObject, uploadSession);
    const uploadResult = await task.upload();

    const body =
      uploadResult?.responseBody || uploadResult?._responseBody || null;
    const fileId = body?.id;

    // Obtener URLs del archivo
    const fileInfo = await downloadFile(fileId);
    const urlPublica = fileInfo?.downloadUrl || null;
    const urlLocal = fileInfo?.webUrl || null;

    if (!fileId)
      throw new Error("No se obtuvo el ID del archivo después de subirlo");

    return { fileId, filename: filenameSanitized, urlPublica, urlLocal };
  } catch (error) {
    console.error("cargarASharepoint error:", error);
    return {
      status: 500,
      mensaje: error?.message || "Error al subir documento a SharePoint",
      ...error,
    };
  }
}

export const SeeFile = async (fileId) => {
  try {
    const client = await microsoftConnection();
    const { biblioteca: library } = await getRulesSharepoint();

    const preview = await client
      .api(`/drives/${library}/items/${fileId}/preview`)
      .post({ zoom: "1.0" });

    return {
      // preview: preview?.getUrl
      preview: preview?.getUrl || preview?.webUrl,
    };
  } catch (error) {
    console.error("Error en View Sharepoint:", error);
    throw { mensaje: "Error al visualizar archivo" };
  }
};

export const downloadFile = async (fileId) => {
  try {
    const client = await microsoftConnection();
    const { biblioteca: library } = await getRulesSharepoint();

    if (!fileId) {
      return { mensaje: "El ID del archivo es requerido" };
    }

    const [file, down] = await Promise.all([
      client
        .api(`/drives/${library}/items/${fileId}`)
        .select("id,name,webUrl")
        .get(),
      client
        .api(`/drives/${library}/items/${fileId}`)
        .select("@microsoft.graph.downloadUrl")
        .get(),
    ]);

    if (!file && !down) {
      return { mensaje: "Archivo no encontrado" };
    }
    const dataSherpoint = {
      id: file?.id,
      name: file?.name,
      webUrl: file?.webUrl,
      downloadUrl: down["@microsoft.graph.downloadUrl"],
    };
    return dataSherpoint;
  } catch (error) {
    console.error("Error en downloadFile:", error);
    return { mensaje: "Error al descargar archivo" };
  }
};
