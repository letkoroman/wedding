import { toMinutes, minutesToLabel, fmtDuration } from './timeUtils.js';
import { deriveColors } from './colors.js';
import BlockHeader from './BlockHeader.jsx';

function getCategory(categories, key) {
  if (!key) return { icon: '❓', label: 'Bez kategorie', accent: '#aaa' };
  return categories.find((c) => c.key === key) || { icon: '❓', label: key, accent: '#aaa' };
}

// Group enriched items into time-overlap clusters
function buildClusters(enriched) {
  const sorted = [...enriched].sort((a, b) => a.startMin - b.startMin);
  const clusters = [];
  let group = [sorted[0]];
  let groupEnd = sorted[0].endMin;
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].startMin < groupEnd) {
      group.push(sorted[i]);
      groupEnd = Math.max(groupEnd, sorted[i].endMin);
    } else {
      clusters.push(group);
      group = [sorted[i]];
      groupEnd = sorted[i].endMin;
    }
  }
  clusters.push(group);
  return clusters.map((items) => {
    const startMin = items[0].startMin;
    const endMin = Math.max(...items.map((i) => i.endMin));
    return { startMin, endMin, rows: buildRows(items) };
  });
}

// Split a cluster into sequential/parallel rows
function buildRows(items) {
  const sorted = [...items].sort((a, b) => a.startMin - b.startMin);
  const rows = [];
  let i = 0;
  while (i < sorted.length) {
    const group = [sorted[i]];
    let j = i + 1;
    while (j < sorted.length) {
      if (sorted[j].startMin < Math.max(...group.map((g) => g.endMin))) {
        group.push(sorted[j]); j++;
      } else break;
    }
    rows.push(group.length === 1 ? { type: 'single', item: group[0] } : { type: 'parallel', items: group });
    i = j;
  }
  return rows;
}

// Group sorted items into contiguous runs sharing the same blockId
function buildGroupedAgenda(items, blocks) {
  if (!items.length) return [];
  const enriched = items
    .map((i) => ({ ...i, startMin: toMinutes(i.casZacatku), endMin: toMinutes(i.casKonce) }))
    .sort((a, b) => a.startMin - b.startMin);

  const runs = [];
  let curr = null;
  for (const item of enriched) {
    const bid = item.blockId || null;
    if (!curr || curr.blockId !== bid) { curr = { blockId: bid, items: [] }; runs.push(curr); }
    curr.items.push(item);
  }

  return runs.map((run) => {
    const block = run.blockId ? blocks.find((b) => b.id === run.blockId) : null;
    const minStart = run.items[0].startMin;
    const maxEnd = Math.max(...run.items.map((i) => i.endMin));
    return { block, items: run.items, sections: buildClusters(run.items), minStart, maxEnd };
  });
}

export default function OverallTimeline({ items, categories, blocks = [], onDelete, onEdit, onUnschedule }) {
  if (!items.length) return <p className="empty-state">Zatím žádné naplánované aktivity.</p>;
  const groups = buildGroupedAgenda(items, blocks);
  let lastEnd = -1;

  return (
    <div className="grouped-agenda">
      {groups.map((group, gIdx) => {
        const gap = lastEnd >= 0 ? group.minStart - lastEnd : 0;
        lastEnd = group.maxEnd;
        const blockTint = group.block ? deriveColors(group.block.barva) : null;
        return (
          <div
            key={group.block ? `block-${group.block.id}` : `ungrouped-${gIdx}`}
            className="block-group"
            style={blockTint ? { borderLeftColor: blockTint.border, background: blockTint.bg } : undefined}
          >
            {gap >= 30 && <GapRow minutes={gap} />}
            {group.block && <BlockHeader block={group.block} items={group.items} />}
            {group.sections.map((section, sIdx) => {
              const intraGap = sIdx > 0 ? section.startMin - group.sections[sIdx - 1].endMin : 0;
              return (
                <div key={sIdx}>
                  {intraGap >= 15 && <GapRow minutes={intraGap} compact />}
                  <AgendaSection
                    section={section}
                    categories={categories}
                    onDelete={onDelete}
                    onEdit={onEdit}
                    onUnschedule={onUnschedule}
                    inBlock={!!group.block}
                    isLast={sIdx === group.sections.length - 1 && gIdx === groups.length - 1}
                  />
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

function GapRow({ minutes, compact = false }) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const label = h > 0 ? (m > 0 ? `${h} h ${m} min` : `${h} h`) : `${m} min`;
  return <div className={`agenda-gap${compact ? ' compact' : ''}`}><span className="gap-label">– – {label} volno – –</span></div>;
}

function AgendaSection({ section, categories, onDelete, onEdit, onUnschedule, inBlock, isLast }) {
  return (
    <div className={`agenda-section${inBlock ? ' in-block' : ''}${isLast ? ' is-last' : ''}`}>
      <div className="as-time-col">
        <div className="as-time-start">{minutesToLabel(section.startMin)}</div>
        <div className="as-time-end">– {minutesToLabel(section.endMin)}</div>
      </div>
      <div className="as-content">
        {section.rows.map((row, idx) =>
          row.type === 'single' ? (
            <ActivityRow key={idx} item={row.item} categories={categories} onDelete={onDelete} onEdit={onEdit} onUnschedule={onUnschedule} />
          ) : (
            <ParallelGroup key={idx} items={row.items} categories={categories} onDelete={onDelete} onEdit={onEdit} onUnschedule={onUnschedule} />
          )
        )}
      </div>
    </div>
  );
}

function ActivityRow({ item, categories, onDelete, onEdit, onUnschedule, inLane = false }) {
  const cat = getCategory(categories, item.kategorie);
  const c = deriveColors(cat.accent);
  const duration = fmtDuration(item.casZacatku, item.casKonce);

  function handleDragStart(e) {
    e.dataTransfer.setData('text/plain', item.id);
    e.dataTransfer.setData('text/x-type', 'scheduled');
    e.dataTransfer.effectAllowed = 'move';
  }

  return (
    <div
      className={`activity-row${inLane ? ' in-lane' : ''}`}
      style={{ borderLeftColor: c.border, background: c.bg, color: c.text }}
      draggable
      onDragStart={handleDragStart}
      onClick={() => onEdit(item)}
    >
      <div className="ar-body">
        <div className="ar-meta">
          <span className="ar-time">{item.casZacatku} – {item.casKonce}</span>
          {duration && <span className="ar-dur">{duration}</span>}
          <span className="ar-cat">{cat.icon} {cat.label}</span>
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

function ParallelGroup({ items, categories, onDelete, onEdit, onUnschedule }) {
  return (
    <div className="parallel-group">
      <div className="pg-lanes">
        {items.map((item) => {
          const cat = getCategory(categories, item.kategorie);
          const c = deriveColors(cat.accent);
          return (
            <div key={item.id} className="pg-lane">
              <div className="pg-lane-head" style={{ color: c.border, borderBottomColor: c.border + '50', background: c.border + '0f' }}>
                {item.misto ? `📍 ${item.misto}` : `${cat.icon} ${cat.label}`}
              </div>
              <ActivityRow item={item} categories={categories} onDelete={onDelete} onEdit={onEdit} onUnschedule={onUnschedule} inLane />
            </div>
          );
        })}
      </div>
    </div>
  );
}
