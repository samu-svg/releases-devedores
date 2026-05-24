import { Request, Response } from "express";
import * as service from "../services/disparosCobrancaService.js";

function mensagemErroUpstream(status: number, text: string): string {
  const corpo = text.trim().slice(0, 200);
  if (status === 404) {
    return "Webhook não encontrado (404). Confira a URL e se o fluxo do chatbot está publicado/ativo.";
  }
  if (status === 401 || status === 403) {
    return `Webhook recusou a requisição (${status}). Verifique token ou permissões na URL.`;
  }
  if (status >= 500) {
    return `Erro no servidor do webhook (${status}).${corpo ? ` — ${corpo}` : ""}`;
  }
  return `Webhook retornou HTTP ${status}${corpo ? ` — ${corpo}` : ""}`;
}

export async function listarCobrancas(req: Request, res: Response): Promise<void> {
  try {
    const cobrancas = await service.listarPorUsuario(req.supabase);
    res.json(cobrancas);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro ao listar cobranças";
    res.status(500).json({ erro: msg });
  }
}

export async function disparar(req: Request, res: Response): Promise<void> {
  const { webhookUrl, payload, devedorId } = req.body;

  if (!webhookUrl || typeof webhookUrl !== "string") {
    res.status(400).json({ ok: false, erro: "webhookUrl é obrigatório" });
    return;
  }
  if (!payload || typeof payload !== "object") {
    res.status(400).json({ ok: false, erro: "payload é obrigatório" });
    return;
  }
  if (devedorId == null || Number.isNaN(Number(devedorId))) {
    res.status(400).json({ ok: false, erro: "devedorId é obrigatório" });
    return;
  }

  let url: URL;
  try {
    url = new URL(webhookUrl.trim());
  } catch {
    res.status(400).json({ ok: false, erro: "URL do webhook inválida" });
    return;
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    res.status(400).json({ ok: false, erro: "URL do webhook deve usar HTTP ou HTTPS" });
    return;
  }

  const idDevedor = Number(devedorId);

  try {
    const response = await fetch(url.toString(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json, text/plain, */*",
        "User-Agent": "Sistema-Cobranca-Webhook/1.0",
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(20_000),
      redirect: "follow",
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      const erro = mensagemErroUpstream(response.status, text);
      await service.registrarErro(req.supabase, req.userId, idDevedor, erro);
      res.json({ ok: false, erro });
      return;
    }

    const cobranca = await service.registrarSucesso(req.supabase, req.userId, idDevedor);
    res.json({ ok: true, cobranca });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro ao enviar webhook";
    const erro =
      msg.includes("timeout") || msg.includes("aborted")
        ? "Tempo esgotado ao contactar o webhook (20s). Verifique a URL."
        : msg.includes("fetch failed") || msg.includes("ENOTFOUND")
          ? "Não foi possível alcançar o servidor do webhook. Verifique a URL."
          : msg;

    try {
      await service.registrarErro(req.supabase, req.userId, idDevedor, erro);
    } catch {
      // Mantém resposta original se falhar ao persistir
    }

    res.json({ ok: false, erro });
  }
}
