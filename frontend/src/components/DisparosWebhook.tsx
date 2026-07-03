import { useState, useCallback, useMemo, useEffect } from "react";
import type { Devedor as DevedorApi } from "../App";
import { API_URL } from "../lib/api";
import { saldoDevedorSemJuros } from "../lib/saldo";

interface Devedor {
  id: number;
  devedor: string;
  cpfCnpj?: string;
  telefone?: string | null;
  valorOriginal: number;
  saldoDevedor: number;
  diasAtraso: number;
  status: "atrasado" | "pendente" | "pago";
  dataVencimento: string;
  cobranca?: {
    totalEnvios: number;
    ultimoEnvio: string | null;
    ultimoStatus: "sucesso" | "erro" | null;
    ultimoErro: string | null;
  };
}

interface RegistroDisparo {
  devedorId: number;
  totalEnvios: number;
  ultimoStatus: "sucesso" | "erro" | "enviando";
  ultimoEnvio: string | null;
  ultimoErro?: string;
}

interface Props {
  devedores: DevedorApi[];
  carregando: boolean;
  erro: string | null;
  token: string;
  onAtualizar?: () => void;
}

function agruparPorDevedor(data: DevedorApi[]): Devedor[] {
  return data.map((dev) => {
    const dividas = dev.dividas ?? [];
    const diasAtraso = dividas.length > 0 ? Math.max(...dividas.map((d) => d.diasAtraso)) : 0;
    const status: Devedor["status"] = dividas.some((d) => d.status === "atrasado")
      ? "atrasado"
      : dividas.some((d) => d.status === "pendente")
        ? "pendente"
        : "pago";
    const dividasAbertas = dividas
      .filter((d) => d.status !== "pago")
      .sort((a, b) => a.dataVencimento.localeCompare(b.dataVencimento));
    const dataVencimento = dividasAbertas[0]?.dataVencimento ?? dividas[0]?.dataVencimento ?? "";

    return {
      id: dev.id,
      devedor: dev.nome,
      cpfCnpj: dev.cpfCnpj,
      telefone: dev.telefone,
      valorOriginal: dev.totalOriginal,
      saldoDevedor: saldoDevedorSemJuros(dev),
      diasAtraso,
      status,
      dataVencimento,
      cobranca: dev.cobranca,
    };
  });
}

function normalizarTelefone(telefone: string | null | undefined): string | null {
  if (!telefone?.trim()) return null;
  const digits = telefone.replace(/\D/g, "");
  if (digits.length < 10) return null;
  return digits.startsWith("55") ? digits : `55${digits}`;
}

function pareceTelefone(valor: string): boolean {
  const digits = valor.replace(/\D/g, "");
  return digits.length >= 10 && digits.length <= 15;
}

function obterTelefone(devedor: Devedor): string | null {
  const tel = normalizarTelefone(devedor.telefone);
  if (tel) return tel;
  if (devedor.cpfCnpj && pareceTelefone(devedor.cpfCnpj)) {
    return normalizarTelefone(devedor.cpfCnpj);
  }
  return null;
}

function montarPayloadBotConversa(devedor: Devedor): Record<string, string | number> {
  const phone = obterTelefone(devedor);
  if (!phone) {
    throw new Error(`Telefone não cadastrado para "${devedor.devedor}"`);
  }

  return {
    name: devedor.devedor,
    phone,
    "customFields dias atraso": devedor.diasAtraso,
    "customFields valor divida": devedor.saldoDevedor.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    }),
    "customFields data vencimento": devedor.dataVencimento,
  };
}

async function dispararWebhook(
  token: string,
  webhookUrl: string,
  devedor: Devedor
): Promise<RegistroDisparo> {
  const payload = montarPayloadBotConversa(devedor);

  const res = await fetch(`${API_URL}/webhook/disparar`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ webhookUrl, payload, devedorId: devedor.id }),
  });

  const body = await res.json().catch(() => null);

  if (!res.ok) {
    throw new Error(body?.erro ?? `Falha ao enviar (HTTP ${res.status})`);
  }

  if (body && body.ok === false) {
    throw new Error(body.erro ?? "Erro ao enviar webhook");
  }

  const cobranca = body?.cobranca;
  return {
    devedorId: devedor.id,
    totalEnvios: cobranca?.totalEnvios ?? 0,
    ultimoStatus: "sucesso",
    ultimoEnvio: cobranca?.ultimoEnvio ?? new Date().toISOString(),
  };
}

function cobrancaParaRegistro(devedorId: number, cobranca?: Devedor["cobranca"]): RegistroDisparo | null {
  if (!cobranca) return null;
  return {
    devedorId,
    totalEnvios: cobranca.totalEnvios,
    ultimoStatus: cobranca.ultimoStatus === "erro" ? "erro" : "sucesso",
    ultimoEnvio: cobranca.ultimoEnvio,
    ultimoErro: cobranca.ultimoErro ?? undefined,
  };
}

function formatarMoeda(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatarData(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

export default function DisparosWebhook({ devedores: devedoresApi, carregando, erro, token, onAtualizar }: Props) {
  const [webhookUrl, setWebhookUrl] = useState(() => localStorage.getItem("webhook_url") ?? "");
  const [urlSalva, setUrlSalva] = useState(() => !!localStorage.getItem("webhook_url"));
  const devedores = useMemo(() => agruparPorDevedor(devedoresApi), [devedoresApi]);
  const [selecionados, setSelecionados] = useState<Set<number>>(new Set());
  const [filtroStatus, setFiltroStatus] = useState<"atrasado" | "todos" | "nao_cobrados" | "cobrados">("atrasado");
  const [busca, setBusca] = useState("");
  const [registros, setRegistros] = useState<Map<number, RegistroDisparo>>(new Map());
  const [disparando, setDisparando] = useState(false);
  const [progresso, setProgresso] = useState({ atual: 0, total: 0 });

  useEffect(() => {
    const map = new Map<number, RegistroDisparo>();
    for (const d of devedores) {
      const reg = cobrancaParaRegistro(d.id, d.cobranca);
      if (reg) map.set(d.id, reg);
    }
    setRegistros(map);
  }, [devedores]);

  const devedoresFiltrados = devedores.filter((d) => {
    const totalEnvios = registros.get(d.id)?.totalEnvios ?? d.cobranca?.totalEnvios ?? 0;
    const cobrado = totalEnvios > 0;
    const matchBusca =
      busca.trim() === "" || d.devedor.toLowerCase().includes(busca.toLowerCase());
    if (!matchBusca) return false;

    switch (filtroStatus) {
      case "atrasado":
        return d.status === "atrasado";
      case "cobrados":
        return cobrado;
      case "nao_cobrados":
        return !cobrado;
      default:
        return true;
    }
  });

  const toggleSelecionado = (id: number) => {
    setSelecionados((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  const selecionarTodosAtrasados = () => {
    setSelecionados(new Set(devedores.filter((d) => d.status === "atrasado").map((d) => d.id)));
  };

  const limparSelecao = () => setSelecionados(new Set());

  const todosFiltradosSelecionados =
    devedoresFiltrados.length > 0 && devedoresFiltrados.every((d) => selecionados.has(d.id));

  const toggleTodosFiltrados = () => {
    if (todosFiltradosSelecionados) {
      setSelecionados((prev) => {
        const n = new Set(prev);
        devedoresFiltrados.forEach((d) => n.delete(d.id));
        return n;
      });
    } else {
      setSelecionados((prev) => {
        const n = new Set(prev);
        devedoresFiltrados.forEach((d) => n.add(d.id));
        return n;
      });
    }
  };

  const salvarUrl = () => {
    localStorage.setItem("webhook_url", webhookUrl.trim());
    setUrlSalva(true);
  };

  const disparar = useCallback(async () => {
    if (!webhookUrl.trim()) return;
    const alvos = devedores.filter((d) => selecionados.has(d.id));
    if (alvos.length === 0) return;

    setDisparando(true);
    setProgresso({ atual: 0, total: alvos.length });

    for (let i = 0; i < alvos.length; i++) {
      const d = alvos[i];
      setProgresso({ atual: i + 1, total: alvos.length });

      setRegistros((prev) => {
        const n = new Map(prev);
        n.set(d.id, {
          devedorId: d.id,
          totalEnvios: n.get(d.id)?.totalEnvios ?? d.cobranca?.totalEnvios ?? 0,
          ultimoStatus: "enviando",
          ultimoEnvio: new Date().toISOString(),
        });
        return n;
      });

      try {
        const registro = await dispararWebhook(token, webhookUrl.trim(), d);
        setRegistros((prev) => {
          const n = new Map(prev);
          n.set(d.id, registro);
          return n;
        });
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        setRegistros((prev) => {
          const n = new Map(prev);
          const atual = n.get(d.id);
          n.set(d.id, {
            devedorId: d.id,
            totalEnvios: atual?.totalEnvios ?? d.cobranca?.totalEnvios ?? 0,
            ultimoStatus: "erro",
            ultimoEnvio: new Date().toISOString(),
            ultimoErro: msg,
          });
          return n;
        });
      }

      if (i < alvos.length - 1) await new Promise((r) => setTimeout(r, 300));
    }

    setDisparando(false);
    onAtualizar?.();
  }, [webhookUrl, devedores, selecionados, token, onAtualizar]);

  const totalAtrasados = devedores.filter((d) => d.status === "atrasado").length;
  const totalCobrados = devedores.filter((d) => (registros.get(d.id)?.totalEnvios ?? d.cobranca?.totalEnvios ?? 0) > 0).length;
  const totalErro = [...registros.values()].filter((r) => r.ultimoStatus === "erro").length;

  return (
    <div className="disparos-container">
      <div className="disparos-header">
        <div className="header-titulo">
          <span className="header-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12.55a11 11 0 0 1 14.08 0" />
              <path d="M1.42 9a16 16 0 0 1 21.16 0" />
              <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
              <line x1="12" y1="20" x2="12.01" y2="20" />
            </svg>
          </span>
          <div>
            <h2>Disparos via Webhook</h2>
            <p>Acione fluxos do chatbot para devedores selecionados</p>
          </div>
        </div>
        <div className="header-stats">
          <div className="stat-pill atrasado"><span>{totalAtrasados}</span><label>Atrasados</label></div>
          <div className="stat-pill sucesso"><span>{totalCobrados}</span><label>Cobrados</label></div>
          <div className="stat-pill erro"><span>{totalErro}</span><label>Erros</label></div>
        </div>
      </div>

      <div className="secao-webhook">
        <label className="secao-label">URL do Webhook</label>
        <div className="webhook-input-row">
          <input
            type="url"
            className="webhook-input"
            placeholder="https://seu-chatbot.com/webhook/fluxo-cobranca"
            value={webhookUrl}
            onChange={(e) => { setWebhookUrl(e.target.value); setUrlSalva(false); }}
          />
          <button className={`btn-salvar ${urlSalva ? "salvo" : ""}`} onClick={salvarUrl} disabled={!webhookUrl.trim()}>
            {urlSalva ? "✓ Salvo" : "Salvar"}
          </button>
        </div>
        <p className="webhook-hint">
          Formato BotConversa: name, phone e customFields (dias atraso, valor divida, data vencimento).
          O devedor precisa ter telefone cadastrado.
        </p>
      </div>

      <div className="barra-acoes">
        <div className="barra-esquerda">
          <div className="filtro-tabs">
            <button className={`tab ${filtroStatus === "atrasado" ? "ativa" : ""}`} onClick={() => setFiltroStatus("atrasado")}>Atrasados</button>
            <button className={`tab ${filtroStatus === "nao_cobrados" ? "ativa" : ""}`} onClick={() => setFiltroStatus("nao_cobrados")}>Não cobrados</button>
            <button className={`tab ${filtroStatus === "cobrados" ? "ativa" : ""}`} onClick={() => setFiltroStatus("cobrados")}>Cobrados</button>
            <button className={`tab ${filtroStatus === "todos" ? "ativa" : ""}`} onClick={() => setFiltroStatus("todos")}>Todos</button>
          </div>
          <input className="busca-input" type="text" placeholder="Buscar devedor..." value={busca} onChange={(e) => setBusca(e.target.value)} />
        </div>
        <div className="barra-direita">
          <button className="btn-atalho" onClick={selecionarTodosAtrasados}>Selecionar todos atrasados</button>
          <button className="btn-atalho cinza" onClick={limparSelecao} disabled={selecionados.size === 0}>Limpar seleção</button>
          <button className="btn-disparar" onClick={disparar} disabled={disparando || selecionados.size === 0 || !webhookUrl.trim()}>
            {disparando ? `Enviando ${progresso.atual}/${progresso.total}…` : `🚀 Disparar (${selecionados.size})`}
          </button>
        </div>
      </div>

      {disparando && (
        <div className="progresso-wrapper">
          <div className="progresso-barra" style={{ width: `${(progresso.atual / progresso.total) * 100}%` }} />
        </div>
      )}

      <div className="disparos-lista-conteudo">
        {carregando ? (
          <div className="estado-vazio"><div className="spinner" /><p>Carregando devedores…</p></div>
        ) : erro ? (
          <div className="estado-vazio erro-texto"><span>⚠️</span><p>{erro}</p></div>
        ) : devedoresFiltrados.length === 0 ? (
          <div className="estado-vazio"><span>📭</span><p>Nenhum devedor encontrado.</p></div>
        ) : (
          <>
            <div className="disparos-tabela-desktop tabela-wrapper">
              <table className="tabela-devedores">
                <thead>
                  <tr>
                    <th className="col-check">
                      <input type="checkbox" checked={todosFiltradosSelecionados} onChange={toggleTodosFiltrados} />
                    </th>
                    <th>Devedor</th>
                    <th>CPF/CNPJ</th>
                    <th>Saldo Devedor</th>
                    <th>Dias Atraso</th>
                    <th>Status dívida</th>
                    <th>Cobrança</th>
                    <th>Envios</th>
                    <th>Último envio</th>
                    <th>Situação</th>
                  </tr>
                </thead>
                <tbody>
                  {devedoresFiltrados.map((d) => {
                    const reg = registros.get(d.id);
                    const totalEnvios = reg?.totalEnvios ?? d.cobranca?.totalEnvios ?? 0;
                    const cobrado = totalEnvios > 0;
                    const selecionado = selecionados.has(d.id);
                    return (
                      <tr
                        key={d.id}
                        className={`linha ${selecionado ? "selecionada" : ""} ${reg?.ultimoStatus === "erro" ? "linha-erro" : ""} ${cobrado ? "linha-cobrado" : ""}`}
                        onClick={() => toggleSelecionado(d.id)}
                      >
                        <td className="col-check">
                          <input type="checkbox" checked={selecionado} onChange={() => toggleSelecionado(d.id)} onClick={(e) => e.stopPropagation()} />
                        </td>
                        <td className="col-nome">{d.devedor}</td>
                        <td className="col-cpf">{d.cpfCnpj ?? "—"}</td>
                        <td className="col-valor">{formatarMoeda(d.saldoDevedor)}</td>
                        <td className="col-dias">
                          {d.diasAtraso > 0 ? <span className="badge-dias">{d.diasAtraso}d</span> : "—"}
                        </td>
                        <td>
                          <span className={`badge-status ${d.status}`}>
                            {d.status === "atrasado" ? "Atrasado" : d.status === "pendente" ? "Pendente" : "Pago"}
                          </span>
                        </td>
                        <td className="col-cobranca">
                          {cobrado ? (
                            <span className="badge-cobrado">Cobrado</span>
                          ) : (
                            <span className="col-vazio">—</span>
                          )}
                        </td>
                        <td className="col-tentativas">
                          {totalEnvios > 0 ? (
                            <span className="badge-tentativas ok">{totalEnvios}×</span>
                          ) : (
                            <span className="col-vazio">0</span>
                          )}
                        </td>
                        <td className="col-envio">
                          {reg?.ultimoEnvio ?? d.cobranca?.ultimoEnvio
                            ? formatarData(reg?.ultimoEnvio ?? d.cobranca!.ultimoEnvio!)
                            : "—"}
                        </td>
                        <td className="col-situacao">
                          {reg?.ultimoStatus === "enviando" ? (
                            <span className="situacao-enviando"><span className="dot-pulse" /> Enviando…</span>
                          ) : reg?.ultimoStatus === "erro" ? (
                            <span className="situacao-erro" title={reg.ultimoErro}>✗ Erro</span>
                          ) : cobrado ? (
                            <span className="situacao-sucesso">✓ Enviado</span>
                          ) : (
                            <span className="situacao-aguardando">Aguardando</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="disparos-lista-mobile">
              {devedoresFiltrados.map((d) => {
                const reg = registros.get(d.id);
                const totalEnvios = reg?.totalEnvios ?? d.cobranca?.totalEnvios ?? 0;
                const cobrado = totalEnvios > 0;
                const selecionado = selecionados.has(d.id);
                return (
                  <article
                    key={d.id}
                    className={`disparo-card ${selecionado ? "selecionada" : ""} ${reg?.ultimoStatus === "erro" ? "linha-erro" : ""} ${cobrado ? "linha-cobrado" : ""}`}
                    onClick={() => toggleSelecionado(d.id)}
                  >
                    <div className="disparo-card-topo">
                      <input
                        type="checkbox"
                        checked={selecionado}
                        onChange={() => toggleSelecionado(d.id)}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <div className="disparo-card-identidade">
                        <strong>{d.devedor}</strong>
                        <span>{d.cpfCnpj ?? "Sem CPF/CNPJ"}</span>
                      </div>
                      <span className="disparo-card-valor">{formatarMoeda(d.saldoDevedor)}</span>
                    </div>
                    <div className="disparo-card-meta">
                      <span className={`badge-status ${d.status}`}>
                        {d.status === "atrasado" ? "Atrasado" : d.status === "pendente" ? "Pendente" : "Pago"}
                      </span>
                      {d.diasAtraso > 0 && <span className="badge-dias">{d.diasAtraso}d</span>}
                      {cobrado ? <span className="badge-cobrado">Cobrado {totalEnvios}×</span> : null}
                    </div>
                    <div className="disparo-card-rodape">
                      {reg?.ultimoStatus === "enviando" ? (
                        <span className="situacao-enviando"><span className="dot-pulse" /> Enviando…</span>
                      ) : reg?.ultimoStatus === "erro" ? (
                        <span className="situacao-erro" title={reg.ultimoErro}>✗ Erro ao enviar</span>
                      ) : cobrado ? (
                        <span className="situacao-sucesso">✓ Enviado</span>
                      ) : (
                        <span className="situacao-aguardando">Aguardando disparo</span>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          </>
        )}
      </div>

      {totalErro > 0 && (
        <div className="painel-erros">
          <h4>⚠️ Erros de envio</h4>
          <ul>
            {[...registros.values()].filter((r) => r.ultimoStatus === "erro").map((r) => {
              const nome = devedores.find((d) => d.id === r.devedorId)?.devedor ?? `#${r.devedorId}`;
              return (
                <li key={r.devedorId}><strong>{nome}</strong> — Erro ao enviar{r.ultimoErro ? `: ${r.ultimoErro}` : ""}</li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
