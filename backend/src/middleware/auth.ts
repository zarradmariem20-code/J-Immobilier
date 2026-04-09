import type { Request, Response, NextFunction } from "express";

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.header("authorization");

  if (!authHeader) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  next();
}
