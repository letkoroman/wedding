import { useEffect, useState } from 'react';
import { agendaApi, categoriesApi, blocksApi } from '../../api.js';
import CategoryLegend from './CategoryLegend.jsx';
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
  const [showForm, setShowForm] = useState(false);
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [showBlockForm, setShowBlockForm] = useState(false);
  const [isDropActive, setIsDropActive] = useState(false);
  const [isScheduledDragging, setIsScheduledDragging] = useState(false);

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

  function handleReorderPreview(reorderedGroup) {
    setItems((prev) => {
      const ids = new Set(reorderedGroup.map((i) => i.id));
      const others = prev.filter((i) => !ids.has(i.id));
      return [...others, ...reorderedGroup];
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
    try {
      await categoriesApi.remove(key);
      setCategories((prev) => prev.filter((c) => c.key !== key));
    } catch {
      alert('Nejprve přesuňte nebo smažte aktivity v této kategorii.');
    }
  }

  async function handleCreateBlock(data) {
    const created = await blocksApi.create(data);
    setBlocks((prev) => [...prev, created]);
    setShowBlockForm(false);
  }

  async function handleDeleteBlock(id) {
    if (!window.confirm('Smazat blok programu? Aktivity zůstanou, jen se odřadí z bloku.')) return;
    await blocksApi.remove(id);
    setItems((prev) => prev.map((i) => (i.blockId === id ? { ...i, blockId: null } : i)));
    setBlocks((prev) => prev.filter((b) => b.id !== id));
  }

  function openEdit(item) {
    setEditingItem(item);
    setPresetIdea(null);
    setShowForm(true);
  }

  function openAddSchedule() {
    setEditingItem(null);
    setPresetIdea(null);
    setShowForm(true);
  }

  function openAssignIdea(idea) {
    setEditingItem(idea);
    setPresetIdea(idea);
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditingItem(null);
    setPresetIdea(null);
  }

  async function handleReschedule(item, newCasZacatku, newCasKonce) {
    const updated = await agendaApi.update(item.id, { ...item, casZacatku: newCasZacatku, casKonce: newCasKonce });
    setItems((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
  }

  async function handleUnschedule(item) {
    const updated = await agendaApi.update(item.id, { ...item, casZacatku: null, casKonce: null });
    setItems((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
  }

  function handleDropOnProgram(e) {
    e.preventDefault();
    setIsDropActive(false);
    const id = e.dataTransfer.getData('text/plain');
    const idea = ideas.find((i) => i.id === id);
    if (idea) openAssignIdea(idea);
  }

  return (
    <div>
      <div className="page-header">
        <h2>Program svatebního dne</h2>
        <div className="page-actions">
          <button className="btn" onClick={openAddSchedule}>+ Přidat aktivitu</button>
          <button className="btn btn-outline" onClick={() => setShowCategoryForm(true)}>+ Nová kategorie</button>
          <button className="btn btn-outline" onClick={() => setShowBlockForm(true)}>+ Nový blok</button>
        </div>
      </div>

      <CategoryLegend categories={categories} onDelete={handleDeleteCategory} />

      {blocks.length > 0 && (
        <div className="block-legend">
          {blocks.map((block) => (
            <span
              key={block.id}
              className="block-chip"
              style={{ borderColor: block.barva, background: block.barva + '18', color: block.barva }}
            >
              {block.nazev}
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

      <div className="pill-row" role="group" aria-label="Filtr podle kategorie">
        <button
          className={`pill ${!filterCat ? 'active' : ''}`}
          style={!filterCat ? { background: '#4a3f3a' } : undefined}
          aria-pressed={!filterCat}
          onClick={() => setFilterCat(null)}
        >
          Vše
        </button>
        {categories.map((cat) => {
          const isActive = filterCat === cat.key;
          return (
            <button
              key={cat.key}
              className={`pill ${isActive ? 'active' : ''}`}
              style={isActive ? { background: cat.accent } : undefined}
              aria-pressed={isActive}
              onClick={() => setFilterCat(isActive ? null : cat.key)}
            >
              {cat.icon} {cat.label}
            </button>
          );
        })}
      </div>

      <div className="page-layout">
        <div
          className={`page-main ${isDropActive ? 'drop-target-active' : ''}`}
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
            onReschedule={handleReschedule}
            onUnschedule={handleUnschedule}
            onScheduledDragChange={setIsScheduledDragging}
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
          isScheduledDragging={isScheduledDragging}
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
        />
      )}
      {showCategoryForm && (
        <CategoryForm onSave={handleCreateCategory} onClose={() => setShowCategoryForm(false)} />
      )}
      {showBlockForm && (
        <BlockForm onSave={handleCreateBlock} onClose={() => setShowBlockForm(false)} />
      )}
    </div>
  );
}
