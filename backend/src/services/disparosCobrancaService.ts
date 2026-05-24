import { SupabaseClient } from "@supabase/supabase-js";

export interface CobrancaDisparada {
  devedorId: number;
  totalEnvios: number;
  ultimoEnvio: string | null;
  ultimoStatus: "sucesso" | "erro" | null;
  ultimoErro: string | null;
}

interface CobrancaRow {
  devedor_id: number;
  total_envios: number;
  ultimo_envio_em: string | null;
  ultimo_status: "sucesso" | "erro" | null;
  ultimo_erro: string | null;
}

export async function listarPorUsuario(
  supabase: SupabaseClient
): Promise<CobrancaDisparada[]> {
  const { data, error } = await supabase
    .from("cobrancas_disparadas")
    .select("devedor_id, total_envios, ultimo_envio_em, ultimo_status, ultimo_erro");

  if (error) throw new Error(`Erro ao listar cobranças: ${error.message}`);

  return (data ?? []).map((row: CobrancaRow) => ({
    devedorId: row.devedor_id,
    totalEnvios: row.total_envios,
    ultimoEnvio: row.ultimo_envio_em,
    ultimoStatus: row.ultimo_status,
    ultimoErro: row.ultimo_erro,
  }));
}

export async function registrarSucesso(
  supabase: SupabaseClient,
  userId: string,
  devedorId: number
): Promise<CobrancaDisparada> {
  const agora = new Date().toISOString();

  const { data: existente, error: errBusca } = await supabase
    .from("cobrancas_disparadas")
    .select("total_envios")
    .eq("devedor_id", devedorId)
    .maybeSingle();

  if (errBusca) throw new Error(`Erro ao buscar cobrança: ${errBusca.message}`);

  const totalEnvios = (existente?.total_envios ?? 0) + 1;

  const { data, error } = await supabase
    .from("cobrancas_disparadas")
    .upsert(
      {
        user_id: userId,
        devedor_id: devedorId,
        total_envios: totalEnvios,
        ultimo_envio_em: agora,
        ultimo_status: "sucesso",
        ultimo_erro: null,
      },
      { onConflict: "user_id,devedor_id" }
    )
    .select("devedor_id, total_envios, ultimo_envio_em, ultimo_status, ultimo_erro")
    .single();

  if (error) throw new Error(`Erro ao registrar cobrança: ${error.message}`);

  return {
    devedorId: data.devedor_id,
    totalEnvios: data.total_envios,
    ultimoEnvio: data.ultimo_envio_em,
    ultimoStatus: data.ultimo_status,
    ultimoErro: data.ultimo_erro,
  };
}

export async function registrarErro(
  supabase: SupabaseClient,
  userId: string,
  devedorId: number,
  mensagemErro: string
): Promise<void> {
  const agora = new Date().toISOString();

  const { data: existente } = await supabase
    .from("cobrancas_disparadas")
    .select("total_envios")
    .eq("devedor_id", devedorId)
    .maybeSingle();

  const { error } = await supabase.from("cobrancas_disparadas").upsert(
    {
      user_id: userId,
      devedor_id: devedorId,
      total_envios: existente?.total_envios ?? 0,
      ultimo_envio_em: agora,
      ultimo_status: "erro",
      ultimo_erro: mensagemErro.slice(0, 500),
    },
    { onConflict: "user_id,devedor_id" }
  );

  if (error) throw new Error(`Erro ao registrar falha: ${error.message}`);
}
