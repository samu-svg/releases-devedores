import { ConfigJuros, PagamentoParaCalculo, ResultadoCalculo } from "../models/types.js";

export const CONFIG_PADRAO: ConfigJuros = {
  taxaMensal: 0.03,
  multaAtraso: 0,
  tipoJuros: "simples",
  carenciaDias: 0,
};

// ---------------------------------------------------------------------------
// Funções puras — não acessam banco, apenas calculam
// ---------------------------------------------------------------------------

export function calcularJuros(
  valorOriginal: number,
  dataVencimento: string,
  pagamentos: PagamentoParaCalculo[],
  config: ConfigJuros = CONFIG_PADRAO,
  dataReferencia: Date = new Date()
): ResultadoCalculo {
  const vencimento = new Date(dataVencimento + "T00:00:00");
  const hoje = new Date(dataReferencia.toISOString().split("T")[0] + "T00:00:00");
  const diasDesdeVencimento = Math.max(0, diffDias(vencimento, hoje));
  const totalPago = somarPagamentos(pagamentos);

  const diasAtraso = Math.max(0, diasDesdeVencimento - config.carenciaDias);

  if (diasAtraso === 0) {
    const saldo = Math.max(0, valorOriginal - totalPago);
    return {
      valorOriginal,
      totalPago,
      jurosAcumulados: 0,
      multaAtraso: 0,
      saldoDevedor: saldo,
      diasAtraso: 0,
    };
  }

  const inicioJuros = new Date(vencimento.getTime() + config.carenciaDias * 86400000);

  const multaOriginal = valorOriginal * config.multaAtraso;
  let multaRestante = multaOriginal;

  const pgtos = [...pagamentos]
    .filter((p) => p.valor_pago > 0)
    .sort(
      (a, b) =>
        new Date(a.data_pagamento).getTime() -
        new Date(b.data_pagamento).getTime()
    );

  let saldoPrincipal = valorOriginal;
  let jurosAcumulados = 0;
  let inicioPeriodo = inicioJuros;

  for (const pgto of pgtos) {
    const dataPgto = new Date(pgto.data_pagamento + "T00:00:00");

    if (dataPgto <= inicioJuros) {
      saldoPrincipal -= pgto.valor_pago;
      if (saldoPrincipal < 0) saldoPrincipal = 0;
      continue;
    }

    const diasPeriodo = diffDias(inicioPeriodo, dataPgto);
    jurosAcumulados += calcularJurosPeriodo(saldoPrincipal, diasPeriodo, config);

    let restante = pgto.valor_pago;

    const abateJuros = Math.min(restante, jurosAcumulados);
    jurosAcumulados -= abateJuros;
    restante -= abateJuros;

    const abateMulta = Math.min(restante, multaRestante);
    multaRestante -= abateMulta;
    restante -= abateMulta;

    saldoPrincipal = Math.max(0, saldoPrincipal - restante);
    inicioPeriodo = dataPgto;
  }

  const diasRestantes = diffDias(inicioPeriodo, hoje);
  jurosAcumulados += calcularJurosPeriodo(saldoPrincipal, diasRestantes, config);

  const saldoDevedor = saldoPrincipal + jurosAcumulados + multaRestante;

  return {
    valorOriginal,
    totalPago,
    jurosAcumulados: arredondar(jurosAcumulados),
    multaAtraso: arredondar(multaRestante),
    saldoDevedor: arredondar(Math.max(0, saldoDevedor)),
    diasAtraso,
  };
}

// ---------------------------------------------------------------------------
// Helpers internos
// ---------------------------------------------------------------------------

function calcularJurosPeriodo(
  saldo: number,
  dias: number,
  config: ConfigJuros
): number {
  if (saldo <= 0 || dias <= 0) return 0;
  const meses = Math.floor(dias / 30);

  if (config.tipoJuros === "simples") {
    return saldo * config.taxaMensal * meses;
  }
  return saldo * (Math.pow(1 + config.taxaMensal, meses) - 1);
}

function diffDias(a: Date, b: Date): number {
  return Math.floor((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
}

function somarPagamentos(pagamentos: PagamentoParaCalculo[]): number {
  return pagamentos.reduce((s, p) => s + Number(p.valor_pago), 0);
}

function arredondar(valor: number): number {
  return Math.round(valor * 100) / 100;
}
