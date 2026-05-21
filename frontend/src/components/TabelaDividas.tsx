import type { Divida } from "../App";

interface Props {
  dividas: Divida[];
  onRemover: (id: number) => void;
  onPagar: (divida: Divida) => void;
}

function formatarMoeda(valor: number | null | undefined): string {
  return (valor ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatarData(iso: string): string {
  const [ano, mes, dia] = iso.split("-");
  return `${dia}/${mes}/${ano}`;
}

export default function TabelaDividas({ dividas, onRemover, onPagar }: Props) {
  if (dividas.length === 0) {
    return <p className="tabela-vazia">Nenhuma dívida cadastrada.</p>;
  }

  return (
    <div className="tabela-wrapper">
      <table>
        <thead>
          <tr>
            <th>Devedor</th>
            <th>CPF/CNPJ</th>
            <th>Valor Original</th>
            <th>Juros</th>
            <th>Total Pago</th>
            <th>Saldo Devedor</th>
            <th>Atraso</th>
            <th>Status</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {dividas.map((d) => (
            <tr key={d.id} className={d.status === "pago" ? "linha-pago" : ""}>
              <td>
                <span className="nome-devedor">{d.devedor}</span>
              </td>
              <td className="cpf">{d.cpfCnpj}</td>
              <td className="valor">{formatarMoeda(d.valorOriginal)}</td>
              <td className="valor juros">
                {d.jurosAcumulados > 0
                  ? formatarMoeda(d.jurosAcumulados)
                  : "—"}
              </td>
              <td className="valor pago">
                {d.totalPago > 0 ? formatarMoeda(d.totalPago) : "—"}
              </td>
              <td className="valor saldo-devedor">
                {formatarMoeda(d.saldoDevedor)}
              </td>
              <td className="atraso">
                {d.diasAtraso > 0 ? (
                  <span className="dias-atraso">{d.diasAtraso}d</span>
                ) : (
                  <span className="em-dia">
                    {formatarData(d.dataVencimento)}
                  </span>
                )}
              </td>
              <td>
                <span className={`badge badge-${d.status}`}>{d.status}</span>
              </td>
              <td className="acoes">
                {d.status !== "pago" && (
                  <button
                    className="btn btn-sucesso"
                    onClick={() => onPagar(d)}
                  >
                    Pagar
                  </button>
                )}
                <button
                  className="btn btn-perigo"
                  onClick={() => onRemover(d.id)}
                >
                  Remover
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
