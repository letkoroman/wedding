import { useState } from 'react';
import { TIME_OPTIONS } from './timeUtils.js';

const COLOR_PRESETS = ['#D4AF37', '#9b7de0', '#5a9a5a', '#c46a6a', '#e07070', '#4a90d9', '#6fa8c9', '#8B7355'];

export default function BlockForm({ block, onSave, onClose }) {
  const isEdit = Boolean(block);
  const [nazev, setNazev] = useState(block?.nazev || '');
  const [barva, setBarva] = useState(block?.barva || COLOR_PRESETS[0]);
  const [casZacatku, setCasZacatku] = useState(block?.casZacatku || '10:00');
  const [casKonce, setCasKonce] = useState(block?.casKonce || '14:00');

  function step(field, dir) {
    const current = field === 'casZacatku' ? casZacatku : casKonce;
    const idx = TIME_OPTIONS.indexOf(current);
    const nextIdx = (idx + dir + TIME_OPTIONS.length) % TIME_OPTIONS.length;
    const next = TIME_OPTIONS[nextIdx];
    if (field === 'casZacatku') setCasZacatku(next); else setCasKonce(next);
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!nazev.trim()) return;
    onSave({ nazev: nazev.trim(), barva, casZacatku, casKonce });
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>{isEdit ? 'Upravit blok' : 'Nový blok programu'}</h3>
        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <label htmlFor="block-nazev">Název bloku</label>
            <input
              id="block-nazev"
              type="text"
              value={nazev}
              onChange={(e) => setNazev(e.target.value)}
              placeholder="např. Obřad a ceremonie"
              required
              autoFocus
            />
          </div>
          <div className="form-row">
            <label>Barva bloku</label>
            <div className="swatch-row">
              {COLOR_PRESETS.map((col) => (
                <button
                  key={col}
                  type="button"
                  className={`swatch${barva === col ? ' selected' : ''}`}
                  style={{ background: col }}
                  aria-label={`Zvolit barvu ${col}`}
                  onClick={() => setBarva(col)}
                />
              ))}
              <input
                type="color"
                value={barva}
                onChange={(e) => setBarva(e.target.value)}
                aria-label="Vlastní barva"
                style={{ width: 32, height: 26, padding: 1, border: '1px solid #ccc', borderRadius: 6, cursor: 'pointer' }}
              />
            </div>
            <div
              className="block-preview-chip"
              style={{ borderColor: barva, background: barva + '1c', color: barva }}
            >
              {nazev || 'Náhled bloku'}
            </div>
          </div>
          <div className="form-row">
            <label>Čas bloku (24h formát)</label>
            <div className="time-field-pair">
              <div className="time-field">
                <span className="time-field-label">Začátek</span>
                <div className="time-stepper">
                  <button type="button" className="stepper-btn" aria-label="O 15 minut dříve" onClick={() => step('casZacatku', -1)}>−</button>
                  <select value={casZacatku} onChange={(e) => setCasZacatku(e.target.value)}>
                    {TIME_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                  <button type="button" className="stepper-btn" aria-label="O 15 minut později" onClick={() => step('casZacatku', 1)}>+</button>
                </div>
              </div>
              <div className="time-field">
                <span className="time-field-label">Konec</span>
                <div className="time-stepper">
                  <button type="button" className="stepper-btn" aria-label="O 15 minut dříve" onClick={() => step('casKonce', -1)}>−</button>
                  <select value={casKonce} onChange={(e) => setCasKonce(e.target.value)}>
                    {TIME_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                  <button type="button" className="stepper-btn" aria-label="O 15 minut později" onClick={() => step('casKonce', 1)}>+</button>
                </div>
              </div>
            </div>
          </div>
          <div className="form-actions">
            <button type="button" className="btn btn-outline" onClick={onClose}>Zrušit</button>
            <button type="submit" className="btn">{isEdit ? 'Uložit změny' : 'Vytvořit blok'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
