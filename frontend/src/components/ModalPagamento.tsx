import { useState } from "react";
import type { DividaResumida } from "../App";

interface Props {
  divida: DividaResumida;
  nomeDevedor: string;
  onConfirmar: (dividaId: number, valorPago: number, dataPagamento: string) => Promise<void>;
  onFechar: () => void;
}

function formatarMoeda(valor: number | null | undefined): string {
  return (valor ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function ModalPagamento({ divida, nomeDevedor, onConfirmar, onFechar }: Props) {
  const [valor, setValor] = useState("");
  const [dataPagamento, setDataPagamento] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const valorNum = Number(valor);
    if (valorNum <= 0) {
      setErro("O valor deve ser maior que zero.");
      return;
    }
    if (valorNum > divida.saldoDevedor + 0.01) {
      setErro(`O valor excede o saldo devedor de ${formatarMoeda(divida.saldoDevedor)}.`);
      return;
    }

    setEnviando(true);
    setErro(null);
    try {
      await onConfirmar(divida.id, valorNum, dataPagamento);
    } catch (err: any) {
      setErro(err.message || "Erro ao registrar pagamento.");
      setEnviando(false);
    }
  }

  function preencherTotal() {
    setValor(divida.saldoDevedor.toFixed(2));
  }

  return (
    <div className="modal-overlay" onClick={onFechar}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Registrar Pagamento</h3>
          <button className="modal-fechar" onClick={onFechar}>
            &times;
          </button>
        </div>

        <div className="modal-resumo">
          <div className="resumo-item">
            <span className="resumo-label">Devedor</span>
            <span className="resumo-valor">{nomeDevedor}</span>
          </div>
          <div className="resumo-item">
            <span className="resumo-label">Valor Original</span>
            <span className="resumo-valor">{formatarMoeda(divida.valorOriginal)}</span>
          </div>
          {divida.jurosAcumulados > 0 && (
            <div className="resumo-item">
              <span className="resumo-label">Juros ({divida.diasAtraso} dias)</span>
              <span className="resumo-valor juros">{formatarMoeda(divida.jurosAcumulados)}</span>
            </div>
          )}
          {divida.totalPago > 0 && (
            <div className="resumo-item">
              <span className="resumo-label">Já Pago</span>
              <span className="resumo-valor pago">- {formatarMoeda(divida.totalPago)}</span>
            </div>
          )}
          <div className="resumo-item resumo-destaque">
            <span className="resumo-label">Saldo Devedor</span>
            <span className="resumo-valor">{formatarMoeda(divida.saldoDevedor)}</span>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="valorPagamento">Valor do Pagamento (R$)</label>
            <div className="input-com-botao">
              <input
                id="valorPagamento"
                type="number"
                step="0.01"
                min="0.01"
                max={divida.saldoDevedor}
                placeholder="0,00"
                value={valor}
                onChange={(e) => setValor(e.target.value)}
                autoFocus
                required
              />
              <button type="button" className="btn btn-outline" onClick={preencherTotal}>
                Pagar tudo
              </button>
            </div>
          </div>

          <div className="form-group" style={{ marginTop: 12 }}>
            <label htmlFor="dataPagamento">Data do Pagamento</label>
            <input
              id="dataPagamento"
              type="date"
              value={dataPagamento}
              onChange={(e) => setDataPagamento(e.target.value)}
              required
            />
          </div>

          {erro && <p className="erro modal-erro">{erro}</p>}

          <div className="modal-acoes">
            <button type="button" className="btn btn-cancelar" onClick={onFechar}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-sucesso" disabled={enviando}>
              {enviando ? "Processando..." : "Confirmar Pagamento"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
