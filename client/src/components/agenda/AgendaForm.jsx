import { useState } from 'react';

const ICONS = ['💍', '🥂', '🍽️', '💃', '📸', '🎵', '🚗', '⛪', '🌸', '🎂'];

const EMPTY_ITEM = {
  nazev: '',
  casZacatku: '12:00',
  trvani: 30,
  ikona: ICONS[0],
  poznamka: ''
};

export default function AgendaForm({ item, onSave, onClose }) {
  const [form, setForm] = useState(item ? { ...item } : { ...EMPTY_ITEM });

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
        <h3>{item ? 'Upravit položku programu' : 'Přidat položku programu'}</h3>
        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <label htmlFor="nazev">Název</label>
            <input
              id="nazev"
              type="text"
              value={form.nazev}
              onChange={(e) => update('nazev', e.target.value)}
              required
            />
          </div>
          <div className="form-row">
            <label htmlFor="casZacatku">Čas začátku</label>
            <input
              id="casZacatku"
              type="time"
              value={form.casZacatku}
              onChange={(e) => update('casZacatku', e.target.value)}
              required
            />
          </div>
          <div className="form-row">
            <label htmlFor="trvani">Trvání (minuty)</label>
            <input
              id="trvani"
              type="number"
              min="0"
              step="5"
              value={form.trvani}
              onChange={(e) => update('trvani', Number(e.target.value))}
              required
            />
          </div>
          <div className="form-row">
            <label htmlFor="ikona">Ikona</label>
            <select id="ikona" value={form.ikona} onChange={(e) => update('ikona', e.target.value)}>
              {ICONS.map((icon) => (
                <option key={icon} value={icon}>{icon}</option>
              ))}
            </select>
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
