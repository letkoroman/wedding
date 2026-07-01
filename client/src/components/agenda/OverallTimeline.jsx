import { useEffect, useRef, useState } from 'react';
import { layoutOverall, clusterOverall } from './layout.js';
import { minutesToLabel, fmtDuration } from './timeUtils.js';
import { deriveColors } from './colors.js';

const PX_PER_MIN = 1.7;
const MIN_BLOCK_PX = 60;

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

export default function OverallTimeline({ items, categories, blocks = [], onDelete, onEdit, onReschedule, onUnschedule, onScheduledDragChange }) {
  const isMobile = useIsMobile();

  if (items.length === 0) {
    return <p className="empty-state">Zatím žádné naplánované aktivity.</p>;
  }

  const laid = layoutOverall(items);

  if (isMobile) {
    return <MobileClusters laid={laid} categories={categories} blocks={blocks} onDelete={onDelete} onEdit={onEdit} />;
  }
  return (
    <DesktopTimeline
      laid={laid}
      categories={categories}
      blocks={blocks}
      onDelete={onDelete}
      onEdit={onEdit}
      onReschedule={onReschedule}
      onUnschedule={onUnschedule}
      onScheduledDragChange={onScheduledDragChange}
    />
  );
}

function DesktopTimeline({ laid, categories, blocks, onDelete, onEdit, onReschedule, onUnschedule, onScheduledDragChange }) {
  const axisStart = Math.floor(Math.min(...laid.map((i) => i.startMin)) / 60) * 60;
  const axisEnd = Math.ceil(Math.max(...laid.map((i) => i.endMin)) / 60) * 60;
  const totalHeight = (axisEnd - axisStart) * PX_PER_MIN;
  const hourLabels = [];
  for (let m = axisStart; m <= axisEnd; m += 60) hourLabels.push(m);

  const dragRef = useRef(null);
  const [preview, setPreview] = useState({ itemId: null, deltaMin: 0 });

  // Re-attach every render so closures always have fresh laid/axis values
  useEffect(() => {
    function onPointerMove(e) {
      if (!dragRef.current) return;
      const { startPointerY, origStartMin, duration } = dragRef.current;
      const rawDelta = (e.clientY - startPointerY) / PX_PER_MIN;
      const snapped = Math.round(rawDelta / 15) * 15;
      const constrained = Math.max(axisStart - origStartMin, Math.min(axisEnd - duration - origStartMin, snapped));
      setPreview({ itemId: dragRef.current.itemId, deltaMin: constrained });
    }

    function onPointerUp(e) {
      if (!dragRef.current) return;
      const { itemId, origStartMin, duration, startPointerY } = dragRef.current;
      dragRef.current = null;
      const rawDelta = (e.clientY - startPointerY) / PX_PER_MIN;
      const snapped = Math.round(rawDelta / 15) * 15;
      const constrained = Math.max(axisStart - origStartMin, Math.min(axisEnd - duration - origStartMin, snapped));
      setPreview({ itemId: null, deltaMin: 0 });
      onScheduledDragChange?.(false);

      const item = laid.find((i) => i.id === itemId);
      if (!item) return;

      // Check bench drop first — user may drag sideways without vertical movement
      const el = document.elementFromPoint(e.clientX, e.clientY);
      if (el?.closest('.bench-section')) {
        onUnschedule?.(item);
        return;
      }

      if (Math.abs(constrained) >= 15) {
        const newStart = origStartMin + constrained;
        const newEnd = newStart + duration;
        onReschedule?.(item, minutesToLabel(newStart), minutesToLabel(newEnd));
      } else {
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
    if (item.endMin < item.startMin) { onEdit(item); return; }
    e.preventDefault();
    dragRef.current = {
      itemId: item.id,
      startPointerY: e.clientY,
      origStartMin: item.startMin,
      duration: item.endMin - item.startMin
    };
    setPreview({ itemId: item.id, deltaMin: 0 });
    onScheduledDragChange?.(true);
  }

  // Compute swimlane bands for blocks that have items in the current laid set
  const swimlanes = blocks
    .map((block) => {
      const blockItems = laid.filter((i) => i.blockId === block.id);
      if (!blockItems.length) return null;
      return {
        block,
        minStart: Math.min(...blockItems.map((i) => i.startMin)),
        maxEnd: Math.max(...blockItems.map((i) => i.endMin)),
      };
    })
    .filter(Boolean);

  return (
    <div className="timeline-card">
      <div className="timeline" style={{ height: totalHeight + 24 }}>
        {hourLabels.map((m) => (
          <div key={m} className="hour-line" style={{ top: (m - axisStart) * PX_PER_MIN }}>
            <span className="hour-label">{minutesToLabel(m)}</span>
          </div>
        ))}
        <div className="blocks-layer">
          {/* Swimlane backgrounds — rendered before activity blocks so they sit behind */}
          {swimlanes.map(({ block, minStart, maxEnd }) => (
            <div
              key={block.id}
              className="swimlane-bg"
              style={{
                top: (minStart - axisStart) * PX_PER_MIN - 4,
                height: Math.max((maxEnd - minStart) * PX_PER_MIN + 8, 48),
                borderLeftColor: block.barva,
                background: block.barva + '18',
              }}
            >
              <div className="swimlane-label" style={{ color: block.barva, background: block.barva + '28' }}>
                {block.nazev}
              </div>
            </div>
          ))}

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
            const showDesc = Boolean(item.poznamka) && height > 82;
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
                {item.misto && <span className="b-loc">📍 {item.misto}</span>}
                {showDesc && <span className="b-desc">{item.poznamka}</span>}
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
        {item.poznamka && <span className="cm-desc">{item.poznamka}</span>}
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

function MobileClusters({ laid, categories, blocks, onDelete, onEdit }) {
  const clusters = clusterOverall(laid);
  return (
    <div className="mobile-clusters">
      {clusters.map((cluster, idx) => (
        <ClusterCard
          key={idx}
          cluster={cluster}
          isSingle={cluster.items.length === 1}
          categories={categories}
          blocks={blocks}
          onDelete={onDelete}
          onEdit={onEdit}
        />
      ))}
    </div>
  );
}

function ClusterCard({ cluster, isSingle, categories, blocks, onDelete, onEdit }) {
  const [expanded, setExpanded] = useState(false);
  const involvedIcons = [...new Set(cluster.items.map((i) => getCategory(categories, i.kategorie).icon))].join(' ');

  // Determine if all items in this cluster share the same block
  const blockIds = [...new Set(cluster.items.map((i) => i.blockId).filter(Boolean))];
  const sharedBlock = blockIds.length === 1 ? blocks.find((b) => b.id === blockIds[0]) : null;

  return (
    <div className={`cluster-card ${isSingle ? 'single' : ''} ${expanded ? 'expanded' : ''}`}>
      {sharedBlock && (
        <div className="mobile-block-label" style={{ borderLeftColor: sharedBlock.barva, color: sharedBlock.barva, background: sharedBlock.barva + '18' }}>
          {sharedBlock.nazev}
        </div>
      )}
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
