interface Props {
  titulo: string;
  valor: string;
  icone: React.ReactNode;
  cor?: "padrao" | "sucesso" | "perigo" | "alerta" | "info";
  subtexto?: string;
}

const CORES: Record<string, string> = {
  padrao: "var(--cor-primaria)",
  sucesso: "var(--cor-sucesso)",
  perigo: "var(--cor-perigo)",
  alerta: "var(--cor-alerta)",
  info: "#6366f1",
};

const FUNDOS: Record<string, string> = {
  padrao: "rgba(26, 86, 219, 0.08)",
  sucesso: "rgba(22, 163, 74, 0.08)",
  perigo: "rgba(220, 38, 38, 0.08)",
  alerta: "rgba(234, 88, 12, 0.08)",
  info: "rgba(99, 102, 241, 0.08)",
};

export default function CardKPI({ titulo, valor, icone, cor = "padrao", subtexto }: Props) {
  return (
    <div className="kpi-card">
      <div className="kpi-icone" style={{ backgroundColor: FUNDOS[cor], color: CORES[cor] }}>
        {icone}
      </div>
      <div className="kpi-conteudo">
        <span className="kpi-titulo">{titulo}</span>
        <span className="kpi-valor" style={{ color: CORES[cor] }}>{valor}</span>
        {subtexto && <span className="kpi-subtexto">{subtexto}</span>}
      </div>
    </div>
  );
}
