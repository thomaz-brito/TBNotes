// Tela de estado (carregando / acordando o banco / erro de conexão).

type StatusScreenProps = {
  title: string;
  text?: string;
  spinner?: boolean;
  actionLabel?: string;
  onAction?: () => void;
};

export default function StatusScreen({
  title,
  text,
  spinner,
  actionLabel,
  onAction,
}: StatusScreenProps) {
  return (
    <div className="auth-screen">
      <div className="auth-card" style={{ textAlign: "center" }}>
        {spinner && <div className="spinner" aria-hidden="true" />}
        <h1 className="auth-title" style={{ fontSize: 20 }}>
          {title}
        </h1>
        {text && <p className="auth-sub" style={{ marginBottom: 0 }}>{text}</p>}
        {actionLabel && onAction && (
          <button
            className="btn btn-primary btn-block"
            style={{ marginTop: 18 }}
            onClick={onAction}
          >
            {actionLabel}
          </button>
        )}
      </div>
    </div>
  );
}
