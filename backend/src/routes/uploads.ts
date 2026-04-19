import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { generateVideoUploadUrl } from "../services/r2.js";

const router = Router();

router.post("/video-sign", requireAuth, async (req, res, next) => {
  try {
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

export default router;