import type { Devedor } from "../App";
import { saldoDevedorSemJuros } from "../lib/saldo";

interface Props {
  devedor: Devedor;
  onFechar: () => void;
  onRemoverDevedor: (devedor: Devedor) => void;
}

function fmt(valor: number): string {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function ModalDetalhesDevedor({ devedor, onFechar, onRemoverDevedor }: Props) {
  return (
    <div className="modal-overlay" onClick={onFechar}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Detalhes do Devedor</h3>
          <button className="modal-fechar" onClick={onFechar}>
            &times;
          </button>
        </div>

        <div className="modal-resumo">
          <div className="resumo-item">
            <span className="resumo-label">Nome</span>
            <span className="resumo-valor">{devedor.nome}</span>
          </div>
          <div className="resumo-item">
            <span className="resumo-label">CPF/CNPJ</span>
            <span className="resumo-valor cpf">{devedor.cpfCnpj}</span>
          </div>
          <div className="resumo-item">
            <span className="resumo-label">Telefone</span>
            <span className="resumo-valor">
              {devedor.telefone || "—"}
            </span>
          </div>
          <div className="resumo-item">
            <span className="resumo-label">E-mail</span>
            <span className="resumo-valor">
              {devedor.email || "—"}
            </span>
          </div>
        </div>

        <h4 className="detalhes-subtitulo">Resumo financeiro</h4>
        <div className="modal-resumo">
          <div className="resumo-item">
            <span className="resumo-label">Dívidas</span>
            <span className="resumo-valor">{devedor.qtdDividas}</span>
          </div>
          <div className="resumo-item">
            <span className="resumo-label">Valor Original</span>
            <span className="resumo-valor">{fmt(devedor.totalOriginal)}</span>
          </div>
          {devedor.totalJuros > 0 && (
            <div className="resumo-item">
              <span className="resumo-label">Juros</span>
              <span className="resumo-valor juros">{fmt(devedor.totalJuros)}</span>
            </div>
          )}
          {devedor.totalPago > 0 && (
            <div className="resumo-item">
              <span className="resumo-label">Total Pago</span>
              <span className="resumo-valor pago">{fmt(devedor.totalPago)}</span>
            </div>
          )}
          <div className="resumo-item resumo-destaque">
            <span className="resumo-label">Saldo Devedor</span>
            <span className="resumo-valor">{fmt(saldoDevedorSemJuros(devedor))}</span>
          </div>
        </div>

        <div className="modal-acoes">
          <button className="btn btn-perigo" onClick={() => onRemoverDevedor(devedor)}>
            Excluir devedor
          </button>
          <button className="btn btn-cancelar" onClick={onFechar}>
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
