import { SupabaseClient } from "@supabase/supabase-js";
import { Pagamento, CriarPagamentoDTO } from "../models/types.js";
import { calcularJuros } from "./jurosService.js";

export async function registrar(
  supabase: SupabaseClient,
  dados: CriarPagamentoDTO
): Promise<Pagamento> {
  const { data: divida } = await supabase
    .from("dividas")
    .select("id, valor_original, data_vencimento, status")
    .eq("id", dados.dividaId)
    .single();

  if (!divida) throw new Error("DIVIDA_NAO_ENCONTRADA");
  if (divida.status === "pago") throw new Error("DIVIDA_JA_PAGA");

  const { data: pgtos } = await supabase
    .from("pagamentos")
    .select("valor_pago, data_pagamento")
    .eq("divida_id", dados.dividaId);

  const calculo = calcularJuros(
    Number(divida.valor_original),
    divida.data_vencimento,
    pgtos ?? []
  );

  if (dados.valorPago <= 0) throw new Error("VALOR_INVALIDO");
  if (dados.valorPago > calculo.saldoDevedor + 0.01) throw new Error("VALOR_EXCEDE_SALDO");

  const ehTotal = dados.valorPago >= calculo.saldoDevedor - 0.01;
  const dataPagamento = dados.dataPagamento ?? new Date().toISOString().split("T")[0];

  const { data: novoPgto, error } = await supabase
    .from("pagamentos")
    .insert({
      divida_id: dados.dividaId,
      valor_pago: dados.valorPago,
      data_pagamento: dataPagamento,
      tipo: ehTotal ? "total" : "parcial",
    })
    .select("*")
    .single();

  if (error || !novoPgto) throw new Error(`Erro ao registrar pagamento: ${error?.message}`);

  if (ehTotal) {
    await supabase
      .from("dividas")
      .update({ status: "pago" })
      .eq("id", dados.dividaId);
  }

  return {
    id: novoPgto.id,
    dividaId: novoPgto.divida_id,
    valorPago: Number(novoPgto.valor_pago),
    dataPagamento: novoPgto.data_pagamento,
    tipo: novoPgto.tipo,
    criadoEm: novoPgto.criado_em,
  };
}

export async function remover(
  supabase: SupabaseClient,
  pagamentoId: number
): Promise<void> {
  const { data: pgto } = await supabase
    .from("pagamentos")
    .select("id, divida_id")
    .eq("id", pagamentoId)
    .single();

  if (!pgto) throw new Error("PAGAMENTO_NAO_ENCONTRADO");

  const { error } = await supabase
    .from("pagamentos")
    .delete()
    .eq("id", pagamentoId);

  if (error) throw new Error(`Erro ao remover pagamento: ${error.message}`);

  await supabase
    .from("dividas")
    .update({ status: "pendente" })
    .eq("id", pgto.divida_id);
}

export async function listarPorDivida(
  supabase: SupabaseClient,
  dividaId: number
): Promise<Pagamento[]> {
  const { data, error } = await supabase
    .from("pagamentos")
    .select("*")
    .eq("divida_id", dividaId)
    .order("data_pagamento", { ascending: true });

  if (error) throw new Error(`Erro ao listar pagamentos: ${error.message}`);

  return (data ?? []).map((p) => ({
    id: p.id,
    dividaId: p.divida_id,
    valorPago: Number(p.valor_pago),
    dataPagamento: p.data_pagamento,
    tipo: p.tipo,
    criadoEm: p.criado_em,
  }));
}
