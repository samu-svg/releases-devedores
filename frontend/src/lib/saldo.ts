import type { Devedor, DividaResumida } from "../App";

/** Saldo restante do principal (sem juros nem multa). */
export function saldoDividaSemJuros(d: DividaResumida): number {
  return Math.max(0, d.saldoDevedor - d.jurosAcumulados - d.multaAtraso);
}

export function saldoDevedorSemJuros(dev: Devedor): number {
  return dev.dividas.reduce((s, d) => s + saldoDividaSemJuros(d), 0);
}
