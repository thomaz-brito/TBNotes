import { useState } from "react";

// Tela de entrada. O app é pessoal: o usuário é criado no painel do
// Supabase (Authentication → Users), então aqui só existe login.

type LoginScreenProps = {
  onLogin: (email: string, password: string) => Promise<string | null>;
};

export default function LoginScreen({ onLogin }: LoginScreenProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    const message = await onLogin(email.trim(), password);
    if (message) {
      setError(message);
      setBusy(false);
    }
  }

  return (
    <div className="auth-screen">
      <form className="auth-card" onSubmit={submit}>
        <img src="/icons/icon-192.png" alt="" className="auth-logo" />
        <h1 className="auth-title">TBNotes</h1>
        <p className="auth-sub">Seus treinos, na nuvem.</p>

        <div className="field">
          <label className="field-label">E-mail</label>
          <input
            className="input"
            type="email"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className="field">
          <label className="field-label">Senha</label>
          <input
            className="input"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        {error && <p className="auth-error">{error}</p>}

        <button
          className="btn btn-primary btn-block"
          type="submit"
          disabled={busy || !email.trim() || !password}
          style={{ opacity: busy || !email.trim() || !password ? 0.6 : 1 }}
        >
          {busy ? "Entrando…" : "Entrar"}
        </button>
      </form>
    </div>
  );
}
