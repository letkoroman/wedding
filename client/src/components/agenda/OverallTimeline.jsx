import { useEffect, useState } from 'react';
import { layoutOverall, clusterOverall } from './layout.js';
import { minutesToLabel } from './timeUtils.js';
import { deriveColors } from './colors.js';

const PX_PER_MIN = 1.7;
const MIN_BLOCK_PX = 46;

function getCategory(categories, key) {
  return categories.find((c) => c.key === key) || categories[0] || { icon: '', label: key, accent: '#999' };
}

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(max-width: 680px)').matches
  );
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 680px)');
    const handler = () => setIsMobile(mq.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);
  return isMobile;
}

export default function OverallTimeline({ items, categories, onDelete, onEdit }) {
  const isMobile = useIsMobile();

  if (items.length === 0) {
    return <p className="empty-state">Zatím žádné naplánované aktivity.</p>;
  }

  const laid = layoutOverall(items);

  if (isMobile) {
    return <MobileClusters laid={laid} categories={categories} onDelete={onDelete} onEdit={onEdit} />;
  }
  return <DesktopTimeline laid={laid} categories={categories} onDelete={onDelete} onEdit={onEdit} />;
}

function DesktopTimeline({ laid, categories, onDelete, onEdit }) {
  const axisStart = Math.floor(Math.min(...laid.map((i) => i.startMin)) / 60) * 60;
  const axisEnd = Math.ceil(Math.max(...laid.map((i) => i.endMin)) / 60) * 60;
  const totalHeight = (axisEnd - axisStart) * PX_PER_MIN;
  const hourLabels = [];
  for (let m = axisStart; m <= axisEnd; m += 60) hourLabels.push(m);

  return (
    <div className="timeline-card">
      <div className="timeline" style={{ height: totalHeight + 24 }}>
        {hourLabels.map((m) => (
          <div key={m} className="hour-line" style={{ top: (m - axisStart) * PX_PER_MIN }}>
            <span className="hour-label">{minutesToLabel(m)}</span>
          </div>
        ))}
        <div className="blocks-layer">
          {laid.map((item) => {
            const cat = getCategory(categories, item.kategorie);
            const c = deriveColors(cat.accent);
            const top = (item.startMin - axisStart) * PX_PER_MIN;
            const height = Math.max(MIN_BLOCK_PX, (item.endMin - item.startMin) * PX_PER_MIN);
            const leftPct = (item.col / item.maxCols) * 100;
            const widthPct = (1 / item.maxCols) * 100;
            return (
              <div
                key={item.id}
                className="block"
                style={{
                  top,
                  height,
                  left: `calc(${leftPct}% + 2px)`,
                  width: `calc(${widthPct}% - 4px)`,
                  background: c.bg,
                  borderLeftColor: c.border,
                  color: c.text
                }}
                title={`${item.nazev} (${item.casZacatku}–${item.casKonce})${item.misto ? ' · ' + item.misto : ''}`}
                onClick={() => onEdit(item)}
              >
                <button
                  type="button"
                  className="block-delete"
                  title="Smazat aktivitu"
                  onClick={(e) => { e.stopPropagation(); onDelete(item); }}
                >
                  🗑
                </button>
                <span className="b-cat">{cat.icon} {cat.label}</span>
                <span className="b-name">{item.nazev}</span>
                <span className="b-time">{item.casZacatku}–{item.casKonce}</span>
                {item.misto && height > 70 && <span className="b-loc">📍 {item.misto}</span>}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function MiniRow({ item, categories, showTime, onDelete, onEdit }) {
  const cat = getCategory(categories, item.kategorie);
  const c = deriveColors(cat.accent);
  return (
    <div
      className="cluster-mini"
      style={{ background: c.bg, borderLeftColor: c.border, color: c.text }}
      onClick={() => onEdit(item)}
    >
      <div className="cm-body">
        <span className="cm-cat">{cat.icon} {cat.label}</span>
        <span className="cm-name">{item.nazev}{item.misto ? ` · 📍 ${item.misto}` : ''}</span>
      </div>
      {showTime && <span className="cm-time">{item.casZacatku}–{item.casKonce}</span>}
      <button
        type="button"
        className="cm-delete"
        title="Smazat aktivitu"
        onClick={(e) => { e.stopPropagation(); onDelete(item); }}
      >
        🗑
      </button>
    </div>
  );
}

function MobileClusters({ laid, categories, onDelete, onEdit }) {
  const clusters = clusterOverall(laid);
  return (
    <div className="mobile-clusters">
      {clusters.map((cluster, idx) => (
        <ClusterCard
          key={idx}
          cluster={cluster}
          isSingle={cluster.items.length === 1}
          categories={categories}
          onDelete={onDelete}
          onEdit={onEdit}
        />
      ))}
    </div>
  );
}

function ClusterCard({ cluster, isSingle, categories, onDelete, onEdit }) {
  const [expanded, setExpanded] = useState(false);
  const involvedIcons = [...new Set(cluster.items.map((i) => getCategory(categories, i.kategorie).icon))].join(' ');

  return (
    <div className={`cluster-card ${isSingle ? 'single' : ''} ${expanded ? 'expanded' : ''}`}>
      <div className="cluster-summary" onClick={() => !isSingle && setExpanded((e) => !e)}>
        <span className="cs-time">{minutesToLabel(cluster.minStart)}–{minutesToLabel(cluster.maxEnd)}</span>
        <span className="cs-icons">{involvedIcons}</span>
        {!isSingle && (
          <>
            <span className="cs-count">{cluster.items.length} aktivity souběžně</span>
            <span className="cs-caret">▾</span>
          </>
        )}
      </div>
      {isSingle ? (
        <MiniRow item={cluster.items[0]} categories={categories} showTime={false} onDelete={onDelete} onEdit={onEdit} />
      ) : (
        <div className="cluster-items">
          {[...cluster.items].sort((a, b) => a.startMin - b.startMin).map((item) => (
            <MiniRow key={item.id} item={item} categories={categories} showTime onDelete={onDelete} onEdit={onEdit} />
          ))}
        </div>
      )}
    </div>
  );
}
