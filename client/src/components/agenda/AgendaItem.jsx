function addMinutes(time, minutes) {
  const [h, m] = time.split(':').map(Number);
  const total = h * 60 + m + minutes;
  const wrapped = ((total % 1440) + 1440) % 1440;
  const hh = Math.floor(wrapped / 60).toString().padStart(2, '0');
  const mm = (wrapped % 60).toString().padStart(2, '0');
  return `${hh}:${mm}`;
}

export default function AgendaItem({ item, onEdit, onDelete }) {
  const endTime = addMinutes(item.casZacatku, item.trvani);

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
