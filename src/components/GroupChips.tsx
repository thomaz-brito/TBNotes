// Filtro horizontal de grupos musculares ("chips" roláveis).

type GroupChipsProps = {
  groups: string[];
  value: string | null; // null = todos
  onChange: (group: string | null) => void;
};

export default function GroupChips({ groups, value, onChange }: GroupChipsProps) {
  return (
    <div className="chips">
      <button
        className={`chip${value === null ? " active" : ""}`}
        onClick={() => onChange(null)}
      >
        Todos
      </button>
      {groups.map((group) => (
        <button
          key={group}
          className={`chip${value === group ? " active" : ""}`}
          onClick={() => onChange(group)}
        >
          {group}
        </button>
      ))}
    </div>
  );
}
