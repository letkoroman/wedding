const TYPE_LABELS = {
  jednotlivec: 'Jednotlivec',
  par: 'Pár',
  rodina: 'Rodina'
};

const STATUS_LABELS = {
  ceka: 'Čeká na odpověď',
  potvrzeno: 'Potvrzeno',
  nepride: 'Nepřijde'
};

const STATUS_BADGE_CLASS = {
  ceka: 'badge-waiting',
  potvrzeno: 'badge-confirmed',
  nepride: 'badge-declined'
};

function childrenLabel(count) {
  if (count === 1) return '1 dítě';
  if (count >= 2 && count <= 4) return `${count} děti`;
  return `${count} dětí`;
}

function roomsLabel(count) {
  if (count === 1) return 'pokoj';
  if (count >= 2 && count <= 4) return 'pokoje';
  return 'pokojů';
}

function formatShortDate(isoDate) {
  const [, month, day] = isoDate.split('-');
  return `${Number(day)}.${Number(month)}.`;
}

export default function GuestList({ guests, onEdit, onDelete }) {
  if (guests.length === 0) {
    return <p className="empty-state">Žádní hosté v tomto výběru.</p>;
  }

  return (
    <ul className="guest-list">
      {guests.map((guest) => (
        <li key={guest.id} className="guest-row card">
          <div className="guest-main">
            <div className="guest-name">
              {guest.jmeno}
              {guest.mustHave && <span className="guest-star" title="Must-have">★</span>}
            </div>
            <div className="guest-meta">
              {TYPE_LABELS[guest.typ]}
              {guest.typ === 'rodina' && guest.pocetDeti > 0 && ` · ${childrenLabel(guest.pocetDeti)}`}
            </div>
            {guest.poznamka && <div className="guest-note">{guest.poznamka}</div>}
            {guest.pocetIzieb > 0 && (
              <div className="guest-accommodation-badge">
                🛏️ {guest.pocetIzieb} {roomsLabel(guest.pocetIzieb)} ({formatShortDate(guest.ubytovaniOd)}–{formatShortDate(guest.ubytovaniDo)})
              </div>
            )}
          </div>
          <div className="guest-side">
            <span className={`badge ${STATUS_BADGE_CLASS[guest.potvrzeni]}`}>
              {STATUS_LABELS[guest.potvrzeni]}
            </span>
            <div className="guest-actions">
              <button className="btn-icon" onClick={() => onEdit(guest)} title="Upravit">✎</button>
              <button className="btn-icon" onClick={() => onDelete(guest.id)} title="Smazat">🗑</button>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
