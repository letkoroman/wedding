import './Nav.css';

const TABS = [
  { id: 'hoste', label: 'Hosté' },
  { id: 'program', label: 'Program' },
  { id: 'ukoly', label: 'Úkoly' },
  { id: 'ubytovani', label: 'Ubytování' }
];

export default function Nav({ active, onChange }) {
  return (
    <nav className="nav">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          className={`nav-tab ${active === tab.id ? 'active' : ''}`}
          onClick={() => onChange(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </nav>
  );
}
