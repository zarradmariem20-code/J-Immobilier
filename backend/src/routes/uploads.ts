import { randomUUID } from "node:crypto";
import express, { Router } from "express";
import { createClient } from "@supabase/supabase-js";
import { requireAuth } from "../middleware/auth.js";
import {
  generateVideoUploadUrl,
  getR2ConfigurationIssue,
  isR2Configured,
  uploadVideoBuffer,
  uploadVideoPreviewBuffer,
} from "../services/r2.js";
import { processImage } from "../utils/imageProcessing.js";
import { generateVideoPreview } from "../utils/videoPreview.js";

const router = Router();
const MEDIA_BUCKET = "listing-media";

function buildMediaObjectPath(filename: string, folder: "photos" | "videos") {
  const extension = filename.includes(".")
    ? filename.split(".").pop()?.toLowerCase() || (folder === "videos" ? "mp4" : "jpg")
    : folder === "videos"
      ? "mp4"
      : "jpg";

  return `${folder}/${new Date().toISOString().slice(0, 10)}/${Date.now()}-${randomUUID()}.${extension}`;
}

function createSupabaseStorageClient(authHeader: string) {
  const supabaseUrl = process.env.SUPABASE_URL?.trim();
  const supabasePublishableKey = process.env.SUPABASE_PUBLISHABLE_DEFAULT_KEY?.trim();

  if (!supabaseUrl || !supabasePublishableKey) {
    throw new Error("Le serveur n'a pas la configuration Supabase requise pour les photos.");
  }

  return createClient(supabaseUrl, supabasePublishableKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    global: {
      headers: {
        Authorization: authHeader,
      },
    },
  });
}

router.post("/video-sign", requireAuth, async (req, res, next) => {
  try {
    if (!isR2Configured()) {
      res.status(503).json({
        error: getR2ConfigurationIssue() || "Le service de televersement video n'est pas configure sur le serveur.",
      });
      return;
    }

    const filename = typeof req.body?.filename === "string" ? req.body.filename.trim() : "";
    const contentType = typeof req.body?.content_type === "string" ? req.body.content_type.trim() : "";

    if (!filename || filename.length > 255) {
      res.status(400).json({ error: "Nom de fichier invalide." });
      return;
    }

    if (!/^video\//i.test(contentType)) {
      res.status(400).json({ error: "Le type de contenu doit etre une video." });
      return;
    }

    const result = await generateVideoUploadUrl(filename, contentType);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.put("/video-upload", requireAuth, express.raw({ type: "video/*", limit: "250mb" }), async (req, res, next) => {
  try {
    if (!isR2Configured()) {
      res.status(503).json({
        error: getR2ConfigurationIssue() || "Le service de televersement video n'est pas configure sur le serveur.",
      });
      return;
    }

    const filenameHeader = req.headers["x-upload-filename"];
    const filename = typeof filenameHeader === "string" ? filenameHeader.trim() : "";
    const contentType = typeof req.headers["content-type"] === "string" ? req.headers["content-type"].trim() : "";

    if (!filename || filename.length > 255) {
      res.status(400).json({ error: "Nom de fichier invalide." });
      return;
    }

    if (!/^video\//i.test(contentType)) {
      res.status(400).json({ error: "Le type de contenu doit etre une video." });
      return;
    }

    if (!Buffer.isBuffer(req.body) || req.body.length === 0) {
      res.status(400).json({ error: "Aucune video n'a ete transmise." });
      return;
    }

    const result = await uploadVideoBuffer(filename, contentType, req.body);

    let previewUrl: string | null = null;
    try {
      const previewBuffer = await generateVideoPreview(req.body, filename);
      const previewKey = result.key.replace(/\.[^.]+$/, "-preview.webm");
      const previewResult = await uploadVideoPreviewBuffer(previewKey, previewBuffer);
      previewUrl = previewResult.publicUrl;
    } catch {
      // Preview generation is best-effort; don't fail the upload
    }

    res.json({ publicUrl: result.publicUrl, key: result.key, previewUrl });
  } catch (error) {
    next(error);
  }
});

router.post("/video-preview", requireAuth, async (req, res, next) => {
  try {
    if (!isR2Configured()) {
      res.status(503).json({
        error: getR2ConfigurationIssue() || "Le service de televersement video n'est pas configure sur le serveur.",
      });
      return;
    }

    const videoUrl = typeof req.body?.videoUrl === "string" ? req.body.videoUrl.trim() : "";
    const videoKey = typeof req.body?.videoKey === "string" ? req.body.videoKey.trim() : "";

    if (!videoUrl || !videoKey) {
      res.status(400).json({ error: "videoUrl et videoKey sont requis." });
      return;
    }

    const previewKey = videoKey.replace(/\.[^.]+$/, "-preview.webm");

    const response = await fetch(videoUrl);
    if (!response.ok) {
      res.status(502).json({ error: "Impossible de telecharger la video depuis le stockage." });
      return;
    }

    const videoBuffer = Buffer.from(await response.arrayBuffer());

    let previewBuffer: Buffer;
    try {
      previewBuffer = await generateVideoPreview(videoBuffer, videoKey);
    } catch {
      res.status(500).json({ error: "Impossible de generer l'apercu video." });
      return;
    }

    const previewResult = await uploadVideoPreviewBuffer(previewKey, previewBuffer);
    res.json({ previewUrl: previewResult.publicUrl, previewKey });
  } catch (error) {
    next(error);
  }
});

router.put("/photo-upload", requireAuth, express.raw({ type: "image/*", limit: "40mb" }), async (req, res, next) => {
  try {
    const authHeader = req.header("authorization");
    if (!authHeader) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const filenameHeader = req.headers["x-upload-filename"];
    const filename = typeof filenameHeader === "string" ? filenameHeader.trim() : "";
    const contentType = typeof req.headers["content-type"] === "string" ? req.headers["content-type"].trim() : "";

    if (!filename || filename.length > 255) {
      res.status(400).json({ error: "Nom de fichier invalide." });
      return;
    }

    if (!/^image\//i.test(contentType)) {
      res.status(400).json({ error: "Le type de contenu doit etre une image." });
      return;
    }

    if (!Buffer.isBuffer(req.body) || req.body.length === 0) {
      res.status(400).json({ error: "Aucune photo n'a ete transmise." });
      return;
    }

    const supabase = createSupabaseStorageClient(authHeader);
    const basePath = buildMediaObjectPath(filename, "photos").replace(/\.[^.]+$/, "");

    let sizes;
    try {
      sizes = await processImage(req.body);
    } catch {
      const fallbackPath = `${basePath}.jpg`;
      const { error: uploadError } = await supabase.storage.from(MEDIA_BUCKET).upload(fallbackPath, req.body, {
        cacheControl: "3600",
        upsert: false,
        contentType,
      });
      if (uploadError) {
        res.status(500).json({ error: `Impossible d'envoyer la photo : ${uploadError.message}` });
        return;
      }
      const { data } = supabase.storage.from(MEDIA_BUCKET).getPublicUrl(fallbackPath);
      res.json({ publicUrl: data?.publicUrl ?? "", mediumUrl: data?.publicUrl ?? "", thumbUrl: data?.publicUrl ?? "", path: fallbackPath });
      return;
    }

    const [fullResult, mediumResult, thumbResult] = await Promise.all([
      supabase.storage.from(MEDIA_BUCKET).upload(`${basePath}-full.webp`, sizes.full.buffer, {
        cacheControl: "3600",
        upsert: false,
        contentType: "image/webp",
      }),
      supabase.storage.from(MEDIA_BUCKET).upload(`${basePath}-medium.webp`, sizes.medium.buffer, {
        cacheControl: "3600",
        upsert: false,
        contentType: "image/webp",
      }),
      supabase.storage.from(MEDIA_BUCKET).upload(`${basePath}-thumb.webp`, sizes.thumb.buffer, {
        cacheControl: "3600",
        upsert: false,
        contentType: "image/webp",
      }),
    ]);

    const uploadError = fullResult.error || mediumResult.error || thumbResult.error;
    if (uploadError) {
      res.status(500).json({ error: `Impossible d'envoyer la photo : ${uploadError.message}` });
      return;
    }

    const fullUrl = supabase.storage.from(MEDIA_BUCKET).getPublicUrl(`${basePath}-full.webp`).data?.publicUrl ?? "";
    const mediumUrl = supabase.storage.from(MEDIA_BUCKET).getPublicUrl(`${basePath}-medium.webp`).data?.publicUrl ?? "";
    const thumbUrl = supabase.storage.from(MEDIA_BUCKET).getPublicUrl(`${basePath}-thumb.webp`).data?.publicUrl ?? "";

    res.json({ publicUrl: mediumUrl, mediumUrl, thumbUrl, fullUrl, path: `${basePath}-medium.webp` });
  } catch (error) {
    next(error);
  }
});

export default router;