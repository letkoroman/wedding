import { useEffect, useRef, useState } from 'react';
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

export default function OverallTimeline({ items, categories, onDelete, onEdit, onReschedule, onUnschedule, onScheduledDragChange }) {
  const isMobile = useIsMobile();

  if (items.length === 0) {
    return <p className="empty-state">Zatím žádné naplánované aktivity.</p>;
  }

  const laid = layoutOverall(items);

  if (isMobile) {
    return <MobileClusters laid={laid} categories={categories} onDelete={onDelete} onEdit={onEdit} />;
  }
  return (
    <DesktopTimeline
      laid={laid}
      categories={categories}
      onDelete={onDelete}
      onEdit={onEdit}
      onReschedule={onReschedule}
      onUnschedule={onUnschedule}
      onScheduledDragChange={onScheduledDragChange}
    />
  );
}

function DesktopTimeline({ laid, categories, onDelete, onEdit, onReschedule, onUnschedule, onScheduledDragChange }) {
  const axisStart = Math.floor(Math.min(...laid.map((i) => i.startMin)) / 60) * 60;
  const axisEnd = Math.ceil(Math.max(...laid.map((i) => i.endMin)) / 60) * 60;
  const totalHeight = (axisEnd - axisStart) * PX_PER_MIN;
  const hourLabels = [];
  for (let m = axisStart; m <= axisEnd; m += 60) hourLabels.push(m);

  // Ref stores mutable drag tracking data (avoids stale closures in event handlers)
  const dragRef = useRef(null);
  // Visual preview state — re-renders the dragged block at its new position
  const [preview, setPreview] = useState({ itemId: null, deltaMin: 0 });

  // Re-attach on every render so the pointermove/pointerup closures always have fresh values
  // (laid, axisStart, axisEnd, onEdit, onReschedule, onUnschedule are captured fresh each render)
  useEffect(() => {
    function onPointerMove(e) {
      if (!dragRef.current) return;
      const { startPointerY, origStartMin, duration } = dragRef.current;
      const rawDelta = (e.clientY - startPointerY) / PX_PER_MIN;
      const snapped = Math.round(rawDelta / 15) * 15;
      const minDelta = axisStart - origStartMin;
      const maxDelta = axisEnd - duration - origStartMin;
      const constrained = Math.max(minDelta, Math.min(maxDelta, snapped));
      setPreview({ itemId: dragRef.current.itemId, deltaMin: constrained });
    }

    function onPointerUp(e) {
      if (!dragRef.current) return;
      const { itemId, origStartMin, duration, startPointerY } = dragRef.current;
      dragRef.current = null;
      const rawDelta = (e.clientY - startPointerY) / PX_PER_MIN;
      const snapped = Math.round(rawDelta / 15) * 15;
      const minDelta = axisStart - origStartMin;
      const maxDelta = axisEnd - duration - origStartMin;
      const constrained = Math.max(minDelta, Math.min(maxDelta, snapped));
      setPreview({ itemId: null, deltaMin: 0 });
      onScheduledDragChange?.(false);

      const item = laid.find((i) => i.id === itemId);
      if (!item) return;

      if (Math.abs(constrained) >= 15) {
        // Check if released over the lavička bench
        const el = document.elementFromPoint(e.clientX, e.clientY);
        if (el?.closest('.bench-section')) {
          onUnschedule?.(item);
        } else {
          const newStart = origStartMin + constrained;
          const newEnd = newStart + duration;
          onReschedule?.(item, minutesToLabel(newStart), minutesToLabel(newEnd));
        }
      } else {
        // Small or no movement → treat as a click (open edit form)
        onEdit(item);
      }
    }

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };
  }); // intentionally no dep array — fresh closures every render

  function startDrag(e, item) {
    if (e.target.closest('.block-delete')) return;
    // Skip midnight-crossing activities (endMin < startMin) — complex edge case
    if (item.endMin < item.startMin) {
      onEdit(item);
      return;
    }
    e.preventDefault(); // prevent text selection while dragging
    dragRef.current = {
      itemId: item.id,
      startPointerY: e.clientY,
      origStartMin: item.startMin,
      duration: item.endMin - item.startMin
    };
    setPreview({ itemId: item.id, deltaMin: 0 });
    onScheduledDragChange?.(true);
  }

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
            const isDragging = preview.itemId === item.id;
            const effectiveStartMin = item.startMin + (isDragging ? preview.deltaMin : 0);
            const top = (effectiveStartMin - axisStart) * PX_PER_MIN;
            const height = Math.max(MIN_BLOCK_PX, (item.endMin - item.startMin) * PX_PER_MIN);
            const leftPct = (item.col / item.maxCols) * 100;
            const widthPct = (1 / item.maxCols) * 100;
            const displayStart = isDragging ? minutesToLabel(effectiveStartMin) : item.casZacatku;
            const displayEnd = isDragging ? minutesToLabel(item.endMin + preview.deltaMin) : item.casKonce;
            return (
              <div
                key={item.id}
                className={`block ${isDragging ? 'dragging' : ''}`}
                style={{
                  top,
                  height,
                  left: `calc(${leftPct}% + 2px)`,
                  width: `calc(${widthPct}% - 4px)`,
                  background: c.bg,
                  borderLeftColor: c.border,
                  color: c.text
                }}
                title={`${item.nazev} — ťahaním zmeníš čas, pust na lavičku pre odplánování`}
                onPointerDown={(e) => startDrag(e, item)}
              >
                <button
                  type="button"
                  className="block-delete"
                  title="Smazat aktivitu"
                  aria-label="Smazat aktivitu"
                  onClick={(e) => { e.stopPropagation(); onDelete(item); }}
                >
                  🗑
                </button>
                <span className="b-cat">{cat.icon} {cat.label}</span>
                <span className="b-name">{item.nazev}</span>
                <span className="b-time">{displayStart}–{displayEnd}</span>
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
        aria-label="Smazat aktivitu"
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
