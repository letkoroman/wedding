import AgendaItem from './AgendaItem.jsx';
import AgendaVisualTimeline from './AgendaVisualTimeline.jsx';

export default function AgendaTimeline({ items, onEdit, onDelete }) {
  if (items.length === 0) {
    return <p className="empty-state">Zatím žádný program. Přidejte první položku.</p>;
  }

  const sorted = [...items].sort((a, b) => a.casZacatku.localeCompare(b.casZacatku));

  return (
    <div className="agenda-program-layout">
      <div className="agenda-list">
        {sorted.map((item) => (
          <AgendaItem key={item.id} item={item} onEdit={onEdit} onDelete={onDelete} />
        ))}
      </div>
      <AgendaVisualTimeline items={sorted} />
    </div>
  );
}
