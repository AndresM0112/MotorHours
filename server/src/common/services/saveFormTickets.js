// src/queues/processors/createInformeTicket.pdf.js
import path from "path";
import fs from "fs/promises";
import { fileURLToPath } from "url";
// import Handlebars from "handlebars";
import { PDFDocument, StandardFonts, rgb, PDFName } from "pdf-lib";
import axios from "axios";

// import puppeteer from "puppeteer";
import Handlebars from "handlebars";
import puppeteer from "puppeteer";
import moment from "moment";
import { getConnection, releaseConnection } from "../configs/db.config.js";
// import { getTicketById } from "../../modules/admin/tickets/tickets.service.js";
import { getTicketDataPDF } from "../../modules/admin/tickets/tickets.service.js";
import { downloadFile } from "../microsftGraph/funciones.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- util: leer imagen y convertir a Base64 ---
async function getBase64Image(filePath) {
  const image = await fs.readFile(filePath);
  const base64 = image.toString("base64");
  return `data:image/png;base64,${base64}`;
}

// --- Cache para plantillas HBS ---
const templateCache = new Map();

// async function renderTemplate(filePath, viewModel) {
//   let tpl = templateCache.get(filePath);
//   if (!tpl) {
//     const source = await fs.readFile(filePath, "utf-8");
//     Handlebars.registerHelper("ifEquals", (a, b, options) =>
//       a == b ? options.fn(this) : options.inverse(this)
//     );
//     tpl = Handlebars.compile(source, { noEscape: true });
//     templateCache.set(filePath, tpl);
//   }
//   return tpl(viewModel);
// }

// --- Generar PDF desde HTML ---

async function renderTemplate(filePath, viewModel) {
  const source = await fs.readFile(filePath, "utf-8");
  Handlebars.registerHelper("ifEquals", (a, b, options) =>
    a == b ? options.fn(this) : options.inverse(this)
  );
  const tpl = Handlebars.compile(source, { noEscape: true });
  return tpl(viewModel);
}


export async function htmlToPDF({ html, pdfPath }) {
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const page = await browser.newPage();
    await page.setContent(html, {
      waitUntil: ["domcontentloaded", "networkidle0"],
    });
    await page.pdf({
      path: pdfPath,
      format: "A4",
      printBackground: true,
      margin: { top: "5mm", right: "5mm", bottom: "6mm", left: "5mm" },
      preferCSSPageSize: true,
    });
  } finally {
    await browser.close();
  }
}

export async function htmlToPDFBuffer(html) {
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  try {
    const page = await browser.newPage();
    await page.setContent(html, {
      waitUntil: ["domcontentloaded", "networkidle0"],
    });
    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "5mm", right: "5mm", bottom: "6mm", left: "5mm" },
      preferCSSPageSize: true,
    });
    return pdfBuffer;
  } finally {
    await browser.close();
  }
}

// --- Merge PDF principal + evidencias PDF y crear links internos ---
// --- Merge PDF principal + evidencias PDF y crear links internos ---
// --- Merge PDF principal + evidencias PDF (sin pintar índice con pdf-lib) ---
async function mergeTicketWithEvidencePdfs(mainPdfBuffer, evidencias = []) {
  const mergedPdf = await PDFDocument.load(mainPdfBuffer);

  // Solo PDFs, no imágenes
  const evidenciasPdf = (evidencias || []).filter((e) => {
    if (e.isImage) return false;
    const name = (e.nombre || "").toLowerCase();
    const mime = (e.mimetype || "").toLowerCase();
    return mime.includes("pdf") || name.endsWith(".pdf");
  });

  if (!evidenciasPdf.length) {
    const bytes = await mergedPdf.save();
    return Buffer.from(bytes);
  }

  for (const ev of evidenciasPdf) {
    try {
      if (!ev.url) continue;

      const resp = await axios.get(ev.url, { responseType: "arraybuffer" });
      const evBuffer = Buffer.from(resp.data);

      const evDoc = await PDFDocument.load(evBuffer);
      const evPages = await mergedPdf.copyPages(evDoc, evDoc.getPageIndices());

      for (const p of evPages) {
        mergedPdf.addPage(p);
      }
    } catch (error) {
      console.error("❌ Error agregando evidencia PDF:", ev.nombre, error.message);
    }
  }

  const finalBytes = await mergedPdf.save();
  return Buffer.from(finalBytes);
}




// --- Armar ViewModel (estructura de datos para el template) ---
// function buildVMFromTicket(ticket) {
//   return {
//     logolamayoristanew: ticket.logolamayoristanew,
//     hoy: moment().format("DD/MM/YYYY"),

//     // Datos del ticket
//     ticketId: ticket.tktId,
//     descripcion: ticket.descripcion,
//     prioridad: ticket.prioridadId, // puedes mapear el label luego
//     estado: ticket.estadoId,
//     asignado: ticket.asignado || "Sin asignar",
//     fechaRegistro: moment(ticket.fechaRegistro).format("DD/MM/YYYY HH:mm"),
//     fechaActualizacion: moment(ticket.fechaActualizacion).format("DD/MM/YYYY HH:mm"),

//     // Historial (acciones)
//     historial: ticket.historial.map((h) => ({
//       fecha: moment(h.fecha).format("DD/MM/YYYY HH:mm"),
//       comentario: h.comentario || "-",
//       accionId: h.accionId,
//       estadoNuevoId: h.estadoNuevoId,
//       usuarioId: h.usuarioId,
//     })),

//     // Evidencias (imágenes)
//     evidencias: ticket.evidencias.map((e) => ({
//       nombre: e.nombre,
//       url: e.urlpublica || e.urllocal || null,
//       tipo: e.tipo,
//     })),
//   };
// }

function buildVMFromTicket(ticket) {
  const evidencias = ticket.evidencias || [];

  const mapEvidencia = (e) => ({
    nombre: e.nombre,
    url: e.url || e.urlpublica || e.urllocal || null,
    tipo: Number(e.tipo),
    isImage: !!e.isImage, // viene marcado en generateHTMLInformeTicket
    icon: e.icon || null, 
  });
  
  const evidenciasIniciales = evidencias
    .filter((e) => Number(e.tipo) === 1)
    .map(mapEvidencia);

  const evidenciasProceso = evidencias
    .filter((e) => Number(e.tipo) === 2)
    .map(mapEvidencia);

  const evidenciasFinales = evidencias
    .filter((e) => Number(e.tipo) === 3)
    .map(mapEvidencia);

  // 👇 Derivados “bonitos” para el template
  const solicitanteNombre =
    ticket.cliente?.nombreCompleto || ticket.cliente?.nombre || "Sin cliente";

  const bloqueNombre = ticket.bloque?.nombre || "Sin bloque";

  const localNombre =
    ticket.local?.nombre || ticket.localizacion?.nombre || "Sin local";

  // const solucionComentario =
  //   ticket.historial?.find((h) => h.comentario)?.comentario ||
  //   "No hay comentarios";

  const historial = ticket.historial || [];

  const solucionCierre = [...historial].reverse().find(
    (h) =>
      h.comentario &&
      String(h.comentario).trim() !== "" &&
      Number(h.estadoNuevoId) === 4 // ejemplo: 4 = Cerrado
  );

  const solucionComentario =
    solucionCierre?.comentario ||
    [...historial]
      .reverse()
      .find((h) => h.comentario && String(h.comentario).trim() !== "")
      ?.comentario ||
    "No hay comentarios";

    

  return {
    // Logo
    logo: ticket.logolamayoristanew || null,
    hoy: moment().format("DD/MM/YYYY"),

    // Datos del ticket
    idTicket: ticket.tktId,
    descripcion: ticket.descripcion,
    prioridad: ticket.prioridad?.nombre || "Sin definir",
    estado: ticket.estado?.nombre || "Sin definir",
    responsable: ticket.asignado?.nombre || "Sin asignar",
    fechaRegistro: moment(ticket.fechaRegistro).format("DD/MM/YYYY HH:mm"),
    fechaActualizacion: moment(ticket.fechaActualizacion).format(
      "DD/MM/YYYY HH:mm"
    ),

    // Datos relacionados
    solicitante: solicitanteNombre,
    area: ticket.area?.nombre || "-",
    prioridad: ticket.prioridad?.nombre || "-", // o cambia según tu modelo
    local: localNombre,
    bloque: bloqueNombre,
    propietario: solicitanteNombre,
    solucion: solucionComentario,

    // Evidencias
    // evidencias: (ticket.evidencias || []).map(e => e.urlpublica || e.urllocal),
    // evidencias: (ticket.evidencias || []).map((e) => ({
    //   nombre: e.nombre,
    //   url: e.url || e.urlpublica || e.urllocal || null,
    //   tipo: e.tipo,
    // })),

    evidenciasIniciales,
    evidenciasProceso,
    evidenciasFinales,
  };
}




// --- Función principal ---
export async function generateHTMLInformeTicket({ tktId }, connection = null) {
  if (!tktId) return;

  let conn = connection;
  let release = false;

  if (!conn) {
    conn = await getConnection();
    release = true;
  }

  const TPL_DIR = path.resolve(__dirname, "../templates/");
  const TPL_LOGO = path.resolve(__dirname, "../images/");
  const pathLogo = path.join(TPL_LOGO, "lamayoristanew.png");
  const logolamayoristanew = await getBase64Image(pathLogo);

  const pathFileIcon = path.join(TPL_LOGO, "file_icon.png");
  const fileIcon = await getBase64Image(pathFileIcon);

  const TPL_TICKET = path.join(TPL_DIR, "ticket-informe.hbs");

  try {
    const ticket = await getTicketDataPDF(tktId, conn);
    console.log("📄 Datos del ticket para PDF:", ticket);
    if (!ticket) throw new Error(`Ticket ${tktId} no encontrado o eliminado.`);

    // Agregar logo
    ticket.logolamayoristanew = logolamayoristanew;

    // --- 🔹 Preparar evidencias ---
    const evidenciasPreparadas = await Promise.all(
      (ticket.evidencias || []).map(async (e) => {
        try {
          let finalUrl = null;

          if (e.fileId) {
            const { downloadUrl } = await downloadFile(e.fileId);
            finalUrl = downloadUrl; // 👈 ya es absoluta
          } else {
            finalUrl = e.urlpublica || e.urllocal || null;
          }

          if (!finalUrl) return null;

          const mimetype = e.mimetype || "";
          const isImage = /^image\//i.test(mimetype);

          return {
            nombre: e.nombre,
            tipo: e.tipo,
            url: finalUrl,
            mimetype,
            isImage,
            icon: isImage ? null : fileIcon,
          };
        } catch (err) {
          console.error("Error obteniendo evidencia:", e.nombre, err.message);
          return null;
        }
      })
    );

    ticket.evidencias = evidenciasPreparadas.filter(Boolean);

    // ticket.evidencias = ticket.evidenciasBase64.map(e => e.base64);

    // Construir viewModel
    const vm = buildVMFromTicket(ticket);

    console.log("🖼️ Evidencias convertidas:", ticket.evidencias.slice(0, 2));

    // Renderizar HTML con Handlebars
    const html = await renderTemplate(TPL_TICKET, vm);

    // // --- Guardar HTML temporal para revisión ---
    // const htmlTempPath = path.join(
    //   __dirname,
    //   `../../temp_informe_ticket_${tktId}.html`
    // );
    // await fs.writeFile(htmlTempPath, html, "utf-8");
    // console.log("✅ HTML temporal generado en:", htmlTempPath);

    // Nombre de archivo
    const today = moment().format("YYYYMMDD_HHmm");
    const safe = (txt) => String(txt || "").replace(/[^\w.-]+/g, "_");
    const baseName = `Informe_Ticket_${safe(ticket.tktId)}_${today}`;
    const extension = "pdf";

    return { success: true, filename: baseName, html, extension, data: ticket };
  } catch (err) {
    console.error("[createInformeTicket][PDF] Error:", err);
    throw err;
  } finally {
    if (release) releaseConnection(conn);
  }
}

//Merge del PDF 
export async function generateTicketPdfWithMerge({ tktId }) {
  if (!tktId) {
    throw new Error("tktId requerido para generar el PDF del ticket");
  }

  // 1) Generar HTML + data del ticket (ya usas esta función)
  const { success, filename, html, extension, data: ticket } =
    await generateHTMLInformeTicket({ tktId });

  if (!success) {
    throw new Error(`No se pudo generar HTML para ticket ${tktId}`);
  }

  // 2) Generar PDF base con Puppeteer
  const mainPdfBuffer = await htmlToPDFBuffer(html);

  // 3) Hacer merge con evidencias PDF + agregar índice/links
  const finalPdfBuffer = await mergeTicketWithEvidencePdfs(
    mainPdfBuffer,
    ticket.evidencias || []
  );

  return {
    buffer: finalPdfBuffer,
    filename,
    extension, // "pdf"
  };
}