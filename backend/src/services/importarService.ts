import { SupabaseClient } from "@supabase/supabase-js";
import { findOrCreateDevedorPorNome } from "./devedorIdentidadeService.js";

interface ResultadoImportacao {
  importadas: number;
  erros: string[];
  total: number;
}

function parseCsvLine(line: string): string[] {
  const campos: string[] = [];
  let atual = "";
  let dentroAspas = false;

  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      dentroAspas = !dentroAspas;
    } else if (c === "," && !dentroAspas) {
      campos.push(atual.trim());
      atual = "";
    } else {
      atual += c;
    }
  }
  campos.push(atual.trim());
  return campos;
}

export async function importarCsv(
  supabase: SupabaseClient,
  userId: string,
  conteudo: string
): Promise<ResultadoImportacao> {
  const linhas = conteudo
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  let importadas = 0;
  const erros: string[] = [];

  for (let i = 0; i < linhas.length; i++) {
    const numLinha = i + 1;
    const campos = parseCsvLine(linhas[i]);

    if (campos.length < 7) {
      erros.push(`Linha ${numLinha}: esperado 7 colunas, encontrado ${campos.length}`);
      continue;
    }

    const nome = campos[0];
    const cpfRaw = campos[1];
    const valor = parseFloat(campos[5]);
    const data = campos[6];

    if (!nome) {
      erros.push(`Linha ${numLinha}: nome do devedor vazio`);
      continue;
    }
    if (isNaN(valor) || valor <= 0) {
      erros.push(`Linha ${numLinha}: valor inválido "${campos[5]}"`);
      continue;
    }
    if (!data.match(/^\d{4}-\d{2}-\d{2}$/)) {
      erros.push(`Linha ${numLinha}: data inválida "${data}" (esperado AAAA-MM-DD)`);
      continue;
    }

    const cpfCnpj = (cpfRaw ?? "").trim();

    try {
      const devedorId = await findOrCreateDevedorPorNome(
        supabase,
        userId,
        nome,
        cpfCnpj
      );

      const { error } = await supabase.from("dividas").insert({
        devedor_id: devedorId,
        valor_original: valor,
        data_vencimento: data,
        status: "pendente",
        user_id: userId,
      });

      if (error) {
        erros.push(`Linha ${numLinha}: ${error.message}`);
        continue;
      }

      importadas++;
    } catch (err: any) {
      erros.push(`Linha ${numLinha}: ${err.message}`);
    }
  }

  return { importadas, erros, total: linhas.length };
}
