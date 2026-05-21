import { SupabaseClient } from "@supabase/supabase-js";

/**
 * Trim + colapsa espaços internos. Mantém acentuação e maiúsculas/minúsculas do texto informado.
 */
export function normalizarNomeChave(nome: string): string {
  return nome.trim().replace(/\s+/g, " ");
}

/**
 * Escapa \, % e _ para uso em ILIKE com correspondência literal (sem curingas).
 */
export function escapeIlikeLiteral(texto: string): string {
  return texto.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
}

export interface OpcoesFindOrCreateDevedor {
  telefone?: string;
  email?: string;
}

/**
 * Identifica o devedor pelo NOME (normalizado + ILIKE), não pelo CPF.
 * CPF/CNPJ é apenas dado cadastral; pode repetir entre pessoas diferentes.
 */
export async function findOrCreateDevedorPorNome(
  supabase: SupabaseClient,
  userId: string,
  nome: string,
  cpfCnpj: string,
  opcoes?: OpcoesFindOrCreateDevedor
): Promise<number> {
  const chave = normalizarNomeChave(nome);
  if (!chave) throw new Error("Nome do devedor não pode ser vazio");

  const padrao = escapeIlikeLiteral(chave);
  const { data: existentes, error: errBusca } = await supabase
    .from("devedores")
    .select("id")
    .eq("user_id", userId)
    .ilike("nome", padrao)
    .limit(1);

  if (errBusca) throw new Error(`Erro ao buscar devedor: ${errBusca.message}`);

  const existente = existentes?.[0];
  const cpfLimpo = (cpfCnpj ?? "").trim();
  const cpfArmazenar = cpfLimpo || "-";

  if (existente) {
    const updates: Record<string, string> = { nome: chave };
    if (opcoes?.telefone !== undefined && opcoes.telefone !== "") {
      updates.telefone = opcoes.telefone;
    }
    if (opcoes?.email !== undefined && opcoes.email !== "") {
      updates.email = opcoes.email;
    }
    if (cpfLimpo) {
      updates.cpf_cnpj = cpfLimpo;
    }

    await supabase.from("devedores").update(updates).eq("id", existente.id);
    return existente.id;
  }

  const insert: Record<string, unknown> = {
    nome: chave,
    cpf_cnpj: cpfArmazenar,
    user_id: userId,
  };
  if (opcoes?.telefone) insert.telefone = opcoes.telefone;
  if (opcoes?.email) insert.email = opcoes.email;

  const { data: novo, error } = await supabase
    .from("devedores")
    .insert(insert)
    .select("id")
    .single();

  if (error || !novo) throw new Error(`Erro ao criar devedor: ${error?.message}`);
  return novo.id;
}
