import { useState } from 'react';

const COLOR_PRESETS = ['#D4AF37', '#9b7de0', '#5a9a5a', '#c46a6a', '#e07070', '#4a90d9', '#c46a6a', '#8B7355'];

export default function BlockForm({ block, onSave, onClose }) {
  const isEdit = Boolean(block);
  const [nazev, setNazev] = useState(block?.nazev || '');
  const [barva, setBarva] = useState(block?.barva || COLOR_PRESETS[0]);

  function handleSubmit(e) {
    e.preventDefault();
    if (!nazev.trim()) return;
    onSave({ nazev: nazev.trim(), barva });
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
          <div className="form-actions">
            <button type="button" className="btn btn-outline" onClick={onClose}>Zrušit</button>
            <button type="submit" className="btn">{isEdit ? 'Uložit změny' : 'Vytvořit blok'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
