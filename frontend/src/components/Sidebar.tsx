export type Pagina = "dashboard" | "devedores" | "disparos";

interface Props {
  paginaAtual: Pagina;
  onNavegar: (pagina: Pagina) => void;
  email: string;
  onLogout: () => void;
  aberta?: boolean;
  onFechar?: () => void;
}

function iniciaisEmail(email: string): string {
  const parte = email.split("@")[0] ?? "?";
  return parte.slice(0, 2).toUpperCase();
}

export default function Sidebar({ paginaAtual, onNavegar, email, onLogout, aberta, onFechar }: Props) {
  function navegar(pagina: Pagina) {
    onNavegar(pagina);
    onFechar?.();
  }

  return (
    <aside className={`sidebar ${aberta ? "sidebar-aberta" : ""}`}>
      {onFechar && (
        <button
          type="button"
          className="sidebar-btn-fechar"
          onClick={onFechar}
          aria-label="Fechar menu"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      )}
      <div className="sidebar-logo">
        <span className="sidebar-logo-icone">$</span>
        <div>
          <h1 className="sidebar-titulo">Cobrança</h1>
          <span className="sidebar-subtitulo">Sistema 2026</span>
        </div>
      </div>

      <nav className="sidebar-nav">
        <span className="sidebar-nav-label">Menu</span>

        <button
          className={`sidebar-item ${paginaAtual === "dashboard" ? "sidebar-item-ativo" : ""}`}
          onClick={() => navegar("dashboard")}
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
          onClick={() => navegar("devedores")}
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
          onClick={() => navegar("disparos")}
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
          <span className="sidebar-avatar">{iniciaisEmail(email)}</span>
          <div className="sidebar-usuario-info">
            <span className="sidebar-usuario-nome">{email.split("@")[0]}</span>
            <span className="sidebar-email" title={email}>{email}</span>
          </div>
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
