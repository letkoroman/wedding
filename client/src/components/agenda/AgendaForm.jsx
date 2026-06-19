import { useState } from 'react';
import { CATEGORY_OPTIONS } from './categories.js';

const ICONS = ['💍', '🥂', '🍽️', '💃', '📸', '🎵', '🚗', '⛪', '🌸', '🎂', '⚽', '🎉'];

const EMPTY_ITEM = {
  nazev: '',
  casZacatku: '10:00',
  casKonce: '11:00',
  kategorie: 'ceremonie',
  ikona: ICONS[0],
  poznamka: ''
};

function toMinutes(t) {
  if (!t) return 0;
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

function computeDuration(casZacatku, casKonce) {
  if (!casZacatku || !casKonce) return null;
  let diff = toMinutes(casKonce) - toMinutes(casZacatku);
  if (diff < 0) diff += 1440;
  if (diff <= 0) return null;
  const h = Math.floor(diff / 60);
  const m = diff % 60;
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h} h`;
  return `${h} h ${m} min`;
}

export default function AgendaForm({ item, onSave, onClose }) {
  const [form, setForm] = useState(
    item
      ? { ...item, casKonce: item.casKonce || '' }
      : { ...EMPTY_ITEM }
  );

  function update(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    onSave(form);
  }

  const duration = computeDuration(form.casZacatku, form.casKonce);

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
            <label htmlFor="kategorie">Kategorie</label>
            <select
              id="kategorie"
              value={form.kategorie}
              onChange={(e) => update('kategorie', e.target.value)}
            >
              {CATEGORY_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          <div className="form-row-pair">
            <div className="form-row">
              <label htmlFor="casZacatku">Čas začátku</label>
              <input
                id="casZacatku"
                type="time"
                step="900"
                value={form.casZacatku}
                onChange={(e) => update('casZacatku', e.target.value)}
                required
              />
            </div>
            <div className="form-row">
              <label htmlFor="casKonce">Čas konce</label>
              <input
                id="casKonce"
                type="time"
                step="900"
                value={form.casKonce}
                onChange={(e) => update('casKonce', e.target.value)}
                required
              />
            </div>
          </div>
          {duration && (
            <div className="form-row">
              <label>Délka trvání</label>
              <div className="form-computed-value">{duration}</div>
            </div>
          )}
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
