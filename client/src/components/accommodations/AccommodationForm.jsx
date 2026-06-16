import { useState } from 'react';

const EMPTY_RESERVATION = {
  nazev: '',
  pocetIzieb: 1,
  terminOd: '',
  terminDo: '',
  poznamka: ''
};

export default function AccommodationForm({ reservation, onSave, onClose }) {
  const [form, setForm] = useState(reservation ? { ...reservation } : { ...EMPTY_RESERVATION });

  function update(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    onSave(form);
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>{reservation ? 'Upravit rezervaci ubytování' : 'Přidat rezervaci ubytování'}</h3>
        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <label htmlFor="nazev">Název (hotel / místo)</label>
            <input
              id="nazev"
              type="text"
              value={form.nazev}
              onChange={(e) => update('nazev', e.target.value)}
              required
            />
          </div>
          <div className="form-row">
            <label htmlFor="pocetIzieb">Počet pokojů</label>
            <input
              id="pocetIzieb"
              type="number"
              min="0"
              step="1"
              value={form.pocetIzieb}
              onChange={(e) => update('pocetIzieb', Number(e.target.value))}
              required
            />
          </div>
          <div className="form-row">
            <label htmlFor="terminOd">Termín od</label>
            <input
              id="terminOd"
              type="date"
              value={form.terminOd}
              onChange={(e) => update('terminOd', e.target.value)}
              required
            />
          </div>
          <div className="form-row">
            <label htmlFor="terminDo">Termín do</label>
            <input
              id="terminDo"
              type="date"
              value={form.terminDo}
              onChange={(e) => update('terminDo', e.target.value)}
              required
            />
          </div>
          <div className="form-row">
            <label htmlFor="poznamka">Poznámka</label>
            <textarea
              id="poznamka"
              rows={2}
              value={form.poznamka}
              onChange={(e) => update('poznamka', e.target.value)}
            />
          </div>
          <div className="form-actions">
            <button type="button" className="btn btn-outline" onClick={onClose}>Zrušit</button>
            <button type="submit" className="btn">Uložit</button>
          </div>
        </form>
      </div>
    </div>
  );
}
