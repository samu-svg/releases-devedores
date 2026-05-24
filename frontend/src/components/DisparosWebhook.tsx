import { useState, useCallback, useMemo } from "react";
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
}

interface RegistroDisparo {
  devedorId: number;
  nomeDevedor: string;
  tentativas: number;
  ultimoStatus: "sucesso" | "erro" | "enviando";
  ultimoEnvio: string;
  erro?: string;
}

interface Props {
  devedores: DevedorApi[];
  carregando: boolean;
  erro: string | null;
  token: string;
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

async function dispararWebhook(token: string, webhookUrl: string, devedor: Devedor): Promise<void> {
  const payload = montarPayloadBotConversa(devedor);

  const res = await fetch(`${API_URL}/webhook/disparar`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ webhookUrl, payload }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.erro ?? `Falha ao enviar (HTTP ${res.status})`);
  }

  const body = await res.json().catch(() => null);
  if (body && body.ok === false) {
    throw new Error(body.erro ?? "Erro ao enviar webhook");
  }
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

export default function DisparosWebhook({ devedores: devedoresApi, carregando, erro, token }: Props) {
  const [webhookUrl, setWebhookUrl] = useState(() => localStorage.getItem("webhook_url") ?? "");
  const [urlSalva, setUrlSalva] = useState(() => !!localStorage.getItem("webhook_url"));
  const devedores = useMemo(() => agruparPorDevedor(devedoresApi), [devedoresApi]);
  const [selecionados, setSelecionados] = useState<Set<number>>(new Set());
  const [filtroStatus, setFiltroStatus] = useState<"todos" | "atrasado">("atrasado");
  const [busca, setBusca] = useState("");
  const [registros, setRegistros] = useState<Map<number, RegistroDisparo>>(new Map());
  const [disparando, setDisparando] = useState(false);
  const [progresso, setProgresso] = useState({ atual: 0, total: 0 });

  const devedoresFiltrados = devedores.filter((d) => {
    const matchStatus = filtroStatus === "todos" ? true : d.status === "atrasado";
    const matchBusca = busca.trim() === "" || d.devedor.toLowerCase().includes(busca.toLowerCase());
    return matchStatus && matchBusca;
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
        const atual = n.get(d.id);
        n.set(d.id, {
          devedorId: d.id,
          nomeDevedor: d.devedor,
          tentativas: (atual?.tentativas ?? 0) + 1,
          ultimoStatus: "enviando",
          ultimoEnvio: new Date().toISOString(),
        });
        return n;
      });

      try {
        await dispararWebhook(token, webhookUrl.trim(), d);
        setRegistros((prev) => {
          const n = new Map(prev);
          const atual = n.get(d.id)!;
          n.set(d.id, { ...atual, ultimoStatus: "sucesso", erro: undefined });
          return n;
        });
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        setRegistros((prev) => {
          const n = new Map(prev);
          const atual = n.get(d.id)!;
          n.set(d.id, { ...atual, ultimoStatus: "erro", erro: msg });
          return n;
        });
      }

      if (i < alvos.length - 1) await new Promise((r) => setTimeout(r, 300));
    }

    setDisparando(false);
  }, [webhookUrl, devedores, selecionados, token]);

  const totalAtrasados = devedores.filter((d) => d.status === "atrasado").length;
  const totalSucesso = [...registros.values()].filter((r) => r.ultimoStatus === "sucesso").length;
  const totalErro = [...registros.values()].filter((r) => r.ultimoStatus === "erro").length;

  return (
    <div className="disparos-container">
      <div className="disparos-header">
        <div className="header-titulo">
          <span className="header-icon">📡</span>
          <div>
            <h2>Disparos via Webhook</h2>
            <p>Acione fluxos do chatbot para devedores selecionados</p>
          </div>
        </div>
        <div className="header-stats">
          <div className="stat-pill atrasado"><span>{totalAtrasados}</span><label>Atrasados</label></div>
          <div className="stat-pill sucesso"><span>{totalSucesso}</span><label>Enviados</label></div>
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
            <button className={`tab ${filtroStatus === "atrasado" ? "ativa" : ""}`} onClick={() => setFiltroStatus("atrasado")}>Somente atrasados</button>
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

      <div className="tabela-wrapper">
        {carregando ? (
          <div className="estado-vazio"><div className="spinner" /><p>Carregando devedores…</p></div>
        ) : erro ? (
          <div className="estado-vazio erro-texto"><span>⚠️</span><p>{erro}</p></div>
        ) : devedoresFiltrados.length === 0 ? (
          <div className="estado-vazio"><span>📭</span><p>Nenhum devedor encontrado.</p></div>
        ) : (
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
                <th>Status</th>
                <th>Disparos</th>
                <th>Último Envio</th>
                <th>Situação</th>
              </tr>
            </thead>
            <tbody>
              {devedoresFiltrados.map((d) => {
                const reg = registros.get(d.id);
                const selecionado = selecionados.has(d.id);
                return (
                  <tr
                    key={d.id}
                    className={`linha ${selecionado ? "selecionada" : ""} ${reg?.ultimoStatus === "erro" ? "linha-erro" : ""}`}
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
                    <td className="col-tentativas">
                      {reg ? (
                        <span className={`badge-tentativas ${reg.ultimoStatus === "erro" ? "erro" : "ok"}`}>{reg.tentativas}×</span>
                      ) : <span className="col-vazio">—</span>}
                    </td>
                    <td className="col-envio">{reg ? formatarData(reg.ultimoEnvio) : "—"}</td>
                    <td className="col-situacao">
                      {!reg ? <span className="situacao-aguardando">Aguardando</span>
                        : reg.ultimoStatus === "enviando" ? <span className="situacao-enviando"><span className="dot-pulse" /> Enviando…</span>
                        : reg.ultimoStatus === "sucesso" ? <span className="situacao-sucesso">✓ Enviado</span>
                        : <span className="situacao-erro" title={reg.erro}>✗ Erro ao enviar</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {totalErro > 0 && (
        <div className="painel-erros">
          <h4>⚠️ Erros de envio</h4>
          <ul>
            {[...registros.values()].filter((r) => r.ultimoStatus === "erro").map((r) => (
              <li key={r.devedorId}><strong>{r.nomeDevedor}</strong> — Erro ao enviar{r.erro ? `: ${r.erro}` : ""}</li>
            ))}
          </ul>
        </div>
      )}

      <style>{`
        .disparos-container { display:flex; flex-direction:column; gap:20px; padding:24px; font-family:'Segoe UI',system-ui,sans-serif; color:var(--color-text,#1a1a2e); background:var(--color-bg,#f4f6fb); min-height:100%; box-sizing:border-box; }
        .disparos-header { display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:16px; }
        .header-titulo { display:flex; align-items:center; gap:14px; }
        .header-icon { font-size:2rem; }
        .header-titulo h2 { margin:0 0 2px; font-size:1.4rem; font-weight:700; color:var(--color-text,#1a1a2e); }
        .header-titulo p { margin:0; font-size:0.85rem; color:#6b7280; }
        .header-stats { display:flex; gap:12px; }
        .stat-pill { display:flex; flex-direction:column; align-items:center; padding:8px 18px; border-radius:12px; font-weight:700; min-width:72px; }
        .stat-pill span { font-size:1.4rem; line-height:1; }
        .stat-pill label { font-size:0.7rem; font-weight:500; margin-top:2px; text-transform:uppercase; letter-spacing:.04em; }
        .stat-pill.atrasado { background:#fff1f0; color:#e53935; }
        .stat-pill.sucesso { background:#f0fdf4; color:#16a34a; }
        .stat-pill.erro { background:#fff7ed; color:#ea580c; }
        .secao-webhook { background:#fff; border:1px solid #e5e7eb; border-radius:14px; padding:18px 20px; }
        .secao-label { display:block; font-size:0.78rem; font-weight:600; text-transform:uppercase; letter-spacing:.06em; color:#6b7280; margin-bottom:10px; }
        .webhook-input-row { display:flex; gap:10px; }
        .webhook-input { flex:1; padding:10px 14px; border:1.5px solid #d1d5db; border-radius:9px; font-size:0.92rem; color:#1a1a2e; background:#f9fafb; outline:none; transition:border-color .2s; }
        .webhook-input:focus { border-color:#4f46e5; background:#fff; }
        .btn-salvar { padding:10px 20px; background:#4f46e5; color:#fff; border:none; border-radius:9px; font-size:0.9rem; font-weight:600; cursor:pointer; white-space:nowrap; transition:background .15s,transform .1s; }
        .btn-salvar:hover:not(:disabled) { background:#4338ca; }
        .btn-salvar:active { transform:scale(.97); }
        .btn-salvar.salvo { background:#16a34a; }
        .btn-salvar:disabled { opacity:.45; cursor:default; }
        .webhook-hint { margin:8px 0 0; font-size:0.78rem; color:#9ca3af; }
        .barra-acoes { display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:12px; }
        .barra-esquerda, .barra-direita { display:flex; align-items:center; gap:10px; flex-wrap:wrap; }
        .filtro-tabs { display:flex; background:#e5e7eb; border-radius:8px; padding:3px; }
        .tab { padding:6px 14px; border:none; background:transparent; border-radius:6px; font-size:0.82rem; font-weight:500; cursor:pointer; color:#6b7280; transition:background .15s,color .15s; }
        .tab.ativa { background:#fff; color:#1a1a2e; box-shadow:0 1px 4px #0001; }
        .busca-input { padding:7px 12px; border:1.5px solid #d1d5db; border-radius:8px; font-size:0.85rem; color:#1a1a2e; background:#fff; outline:none; width:180px; }
        .busca-input:focus { border-color:#4f46e5; }
        .btn-atalho { padding:7px 14px; background:#eef2ff; color:#4f46e5; border:1.5px solid #c7d2fe; border-radius:8px; font-size:0.82rem; font-weight:600; cursor:pointer; transition:background .15s; }
        .btn-atalho:hover:not(:disabled) { background:#e0e7ff; }
        .btn-atalho.cinza { background:#f3f4f6; color:#6b7280; border-color:#d1d5db; }
        .btn-atalho.cinza:hover:not(:disabled) { background:#e5e7eb; }
        .btn-atalho:disabled { opacity:.4; cursor:default; }
        .btn-disparar { padding:8px 22px; background:#4f46e5; color:#fff; border:none; border-radius:9px; font-size:0.9rem; font-weight:700; cursor:pointer; letter-spacing:.01em; transition:background .15s,transform .1s; }
        .btn-disparar:hover:not(:disabled) { background:#4338ca; }
        .btn-disparar:active { transform:scale(.97); }
        .btn-disparar:disabled { opacity:.45; cursor:default; }
        .progresso-wrapper { height:4px; background:#e5e7eb; border-radius:4px; overflow:hidden; }
        .progresso-barra { height:100%; background:linear-gradient(90deg,#4f46e5,#7c3aed); border-radius:4px; transition:width .3s ease; }
        .tabela-wrapper { background:#fff; border:1px solid #e5e7eb; border-radius:14px; overflow:hidden; overflow-x:auto; }
        .tabela-devedores { width:100%; border-collapse:collapse; font-size:0.875rem; }
        .tabela-devedores thead tr { background:#f9fafb; border-bottom:1.5px solid #e5e7eb; }
        .tabela-devedores th { padding:11px 14px; text-align:left; font-size:0.72rem; font-weight:700; text-transform:uppercase; letter-spacing:.06em; color:#6b7280; white-space:nowrap; }
        .col-check { width:40px; text-align:center; }
        .tabela-devedores td { padding:11px 14px; vertical-align:middle; border-bottom:1px solid #f3f4f6; color:#374151; }
        .linha { cursor:pointer; transition:background .12s; }
        .linha:hover { background:#f9fafb; }
        .linha.selecionada { background:#eef2ff; }
        .linha.linha-erro { background:#fff5f5; }
        .linha.linha-erro:hover { background:#fff0f0; }
        .col-nome { font-weight:600; color:#1a1a2e; }
        .col-cpf { font-family:monospace; font-size:0.82rem; color:#6b7280; }
        .col-valor { font-weight:600; color:#e53935; }
        .col-dias { text-align:center; }
        .col-vazio { color:#d1d5db; }
        .badge-dias { background:#fff1f0; color:#e53935; border-radius:6px; padding:2px 8px; font-size:0.78rem; font-weight:700; }
        .badge-status { padding:3px 10px; border-radius:6px; font-size:0.76rem; font-weight:700; text-transform:uppercase; letter-spacing:.04em; }
        .badge-status.atrasado { background:#fff1f0; color:#e53935; }
        .badge-status.pendente { background:#fff7ed; color:#ea580c; }
        .badge-status.pago { background:#f0fdf4; color:#16a34a; }
        .col-tentativas { text-align:center; }
        .badge-tentativas { padding:2px 10px; border-radius:6px; font-size:0.8rem; font-weight:700; }
        .badge-tentativas.ok { background:#eef2ff; color:#4f46e5; }
        .badge-tentativas.erro { background:#fff1f0; color:#e53935; }
        .col-envio { font-size:0.8rem; color:#6b7280; white-space:nowrap; }
        .col-situacao { white-space:nowrap; }
        .situacao-aguardando { color:#9ca3af; font-size:0.82rem; }
        .situacao-enviando { color:#4f46e5; font-size:0.82rem; display:inline-flex; align-items:center; gap:5px; }
        .situacao-sucesso { color:#16a34a; font-size:0.82rem; font-weight:600; }
        .situacao-erro { color:#e53935; font-size:0.82rem; font-weight:600; cursor:help; }
        .dot-pulse { width:8px; height:8px; border-radius:50%; background:#4f46e5; display:inline-block; animation:pulse 1s infinite; }
        @keyframes pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.4;transform:scale(.7)} }
        .estado-vazio { display:flex; flex-direction:column; align-items:center; justify-content:center; padding:60px 20px; gap:12px; color:#9ca3af; }
        .estado-vazio span { font-size:2.5rem; }
        .estado-vazio p { margin:0; font-size:0.9rem; }
        .erro-texto { color:#e53935; }
        .spinner { width:32px; height:32px; border:3px solid #e5e7eb; border-top-color:#4f46e5; border-radius:50%; animation:spin .7s linear infinite; }
        @keyframes spin { to{transform:rotate(360deg)} }
        .painel-erros { background:#fff5f5; border:1.5px solid #fecaca; border-radius:12px; padding:16px 20px; }
        .painel-erros h4 { margin:0 0 10px; font-size:0.9rem; color:#e53935; }
        .painel-erros ul { margin:0; padding:0 0 0 16px; }
        .painel-erros li { font-size:0.85rem; color:#7f1d1d; margin-bottom:4px; }
        input[type="checkbox"] { accent-color:#4f46e5; width:16px; height:16px; cursor:pointer; }
      `}</style>
    </div>
  );
}
