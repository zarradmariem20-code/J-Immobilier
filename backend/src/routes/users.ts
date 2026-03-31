import { Router } from "express";
import { getOrCreateUser } from "../services/user";
import { requireAuth } from "../middleware/auth";

const router = Router();

// POST /api/users/sync
router.post("/sync", requireAuth, async (req, res) => {
  const { email, name, provider } = req.body;
  if (!email) return res.status(400).json({ error: "Missing email" });
  try {
    const user = await getOrCreateUser({ email, name, provider });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: "Failed to sync user" });
  }
});

export default router;
