export type Pagina = "dashboard" | "devedores" | "disparos";

interface Props {
  paginaAtual: Pagina;
  onNavegar: (pagina: Pagina) => void;
  email: string;
  onLogout: () => void;
}

export default function Sidebar({ paginaAtual, onNavegar, email, onLogout }: Props) {
  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <span className="sidebar-logo-icone">$</span>
        <div>
          <h1 className="sidebar-titulo">Cobrança</h1>
          <span className="sidebar-subtitulo">Sistema 2026</span>
        </div>
      </div>

      <nav className="sidebar-nav">
        <button
          className={`sidebar-item ${paginaAtual === "dashboard" ? "sidebar-item-ativo" : ""}`}
          onClick={() => onNavegar("dashboard")}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="7" height="7" />
            <rect x="14" y="3" width="7" height="7" />
            <rect x="3" y="14" width="7" height="7" />
            <rect x="14" y="14" width="7" height="7" />
          </svg>
          Dashboard
        </button>

        <button
          className={`sidebar-item ${paginaAtual === "devedores" ? "sidebar-item-ativo" : ""}`}
          onClick={() => onNavegar("devedores")}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
          Devedores
        </button>

        <button
          className={`sidebar-item ${paginaAtual === "disparos" ? "sidebar-item-ativo" : ""}`}
          onClick={() => onNavegar("disparos")}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12.55a11 11 0 0 1 14.08 0" />
            <path d="M1.42 9a16 16 0 0 1 21.16 0" />
            <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
            <line x1="12" y1="20" x2="12.01" y2="20" />
          </svg>
          Disparos
        </button>
      </nav>

      <div className="sidebar-rodape">
        <div className="sidebar-usuario">
          <span className="sidebar-email" title={email}>{email}</span>
        </div>
        <button className="sidebar-item sidebar-logout" onClick={onLogout}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
          Sair
        </button>
      </div>
    </aside>
  );
}
