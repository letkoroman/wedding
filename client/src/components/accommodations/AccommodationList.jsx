function formatShortDate(isoDate) {
  if (!isoDate) return '';
  const [, month, day] = isoDate.split('-');
  return `${Number(day)}.${Number(month)}.`;
}

function roomsLabel(count) {
  if (count === 1) return 'pokoj';
  if (count >= 2 && count <= 4) return 'pokoje';
  return 'pokojů';
}

const TYP_IZBY_LABELS = {
  double: 'double bed',
  double_pristylka: 'double bed + přistýlka',
  twin: 'twin beds',
  twin_pristylka: 'twin beds + přistýlka'
};

export default function AccommodationList({ reservations, onEdit, onDelete }) {
  if (reservations.length === 0) {
    return <p className="empty-state">Zatím žádné rezervace ubytování. Přidejte první rezervaci.</p>;
  }

  const sorted = [...reservations].sort((a, b) => a.terminOd.localeCompare(b.terminOd));

  return (
    <ul className="accommodation-list">
      {sorted.map((res) => {
        const assigned = res.assignedGuests || [];
        const roomsNeeded = assigned.reduce((s, g) => s + (g.pocetIzieb || 0), 0);
        const chybi = roomsNeeded - res.pocetIzieb;
        const ok = chybi <= 0;

        return (
          <li key={res.id} className="accommodation-row card">
            <div className="accommodation-main">
              <div className="accommodation-header-row">
                <div className="accommodation-name">{res.nazev}</div>
                <div className="accommodation-actions">
                  <button className="btn-icon" onClick={() => onEdit(res)} title="Upravit">✎</button>
                  <button className="btn-icon" onClick={() => onDelete(res.id)} title="Smazat">🗑</button>
                </div>
              </div>
              <div className="accommodation-meta">
                {formatShortDate(res.terminOd)}–{formatShortDate(res.terminDo)}
              </div>
              {res.poznamka && <div className="accommodation-note">{res.poznamka}</div>}

              <div className="accommodation-capacity">
                <span className={`capacity-badge ${ok ? 'badge-confirmed' : 'badge-declined'}`}>
                  {ok
                    ? `✓ Kapacita OK (${res.pocetIzieb} ${roomsLabel(res.pocetIzieb)} rezerv. / ${roomsNeeded} potrebných)`
                    : `⚠ Chybí ${Math.abs(chybi)} ${roomsLabel(Math.abs(chybi))} (${res.pocetIzieb} rezerv. / ${roomsNeeded} potrebných)`}
                </span>
              </div>

              {assigned.length > 0 && (
                <div className="accommodation-guests">
                  <div className="accommodation-guests-title">Priradení hostia ({assigned.length}):</div>
                  <ul className="accommodation-guest-list">
                    {assigned.map((g) => (
                      <li key={g.id} className="accommodation-guest-item">
                        <span className="accommodation-guest-name">{g.jmeno}</span>
                        {g.typIzby && (
                          <span className="accommodation-guest-room">
                            {' '}· {TYP_IZBY_LABELS[g.typIzby] || g.typIzby}
                            {g.pocetOsob > 0 && `, ${g.pocetOsob} os.`}
                          </span>
                        )}
                        {g.ubytovaniOd && (
                          <span className="accommodation-guest-dates">
                            {' '}· {formatShortDate(g.ubytovaniOd)}–{formatShortDate(g.ubytovaniDo)}
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {assigned.length === 0 && (
                <div className="accommodation-guests-empty">Žiadni hostia nepriradení</div>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
