import { useState, useEffect, useRef } from "react";
import { Session } from "@supabase/supabase-js";
import { supabase } from "./lib/supabase";
import Login from "./components/Login";
import Sidebar, { type Pagina } from "./components/Sidebar";
import Dashboard from "./components/Dashboard";
import CardDevedor from "./components/CardDevedor";
import FormularioDivida from "./components/FormularioDivida";
import ModalPagamento from "./components/ModalPagamento";
import ModalNovaDivida from "./components/ModalNovaDivida";
import ModalDetalhesDivida from "./components/ModalDetalhesDivida";
import ModalDetalhesDevedor from "./components/ModalDetalhesDevedor";
import DisparosWebhook from "./components/DisparosWebhook";
import { API_URL } from "./lib/api";

export interface DividaResumida {
  id: number;
  valorOriginal: number;
  totalPago: number;
  jurosAcumulados: number;
  multaAtraso: number;
  saldoDevedor: number;
  diasAtraso: number;
  dataVencimento: string;
  status: "pendente" | "pago" | "atrasado";
}

export interface CobrancaDisparadaResumo {
  totalEnvios: number;
  ultimoEnvio: string | null;
  ultimoStatus: "sucesso" | "erro" | null;
  ultimoErro: string | null;
}

export interface Devedor {
  id: number;
  nome: string;
  cpfCnpj: string;
  telefone: string | null;
  email: string | null;
  totalOriginal: number;
  totalJuros: number;
  totalPago: number;
  saldoTotal: number;
  qtdDividas: number;
  qtdAtrasadas: number;
  cobranca?: CobrancaDisparadaResumo;
  dividas: DividaResumida[];
}

interface ResultadoImportacao {
  importadas: number;
  erros: string[];
  total: number;
}

function authHeaders(token: string): Record<string, string> {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [carregandoAuth, setCarregandoAuth] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setCarregandoAuth(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  if (carregandoAuth) {
    return (
      <div className="loading-tela-cheia">
        <div className="dashboard-estado">
          <div className="dashboard-spinner" />
          <p>Carregando…</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return <Login onLogin={() => {}} />;
  }

  return <AppAutenticado session={session} />;
}

function AppAutenticado({ session }: { session: Session }) {
  const token = session.access_token;
  const [paginaAtual, setPaginaAtual] = useState<Pagina>("dashboard");
  const [devedores, setDevedores] = useState<Devedor[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [dividaPagamento, setDividaPagamento] = useState<{
    divida: DividaResumida;
    nomeDevedor: string;
  } | null>(null);
  const [devedorNovaDivida, setDevedorNovaDivida] = useState<Devedor | null>(
    null
  );
  const [dividaDetalhes, setDividaDetalhes] = useState<{
    divida: DividaResumida;
    nomeDevedor: string;
  } | null>(null);
  const [devedorDetalhes, setDevedorDetalhes] = useState<Devedor | null>(null);
  const [busca, setBusca] = useState("");
  const [filtroDevedor, setFiltroDevedor] = useState<"todos" | "atraso" | "quitados">("todos");
  const [sidebarAberta, setSidebarAberta] = useState(false);
  const [importando, setImportando] = useState(false);
  const [resultadoImportacao, setResultadoImportacao] =
    useState<ResultadoImportacao | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function carregarDevedores() {
    try {
      setCarregando(true);
      setErro(null);
      const res = await fetch(`${API_URL}/devedores`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`Erro HTTP ${res.status}`);
      const dados: Devedor[] = await res.json();
      setDevedores(dados);
    } catch {
      setErro(
        "Não foi possível conectar ao servidor. Verifique se o backend está rodando na porta 4000."
      );
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregarDevedores();
  }, []);

  async function adicionarDivida(dados: {
    devedor: string;
    cpfCnpj?: string;
    valorOriginal: string;
    dataVencimento: string;
    telefone?: string;
    email?: string;
  }) {
    const res = await fetch(`${API_URL}/dividas`, {
      method: "POST",
      headers: authHeaders(token),
      body: JSON.stringify(dados),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      throw new Error(body?.erro ?? `Erro HTTP ${res.status}`);
    }
    setDevedorNovaDivida(null);
    await carregarDevedores();
  }

  async function adicionarDividaFormulario(dados: {
    devedor: string;
    cpfCnpj?: string;
    valorOriginal: string;
    dataVencimento: string;
  }) {
    try {
      setErro(null);
      await adicionarDivida(dados);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erro ao adicionar dívida.";
      setErro(msg);
    }
  }

  async function removerDivida(id: number) {
    try {
      await fetch(`${API_URL}/dividas/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      await carregarDevedores();
    } catch {
      setErro("Erro ao remover dívida.");
    }
  }

  async function removerDevedor(devedor: Devedor) {
    if (
      !window.confirm(
        `Excluir o devedor "${devedor.nome}" e todas as suas ${devedor.qtdDividas} dívida(s)? Esta ação não pode ser desfeita.`
      )
    ) {
      return;
    }
    try {
      const res = await fetch(`${API_URL}/devedores/${devedor.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Erro ao remover");
      setDevedorDetalhes(null);
      await carregarDevedores();
    } catch {
      setErro("Erro ao remover devedor.");
    }
  }

  async function registrarPagamento(
    dividaId: number,
    valorPago: number,
    dataPagamento: string
  ) {
    const res = await fetch(`${API_URL}/pagamentos`, {
      method: "POST",
      headers: authHeaders(token),
      body: JSON.stringify({ dividaId, valorPago, dataPagamento }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      throw new Error(body?.erro ?? `Erro HTTP ${res.status}`);
    }
    setDividaPagamento(null);
    await carregarDevedores();
  }

  async function removerPagamento(pagamentoId: number) {
    const res = await fetch(`${API_URL}/pagamentos/${pagamentoId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      throw new Error(body?.erro ?? `Erro HTTP ${res.status}`);
    }
    await carregarDevedores();
  }

  async function handleImportarCsv(e: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = e.target.files?.[0];
    if (!arquivo) return;

    setImportando(true);
    setResultadoImportacao(null);
    setErro(null);

    try {
      const conteudo = await arquivo.text();
      const res = await fetch(`${API_URL}/importar/csv`, {
        method: "POST",
        headers: authHeaders(token),
        body: JSON.stringify({ conteudo }),
      });
      if (!res.ok) throw new Error(`Erro HTTP ${res.status}`);
      const resultado: ResultadoImportacao = await res.json();
      setResultadoImportacao(resultado);
      await carregarDevedores();
    } catch {
      setErro("Erro ao importar CSV.");
    } finally {
      setImportando(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
  }

  return (
    <div className="app-layout">
      <div
        className={`sidebar-overlay ${sidebarAberta ? "visivel" : ""}`}
        onClick={() => setSidebarAberta(false)}
      />
      <Sidebar
        paginaAtual={paginaAtual}
        onNavegar={setPaginaAtual}
        email={session.user.email ?? ""}
        onLogout={handleLogout}
        aberta={sidebarAberta}
        onFechar={() => setSidebarAberta(false)}
      />

      <main className="app-conteudo">
        <div className="app-topbar">
          <button
            type="button"
            className="btn-menu-mobile"
            onClick={() => setSidebarAberta(true)}
            aria-label="Abrir menu"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
          <span className="app-topbar-titulo">
            {paginaAtual === "dashboard" ? "Dashboard" : paginaAtual === "devedores" ? "Devedores" : "Disparos"}
          </span>
        </div>
        {paginaAtual === "dashboard" && (
          <Dashboard devedores={devedores} carregando={carregando} />
        )}

        {paginaAtual === "disparos" && (
          <DisparosWebhook
            devedores={devedores}
            carregando={carregando}
            erro={erro}
            token={token}
            onAtualizar={carregarDevedores}
          />
        )}

        {paginaAtual === "devedores" && (
          <>
            <div className="pagina-cabecalho">
              <h1>Devedores</h1>
              <p>Gerencie dívidas, pagamentos e importações da carteira.</p>
            </div>

            <FormularioDivida onSubmit={adicionarDividaFormulario} />

            <div className="secao-devedores">
              <div className="pagina-toolbar">
                <div className="filtro-pills">
                  <button
                    type="button"
                    className={`filtro-pill ${filtroDevedor === "todos" ? "ativo" : ""}`}
                    onClick={() => setFiltroDevedor("todos")}
                  >
                    Todos
                  </button>
                  <button
                    type="button"
                    className={`filtro-pill ${filtroDevedor === "atraso" ? "ativo" : ""}`}
                    onClick={() => setFiltroDevedor("atraso")}
                  >
                    Com atraso
                  </button>
                  <button
                    type="button"
                    className={`filtro-pill ${filtroDevedor === "quitados" ? "ativo" : ""}`}
                    onClick={() => setFiltroDevedor("quitados")}
                  >
                    Quitados
                  </button>
                </div>
                <div className="secao-acoes">
                  <label className="btn btn-outline btn-importar">
                    {importando ? "Importando..." : "Importar CSV"}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".csv,.txt"
                      onChange={handleImportarCsv}
                      disabled={importando}
                      hidden
                    />
                  </label>
                  <button
                    className="btn btn-primario"
                    onClick={carregarDevedores}
                  >
                    Atualizar
                  </button>
                </div>
              </div>

              {resultadoImportacao && (
                <div
                  className={`resultado-importacao ${resultadoImportacao.erros.length > 0 ? "com-erros" : ""}`}
                >
                  <p>
                    Importação concluída:{" "}
                    <strong>{resultadoImportacao.importadas}</strong> de{" "}
                    {resultadoImportacao.total} dívidas importadas.
                  </p>
                  {resultadoImportacao.erros.length > 0 && (
                    <details>
                      <summary>
                        {resultadoImportacao.erros.length} erro(s)
                      </summary>
                      <ul>
                        {resultadoImportacao.erros.map((e, i) => (
                          <li key={i}>{e}</li>
                        ))}
                      </ul>
                    </details>
                  )}
                  <button
                    className="btn-fechar-resultado"
                    onClick={() => setResultadoImportacao(null)}
                  >
                    &times;
                  </button>
                </div>
              )}

              <div className="barra-pesquisa">
                <span className="icone-lupa">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                </span>
                <input
                  type="text"
                  placeholder="Pesquisar por nome ou CPF/CNPJ..."
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                />
                {busca && (
                  <button
                    className="btn-limpar-busca"
                    onClick={() => setBusca("")}
                    aria-label="Limpar busca"
                  >
                    &times;
                  </button>
                )}
              </div>

              {carregando && (
                <div className="dashboard-estado">
                  <div className="dashboard-spinner" />
                  <p>Carregando devedores…</p>
                </div>
              )}
              {erro && <p className="erro">{erro}</p>}
              {!carregando && !erro && devedores.length === 0 && (
                <div className="estado-vazio-card">
                  <span className="estado-vazio-icone">👥</span>
                  <h3>Nenhum devedor cadastrado</h3>
                  <p>Clique em &ldquo;Nova Dívida&rdquo; acima para começar a montar sua carteira.</p>
                </div>
              )}
              {!carregando &&
                !erro &&
                (() => {
                  const termo = busca.toLowerCase();
                  const filtrados = devedores.filter((dev) => {
                    const matchBusca =
                      !termo ||
                      dev.nome.toLowerCase().includes(termo) ||
                      dev.cpfCnpj.toLowerCase().includes(termo);
                    const todasPagas =
                      dev.dividas.length > 0 &&
                      dev.dividas.every((d) => d.status === "pago");
                    const matchFiltro =
                      filtroDevedor === "todos" ||
                      (filtroDevedor === "atraso" && dev.qtdAtrasadas > 0) ||
                      (filtroDevedor === "quitados" && todasPagas);
                    return matchBusca && matchFiltro;
                  });
                  if (filtrados.length === 0 && devedores.length > 0) {
                    return (
                      <div className="estado-vazio-card">
                        <span className="estado-vazio-icone">🔍</span>
                        <h3>Nenhum resultado</h3>
                        <p>
                          {busca
                            ? `Nenhum devedor encontrado para "${busca}".`
                            : "Nenhum devedor neste filtro."}
                        </p>
                      </div>
                    );
                  }
                  return (
                    <>
                      {filtrados.length > 0 && (
                        <p className="contador-resultados">
                          {filtrados.length} devedor{filtrados.length !== 1 ? "es" : ""}
                        </p>
                      )}
                      {filtrados.map((dev) => (
                        <CardDevedor
                          key={dev.id}
                          devedor={dev}
                          onPagar={(divida) =>
                            setDividaPagamento({ divida, nomeDevedor: dev.nome })
                          }
                          onRemover={removerDivida}
                          onNovaDivida={setDevedorNovaDivida}
                          onDetalhes={(divida, nome) =>
                            setDividaDetalhes({ divida, nomeDevedor: nome })
                          }
                          onDetalhesDevedor={setDevedorDetalhes}
                          onRemoverDevedor={removerDevedor}
                        />
                      ))}
                    </>
                  );
                })()}
            </div>
          </>
        )}
      </main>

      {dividaPagamento && (
        <ModalPagamento
          divida={dividaPagamento.divida}
          nomeDevedor={dividaPagamento.nomeDevedor}
          onConfirmar={registrarPagamento}
          onFechar={() => setDividaPagamento(null)}
        />
      )}

      {devedorNovaDivida && (
        <ModalNovaDivida
          devedor={devedorNovaDivida}
          onConfirmar={adicionarDivida}
          onFechar={() => setDevedorNovaDivida(null)}
        />
      )}

      {dividaDetalhes && (
        <ModalDetalhesDivida
          divida={dividaDetalhes.divida}
          nomeDevedor={dividaDetalhes.nomeDevedor}
          token={token}
          onRemoverPagamento={removerPagamento}
          onFechar={() => {
            setDividaDetalhes(null);
            carregarDevedores();
          }}
        />
      )}

      {devedorDetalhes && (
        <ModalDetalhesDevedor
          devedor={devedorDetalhes}
          onFechar={() => setDevedorDetalhes(null)}
          onRemoverDevedor={removerDevedor}
        />
      )}
    </div>
  );
}
