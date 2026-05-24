import { useState } from "react";
import type { Devedor, DividaResumida } from "../App";
import { saldoDividaSemJuros, saldoDevedorSemJuros } from "../lib/saldo";

interface Props {
  devedor: Devedor;
  onPagar: (divida: DividaResumida) => void;
  onRemover: (dividaId: number) => void;
  onNovaDivida: (devedor: Devedor) => void;
  onDetalhes: (divida: DividaResumida, nomeDevedor: string) => void;
  onDetalhesDevedor: (devedor: Devedor) => void;
  onRemoverDevedor: (devedor: Devedor) => void;
}

function formatarMoeda(valor: number | null | undefined): string {
  return (valor ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatarData(iso: string): string {
  const [ano, mes, dia] = iso.split("-");
  return `${dia}/${mes}/${ano}`;
}

function iniciais(nome: string): string {
  return nome
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();
}

function classeStatus(devedor: Devedor, todasPagas: boolean): string {
  if (todasPagas) return "card-devedor-pago";
  if (devedor.qtdAtrasadas > 0) return "card-devedor-atraso";
  return "card-devedor-pendente";
}

export default function CardDevedor({ devedor, onPagar, onRemover, onNovaDivida, onDetalhes, onDetalhesDevedor, onRemoverDevedor }: Props) {
  const [aberto, setAberto] = useState(false);
  const todasPagas =
    devedor.dividas.length > 0 &&
    devedor.dividas.every((d) => d.status === "pago");

  const qtdPagas = devedor.dividas.filter((d) => d.status === "pago").length;

  return (
    <div className={`card-devedor ${classeStatus(devedor, todasPagas)}`}>
      <div className="card-devedor-header" onClick={() => setAberto(!aberto)}>
        <div className="devedor-info">
          <span className="devedor-avatar">{iniciais(devedor.nome)}</span>
          <div className="devedor-info-texto">
            <span className="devedor-nome">{devedor.nome}</span>
            <div className="devedor-meta">
              <span className="devedor-cpf">{devedor.cpfCnpj}</span>
              {devedor.telefone && (
                <span className="devedor-contato">{devedor.telefone}</span>
              )}
            </div>
          </div>
        </div>

        <div className="devedor-totais">
          {devedor.totalJuros > 0 && (
            <div className="total-item">
              <span className="total-label">Juros</span>
              <span className="total-valor juros">{formatarMoeda(devedor.totalJuros)}</span>
            </div>
          )}
          {devedor.totalPago > 0 && (
            <div className="total-item">
              <span className="total-label">Pago</span>
              <span className="total-valor pago">{formatarMoeda(devedor.totalPago)}</span>
            </div>
          )}
          <div className="total-item total-destaque">
            <span className="total-label">Saldo Total</span>
            <span className="total-valor">{formatarMoeda(saldoDevedorSemJuros(devedor))}</span>
          </div>
          <span className={`seta ${aberto ? "seta-aberta" : ""}`}>&#9662;</span>
        </div>
      </div>

      <div className="devedor-detalhes">
        <div className="detalhe-chips">
          <span className="chip">
            {devedor.qtdDividas} dívida{devedor.qtdDividas !== 1 ? "s" : ""}
          </span>
          {devedor.qtdAtrasadas > 0 && (
            <span className="chip chip-perigo">
              {devedor.qtdAtrasadas} atrasada{devedor.qtdAtrasadas !== 1 ? "s" : ""}
            </span>
          )}
          {(devedor.cobranca?.totalEnvios ?? 0) > 0 && (
            <span className="chip chip-cobrado">
              Cobrado {devedor.cobranca!.totalEnvios}×
            </span>
          )}
          {qtdPagas > 0 && (
            <span className="chip chip-sucesso">
              {qtdPagas} paga{qtdPagas !== 1 ? "s" : ""}
            </span>
          )}
          <span className="chip">
            Original: {formatarMoeda(devedor.totalOriginal)}
          </span>
        </div>
        <div className="detalhe-botoes">
          <button
            className="btn btn-outline btn-sm"
            onClick={(e) => {
              e.stopPropagation();
              onDetalhesDevedor(devedor);
            }}
          >
            Detalhes
          </button>
          <button
            className="btn btn-primario btn-sm"
            onClick={(e) => {
              e.stopPropagation();
              onNovaDivida(devedor);
            }}
          >
            + Nova Dívida
          </button>
          <button
            className="btn btn-perigo btn-sm"
            onClick={(e) => {
              e.stopPropagation();
              onRemoverDevedor(devedor);
            }}
          >
            Apagar
          </button>
        </div>
      </div>

      {aberto && (
        <div className="card-devedor-dividas">
          {devedor.dividas.length === 0 ? (
            <p className="dividas-vazias">
              Nenhuma dívida. Clique em &quot;+ Nova Dívida&quot; para adicionar.
            </p>
          ) : (
          <table>
            <thead>
              <tr>
                <th>Vencimento</th>
                <th>Valor Original</th>
                <th>Juros</th>
                <th>Pago</th>
                <th>Saldo</th>
                <th>Atraso</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {devedor.dividas.map((d) => (
                <tr key={d.id} className={d.status === "pago" ? "linha-pago" : ""}>
                  <td>{formatarData(d.dataVencimento)}</td>
                  <td className="valor">{formatarMoeda(d.valorOriginal)}</td>
                  <td className="valor juros">
                    {d.jurosAcumulados > 0 ? formatarMoeda(d.jurosAcumulados) : "—"}
                  </td>
                  <td className="valor pago">
                    {d.totalPago > 0 ? formatarMoeda(d.totalPago) : "—"}
                  </td>
                  <td className="valor saldo-devedor">{formatarMoeda(saldoDividaSemJuros(d))}</td>
                  <td className="atraso">
                    {d.diasAtraso > 0 ? (
                      <span className="dias-atraso">{d.diasAtraso}d</span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td>
                    <span className={`badge badge-${d.status}`}>{d.status}</span>
                  </td>
                  <td className="acoes">
                    <button
                      className="btn btn-outline btn-sm"
                      onClick={() => onDetalhes(d, devedor.nome)}
                    >
                      Detalhes
                    </button>
                    {d.status !== "pago" && (
                      <button className="btn btn-sucesso" onClick={() => onPagar(d)}>
                        Pagar
                      </button>
                    )}
                    <button className="btn btn-perigo" onClick={() => onRemover(d.id)}>
                      Remover
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          )}
        </div>
      )}
    </div>
  );
}
