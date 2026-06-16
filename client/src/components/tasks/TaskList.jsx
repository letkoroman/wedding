const STATUS_LABELS = {
  nesplneno: 'Nesplněno',
  probiha: 'Probíhá',
  splneno: 'Splněno'
};

const STATUS_ORDER = ['nesplneno', 'probiha', 'splneno'];

const PRIORITY_LABELS = {
  nizka: 'Nízká',
  stredni: 'Střední',
  vysoka: 'Vysoká'
};

const PRIORITY_ORDER = { vysoka: 0, stredni: 1, nizka: 2 };

const PRIORITY_CLASS = {
  nizka: 'priority-low',
  stredni: 'priority-medium',
  vysoka: 'priority-high'
};

function TaskRow({ task, onEdit, onDelete, onStatusChange }) {
  return (
    <li className="task-row card">
      <div className="task-main">
        <div className="task-name">{task.nazev}</div>
        <div className="task-meta">
          {task.prirazeno && <span>{task.prirazeno}</span>}
          {task.termin && <span>termín {task.termin}</span>}
          <span className={`priority-badge ${PRIORITY_CLASS[task.priorita]}`}>
            {PRIORITY_LABELS[task.priorita]}
          </span>
        </div>
        {task.poznamka && <div className="task-note">{task.poznamka}</div>}
      </div>
      <div className="task-side">
        <select
          value={task.stav}
          onChange={(e) => onStatusChange(task, e.target.value)}
          className="task-status-select"
        >
          <option value="nesplneno">Nesplněno</option>
          <option value="probiha">Probíhá</option>
          <option value="splneno">Splněno</option>
        </select>
        <div className="task-actions">
          <button className="btn-icon" onClick={() => onEdit(task)} title="Upravit">✎</button>
          <button className="btn-icon" onClick={() => onDelete(task.id)} title="Smazat">🗑</button>
        </div>
      </div>
    </li>
  );
}

export default function TaskList({ tasks, view, onEdit, onDelete, onStatusChange }) {
  if (tasks.length === 0) {
    return <p className="empty-state">Žádné úkoly v tomto výběru.</p>;
  }

  if (view === 'termin') {
    const sorted = [...tasks].sort((a, b) => {
      if (!a.termin) return 1;
      if (!b.termin) return -1;
      return a.termin.localeCompare(b.termin);
    });
    return (
      <ul className="task-list">
        {sorted.map((task) => (
          <TaskRow key={task.id} task={task} onEdit={onEdit} onDelete={onDelete} onStatusChange={onStatusChange} />
        ))}
      </ul>
    );
  }

  if (view === 'priorita') {
    const sorted = [...tasks].sort((a, b) => PRIORITY_ORDER[a.priorita] - PRIORITY_ORDER[b.priorita]);
    return (
      <ul className="task-list">
        {sorted.map((task) => (
          <TaskRow key={task.id} task={task} onEdit={onEdit} onDelete={onDelete} onStatusChange={onStatusChange} />
        ))}
      </ul>
    );
  }

  return (
    <div className="task-groups">
      {STATUS_ORDER.map((status) => {
        const group = tasks.filter((t) => t.stav === status);
        if (group.length === 0) return null;
        return (
          <div key={status} className="task-group">
            <h3>{STATUS_LABELS[status]}</h3>
            <ul className="task-list">
              {group.map((task) => (
                <TaskRow key={task.id} task={task} onEdit={onEdit} onDelete={onDelete} onStatusChange={onStatusChange} />
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}
