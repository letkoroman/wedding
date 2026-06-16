function formatShortDate(isoDate) {
  const [, month, day] = isoDate.split('-');
  return `${Number(day)}.${Number(month)}.`;
}

function roomsLabel(count) {
  if (count === 1) return 'pokoj';
  if (count >= 2 && count <= 4) return 'pokoje';
  return 'pokojů';
}

export default function AccommodationList({ reservations, onEdit, onDelete }) {
  if (reservations.length === 0) {
    return <p className="empty-state">Zatím žádné rezervace ubytování. Přidejte první rezervaci.</p>;
  }

  const sorted = [...reservations].sort((a, b) => a.terminOd.localeCompare(b.terminOd));

  return (
    <ul className="accommodation-list">
      {sorted.map((reservation) => {
        const chybi = reservation.potrebujeme - reservation.pocetIzieb;
        const ok = chybi <= 0;
        return (
          <li key={reservation.id} className="accommodation-row card">
            <div className="accommodation-main">
              <div className="accommodation-name">{reservation.nazev}</div>
              <div className="accommodation-meta">
                {formatShortDate(reservation.terminOd)}–{formatShortDate(reservation.terminDo)}
              </div>
              {reservation.poznamka && <div className="accommodation-note">{reservation.poznamka}</div>}
              <div className="accommodation-capacity">
                Potřebujeme: {reservation.potrebujeme} {roomsLabel(reservation.potrebujeme)} · Máme rezervováno: {reservation.pocetIzieb} {roomsLabel(reservation.pocetIzieb)}
              </div>
            </div>
            <div className="accommodation-side">
              <span className={`badge ${ok ? 'badge-confirmed' : 'badge-declined'}`}>
                {ok ? 'OK' : `Chybí ${chybi} ${roomsLabel(chybi)}`}
              </span>
              <div className="accommodation-actions">
                <button className="btn-icon" onClick={() => onEdit(reservation)} title="Upravit">✎</button>
                <button className="btn-icon" onClick={() => onDelete(reservation.id)} title="Smazat">🗑</button>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
