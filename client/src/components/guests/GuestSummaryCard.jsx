import './GuestSummaryCard.css';

export default function GuestSummaryCard({ guests }) {
  const confirmed = guests.filter((g) => g.potvrzeni === 'potvrzeno');

  const totalAllAdults = guests.reduce((sum, g) => sum + (g.pocetDospelych || 1), 0);
  const totalAllChildren = guests.reduce((sum, g) => sum + (g.maDite ? (g.pocetDeti || 0) : 0), 0);

  const confirmedAdults = confirmed.reduce((sum, g) => sum + (g.pocetDospelych || 1), 0);
  const mustHaveAdults = confirmed.filter((g) => g.mustHave).reduce((sum, g) => sum + (g.pocetDospelych || 1), 0);
  const waiting = guests.filter((g) => g.potvrzeni === 'ceka').length;

  return (
    <div className="summary-wrapper">
      <div className="card summary-totals">
        <div className="summary-total-stat">
          <div className="summary-total-value">{totalAllAdults}</div>
          <div className="summary-total-label">Celkem dospělých</div>
        </div>
        <div className="summary-total-divider" />
        <div className="summary-total-stat">
          <div className="summary-total-value">{totalAllChildren}</div>
          <div className="summary-total-label">Celkem dětí</div>
        </div>
      </div>
      <div className="card summary-card">
        <div className="summary-stat">
          <div className="summary-value">{confirmedAdults}</div>
          <div className="summary-label">Potvrzení dospělí</div>
        </div>
        <div className="summary-stat">
          <div className="summary-value">{mustHaveAdults}</div>
          <div className="summary-label">Must-have</div>
        </div>
        <div className="summary-stat">
          <div className="summary-value">{waiting}</div>
          <div className="summary-label">Čeká na odpověď</div>
        </div>
      </div>
    </div>
  );
}
