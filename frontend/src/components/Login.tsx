import { useState } from "react";
import { supabase } from "../lib/supabase";

interface Props {
  onLogin: () => void;
}

export default function Login({ onLogin }: Props) {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [modo, setModo] = useState<"login" | "registro">("login");
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [mensagem, setMensagem] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setCarregando(true);
    setErro(null);
    setMensagem(null);

    if (modo === "registro") {
      const { error } = await supabase.auth.signUp({ email, password: senha });
      if (error) {
        setErro(error.message);
      } else {
        setMensagem("Conta criada! Verifique seu e-mail ou faça login.");
        setModo("login");
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password: senha,
      });
      if (error) {
        setErro(traduzirErro(error.message));
      } else {
        onLogin();
      }
    }

    setCarregando(false);
  }

  function traduzirErro(msg: string): string {
    if (msg.includes("Invalid login")) return "E-mail ou senha incorretos.";
    if (msg.includes("Email not confirmed")) return "Confirme seu e-mail antes de entrar.";
    if (msg.includes("already registered")) return "Este e-mail já está registrado.";
    return msg;
  }

  return (
    <div className="login-container">
      <div className="login-painel">
        <div className="login-painel-conteudo">
          <h2>Gestão de cobrança simplificada</h2>
          <p>
            Controle devedores, acompanhe inadimplência e dispare cobranças
            automatizadas — tudo em um só lugar.
          </p>
          <ul className="login-painel-lista">
            <li>Dashboard com indicadores em tempo real</li>
            <li>Cálculo automático de juros e multas</li>
            <li>Integração com chatbots via webhook</li>
          </ul>
        </div>
      </div>

      <div className="login-form-area">
        <div className="login-card">
          <div className="login-header">
            <span className="login-logo">$</span>
            <h1>Sistema de Cobrança</h1>
            <p>{modo === "login" ? "Faça login para continuar" : "Crie sua conta"}</p>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="email">E-mail</label>
              <input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
              />
            </div>

            <div className="form-group">
              <label htmlFor="senha">Senha</label>
              <input
                id="senha"
                type="password"
                placeholder="Mínimo 6 caracteres"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                required
                minLength={6}
              />
            </div>

            {erro && <p className="erro login-erro">{erro}</p>}
            {mensagem && <p className="login-mensagem">{mensagem}</p>}

            <button
              type="submit"
              className="btn btn-primario login-btn"
              disabled={carregando}
            >
              {carregando
                ? "Aguarde..."
                : modo === "login"
                  ? "Entrar"
                  : "Criar Conta"}
            </button>
          </form>

          <p className="login-alternar">
            {modo === "login" ? (
              <>
                Não tem conta?{" "}
                <button
                  type="button"
                  className="login-link"
                  onClick={() => {
                    setModo("registro");
                    setErro(null);
                  }}
                >
                  Criar conta
                </button>
              </>
            ) : (
              <>
                Já tem conta?{" "}
                <button
                  type="button"
                  className="login-link"
                  onClick={() => {
                    setModo("login");
                    setErro(null);
                  }}
                >
                  Fazer login
                </button>
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
