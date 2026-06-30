const VIEWS = [
  { key: 'overall', label: 'Celkový program' },
  { key: 'category', label: 'Podle kategorie' }
];

export default function ProgramToggle({ view, onChange }) {
  return (
    <div className="seg-control" role="tablist">
      {VIEWS.map((v) => (
        <button
          key={v.key}
          role="tab"
          aria-selected={view === v.key}
          className={`seg-btn ${view === v.key ? 'active' : ''}`}
          onClick={() => onChange(v.key)}
        >
          {v.label}
        </button>
      ))}
    </div>
  );
}
