import { SupabaseClient } from "@supabase/supabase-js";
import {
  DevedorComDividas,
  DividaResumida,
  PagamentoParaCalculo,
  StatusDivida,
} from "../models/types.js";
import { calcularJuros } from "./jurosService.js";

function computarStatus(
  statusBanco: string,
  diasAtraso: number,
  saldoDevedor: number
): StatusDivida {
  if (statusBanco === "pago" || saldoDevedor <= 0) return "pago";
  if (diasAtraso > 0) return "atrasado";
  return "pendente";
}

export async function listarComDividas(
  supabase: SupabaseClient
): Promise<DevedorComDividas[]> {
  const { data: devedores, error: errDev } = await supabase
    .from("devedores")
    .select("id, nome, cpf_cnpj, telefone, email")
    .order("nome", { ascending: true });

  if (errDev) throw new Error(`Erro ao listar devedores: ${errDev.message}`);
  if (!devedores?.length) return [];

  const { data: todasDividas, error: errDiv } = await supabase
    .from("dividas")
    .select("id, devedor_id, valor_original, data_vencimento, status")
    .order("data_vencimento", { ascending: true });

  if (errDiv) throw new Error(`Erro ao listar dívidas: ${errDiv.message}`);

  const { data: todosPagamentos, error: errPag } = await supabase
    .from("pagamentos")
    .select("divida_id, valor_pago, data_pagamento");

  if (errPag) throw new Error(`Erro ao listar pagamentos: ${errPag.message}`);

  const pagamentosPorDivida = new Map<number, PagamentoParaCalculo[]>();
  for (const p of todosPagamentos ?? []) {
    const lista = pagamentosPorDivida.get(p.divida_id) ?? [];
    lista.push({ valor_pago: p.valor_pago, data_pagamento: p.data_pagamento });
    pagamentosPorDivida.set(p.divida_id, lista);
  }

  const dividasPorDevedor = new Map<number, typeof todasDividas>();
  for (const d of todasDividas ?? []) {
    const lista = dividasPorDevedor.get(d.devedor_id) ?? [];
    lista.push(d);
    dividasPorDevedor.set(d.devedor_id, lista);
  }

  const resultado: DevedorComDividas[] = [];

  for (const dev of devedores) {
    const dividasRaw = dividasPorDevedor.get(dev.id) ?? [];

    let totalOriginal = 0;
    let totalJuros = 0;
    let totalPago = 0;
    let saldoTotal = 0;
    let qtdAtrasadas = 0;
    const dividas: DividaResumida[] = [];

    for (const d of dividasRaw) {
      const pgtos = pagamentosPorDivida.get(d.id) ?? [];
      const calculo = calcularJuros(
        Number(d.valor_original),
        d.data_vencimento,
        pgtos
      );

      const status = computarStatus(d.status, calculo.diasAtraso, calculo.saldoDevedor);

      totalOriginal += calculo.valorOriginal;
      totalJuros += calculo.jurosAcumulados;
      totalPago += calculo.totalPago;
      saldoTotal += calculo.saldoDevedor;
      if (status === "atrasado") qtdAtrasadas++;

      dividas.push({
        id: d.id,
        valorOriginal: calculo.valorOriginal,
        totalPago: calculo.totalPago,
        jurosAcumulados: calculo.jurosAcumulados,
        multaAtraso: calculo.multaAtraso,
        saldoDevedor: calculo.saldoDevedor,
        diasAtraso: calculo.diasAtraso,
        dataVencimento: d.data_vencimento,
        status,
      });
    }

    resultado.push({
      id: dev.id,
      nome: dev.nome,
      cpfCnpj: dev.cpf_cnpj,
      telefone: dev.telefone ?? null,
      email: dev.email ?? null,
      totalOriginal: Math.round((totalOriginal || 0) * 100) / 100,
      totalJuros: Math.round((totalJuros || 0) * 100) / 100,
      totalPago: Math.round((totalPago || 0) * 100) / 100,
      saldoTotal: Math.round((saldoTotal || 0) * 100) / 100,
      qtdDividas: dividas.length,
      qtdAtrasadas,
      dividas,
    });
  }

  return resultado;
}

export async function remover(
  supabase: SupabaseClient,
  id: number
): Promise<void> {
  const { data: dividas, error: errDiv } = await supabase
    .from("dividas")
    .select("id")
    .eq("devedor_id", id);

  if (errDiv) throw new Error(`Erro ao buscar dívidas: ${errDiv.message}`);

  const idsDividas = (dividas ?? []).map((d) => d.id);

  if (idsDividas.length > 0) {
    const { error: errPag } = await supabase
      .from("pagamentos")
      .delete()
      .in("divida_id", idsDividas);

    if (errPag) throw new Error(`Erro ao remover pagamentos: ${errPag.message}`);

    const { error: errDelDiv } = await supabase
      .from("dividas")
      .delete()
      .eq("devedor_id", id);

    if (errDelDiv) throw new Error(`Erro ao remover dívidas: ${errDelDiv.message}`);
  }

  const { error: errDev } = await supabase
    .from("devedores")
    .delete()
    .eq("id", id);

  if (errDev) throw new Error(`Erro ao remover devedor: ${errDev.message}`);
}
