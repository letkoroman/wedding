import { useState } from 'react';
import { deriveColors } from './colors.js';

function groupByCategory(ideas) {
  const groups = {};
  ideas.forEach((item) => {
    (groups[item.kategorie] = groups[item.kategorie] || []).push(item);
  });
  return groups;
}

export default function IdeaBench({ ideas, categories, onAssign, onDelete, onEdit, onReorderPreview, onReorderCommit, onUnschedule, onAddIdea }) {
  const [isScheduledOver, setIsScheduledOver] = useState(false);
  const groups = groupByCategory(ideas);

  function handleDragOver(e) {
    if (e.dataTransfer.types.includes('text/x-type')) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      setIsScheduledOver(true);
    }
  }

  function handleDragLeave(e) {
    if (!e.currentTarget.contains(e.relatedTarget)) setIsScheduledOver(false);
  }

  function handleDrop(e) {
    e.preventDefault();
    setIsScheduledOver(false);
    const type = e.dataTransfer.getData('text/x-type');
    const id = e.dataTransfer.getData('text/plain');
    if (type === 'scheduled' && id && onUnschedule) onUnschedule(id);
  }

  return (
    <aside
      className={`bench-section${isScheduledOver ? ' scheduled-drop-active' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="bench-header">
        <h3>🗂️ Lavička nápadů</h3>
        {onAddIdea && (
          <button type="button" className="bench-add-btn" onClick={onAddIdea} title="Přidat nápad bez termínu">
            + Nápad
          </button>
        )}
      </div>
      {isScheduledOver && (
        <div className="bench-drop-hint">📥 Pusť sem — aktivita se přesune do lavičky</div>
      )}
      {ideas.length === 0 ? (
        <p className="bench-empty">Lavička je prázdná — nápady bez termínu se objeví zde.</p>
      ) : (
        <>
          <p className="bench-hint">
            Nápady bez termínu, roztříděné podle kategorie a seřazené podle priority.
            Přetáhni nahoru do programu, nebo klikni na „Zařadit". Pořadí uvnitř kategorie změníš přetažením.
          </p>
          <div className="bench-groups">
            {categories
              .filter((cat) => groups[cat.key]?.length)
              .map((cat) => (
                <BenchGroup
                  key={cat.key}
                  category={cat}
                  items={groups[cat.key].slice().sort((a, b) => a.priorita - b.priorita)}
                  onAssign={onAssign}
                  onDelete={onDelete}
                  onEdit={onEdit}
                  onReorderPreview={onReorderPreview}
                  onReorderCommit={onReorderCommit}
                />
              ))}
            {/* Uncategorised bench items */}
            {groups[null]?.length > 0 && (
              <BenchGroup
                category={{ key: null, label: 'Bez kategorie', icon: '❓', accent: '#aaa' }}
                items={groups[null].slice().sort((a, b) => a.priorita - b.priorita)}
                onAssign={onAssign}
                onDelete={onDelete}
                onEdit={onEdit}
                onReorderPreview={onReorderPreview}
                onReorderCommit={onReorderCommit}
              />
            )}
          </div>
        </>
      )}
    </aside>
  );
}

function BenchGroup({ category, items, onAssign, onDelete, onEdit, onReorderPreview, onReorderCommit }) {
  const [draggingId, setDraggingId] = useState(null);
  const c = deriveColors(category.accent);

  function handleDragOver(e, overId) {
    e.preventDefault();
    e.stopPropagation(); // prevent bench outer handler from firing
    if (!draggingId || draggingId === overId) return;
    const fromIndex = items.findIndex((i) => i.id === draggingId);
    const toIndex = items.findIndex((i) => i.id === overId);
    if (fromIndex === -1 || toIndex === -1) return;
    const reordered = [...items];
    const [moved] = reordered.splice(fromIndex, 1);
    reordered.splice(toIndex, 0, moved);
    onReorderPreview(reordered.map((item, idx) => ({ ...item, priorita: idx })));
  }

  return (
    <div className="bench-group">
      <div className="bench-group-title" style={{ color: c.border }}>
        <span className="dot" style={{ background: c.border }} />
        {category.icon} {category.label}
      </div>
      <div className="bench-list">
        {items.map((item, idx) => (
          <div
            key={item.id}
            className={`bench-card${draggingId === item.id ? ' dragging' : ''}`}
            draggable
            onDragStart={(e) => {
              setDraggingId(item.id);
              e.dataTransfer.setData('text/plain', item.id);
              // Do NOT set text/x-type so the bench outer drop handler ignores it
            }}
            onDragOver={(e) => handleDragOver(e, item.id)}
            onDragEnd={() => { setDraggingId(null); onReorderCommit(items); }}
          >
            <div className="bench-card-top" onClick={() => onEdit(item)}>
              <span className="bc-handle">⠿</span>
              <span className="bc-priority">{idx + 1}.</span>
              <span className="bc-name">
                {item.nazev}
                {item.misto && <span className="bc-loc"> · 📍 {item.misto}</span>}
              </span>
            </div>
            <div className="bench-card-actions">
              <button type="button" className="bc-assign" onClick={() => onAssign(item)}>Zařadit →</button>
              <button type="button" className="bc-remove" title="Smazat nápad" onClick={() => onDelete(item)}>🗑</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
