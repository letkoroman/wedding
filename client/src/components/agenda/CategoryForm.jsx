import { useState } from 'react';
import { deriveColors } from './colors.js';

const ICON_CHOICES = ['🎊', '🥂', '💃', '📸', '🎵', '🚗', '⛪', '🌸', '🎂', '⚽', '🏐', '🎯', '🔥', '🌅', '🎆', '🧁', '🍹', '🎮'];
const COLOR_CHOICES = ['#D4AF37', '#5a9a5a', '#9b7de0', '#e09040', '#D8A7B1', '#6fa8c9', '#c97064', '#7a6a5e'];

export default function CategoryForm({ onSave, onClose }) {
  const [label, setLabel] = useState('');
  const [icon, setIcon] = useState(ICON_CHOICES[0]);
  const [accent, setAccent] = useState(COLOR_CHOICES[0]);

  function handleSubmit(e) {
    e.preventDefault();
    if (!label.trim()) return;
    onSave({ label: label.trim(), icon, accent });
  }

  const preview = deriveColors(accent);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>Nová kategorie</h3>
        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <label htmlFor="catNazev">Název kategorie</label>
            <input
              id="catNazev"
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              required
              placeholder="např. After párty"
            />
          </div>
          <div className="form-row">
            <label>Ikona</label>
            <div className="icon-grid">
              {ICON_CHOICES.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  className={opt === icon ? 'selected' : ''}
                  aria-label={`Zvolit ikonu ${opt}`}
                  onClick={() => setIcon(opt)}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>
          <div className="form-row">
            <label>Barva</label>
            <div className="swatch-row">
              {COLOR_CHOICES.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  className={`swatch ${opt === accent ? 'selected' : ''}`}
                  style={{ background: opt }}
                  aria-label={`Zvolit barvu ${opt}`}
                  onClick={() => setAccent(opt)}
                />
              ))}
            </div>
            <input
              type="color"
              value={accent}
              onChange={(e) => setAccent(e.target.value)}
              style={{ marginTop: 8, width: 60, height: 30, padding: 2 }}
            />
          </div>
          <div
            className="cat-preview-chip"
            style={{ background: preview.bg, color: preview.text, borderColor: preview.border }}
          >
            {icon} {label.trim() || 'Náhled'}
          </div>
          <div className="form-actions">
            <button type="button" className="btn btn-outline" onClick={onClose}>Zrušit</button>
            <button type="submit" className="btn">Přidat kategorii</button>
          </div>
        </form>
      </div>
    </div>
  );
}
