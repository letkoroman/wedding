export default function TaskFilter({ assignee, onAssigneeChange, view, onViewChange, assignees = [] }) {
  return (
    <div className="task-filters">
      <select
        value={assignee}
        onChange={(e) => onAssigneeChange(e.target.value)}
        className="task-assignee-filter"
      >
        <option value="">Všechny osoby</option>
        {assignees.map((a) => (
          <option key={a} value={a}>{a}</option>
        ))}
      </select>
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
