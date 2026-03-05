import express from "express";
import axios from "axios";
import NodeCache from "node-cache";
import crypto from "crypto";
// import crypto from "crypto";
// import {
//   microsoftConnection,
//   getRulesSharepoint,
// } from "../configs/microsoftGraph.config.js";
import { microsoftConnection, getRulesSharepoint } from "../configs/microsoftGraph.config.js";


const routerGraph = express.Router();

/** === Configurables por ENV (opcionales) === */
const THUMB_CACHE_TTL = Number(process.env.THUMB_CACHE_TTL || 23200); // seg
const PUBLIC_MAX_AGE = Number(process.env.THUMB_PUBLIC_MAX_AGE || 23200); // seg
const FORCE_JPEG = String(process.env.THUMB_FORCE_JPEG || "true") === "true";
const DEFAULT_SIZE = (process.env.THUMB_DEFAULT_SIZE || "large").toLowerCase();

const cache = new NodeCache({ stdTTL: THUMB_CACHE_TTL, useClones: false });

function buildSizeSegment(size) {
  const s = String(size || DEFAULT_SIZE).toLowerCase();
  if (["small", "medium", "large", "source"].includes(s)) return s;
  if (/^c\d{2,4}x\d{2,4}$/.test(s)) return s; // c640x480, c1024x768, etc.
  return DEFAULT_SIZE;
}

function makeEtag(buffer) {
  const hash = crypto.createHash("sha1").update(buffer).digest("hex");
  return `"spthumb-${hash}"`;
}

async function resolveDefaultDriveId() {
  const rules = await getRulesSharepoint();
  const driveId = rules?.biblioteca;
  if (!driveId) throw new Error("No se pudo resolver driveId (regla 'biblioteca').");
  return driveId;
}

async function getThumbMeta({ driveId, itemId, size }) {
  const client = await microsoftConnection();

  // Intento directo al tamaño pedido
  const meta = await client
    .api(`/drives/${driveId}/items/${itemId}/thumbnails/0/${size}`)
    .get()
    .catch(() => null);

  if (meta?.url) return meta;

  // Fallback: pedir todos y escoger el mejor
  const set = await client
    .api(`/drives/${driveId}/items/${itemId}/thumbnails`)
    .get()
    .catch(() => null);

  const first = Array.isArray(set?.value) ? set.value[0] : null;
  if (!first) return null;
  return first.large || first.medium || first.small || first.source || null;
}

function sendImageWithCache({ req, res, buffer, contentType, inline = true }) {
  const etag = makeEtag(buffer);

  const ifNoneMatch = req.headers["if-none-match"];
  if (ifNoneMatch && ifNoneMatch === etag) {
    res.setHeader("ETag", etag);
    res.setHeader("Cache-Control", `public, max-age=${PUBLIC_MAX_AGE}`);
    return res.status(304).end();
  }

  res.setHeader("Content-Type", contentType || (FORCE_JPEG ? "image/jpeg" : "image/jpeg"));
  res.setHeader("ETag", etag);
  res.setHeader("Cache-Control", `public, max-age=${PUBLIC_MAX_AGE}`);
  res.setHeader("Vary", "Accept-Encoding");

  if (inline) res.setHeader("Content-Disposition", "inline");

  return res.send(buffer);
}

async function handleThumb(req, res, driveIdInput, itemIdInput) {
  const size = buildSizeSegment(req.query.size);
  const inline = String(req.query.inline || "1") === "1";

  try {
    const driveId = driveIdInput || (await resolveDefaultDriveId());
    const itemId =
      itemIdInput ||
      req.params.itemId ||
      req.params.fileId ||
      req.query.fileId;

    if (!driveId || !itemId) {
      return res
        .status(400)
        .json({ ok: false, message: "driveId y itemId requeridos" });
    }

    const cacheKey = `thumb:${driveId}:${itemId}:${size}`;
    const cached = cache.get(cacheKey);
    if (cached?.buffer) {
      return sendImageWithCache({
        req,
        res,
        buffer: cached.buffer,
        contentType:
          cached.contentType || (FORCE_JPEG ? "image/jpeg" : "image/jpeg"),
        inline,
      });
    }

    const meta = await getThumbMeta({ driveId, itemId, size });
    if (!meta?.url) {
      return res.status(404).json({
        ok: false,
        message: "El ítem no posee thumbnail disponible.",
      });
    }

    const imgResp = await axios.get(meta.url, {
      responseType: "arraybuffer",
      validateStatus: () => true,
    });

    if (imgResp.status >= 400) {
      return res.status(502).json({
        ok: false,
        message: `Fallo al descargar thumbnail (status ${imgResp.status}).`,
      });
    }

    const buffer = Buffer.from(imgResp.data);
    const contentType =
      FORCE_JPEG ? "image/jpeg" : imgResp.headers["content-type"] || "image/jpeg";

    cache.set(cacheKey, { buffer, contentType });

    return sendImageWithCache({ req, res, buffer, contentType, inline });
  } catch (err) {
    console.error("thumb error:", err?.response?.data || err.message || err);
    return res
      .status(500)
      .json({ ok: false, message: "No se pudo obtener thumbnail" });
  }
}

routerGraph.get("/thumb/:itemId", async (req, res) => {
  return handleThumb(req, res, null, req.params.itemId);
});

export default routerGraph;
