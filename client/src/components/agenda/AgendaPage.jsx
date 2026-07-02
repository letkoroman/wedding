import { useEffect, useState } from 'react';
import { agendaApi, categoriesApi, blocksApi } from '../../api.js';
import OverallTimeline from './OverallTimeline.jsx';
import IdeaBench from './IdeaBench.jsx';
import AgendaForm from './AgendaForm.jsx';
import CategoryForm from './CategoryForm.jsx';
import BlockForm from './BlockForm.jsx';
import './AgendaTimeline.css';

export default function AgendaPage() {
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [blocks, setBlocks] = useState([]);
  const [filterCat, setFilterCat] = useState(null);
  const [editingItem, setEditingItem] = useState(null);
  const [presetIdea, setPresetIdea] = useState(null);
  const [formInitialMode, setFormInitialMode] = useState('schedule');
  const [showForm, setShowForm] = useState(false);
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [editingBlock, setEditingBlock] = useState(null); // null = create, block obj = edit
  const [showBlockForm, setShowBlockForm] = useState(false);
  const [isDropActive, setIsDropActive] = useState(false);

  useEffect(() => {
    agendaApi.list().then(setItems);
    categoriesApi.list().then(setCategories);
    blocksApi.list().then(setBlocks);
  }, []);

  const scheduled = items.filter((i) => i.casZacatku && i.casKonce);
  const ideas = items.filter((i) => !i.casZacatku || !i.casKonce);
  const filteredScheduled = filterCat ? scheduled.filter((i) => i.kategorie === filterCat) : scheduled;

  async function handleSave(data) {
    if (editingItem) {
      const updated = await agendaApi.update(editingItem.id, data);
      setItems((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
    } else {
      const created = await agendaApi.create(data);
      setItems((prev) => [...prev, created]);
    }
    closeForm();
  }

  async function handleDelete(item) {
    if (!window.confirm(`Opravdu chcete smazat aktivitu „${item.nazev}"?`)) return;
    await agendaApi.remove(item.id);
    setItems((prev) => prev.filter((i) => i.id !== item.id));
  }

  async function handleUnschedule(itemId) {
    const item = items.find((i) => i.id === itemId);
    if (!item) return;
    const updated = await agendaApi.update(item.id, { ...item, casZacatku: null, casKonce: null });
    setItems((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
  }

  function handleReorderPreview(reorderedGroup) {
    setItems((prev) => {
      const ids = new Set(reorderedGroup.map((i) => i.id));
      return [...prev.filter((i) => !ids.has(i.id)), ...reorderedGroup];
    });
  }

  async function handleReorderCommit(groupItems) {
    await Promise.all(groupItems.map((item) => agendaApi.update(item.id, item)));
  }

  async function handleCreateCategory(data) {
    const created = await categoriesApi.create(data);
    setCategories((prev) => [...prev, created]);
    setShowCategoryForm(false);
  }

  async function handleDeleteCategory(key) {
    const cat = categories.find((c) => c.key === key);
    const count = items.filter((i) => i.kategorie === key).length;
    const msg = count > 0
      ? `Smazat kategorii „${cat?.label}"? ${count} aktivit${count === 1 ? 'a' : ''} zůstan${count === 1 ? 'e' : 'ou'} v programu bez kategorie.`
      : `Smazat kategorii „${cat?.label}"?`;
    if (!window.confirm(msg)) return;
    await categoriesApi.remove(key);
    setCategories((prev) => prev.filter((c) => c.key !== key));
    setItems((prev) => prev.map((i) => i.kategorie === key ? { ...i, kategorie: null } : i));
    if (filterCat === key) setFilterCat(null);
  }

  async function handleCreateBlock(data) {
    const created = await blocksApi.create(data);
    setBlocks((prev) => [...prev, created]);
    setShowBlockForm(false);
    setEditingBlock(null);
  }

  async function handleUpdateBlock(data) {
    const updated = await blocksApi.update(editingBlock.id, data);
    setBlocks((prev) => prev.map((b) => (b.id === updated.id ? updated : b)));
    setShowBlockForm(false);
    setEditingBlock(null);
  }

  async function handleDeleteBlock(id) {
    const block = blocks.find((b) => b.id === id);
    const count = items.filter((i) => i.blockId === id).length;
    const msg = count > 0
      ? `Smazat blok „${block?.nazev}"? ${count} aktivit${count === 1 ? 'a' : ''} zůstan${count === 1 ? 'e' : 'ou'} v programu bez bloku.`
      : `Smazat blok „${block?.nazev}"?`;
    if (!window.confirm(msg)) return;
    await blocksApi.remove(id);
    setItems((prev) => prev.map((i) => (i.blockId === id ? { ...i, blockId: null } : i)));
    setBlocks((prev) => prev.filter((b) => b.id !== id));
  }

  function openEdit(item) {
    setEditingItem(item);
    setPresetIdea(null);
    setFormInitialMode(item.casZacatku ? 'schedule' : 'idea');
    setShowForm(true);
  }

  function openAddSchedule() {
    setEditingItem(null);
    setPresetIdea(null);
    setFormInitialMode('schedule');
    setShowForm(true);
  }

  function openAddIdea() {
    setEditingItem(null);
    setPresetIdea(null);
    setFormInitialMode('idea');
    setShowForm(true);
  }

  function openAssignIdea(idea) {
    setEditingItem(idea);
    setPresetIdea(idea);
    setFormInitialMode('schedule');
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditingItem(null);
    setPresetIdea(null);
  }

  function openNewBlock() {
    setEditingBlock(null);
    setShowBlockForm(true);
  }

  function openEditBlock(block) {
    setEditingBlock(block);
    setShowBlockForm(true);
  }

  function handleDropOnProgram(e) {
    e.preventDefault();
    setIsDropActive(false);
    const type = e.dataTransfer.getData('text/x-type');
    if (type === 'scheduled') return; // ignore — already handled by bench drop
    const id = e.dataTransfer.getData('text/plain');
    const idea = ideas.find((i) => i.id === id);
    if (idea) openAssignIdea(idea);
  }

  return (
    <div>
      {/* ─── Header: title + editing actions ─── */}
      <div className="page-header">
        <h2>Program svatebního dne</h2>
        <div className="page-actions">
          <button className="btn fab-add-activity" onClick={openAddSchedule}>
            <span className="fab-icon" aria-hidden="true">+</span> Přidat aktivitu
          </button>
          <button className="btn btn-outline" onClick={() => setShowCategoryForm(true)}>+ Kategorie</button>
          <button className="btn btn-outline" onClick={openNewBlock}>+ Blok</button>
        </div>
      </div>

      {/* ─── Block management (separate from filter) ─── */}
      {blocks.length > 0 && (
        <div className="mgmt-row">
          <span className="mgmt-label">Bloky:</span>
          {blocks.map((block) => (
            <span
              key={block.id}
              className="block-chip"
              style={{ borderColor: block.barva, background: block.barva + '18', color: block.barva }}
            >
              <button
                type="button"
                className="chip-label-btn"
                onClick={() => openEditBlock(block)}
                title="Přejmenovat blok"
              >
                {block.nazev}
              </button>
              <button
                type="button"
                className="chip-remove"
                aria-label={`Smazat blok ${block.nazev}`}
                onClick={() => handleDeleteBlock(block.id)}
              >
                ✕
              </button>
            </span>
          ))}
        </div>
      )}

      {/* ─── Single filter row ─── */}
      <div className="filter-section">
        <span className="filter-label">Zobrazit:</span>
        <div className="pill-row" role="group" aria-label="Filtr podle kategorie">
          <button
            className={`pill${!filterCat ? ' active' : ''}`}
            style={!filterCat ? { background: 'var(--color-text)', borderColor: 'var(--color-text)' } : undefined}
            aria-pressed={!filterCat}
            onClick={() => setFilterCat(null)}
          >
            Vše
          </button>
          {categories.map((cat) => {
            const isActive = filterCat === cat.key;
            return (
              <span key={cat.key} className="pill-wrap">
                <button
                  className={`pill${isActive ? ' active' : ''}`}
                  style={isActive ? { background: cat.accent, borderColor: cat.accent } : undefined}
                  aria-pressed={isActive}
                  onClick={() => setFilterCat(isActive ? null : cat.key)}
                >
                  {cat.icon} {cat.label}
                </button>
                {!cat.fixed && (
                  <button
                    type="button"
                    className="pill-x"
                    aria-label={`Smazat kategorii ${cat.label}`}
                    onClick={() => handleDeleteCategory(cat.key)}
                  >
                    ✕
                  </button>
                )}
              </span>
            );
          })}
        </div>
      </div>

      {/* ─── Main two-column layout ─── */}
      <div className="page-layout">
        <div
          className={`page-main${isDropActive ? ' drop-target-active' : ''}`}
          onDragOver={(e) => { e.preventDefault(); setIsDropActive(true); }}
          onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setIsDropActive(false); }}
          onDrop={handleDropOnProgram}
        >
          <OverallTimeline
            items={filteredScheduled}
            categories={categories}
            blocks={blocks}
            onDelete={handleDelete}
            onEdit={openEdit}
            onUnschedule={handleUnschedule}
          />
        </div>

        <IdeaBench
          ideas={ideas}
          categories={categories}
          onAssign={openAssignIdea}
          onDelete={handleDelete}
          onEdit={openEdit}
          onReorderPreview={handleReorderPreview}
          onReorderCommit={handleReorderCommit}
          onUnschedule={handleUnschedule}
          onAddIdea={openAddIdea}
        />
      </div>

      {showForm && (
        <AgendaForm
          item={editingItem}
          presetIdea={presetIdea}
          categories={categories}
          blocks={blocks}
          onSave={handleSave}
          onClose={closeForm}
          initialMode={formInitialMode}
        />
      )}
      {showCategoryForm && (
        <CategoryForm onSave={handleCreateCategory} onClose={() => setShowCategoryForm(false)} />
      )}
      {showBlockForm && (
        <BlockForm
          block={editingBlock}
          onSave={editingBlock ? handleUpdateBlock : handleCreateBlock}
          onClose={() => { setShowBlockForm(false); setEditingBlock(null); }}
        />
      )}
    </div>
  );
}
