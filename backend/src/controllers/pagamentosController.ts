import { Request, Response } from "express";
import * as service from "../services/pagamentosService.js";

const ERROS: Record<string, { status: number; mensagem: string }> = {
  DIVIDA_NAO_ENCONTRADA: { status: 404, mensagem: "Dívida não encontrada" },
  DIVIDA_JA_PAGA: { status: 400, mensagem: "Esta dívida já está paga" },
  VALOR_INVALIDO: { status: 400, mensagem: "O valor do pagamento deve ser maior que zero" },
  VALOR_EXCEDE_SALDO: { status: 400, mensagem: "O valor do pagamento excede o saldo devedor" },
};

export async function registrar(req: Request, res: Response): Promise<void> {
  const { dividaId, valorPago, dataPagamento } = req.body;

  if (!dividaId || !valorPago) {
    res.status(400).json({ erro: "Campos obrigatórios: dividaId, valorPago" });
    return;
  }

  try {
    const pagamento = await service.registrar(req.supabase, {
      dividaId: Number(dividaId),
      valorPago: Number(valorPago),
      dataPagamento,
    });
    res.status(201).json(pagamento);
  } catch (err: any) {
    const erroConhecido = ERROS[err.message];
    if (erroConhecido) {
      res.status(erroConhecido.status).json({ erro: erroConhecido.mensagem });
      return;
    }
    res.status(500).json({ erro: "Erro interno ao registrar pagamento" });
  }
}

export async function remover(req: Request, res: Response): Promise<void> {
  try {
    await service.remover(req.supabase, Number(req.params.id));
    res.status(204).send();
  } catch (err: any) {
    if (err.message === "PAGAMENTO_NAO_ENCONTRADO") {
      res.status(404).json({ erro: "Pagamento não encontrado" });
      return;
    }
    res.status(500).json({ erro: "Erro interno ao remover pagamento" });
  }
}

export async function listarPorDivida(req: Request, res: Response): Promise<void> {
  try {
    const pagamentos = await service.listarPorDivida(
      req.supabase,
      Number(req.params.dividaId)
    );
    res.json(pagamentos);
  } catch (err) {
    res.status(500).json({ erro: "Erro interno ao listar pagamentos" });
  }
}
