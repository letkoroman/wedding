import { useState } from 'react';
import { deriveColors } from './colors.js';
import { fmtDuration } from './timeUtils.js';

function getCategory(categories, key) {
  return categories.find((c) => c.key === key) || categories[0] || { icon: '', label: key, accent: '#999' };
}

export default function CategoryLinearView({ items, categories, onDelete, onEdit }) {
  const [filter, setFilter] = useState('vse');

  const list = items
    .filter((i) => filter === 'vse' || i.kategorie === filter)
    .slice()
    .sort((a, b) => a.casZacatku.localeCompare(b.casZacatku));

  return (
    <div>
      <div className="pill-row">
        <button
          className={`pill ${filter === 'vse' ? 'active' : ''}`}
          style={filter === 'vse' ? { background: '#4a3f3a' } : undefined}
          onClick={() => setFilter('vse')}
        >
          Vše
        </button>
        {categories.map((cat) => (
          <button
            key={cat.key}
            className={`pill ${filter === cat.key ? 'active' : ''}`}
            style={filter === cat.key ? { background: cat.accent } : undefined}
            onClick={() => setFilter(cat.key)}
          >
            {cat.icon} {cat.label}
          </button>
        ))}
      </div>

      {list.length === 0 ? (
        <p className="empty-state">Žádné aktivity v této kategorii.</p>
      ) : (
        <div className="linear-list">
          {list.map((item) => {
            const cat = getCategory(categories, item.kategorie);
            const c = deriveColors(cat.accent);
            return (
              <div key={item.id} className="linear-item">
                <div className="linear-time">
                  <div className="linear-time-start">{item.casZacatku}</div>
                  <div className="linear-time-end">{item.casKonce}</div>
                </div>
                <div className="linear-card" style={{ borderLeftColor: c.border }} onClick={() => onEdit(item)}>
                  <div className="linear-card-header">
                    <span className="lc-icon">{cat.icon}</span>
                    <span className="lc-name">{item.nazev}</span>
                    <span className="cat-badge" style={{ background: c.bg, color: c.text, borderColor: c.border }}>
                      {cat.icon} {cat.label}
                    </span>
                    <button
                      type="button"
                      className="lc-delete"
                      title="Smazat aktivitu"
                      onClick={(e) => { e.stopPropagation(); onDelete(item); }}
                    >
                      🗑
                    </button>
                  </div>
                  <p className="lc-meta">
                    {fmtDuration(item.casZacatku, item.casKonce)}
                    {item.misto ? <> · <span className="lc-loc">{item.misto}</span></> : null}
                  </p>
                  {item.poznamka && <p className="lc-desc">{item.poznamka}</p>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
