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
      <div className="login-container">
        <p className="loading">Carregando...</p>
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
      await adicionarDivida(dados);
    } catch {
      setErro("Erro ao adicionar dívida.");
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
      <Sidebar
        paginaAtual={paginaAtual}
        onNavegar={setPaginaAtual}
        email={session.user.email ?? ""}
        onLogout={handleLogout}
      />

      <main className="app-conteudo">
        {paginaAtual === "dashboard" && (
          <Dashboard devedores={devedores} carregando={carregando} />
        )}

        {paginaAtual === "disparos" && (
          <DisparosWebhook token={token} />
        )}

        {paginaAtual === "devedores" && (
          <>
            <FormularioDivida onSubmit={adicionarDividaFormulario} />

            <div className="secao-devedores">
              <div className="secao-header">
                <h2>Devedores</h2>
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
                <span className="icone-lupa">&#128269;</span>
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
                  >
                    &times;
                  </button>
                )}
              </div>

              {carregando && <p className="loading">Carregando...</p>}
              {erro && <p className="erro">{erro}</p>}
              {!carregando && !erro && devedores.length === 0 && (
                <p className="tabela-vazia">Nenhum devedor cadastrado.</p>
              )}
              {!carregando &&
                !erro &&
                (() => {
                  const termo = busca.toLowerCase();
                  const filtrados = devedores.filter(
                    (dev) =>
                      !termo ||
                      dev.nome.toLowerCase().includes(termo) ||
                      dev.cpfCnpj.toLowerCase().includes(termo)
                  );
                  if (filtrados.length === 0 && devedores.length > 0) {
                    return (
                      <p className="tabela-vazia">
                        Nenhum devedor encontrado para &ldquo;{busca}&rdquo;.
                      </p>
                    );
                  }
                  return filtrados.map((dev) => (
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
                  ));
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
