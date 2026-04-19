import express, { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import {
  generateVideoUploadUrl,
  getR2ConfigurationIssue,
  isR2Configured,
  uploadVideoBuffer,
} from "../services/r2.js";

const router = Router();

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

export default router;