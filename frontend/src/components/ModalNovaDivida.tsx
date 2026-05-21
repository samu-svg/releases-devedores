import { useState } from "react";
import type { Devedor } from "../App";

interface Props {
  devedor: Devedor;
  onConfirmar: (dados: {
    devedor: string;
    cpfCnpj?: string;
    valorOriginal: string;
    dataVencimento: string;
    telefone?: string;
    email?: string;
  }) => Promise<void>;
  onFechar: () => void;
}

export default function ModalNovaDivida({ devedor, onConfirmar, onFechar }: Props) {
  const [valorOriginal, setValorOriginal] = useState("");
  const [dataVencimento, setDataVencimento] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const valorNum = Number(valorOriginal.replace(",", "."));
    if (isNaN(valorNum) || valorNum <= 0) {
      setErro("Informe um valor válido maior que zero.");
      return;
    }
    if (!dataVencimento) return;

    setEnviando(true);
    setErro(null);
    try {
      await onConfirmar({
        devedor: devedor.nome,
        cpfCnpj:
          devedor.cpfCnpj && devedor.cpfCnpj !== "-" ? devedor.cpfCnpj : undefined,
        valorOriginal: valorNum.toFixed(2),
        dataVencimento,
      });
    } catch (err: any) {
      setErro(err.message || "Erro ao adicionar dívida.");
      setEnviando(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onFechar}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Nova Dívida</h3>
          <button className="modal-fechar" onClick={onFechar}>
            &times;
          </button>
        </div>

        <div className="modal-resumo">
          <div className="resumo-item">
            <span className="resumo-label">Devedor</span>
            <span className="resumo-valor">{devedor.nome}</span>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="novoValor">Valor (R$)</label>
              <input
                id="novoValor"
                type="text"
                inputMode="decimal"
                placeholder="Ex: 1500.00"
                value={valorOriginal}
                onChange={(e) => {
                  const v = e.target.value;
                  if (/^[\d.,]*$/.test(v) || v === "") {
                    setValorOriginal(v);
                  }
                }}
                autoFocus
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="novoVencimento">Vencimento</label>
              <input
                id="novoVencimento"
                type="date"
                value={dataVencimento}
                onChange={(e) => setDataVencimento(e.target.value)}
                required
              />
            </div>
          </div>

          {erro && <p className="erro modal-erro">{erro}</p>}

          <div className="modal-acoes">
            <button type="button" className="btn btn-cancelar" onClick={onFechar}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primario" disabled={enviando}>
              {enviando ? "Salvando..." : "Adicionar Dívida"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
