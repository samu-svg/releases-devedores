import { Request, Response } from "express";
import * as service from "../services/dividasService.js";

export async function listar(req: Request, res: Response): Promise<void> {
  try {
    const dividas = await service.listarTodas(req.supabase);
    res.json(dividas);
  } catch (err) {
    res.status(500).json({ erro: "Erro interno ao listar dívidas" });
  }
}

export async function buscarPorId(req: Request, res: Response): Promise<void> {
  try {
    const divida = await service.buscarPorId(req.supabase, Number(req.params.id));
    if (!divida) {
      res.status(404).json({ erro: "Dívida não encontrada" });
      return;
    }
    res.json(divida);
  } catch (err) {
    res.status(500).json({ erro: "Erro interno ao buscar dívida" });
  }
}

export async function criar(req: Request, res: Response): Promise<void> {
  const { devedor, cpfCnpj, valorOriginal, dataVencimento, telefone, email } = req.body;

  if (!devedor || valorOriginal === undefined || valorOriginal === null || !dataVencimento) {
    res.status(400).json({
      erro: "Campos obrigatórios: devedor, valorOriginal, dataVencimento (cpfCnpj é opcional)",
    });
    return;
  }

  try {
    const nova = await service.criar(req.supabase, req.userId, {
      devedor,
      cpfCnpj: typeof cpfCnpj === "string" ? cpfCnpj : "",
      valorOriginal: Number(valorOriginal),
      dataVencimento,
      telefone,
      email,
    });
    res.status(201).json(nova);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro interno ao criar dívida";
    res.status(500).json({ erro: msg });
  }
}

export async function atualizar(req: Request, res: Response): Promise<void> {
  try {
    const divida = await service.atualizar(req.supabase, Number(req.params.id), req.body);
    if (!divida) {
      res.status(404).json({ erro: "Dívida não encontrada" });
      return;
    }
    res.json(divida);
  } catch (err) {
    res.status(500).json({ erro: "Erro interno ao atualizar dívida" });
  }
}

export async function remover(req: Request, res: Response): Promise<void> {
  try {
    const existing = await service.buscarPorId(req.supabase, Number(req.params.id));
    if (!existing) {
      res.status(404).json({ erro: "Dívida não encontrada" });
      return;
    }
    await service.remover(req.supabase, Number(req.params.id));
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ erro: "Erro interno ao remover dívida" });
  }
}
