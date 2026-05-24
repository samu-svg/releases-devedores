import { useState, FormEvent } from "react";

interface Props {
  onSubmit: (dados: {
    devedor: string;
    cpfCnpj?: string;
    valorOriginal: string;
    dataVencimento: string;
    telefone?: string;
    email?: string;
  }) => Promise<void>;
}

export default function FormularioDivida({ onSubmit }: Props) {
  const [aberto, setAberto] = useState(false);
  const [devedor, setDevedor] = useState("");
  const [cpfCnpj, setCpfCnpj] = useState("");
  const [telefone, setTelefone] = useState("");
  const [email, setEmail] = useState("");
  const [valorOriginal, setValorOriginal] = useState("");
  const [dataVencimento, setDataVencimento] = useState("");
  const [enviando, setEnviando] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!devedor || !valorOriginal || !dataVencimento) return;

    setEnviando(true);
    await onSubmit({
      devedor,
      cpfCnpj: cpfCnpj.trim() || undefined,
      valorOriginal,
      dataVencimento,
      telefone: telefone.trim() || undefined,
      email: email.trim() || undefined,
    });
    setDevedor("");
    setCpfCnpj("");
    setTelefone("");
    setEmail("");
    setValorOriginal("");
    setDataVencimento("");
    setEnviando(false);
    setAberto(false);
  }

  return (
    <div className="card">
      <button
        type="button"
        className="card-cabecalho"
        onClick={() => setAberto(!aberto)}
        aria-expanded={aberto}
      >
        <h2>
          <span className="card-cabecalho-icone">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </span>
          Nova Dívida
        </h2>
        <span className={`card-cabecalho-seta ${aberto ? "aberta" : ""}`}>&#9662;</span>
      </button>

      {aberto && (
        <div className="card-corpo">
          <form onSubmit={handleSubmit}>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="devedor">Nome do Devedor</label>
                <input
                  id="devedor"
                  type="text"
                  placeholder="Ex: João Silva"
                  value={devedor}
                  onChange={(e) => setDevedor(e.target.value)}
                  required
                  autoFocus
                />
              </div>
              <div className="form-group">
                <label htmlFor="cpfCnpj">CPF / CNPJ (opcional)</label>
                <input
                  id="cpfCnpj"
                  type="text"
                  placeholder="Ex: 123.456.789-00"
                  value={cpfCnpj}
                  onChange={(e) => setCpfCnpj(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label htmlFor="telefone">Telefone</label>
                <input
                  id="telefone"
                  type="tel"
                  placeholder="Ex: (11) 98765-4321"
                  value={telefone}
                  onChange={(e) => setTelefone(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label htmlFor="email">E-mail</label>
                <input
                  id="email"
                  type="email"
                  placeholder="Ex: email@exemplo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label htmlFor="valor">Valor (R$)</label>
                <input
                  id="valor"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="Ex: 1500.00"
                  value={valorOriginal}
                  onChange={(e) => setValorOriginal(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="vencimento">Vencimento</label>
                <input
                  id="vencimento"
                  type="date"
                  value={dataVencimento}
                  onChange={(e) => setDataVencimento(e.target.value)}
                  required
                />
              </div>
            </div>
            <button type="submit" className="btn btn-primario" disabled={enviando}>
              {enviando ? "Salvando..." : "Adicionar Dívida"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
