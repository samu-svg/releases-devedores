import { useMemo } from "react";
import type { Devedor, DividaResumida } from "../App";
import { saldoDividaSemJuros, saldoDevedorSemJuros } from "../lib/saldo";
import CardKPI from "./CardKPI";

interface Props {
  devedores: Devedor[];
  carregando: boolean;
}

type DividaComDevedor = DividaResumida & { nomeDevedor: string };

function fmt(valor: number): string {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function parseData(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function inicioDoDia(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function IconeDevedores() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function IconeDividas() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
    </svg>
  );
}

function IconeCheck() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}

function IconeJuros() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
      <polyline points="17 6 23 6 23 12" />
    </svg>
  );
}

function IconePorcento() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="19" y1="5" x2="5" y2="19" />
      <circle cx="6.5" cy="6.5" r="2.5" />
      <circle cx="17.5" cy="17.5" r="2.5" />
    </svg>
  );
}

function IconeRelogio() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

export default function Dashboard({ devedores, carregando }: Props) {
  const metricas = useMemo(() => {
    const hoje = inicioDoDia(new Date());
    const em7dias = new Date(hoje.getTime() + 7 * 86400000);

    const todasDividas: DividaComDevedor[] = devedores.flatMap((dev) =>
      dev.dividas.map((d) => ({ ...d, nomeDevedor: dev.nome }))
    );

    const totalDevedores = devedores.length;
    const totalDividas = todasDividas.length;
    const totalOriginal = devedores.reduce((s, d) => s + d.totalOriginal, 0);
    const totalJuros = devedores.reduce((s, d) => s + d.totalJuros, 0);
    const totalPago = devedores.reduce((s, d) => s + d.totalPago, 0);
    const saldoComJuros = devedores.reduce((s, d) => s + d.saldoTotal, 0);
    const saldoTotal = devedores.reduce((s, d) => s + saldoDevedorSemJuros(d), 0);

    const dividasAtrasadas = todasDividas.filter((d) => d.status === "atrasado");
    const dividasPendentes = todasDividas.filter((d) => d.status === "pendente");
    const dividasPagas = todasDividas.filter((d) => d.status === "pago");

    const saldoAtrasado = dividasAtrasadas.reduce((s, d) => s + saldoDividaSemJuros(d), 0);
    const saldoPendente = dividasPendentes.reduce((s, d) => s + saldoDividaSemJuros(d), 0);

    const devedoresInadimplentes = devedores.filter((d) => d.qtdAtrasadas > 0).length;
    const taxaInadimplencia =
      totalDevedores > 0 ? Math.round((devedoresInadimplentes / totalDevedores) * 100) : 0;

    const carteiraTotal = totalPago + saldoComJuros;
    const taxaRecuperacao = carteiraTotal > 0 ? Math.round((totalPago / carteiraTotal) * 100) : 0;

    const maiorAtraso = dividasAtrasadas.length > 0
      ? Math.max(...dividasAtrasadas.map((d) => d.diasAtraso))
      : 0;

    const faixasAtraso = [
      { label: "1–30 dias", min: 1, max: 30, cor: "faixa-leve" },
      { label: "31–60 dias", min: 31, max: 60, cor: "faixa-media" },
      { label: "61–90 dias", min: 61, max: 90, cor: "faixa-alta" },
      { label: "90+ dias", min: 91, max: Infinity, cor: "faixa-critica" },
    ].map((faixa) => {
      const itens = dividasAtrasadas.filter(
        (d) => d.diasAtraso >= faixa.min && d.diasAtraso <= faixa.max
      );
      return {
        ...faixa,
        qtd: itens.length,
        saldo: itens.reduce((s, d) => s + saldoDividaSemJuros(d), 0),
      };
    });

    const topSaldos = [...devedores]
      .map((dev) => ({ ...dev, saldoSemJuros: saldoDevedorSemJuros(dev) }))
      .sort((a, b) => b.saldoSemJuros - a.saldoSemJuros)
      .slice(0, 5);

    const topAtrasados = devedores
      .filter((d) => d.qtdAtrasadas > 0)
      .map((dev) => {
        const atrasadas = dev.dividas.filter((d) => d.status === "atrasado");
        return {
          ...dev,
          saldoAtrasado: atrasadas.reduce((s, d) => s + saldoDividaSemJuros(d), 0),
          maxDias: Math.max(...atrasadas.map((d) => d.diasAtraso)),
        };
      })
      .sort((a, b) => b.saldoAtrasado - a.saldoAtrasado)
      .slice(0, 5);

    const vencendoBreve = todasDividas
      .filter((d) => {
        if (d.status === "pago") return false;
        const venc = inicioDoDia(parseData(d.dataVencimento));
        return venc >= hoje && venc <= em7dias;
      })
      .sort((a, b) => parseData(a.dataVencimento).getTime() - parseData(b.dataVencimento).getTime())
      .slice(0, 8);

    const pioresDividas = [...dividasAtrasadas]
      .sort((a, b) => b.diasAtraso - a.diasAtraso || saldoDividaSemJuros(b) - saldoDividaSemJuros(a))
      .slice(0, 8);

    const totalBarra = dividasPagas.length + dividasPendentes.length + dividasAtrasadas.length || 1;

    return {
      hoje,
      totalDevedores,
      totalDividas,
      totalOriginal,
      totalJuros,
      totalPago,
      saldoTotal,
      saldoComJuros,
      saldoAtrasado,
      saldoPendente,
      devedoresInadimplentes,
      taxaInadimplencia,
      taxaRecuperacao,
      maiorAtraso,
      faixasAtraso,
      topSaldos,
      topAtrasados,
      vencendoBreve,
      pioresDividas,
      pagas: dividasPagas.length,
      pendentes: dividasPendentes.length,
      atrasadas: dividasAtrasadas.length,
      pctPagas: (dividasPagas.length / totalBarra) * 100,
      pctPendentes: (dividasPendentes.length / totalBarra) * 100,
      pctAtrasadas: (dividasAtrasadas.length / totalBarra) * 100,
      saldoPagas: dividasPagas.reduce((s, d) => s + d.saldoDevedor, 0),
      vazio: totalDevedores === 0,
    };
  }, [devedores]);

  if (carregando) {
    return (
      <div className="dashboard-estado">
        <div className="dashboard-spinner" />
        <p>Carregando dashboard…</p>
      </div>
    );
  }

  if (metricas.vazio) {
    return (
      <div className="dashboard">
        <div className="dashboard-header">
          <div>
            <h2 className="dashboard-titulo">Dashboard</h2>
            <p className="dashboard-subtitulo">Visão geral da carteira de cobrança</p>
          </div>
        </div>
        <div className="dashboard-estado">
          <span className="dashboard-estado-icone">📊</span>
          <p>Nenhum devedor cadastrado ainda.</p>
          <p className="dashboard-estado-dica">Cadastre dívidas na aba Devedores para ver os indicadores.</p>
        </div>
      </div>
    );
  }

  function diasAte(iso: string): number {
    const diff = inicioDoDia(parseData(iso)).getTime() - metricas.hoje.getTime();
    return Math.ceil(diff / 86400000);
  }

  const maxFaixaSaldo = Math.max(...metricas.faixasAtraso.map((f) => f.saldo), 1);

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <div>
          <h2 className="dashboard-titulo">Dashboard</h2>
          <p className="dashboard-subtitulo">
            {metricas.totalDevedores} devedores · {metricas.totalDividas} dívidas · atualizado agora
          </p>
        </div>
        <div className="dashboard-recuperacao">
          <span className="dashboard-recuperacao-label">Taxa de recuperação</span>
          <div className="dashboard-recuperacao-barra">
            <div className="dashboard-recuperacao-fill" style={{ width: `${metricas.taxaRecuperacao}%` }} />
          </div>
          <span className="dashboard-recuperacao-valor">{metricas.taxaRecuperacao}% · {fmt(metricas.totalPago)} recebido</span>
        </div>
      </div>

      <div className="dashboard-hero">
        <div className="hero-card hero-aberto">
          <span className="hero-label">Saldo em aberto</span>
          <strong className="hero-valor">{fmt(metricas.saldoTotal)}</strong>
          <span className="hero-detalhe">
            Sem juros · + juros {fmt(metricas.totalJuros)} = {fmt(metricas.saldoComJuros)} total
          </span>
        </div>
        <div className="hero-card hero-atraso">
          <span className="hero-label">Saldo em atraso</span>
          <strong className="hero-valor">{fmt(metricas.saldoAtrasado)}</strong>
          <span className="hero-detalhe">
            {metricas.atrasadas} dívidas · maior atraso {metricas.maiorAtraso}d
          </span>
        </div>
        <div className="hero-card hero-risco">
          <span className="hero-label">Devedores inadimplentes</span>
          <strong className="hero-valor">{metricas.devedoresInadimplentes}</strong>
          <span className="hero-detalhe">{metricas.taxaInadimplencia}% da carteira · pendente {fmt(metricas.saldoPendente)}</span>
        </div>
      </div>

      <div className="kpi-grid">
        <CardKPI titulo="Devedores" valor={String(metricas.totalDevedores)} icone={<IconeDevedores />} />
        <CardKPI titulo="Dívidas" valor={String(metricas.totalDividas)} icone={<IconeDividas />} cor="info" />
        <CardKPI titulo="Total Recebido" valor={fmt(metricas.totalPago)} icone={<IconeCheck />} cor="sucesso" />
        <CardKPI titulo="Juros Acumulados" valor={fmt(metricas.totalJuros)} icone={<IconeJuros />} cor="alerta" />
        <CardKPI
          titulo="Inadimplência"
          valor={`${metricas.taxaInadimplencia}%`}
          icone={<IconePorcento />}
          cor={metricas.taxaInadimplencia > 50 ? "perigo" : "alerta"}
          subtexto={`${metricas.devedoresInadimplentes} devedores`}
        />
        <CardKPI
          titulo="A vencer (7 dias)"
          valor={String(metricas.vencendoBreve.length)}
          icone={<IconeRelogio />}
          cor="info"
          subtexto={metricas.vencendoBreve.length > 0 ? fmt(metricas.vencendoBreve.reduce((s, d) => s + saldoDividaSemJuros(d), 0)) : "Nenhuma"}
        />
      </div>

      <div className="dashboard-grid-2col">
        <div className="dashboard-secao">
          <h3>Distribuição por status</h3>
          <div className="barra-status-container">
            <div className="barra-status barra-status-grande">
              {metricas.pctPagas > 0 && (
                <div className="barra-segmento barra-pago" style={{ width: `${metricas.pctPagas}%` }} title={`Pagas: ${metricas.pagas}`} />
              )}
              {metricas.pctPendentes > 0 && (
                <div className="barra-segmento barra-pendente" style={{ width: `${metricas.pctPendentes}%` }} title={`Pendentes: ${metricas.pendentes}`} />
              )}
              {metricas.pctAtrasadas > 0 && (
                <div className="barra-segmento barra-atrasado" style={{ width: `${metricas.pctAtrasadas}%` }} title={`Atrasadas: ${metricas.atrasadas}`} />
              )}
            </div>
            <div className="status-resumo">
              <div className="status-resumo-item">
                <span className="legenda-cor legenda-pago" />
                <div>
                  <strong>Pagas</strong>
                  <span>{metricas.pagas} · {fmt(metricas.totalPago)} recebido</span>
                </div>
              </div>
              <div className="status-resumo-item">
                <span className="legenda-cor legenda-pendente" />
                <div>
                  <strong>Pendentes</strong>
                  <span>{metricas.pendentes} · {fmt(metricas.saldoPendente)}</span>
                </div>
              </div>
              <div className="status-resumo-item">
                <span className="legenda-cor legenda-atrasado" />
                <div>
                  <strong>Atrasadas</strong>
                  <span>{metricas.atrasadas} · {fmt(metricas.saldoAtrasado)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="dashboard-secao">
          <h3>Envelhecimento do atraso</h3>
          {metricas.atrasadas === 0 ? (
            <p className="dashboard-vazio">Nenhuma dívida atrasada no momento.</p>
          ) : (
            <ul className="lista-faixas">
              {metricas.faixasAtraso.map((faixa) => (
                <li key={faixa.label} className="faixa-item">
                  <div className="faixa-cabecalho">
                    <span>{faixa.label}</span>
                    <span>{faixa.qtd} dívidas · {fmt(faixa.saldo)}</span>
                  </div>
                  <div className="faixa-barra">
                    <div
                      className={`faixa-barra-fill ${faixa.cor}`}
                      style={{ width: `${(faixa.saldo / maxFaixaSaldo) * 100}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="dashboard-duplo">
        <div className="dashboard-secao">
          <h3>Top 5 — Maiores saldos</h3>
          <table className="tabela-top">
            <thead>
              <tr>
                <th>#</th>
                <th>Devedor</th>
                <th>Dívidas</th>
                <th>Saldo</th>
              </tr>
            </thead>
            <tbody>
              {metricas.topSaldos.map((dev, i) => (
                <tr key={dev.id}>
                  <td className="top-rank" data-label="#">{i + 1}</td>
                  <td data-label="Devedor">
                    <span className="top-nome">{dev.nome}</span>
                    <span className="top-cpf">{dev.cpfCnpj}</span>
                  </td>
                  <td data-label="Dívidas">
                    {dev.qtdDividas}
                    {dev.qtdAtrasadas > 0 && (
                      <span className="top-atrasadas"> ({dev.qtdAtrasadas} atr.)</span>
                    )}
                  </td>
                  <td className="valor saldo-devedor" data-label="Saldo">{fmt(dev.saldoSemJuros)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="dashboard-secao">
          <h3>Top 5 — Maior saldo em atraso</h3>
          {metricas.topAtrasados.length === 0 ? (
            <p className="dashboard-vazio">Nenhum devedor inadimplente.</p>
          ) : (
            <table className="tabela-top">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Devedor</th>
                  <th>Atraso</th>
                  <th>Saldo atrasado</th>
                </tr>
              </thead>
              <tbody>
                {metricas.topAtrasados.map((dev, i) => (
                  <tr key={dev.id}>
                    <td className="top-rank" data-label="#">{i + 1}</td>
                    <td data-label="Devedor">
                      <span className="top-nome">{dev.nome}</span>
                      <span className="top-cpf">{dev.qtdAtrasadas} dívida(s) atrasada(s)</span>
                    </td>
                    <td data-label="Atraso"><span className="badge-dias-dashboard">{dev.maxDias}d</span></td>
                    <td className="valor saldo-devedor" data-label="Saldo atrasado">{fmt(dev.saldoAtrasado)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <div className="dashboard-duplo">
        <div className="dashboard-secao">
          <h3>Vencendo nos próximos 7 dias</h3>
          {metricas.vencendoBreve.length === 0 ? (
            <p className="dashboard-vazio">Nenhuma dívida vencendo neste período.</p>
          ) : (
            <ul className="lista-vencimentos">
              {metricas.vencendoBreve.map((d) => (
                <li key={d.id} className="vencimento-item">
                  <div className="vencimento-info">
                    <span className="vencimento-nome">{d.nomeDevedor}</span>
                    <span className="vencimento-valor">{fmt(saldoDividaSemJuros(d))}</span>
                  </div>
                  <span className="vencimento-prazo vencimento-prazo-ok">
                    {diasAte(d.dataVencimento) <= 0 ? "Hoje" : `${diasAte(d.dataVencimento)}d`}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="dashboard-secao">
          <h3>Dívidas mais críticas (atraso)</h3>
          {metricas.pioresDividas.length === 0 ? (
            <p className="dashboard-vazio">Nenhuma dívida atrasada.</p>
          ) : (
            <ul className="lista-vencimentos">
              {metricas.pioresDividas.map((d) => (
                <li key={d.id} className="vencimento-item vencimento-item-critico">
                  <div className="vencimento-info">
                    <span className="vencimento-nome">{d.nomeDevedor}</span>
                    <span className="vencimento-valor">{fmt(saldoDividaSemJuros(d))}</span>
                  </div>
                  <span className="vencimento-prazo">{d.diasAtraso}d atraso</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
