import type { NextFunction, Request, Response } from "express";
import { config } from "../config.js";

export function apiKeyAuth(req: Request, res: Response, next: NextFunction): void {
  const key = req.header("X-API-Key");
  if (!config.apiKey || key === config.apiKey) {
    next();
    return;
  }
  res.status(401).json({ error: "Unauthorized" });
}
