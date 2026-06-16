export default function TaskFilter({ assignee, onAssigneeChange, view, onViewChange }) {
  return (
    <div className="task-filters">
      <input
        type="text"
        placeholder="Filtrovat podle osoby..."
        value={assignee}
        onChange={(e) => onAssigneeChange(e.target.value)}
        className="task-assignee-filter"
      />
      <div className="filters">
        <button
          className={`filter-btn ${view === 'stav' ? 'active' : ''}`}
          onClick={() => onViewChange('stav')}
        >
          Podle stavu
        </button>
        <button
          className={`filter-btn ${view === 'termin' ? 'active' : ''}`}
          onClick={() => onViewChange('termin')}
        >
          Podle termínu
        </button>
        <button
          className={`filter-btn ${view === 'priorita' ? 'active' : ''}`}
          onClick={() => onViewChange('priorita')}
        >
          Podle priority
        </button>
      </div>
    </div>
  );
}
