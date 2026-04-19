import { randomUUID } from "node:crypto";
import express, { Router } from "express";
import { createClient } from "@supabase/supabase-js";
import { requireAuth } from "../middleware/auth.js";
import {
  generateVideoUploadUrl,
  getR2ConfigurationIssue,
  isR2Configured,
  uploadVideoBuffer,
} from "../services/r2.js";

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
    res.json(result);
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
    const filePath = buildMediaObjectPath(filename, "photos");
    const { error } = await supabase.storage.from(MEDIA_BUCKET).upload(filePath, req.body, {
      cacheControl: "3600",
      upsert: false,
      contentType,
    });

    if (error) {
      res.status(500).json({ error: `Impossible d'envoyer la photo : ${error.message}` });
      return;
    }

    const { data } = supabase.storage.from(MEDIA_BUCKET).getPublicUrl(filePath);

    if (!data?.publicUrl) {
      res.status(500).json({ error: "Impossible de recuperer l'URL publique de la photo." });
      return;
    }

    res.json({ publicUrl: data.publicUrl, path: filePath });
  } catch (error) {
    next(error);
  }
});

export default router;