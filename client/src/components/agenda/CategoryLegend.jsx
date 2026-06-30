import { deriveColors } from './colors.js';

export default function CategoryLegend({ categories, onDelete }) {
  return (
    <div className="legend-row">
      {categories.map((cat) => {
        const c = deriveColors(cat.accent);
        return (
          <span
            key={cat.key}
            className="legend-chip"
            style={{ background: c.bg, color: c.text, borderColor: c.border }}
          >
            <span className="dot" style={{ background: c.border }} />
            {cat.icon} {cat.label}
            {!cat.fixed && (
              <button
                type="button"
                className="chip-remove"
                title="Smazat kategorii"
                onClick={() => onDelete(cat.key)}
              >
                ✕
              </button>
            )}
          </span>
        );
      })}
    </div>
  );
}
