import { useState, useEffect } from "react";
import type { DividaResumida } from "../App";

interface Pagamento {
  id: number;
  dividaId: number;
  valorPago: number;
  dataPagamento: string;
  tipo: string;
  criadoEm: string;
}

interface Props {
  divida: DividaResumida;
  nomeDevedor: string;
  token: string;
  onRemoverPagamento: (pagamentoId: number) => Promise<void>;
  onFechar: () => void;
}

import { API_URL } from "../lib/api";

function fmt(valor: number): string {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function fmtData(iso: string): string {
  const [ano, mes, dia] = iso.split("T")[0].split("-");
  return `${dia}/${mes}/${ano}`;
}

export default function ModalDetalhesDivida({ divida, nomeDevedor, token, onRemoverPagamento, onFechar }: Props) {
  const [pagamentos, setPagamentos] = useState<Pagamento[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [removendo, setRemovendo] = useState<number | null>(null);

  useEffect(() => {
    carregarPagamentos();
  }, [divida.id]);

  async function carregarPagamentos() {
    setCarregando(true);
    try {
      const res = await fetch(`${API_URL}/pagamentos/divida/${divida.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setPagamentos(await res.json());
      }
    } finally {
      setCarregando(false);
    }
  }

  async function handleRemover(pgtoId: number) {
    if (!confirm("Tem certeza que deseja remover este pagamento?")) return;
    setRemovendo(pgtoId);
    try {
      await onRemoverPagamento(pgtoId);
      setPagamentos((prev) => prev.filter((p) => p.id !== pgtoId));
    } finally {
      setRemovendo(null);
    }
  }

  return (
    <div className="modal-overlay" onClick={onFechar}>
      <div className="modal modal-detalhes" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Detalhes da Dívida</h3>
          <button className="modal-fechar" onClick={onFechar}>&times;</button>
        </div>

        <div className="modal-resumo">
          <div className="resumo-item">
            <span className="resumo-label">Devedor</span>
            <span className="resumo-valor">{nomeDevedor}</span>
          </div>
          <div className="resumo-item">
            <span className="resumo-label">Vencimento</span>
            <span className="resumo-valor">{fmtData(divida.dataVencimento)}</span>
          </div>
          <div className="resumo-item">
            <span className="resumo-label">Valor Original</span>
            <span className="resumo-valor">{fmt(divida.valorOriginal)}</span>
          </div>
          {divida.jurosAcumulados > 0 && (
            <div className="resumo-item">
              <span className="resumo-label">Juros ({divida.diasAtraso} dias)</span>
              <span className="resumo-valor juros">{fmt(divida.jurosAcumulados)}</span>
            </div>
          )}
          {divida.totalPago > 0 && (
            <div className="resumo-item">
              <span className="resumo-label">Total Pago</span>
              <span className="resumo-valor pago">- {fmt(divida.totalPago)}</span>
            </div>
          )}
          <div className="resumo-item resumo-destaque">
            <span className="resumo-label">Saldo Devedor</span>
            <span className="resumo-valor">{fmt(divida.saldoDevedor)}</span>
          </div>
        </div>

        <h4 className="detalhes-subtitulo">Pagamentos</h4>

        {carregando && <p className="loading" style={{ padding: 16 }}>Carregando...</p>}

        {!carregando && pagamentos.length === 0 && (
          <p className="detalhes-vazio">Nenhum pagamento registrado.</p>
        )}

        {!carregando && pagamentos.length > 0 && (
          <div className="detalhes-lista-pagamentos">
            <table className="tabela-pagamentos">
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Valor</th>
                  <th>Tipo</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {pagamentos.map((p) => (
                  <tr key={p.id}>
                    <td>{fmtData(p.dataPagamento)}</td>
                    <td className="valor pago">{fmt(p.valorPago)}</td>
                    <td>
                      <span className={`badge ${p.tipo === "total" ? "badge-pago" : "badge-pendente"}`}>
                        {p.tipo}
                      </span>
                    </td>
                    <td>
                      <button
                        className="btn btn-perigo"
                        disabled={divida.status === "pago" || removendo === p.id}
                        onClick={() => handleRemover(p.id)}
                        title={divida.status === "pago" ? "Não é possível remover pagamento de dívida quitada" : undefined}
                      >
                        {removendo === p.id ? "..." : "Remover"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="modal-acoes">
          <button className="btn btn-cancelar" onClick={onFechar}>Fechar</button>
        </div>
      </div>
    </div>
  );
}
