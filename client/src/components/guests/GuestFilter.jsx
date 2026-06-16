const FILTERS = [
  { id: 'vsichni', label: 'Všichni' },
  { id: 'potvrzeni', label: 'Potvrzení' },
  { id: 'must-have', label: 'Must-have' },
  { id: 'cekajici', label: 'Čekající' }
];

export default function GuestFilter({ active, onChange }) {
  return (
    <div className="filters">
      {FILTERS.map((f) => (
        <button
          key={f.id}
          className={`filter-btn ${active === f.id ? 'active' : ''}`}
          onClick={() => onChange(f.id)}
        >
          {f.label}
        </button>
      ))}
    </div>
  );
}
