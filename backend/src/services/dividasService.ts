import { SupabaseClient } from "@supabase/supabase-js";
import {
  Divida,
  CriarDividaDTO,
  AtualizarDividaDTO,
  DividaRow,
  DevedorRow,
  PagamentoParaCalculo,
} from "../models/types.js";
import { calcularJuros } from "./jurosService.js";
import { findOrCreateDevedorPorNome } from "./devedorIdentidadeService.js";

type DividaComDevedor = DividaRow & {
  devedores: Pick<DevedorRow, "nome" | "cpf_cnpj">;
};

async function buscarPagamentos(
  supabase: SupabaseClient,
  dividaId: number
): Promise<PagamentoParaCalculo[]> {
  const { data } = await supabase
    .from("pagamentos")
    .select("valor_pago, data_pagamento")
    .eq("divida_id", dividaId);
  return data ?? [];
}

function computarStatus(
  statusBanco: string,
  diasAtraso: number,
  saldoDevedor: number
): "pendente" | "pago" | "atrasado" {
  if (statusBanco === "pago" || saldoDevedor <= 0) return "pago";
  if (diasAtraso > 0) return "atrasado";
  return "pendente";
}

function toApiFormat(
  divida: DividaComDevedor,
  pagamentos: PagamentoParaCalculo[]
): Divida {
  const calculo = calcularJuros(
    Number(divida.valor_original),
    divida.data_vencimento,
    pagamentos
  );

  return {
    id: divida.id,
    devedor: divida.devedores.nome,
    cpfCnpj: divida.devedores.cpf_cnpj,
    valorOriginal: calculo.valorOriginal,
    totalPago: calculo.totalPago,
    jurosAcumulados: calculo.jurosAcumulados,
    multaAtraso: calculo.multaAtraso,
    saldoDevedor: calculo.saldoDevedor,
    diasAtraso: calculo.diasAtraso,
    dataVencimento: divida.data_vencimento,
    status: computarStatus(divida.status, calculo.diasAtraso, calculo.saldoDevedor),
  };
}

export async function listarTodas(supabase: SupabaseClient): Promise<Divida[]> {
  const { data, error } = await supabase
    .from("dividas")
    .select("*, devedores(nome, cpf_cnpj)")
    .order("id", { ascending: true });

  if (error) throw new Error(`Erro ao listar dívidas: ${error.message}`);

  const dividas = data ?? [];
  const resultado: Divida[] = [];

  for (const d of dividas) {
    const pgtos = await buscarPagamentos(supabase, d.id);
    resultado.push(toApiFormat(d as DividaComDevedor, pgtos));
  }

  return resultado;
}

export async function buscarPorId(
  supabase: SupabaseClient,
  id: number
): Promise<Divida | null> {
  const { data, error } = await supabase
    .from("dividas")
    .select("*, devedores(nome, cpf_cnpj)")
    .eq("id", id)
    .single();

  if (error || !data) return null;

  const pgtos = await buscarPagamentos(supabase, id);
  return toApiFormat(data as DividaComDevedor, pgtos);
}

export async function criar(
  supabase: SupabaseClient,
  userId: string,
  dados: CriarDividaDTO
): Promise<Divida> {
  const devedorId = await findOrCreateDevedorPorNome(
    supabase,
    userId,
    dados.devedor,
    dados.cpfCnpj ?? "",
    { telefone: dados.telefone, email: dados.email }
  );

  const { data, error } = await supabase
    .from("dividas")
    .insert({
      devedor_id: devedorId,
      valor_original: dados.valorOriginal,
      data_vencimento: dados.dataVencimento,
      status: "pendente",
      user_id: userId,
    })
    .select("*, devedores(nome, cpf_cnpj)")
    .single();

  if (error || !data) throw new Error(`Erro ao criar dívida: ${error?.message}`);
  return toApiFormat(data as DividaComDevedor, []);
}

export async function atualizar(
  supabase: SupabaseClient,
  id: number,
  dados: AtualizarDividaDTO
): Promise<Divida | null> {
  const updates: Record<string, unknown> = {};
  if (dados.valorOriginal !== undefined) updates.valor_original = dados.valorOriginal;
  if (dados.dataVencimento !== undefined) updates.data_vencimento = dados.dataVencimento;
  if (dados.status !== undefined) updates.status = dados.status;

  if (
    dados.devedor !== undefined ||
    dados.cpfCnpj !== undefined ||
    dados.telefone !== undefined ||
    dados.email !== undefined
  ) {
    const { data: atual } = await supabase
      .from("dividas")
      .select("devedor_id, devedores(nome, cpf_cnpj)")
      .eq("id", id)
      .single();

    if (!atual) return null;

    const devUpdates: Record<string, string> = {};
    if (dados.devedor !== undefined) devUpdates.nome = dados.devedor;
    if (dados.cpfCnpj !== undefined) devUpdates.cpf_cnpj = dados.cpfCnpj;
    if (dados.telefone !== undefined) devUpdates.telefone = dados.telefone;
    if (dados.email !== undefined) devUpdates.email = dados.email;

    if (Object.keys(devUpdates).length > 0) {
      await supabase
        .from("devedores")
        .update(devUpdates)
        .eq("id", atual.devedor_id);
    }
  }

  if (Object.keys(updates).length > 0) {
    const { error } = await supabase
      .from("dividas")
      .update(updates)
      .eq("id", id);

    if (error) throw new Error(`Erro ao atualizar dívida: ${error.message}`);
  }

  return buscarPorId(supabase, id);
}

export async function remover(supabase: SupabaseClient, id: number): Promise<boolean> {
  const { error } = await supabase
    .from("dividas")
    .delete()
    .eq("id", id);

  if (error) throw new Error(`Erro ao remover dívida: ${error.message}`);
  return true;
}
