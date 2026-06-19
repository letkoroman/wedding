import { CATEGORIES } from './categories.js';

const PX_PER_MIN = 1.4;
const MIN_BLOCK_PX = 32;

function toMinutes(t) {
  if (!t) return 0;
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

function layoutItems(items) {
  const valid = items.filter((i) => i.casZacatku && i.casKonce);
  if (valid.length === 0) return [];

  const withMin = valid
    .map((i) => ({ ...i, startMin: toMinutes(i.casZacatku), endMin: toMinutes(i.casKonce) }))
    .sort((a, b) => a.startMin - b.startMin);

  const columnEnds = [];
  const withCols = withMin.map((item) => {
    let col = columnEnds.findIndex((end) => end <= item.startMin);
    if (col === -1) { col = columnEnds.length; columnEnds.push(0); }
    columnEnds[col] = item.endMin;
    return { ...item, col };
  });

  return withCols.map((item) => {
    const concurrent = withCols.filter(
      (o) => o.startMin < item.endMin && o.endMin > item.startMin
    );
    const maxCols = Math.max(...concurrent.map((o) => o.col + 1));
    return { ...item, maxCols };
  });
}

export default function AgendaVisualTimeline({ items }) {
  const laid = layoutItems(items);
  if (laid.length === 0) return null;

  const axisStart = Math.floor(Math.min(...laid.map((i) => i.startMin)) / 60) * 60;
  const axisEnd = Math.ceil(Math.max(...laid.map((i) => i.endMin)) / 60) * 60;
  const totalHeight = (axisEnd - axisStart) * PX_PER_MIN;

  const hourLabels = [];
  for (let m = axisStart; m <= axisEnd; m += 60) hourLabels.push(m);

  return (
    <div className="agenda-visual-wrap card">
      <div className="agenda-visual-title">Přehled dne</div>
      <div className="agenda-visual" style={{ height: totalHeight + 24 }}>
        {hourLabels.map((m) => (
          <div
            key={m}
            className="agenda-visual-hour-line"
            style={{ top: (m - axisStart) * PX_PER_MIN }}
          >
            <span className="agenda-visual-hour-label">
              {String(Math.floor(m / 60)).padStart(2, '0')}:00
            </span>
          </div>
        ))}

        <div className="agenda-visual-blocks">
          {laid.map((item) => {
            const top = (item.startMin - axisStart) * PX_PER_MIN;
            const rawH = (item.endMin - item.startMin) * PX_PER_MIN;
            const height = Math.max(MIN_BLOCK_PX, rawH);
            const leftPct = (item.col / item.maxCols) * 100;
            const widthPct = (1 / item.maxCols) * 100;
            const cat = CATEGORIES[item.kategorie] || CATEGORIES.ceremonie;

            return (
              <div
                key={item.id}
                className="agenda-visual-block"
                style={{
                  top,
                  height,
                  left: `calc(${leftPct}% + 2px)`,
                  width: `calc(${widthPct}% - 4px)`,
                  background: cat.bg,
                  borderLeft: `3px solid ${cat.border}`,
                  color: cat.text
                }}
              >
                <span className="agenda-visual-block-icon">{cat.icon}</span>
                <span className="agenda-visual-block-name">{item.nazev}</span>
                <span className="agenda-visual-block-time">
                  {item.casZacatku}–{item.casKonce}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
