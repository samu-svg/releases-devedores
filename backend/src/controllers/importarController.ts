import { Request, Response } from "express";
import * as service from "../services/importarService.js";

export async function importarCsv(req: Request, res: Response): Promise<void> {
  const { conteudo } = req.body;

  if (!conteudo || typeof conteudo !== "string") {
    res.status(400).json({ erro: "Campo obrigatório: conteudo (texto CSV)" });
    return;
  }

  try {
    const resultado = await service.importarCsv(req.supabase, req.userId, conteudo);
    res.json(resultado);
  } catch (err) {
    res.status(500).json({ erro: "Erro interno ao importar CSV" });
  }
}
