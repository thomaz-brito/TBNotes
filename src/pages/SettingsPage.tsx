import { useRef, useState } from "react";
import { useData } from "../lib/data";
import { IconDownload, IconLogout, IconUpload } from "../components/Icons";

export default function SettingsPage() {
  const { data, userEmail, exportBackup, importBackup, logout } = useData();
  const fileInput = useRef<HTMLInputElement | null>(null);
  const [importing, setImporting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function onFilePicked(file: File | undefined) {
    if (!file) return;
    const confirmed = window.confirm(
      "Importar este backup vai SUBSTITUIR todos os dados atuais (exercícios, treinos e registros). Continuar?",
    );
    if (!confirmed) return;
    setImporting(true);
    setMessage(null);
    const error = await importBackup(file);
    setImporting(false);
    setMessage(error ?? "Backup importado com sucesso ✓");
  }

  return (
    <div className="page">
      <header className="page-header">
        <h1 className="page-title">Ajustes</h1>
      </header>

      <p className="section-title">Conta</p>
      <div className="card">
        <div className="list-row-title" style={{ fontSize: 15 }}>
          {userEmail ?? "—"}
        </div>
        <div className="list-row-sub">
          Dados salvos na nuvem (Supabase) — acessíveis de qualquer aparelho.
        </div>
        <button
          className="btn btn-block"
          style={{ marginTop: 14 }}
          onClick={() => {
            if (window.confirm("Sair da conta neste aparelho?")) logout();
          }}
        >
          <IconLogout size={20} /> Sair
        </button>
      </div>

      <p className="section-title">Backup</p>
      <div className="card">
        <p className="muted" style={{ fontSize: 14, margin: "0 0 14px" }}>
          O plano gratuito do Supabase não tem backup automático. Exporte um
          arquivo de vez em quando e guarde num lugar seguro (Arquivos, Drive…).
        </p>
        <button className="btn btn-primary btn-block" onClick={exportBackup}>
          <IconDownload size={20} /> Exportar backup
        </button>
        <button
          className="btn btn-block"
          style={{ marginTop: 10, opacity: importing ? 0.6 : 1 }}
          disabled={importing}
          onClick={() => fileInput.current?.click()}
        >
          <IconUpload size={20} />{" "}
          {importing ? "Importando…" : "Importar backup"}
        </button>
        <input
          ref={fileInput}
          type="file"
          accept="application/json,.json"
          style={{ display: "none" }}
          onChange={(e) => {
            onFilePicked(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
        {message && (
          <p
            className="muted"
            style={{ fontSize: 14, marginTop: 12, textAlign: "center" }}
          >
            {message}
          </p>
        )}
      </div>

      <p className="muted" style={{ fontSize: 13, textAlign: "center" }}>
        {data.exercises.length} exercícios · {data.routines.length} treinos ·{" "}
        {data.sessions.length} registros
      </p>
    </div>
  );
}
