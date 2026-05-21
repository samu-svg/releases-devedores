import { Request, Response, NextFunction } from "express";
import { supabaseAdmin, createSupabaseClient } from "../config/database.js";
import { SupabaseClient } from "@supabase/supabase-js";

declare global {
  namespace Express {
    interface Request {
      userId: string;
      supabase: SupabaseClient;
    }
  }
}

export async function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ erro: "Token de autenticação não fornecido" });
    return;
  }

  const token = authHeader.slice(7);

  const { data, error } = await supabaseAdmin.auth.getUser(token);

  if (error || !data.user) {
    res.status(401).json({ erro: "Token inválido ou expirado" });
    return;
  }

  req.userId = data.user.id;
  req.supabase = createSupabaseClient(token);
  next();
}
