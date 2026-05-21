import { Request, Response } from "express";
import * as service from "../services/devedoresService.js";

export async function listar(req: Request, res: Response): Promise<void> {
  try {
    const devedores = await service.listarComDividas(req.supabase);
    res.json(devedores);
  } catch (err) {
    res.status(500).json({ erro: "Erro interno ao listar devedores" });
  }
}

export async function remover(req: Request, res: Response): Promise<void> {
  try {
    await service.remover(req.supabase, Number(req.params.id));
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ erro: "Erro interno ao remover devedor" });
  }
}
