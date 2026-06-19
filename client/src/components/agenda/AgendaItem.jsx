import { CATEGORIES } from './categories.js';

export default function AgendaItem({ item, onEdit, onDelete }) {
  const cat = CATEGORIES[item.kategorie] || CATEGORIES.ceremonie;
  const endTime = item.casKonce || '—';

  return (
    <div className="agenda-item">
      <div className="agenda-time">
        <div className="agenda-time-start">{item.casZacatku}</div>
        <div className="agenda-time-end">{endTime}</div>
      </div>
      <div className="agenda-card card">
        <div className="agenda-card-header">
          <span className="agenda-icon">{item.ikona}</span>
          <span className="agenda-name">{item.nazev}</span>
          <span
            className="agenda-category-badge"
            style={{ background: cat.bg, color: cat.text, borderColor: cat.border }}
          >
            {cat.icon} {cat.label}
          </span>
          <div className="agenda-actions">
            <button className="btn-icon" onClick={() => onEdit(item)} title="Upravit">✎</button>
            <button className="btn-icon" onClick={() => onDelete(item.id)} title="Smazat">🗑</button>
          </div>
        </div>
        {item.poznamka && <p className="agenda-note">{item.poznamka}</p>}
      </div>
    </div>
  );
}
