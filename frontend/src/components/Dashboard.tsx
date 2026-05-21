import type { Devedor, DividaResumida } from "../App";
import CardKPI from "./CardKPI";

interface Props {
  devedores: Devedor[];
  carregando: boolean;
}

function fmt(valor: number): string {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
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

function IconeDinheiro() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="1" x2="12" y2="23" />
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  );
}

function IconeAlerta() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
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

export default function Dashboard({ devedores, carregando }: Props) {
  if (carregando) {
    return <p className="loading">Carregando dashboard...</p>;
  }

  const todasDividas: (DividaResumida & { nomeDevedor: string })[] = devedores.flatMap(
    (dev) => dev.dividas.map((d) => ({ ...d, nomeDevedor: dev.nome }))
  );

  const totalDevedores = devedores.length;
  const totalDividas = todasDividas.length;
  const totalOriginal = devedores.reduce((s, d) => s + d.totalOriginal, 0);
  const totalJuros = devedores.reduce((s, d) => s + d.totalJuros, 0);
  const totalPago = devedores.reduce((s, d) => s + d.totalPago, 0);
  const saldoTotal = devedores.reduce((s, d) => s + d.saldoTotal, 0);
  const totalAtrasadas = devedores.reduce((s, d) => s + d.qtdAtrasadas, 0);

  const pagas = todasDividas.filter((d) => d.status === "pago").length;
  const pendentes = todasDividas.filter((d) => d.status === "pendente").length;
  const atrasadas = todasDividas.filter((d) => d.status === "atrasado").length;

  const devedoresInadimplentes = devedores.filter((d) => d.qtdAtrasadas > 0).length;
  const taxaInadimplencia =
    totalDevedores > 0 ? Math.round((devedoresInadimplentes / totalDevedores) * 100) : 0;

  const top5 = [...devedores].sort((a, b) => b.saldoTotal - a.saldoTotal).slice(0, 5);

  const hoje = new Date();
  const em7dias = new Date(hoje.getTime() + 7 * 86400000);
  const vencendoBreve = todasDividas
    .filter((d) => d.status !== "pago" && new Date(d.dataVencimento) <= em7dias && new Date(d.dataVencimento) >= hoje)
    .sort((a, b) => new Date(a.dataVencimento).getTime() - new Date(b.dataVencimento).getTime())
    .slice(0, 8);

  const totalBarra = pagas + pendentes + atrasadas || 1;
  const pctPagas = (pagas / totalBarra) * 100;
  const pctPendentes = (pendentes / totalBarra) * 100;
  const pctAtrasadas = (atrasadas / totalBarra) * 100;

  function diasAte(iso: string): number {
    const diff = new Date(iso).getTime() - hoje.getTime();
    return Math.ceil(diff / 86400000);
  }

  return (
    <div className="dashboard">
      <h2 className="dashboard-titulo">Dashboard</h2>

      <div className="kpi-grid">
        <CardKPI titulo="Devedores" valor={String(totalDevedores)} icone={<IconeDevedores />} />
        <CardKPI titulo="Dívidas" valor={String(totalDividas)} icone={<IconeDividas />} cor="info" />
        <CardKPI titulo="Valor Original" valor={fmt(totalOriginal)} icone={<IconeDinheiro />} />
        <CardKPI titulo="Saldo Devedor" valor={fmt(saldoTotal)} icone={<IconeDinheiro />} cor="perigo" subtexto="Com juros" />
      </div>

      <div className="kpi-grid">
        <CardKPI titulo="Total Recebido" valor={fmt(totalPago)} icone={<IconeCheck />} cor="sucesso" />
        <CardKPI titulo="Juros Acumulados" valor={fmt(totalJuros)} icone={<IconeJuros />} cor="alerta" />
        <CardKPI titulo="Dívidas Atrasadas" valor={String(totalAtrasadas)} icone={<IconeAlerta />} cor="perigo" />
        <CardKPI titulo="Inadimplência" valor={`${taxaInadimplencia}%`} icone={<IconePorcento />} cor={taxaInadimplencia > 50 ? "perigo" : "alerta"} subtexto={`${devedoresInadimplentes} de ${totalDevedores}`} />
      </div>

      <div className="dashboard-secao">
        <h3>Distribuição por Status</h3>
        <div className="barra-status-container">
          <div className="barra-status">
            {pctPagas > 0 && (
              <div className="barra-segmento barra-pago" style={{ width: `${pctPagas}%` }} title={`Pagas: ${pagas}`} />
            )}
            {pctPendentes > 0 && (
              <div className="barra-segmento barra-pendente" style={{ width: `${pctPendentes}%` }} title={`Pendentes: ${pendentes}`} />
            )}
            {pctAtrasadas > 0 && (
              <div className="barra-segmento barra-atrasado" style={{ width: `${pctAtrasadas}%` }} title={`Atrasadas: ${atrasadas}`} />
            )}
          </div>
          <div className="barra-legenda">
            <span className="legenda-item">
              <span className="legenda-cor legenda-pago" /> Pagas: {pagas}
            </span>
            <span className="legenda-item">
              <span className="legenda-cor legenda-pendente" /> Pendentes: {pendentes}
            </span>
            <span className="legenda-item">
              <span className="legenda-cor legenda-atrasado" /> Atrasadas: {atrasadas}
            </span>
          </div>
        </div>
      </div>

      <div className="dashboard-duplo">
        <div className="dashboard-secao">
          <h3>Top 5 Maiores Saldos</h3>
          {top5.length === 0 ? (
            <p className="dashboard-vazio">Nenhum devedor cadastrado.</p>
          ) : (
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
                {top5.map((dev, i) => (
                  <tr key={dev.id}>
                    <td className="top-rank">{i + 1}</td>
                    <td>
                      <span className="top-nome">{dev.nome}</span>
                      <span className="top-cpf">{dev.cpfCnpj}</span>
                    </td>
                    <td>
                      {dev.qtdDividas}
                      {dev.qtdAtrasadas > 0 && (
                        <span className="top-atrasadas"> ({dev.qtdAtrasadas} atr.)</span>
                      )}
                    </td>
                    <td className="valor saldo-devedor">{fmt(dev.saldoTotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="dashboard-secao">
          <h3>Vencendo em 7 dias</h3>
          {vencendoBreve.length === 0 ? (
            <p className="dashboard-vazio">Nenhuma dívida vencendo nos próximos 7 dias.</p>
          ) : (
            <ul className="lista-vencimentos">
              {vencendoBreve.map((d) => (
                <li key={d.id} className="vencimento-item">
                  <div className="vencimento-info">
                    <span className="vencimento-nome">{d.nomeDevedor}</span>
                    <span className="vencimento-valor">{fmt(d.saldoDevedor)}</span>
                  </div>
                  <span className="vencimento-prazo">
                    {diasAte(d.dataVencimento) <= 0 ? "Hoje" : `${diasAte(d.dataVencimento)}d`}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
