import './GuestSummaryCard.css';

export default function GuestSummaryCard({ guests }) {
  const confirmed = guests.filter((g) => g.potvrzeni === 'potvrzeno');
  const totalAdults = confirmed.reduce((sum, g) => sum + (g.pocetDospelych || 1), 0);
  const mustHaveAdults = confirmed
    .filter((g) => g.mustHave)
    .reduce((sum, g) => sum + (g.pocetDospelych || 1), 0);
  const totalChildren = confirmed.reduce((sum, g) => sum + (g.maDite ? (g.pocetDeti || 0) : 0), 0);
  const waiting = guests.filter((g) => g.potvrzeni === 'ceka').length;

  const stats = [
    { label: 'Potvrzení hosté', value: totalAdults },
    { label: 'z toho Must-have', value: mustHaveAdults },
    { label: 'Děti', value: totalChildren },
    { label: 'Čeká na odpověď', value: waiting }
  ];

  return (
    <div className="card summary-card">
      {stats.map((stat) => (
        <div key={stat.label} className="summary-stat">
          <div className="summary-value">{stat.value}</div>
          <div className="summary-label">{stat.label}</div>
        </div>
      ))}
    </div>
  );
}
