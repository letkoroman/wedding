import { toMinutes, minutesToLabel, fmtDuration } from './timeUtils.js';
import { deriveColors } from './colors.js';

function getCategory(categories, key) {
  return categories.find((c) => c.key === key) || categories[0] || { icon: '', label: key, accent: '#999' };
}

// Group items into time-overlap clusters, preserving block info for display
function buildSections(items, blocks) {
  const sorted = [...items]
    .map((i) => ({ ...i, startMin: toMinutes(i.casZacatku), endMin: toMinutes(i.casKonce) }))
    .sort((a, b) => a.startMin - b.startMin);

  const clusters = [];
  let group = [sorted[0]];
  let groupEnd = sorted[0].endMin;

  for (let i = 1; i < sorted.length; i++) {
    const item = sorted[i];
    if (item.startMin < groupEnd) {
      group.push(item);
      groupEnd = Math.max(groupEnd, item.endMin);
    } else {
      clusters.push(group);
      group = [item];
      groupEnd = item.endMin;
    }
  }
  clusters.push(group);

  return clusters.map((clusterItems) => {
    const startMin = clusterItems[0].startMin;
    const endMin = Math.max(...clusterItems.map((i) => i.endMin));
    const blockIds = [...new Set(clusterItems.map((i) => i.blockId).filter(Boolean))];
    const sharedBlock = blockIds.length === 1 ? blocks.find((b) => b.id === blockIds[0]) : null;
    return { startMin, endMin, block: sharedBlock, rows: buildRows(clusterItems) };
  });
}

// Within a cluster, split into sequential rows; overlapping items → parallel row
function buildRows(items) {
  const sorted = [...items].sort((a, b) => a.startMin - b.startMin);
  const rows = [];
  let i = 0;
  while (i < sorted.length) {
    const group = [sorted[i]];
    let j = i + 1;
    while (j < sorted.length) {
      const gEnd = Math.max(...group.map((g) => g.endMin));
      if (sorted[j].startMin < gEnd) { group.push(sorted[j]); j++; } else break;
    }
    rows.push(group.length === 1 ? { type: 'single', item: group[0] } : { type: 'parallel', items: group });
    i = j;
  }
  return rows;
}

export default function OverallTimeline({ items, categories, blocks = [], onDelete, onEdit }) {
  if (!items.length) {
    return <p className="empty-state">Zatím žádné naplánované aktivity.</p>;
  }
  const sections = buildSections(items, blocks);
  return (
    <div className="grouped-agenda">
      {sections.map((section, idx) => (
        <AgendaSection
          key={idx}
          section={section}
          categories={categories}
          onDelete={onDelete}
          onEdit={onEdit}
          isLast={idx === sections.length - 1}
        />
      ))}
    </div>
  );
}

function AgendaSection({ section, categories, onDelete, onEdit, isLast }) {
  return (
    <div className={`agenda-section${isLast ? ' is-last' : ''}`}>
      <div className="as-time-col">
        <div className="as-time-start">{minutesToLabel(section.startMin)}</div>
        <div className="as-time-end">– {minutesToLabel(section.endMin)}</div>
        {section.block && (
          <div
            className="as-block-badge"
            style={{ color: section.block.barva, borderColor: section.block.barva + '70', background: section.block.barva + '14' }}
          >
            {section.block.nazev}
          </div>
        )}
      </div>
      <div className="as-content">
        {section.rows.map((row, idx) =>
          row.type === 'single' ? (
            <ActivityRow key={idx} item={row.item} categories={categories} onDelete={onDelete} onEdit={onEdit} />
          ) : (
            <ParallelGroup key={idx} items={row.items} categories={categories} onDelete={onDelete} onEdit={onEdit} />
          )
        )}
      </div>
    </div>
  );
}

function ActivityRow({ item, categories, onDelete, onEdit, inLane = false }) {
  const cat = getCategory(categories, item.kategorie);
  const c = deriveColors(cat.accent);
  const duration = fmtDuration(item.casZacatku, item.casKonce);

  return (
    <div
      className={`activity-row${inLane ? ' in-lane' : ''}`}
      style={{ borderLeftColor: c.border, background: c.bg, color: c.text }}
      onClick={() => onEdit(item)}
    >
      <div className="ar-body">
        <div className="ar-meta">
          <span className="ar-cat">{cat.icon} {cat.label}</span>
          {duration && <span className="ar-dur">{duration}</span>}
        </div>
        <div className="ar-name">{item.nazev}</div>
        {!inLane && item.misto && <div className="ar-loc">📍 {item.misto}</div>}
        {item.poznamka && <div className="ar-desc">{item.poznamka}</div>}
      </div>
      <button
        type="button"
        className="ar-del"
        title="Smazat aktivitu"
        aria-label="Smazat aktivitu"
        onClick={(e) => { e.stopPropagation(); onDelete(item); }}
      >
        🗑
      </button>
    </div>
  );
}

function ParallelGroup({ items, categories, onDelete, onEdit }) {
  return (
    <div className="parallel-group">
      <div className="pg-lanes">
        {items.map((item) => {
          const cat = getCategory(categories, item.kategorie);
          const c = deriveColors(cat.accent);
          const laneLabel = item.misto || `${cat.icon} ${cat.label}`;
          return (
            <div key={item.id} className="pg-lane">
              <div className="pg-lane-head" style={{ color: c.border, borderBottomColor: c.border + '50', background: c.border + '0f' }}>
                {item.misto ? `📍 ${item.misto}` : laneLabel}
              </div>
              <ActivityRow item={item} categories={categories} onDelete={onDelete} onEdit={onEdit} inLane />
            </div>
          );
        })}
      </div>
    </div>
  );
}
