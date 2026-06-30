import { useEffect, useState } from 'react';
import { agendaApi, categoriesApi } from '../../api.js';
import ProgramToggle from './ProgramToggle.jsx';
import CategoryLegend from './CategoryLegend.jsx';
import OverallTimeline from './OverallTimeline.jsx';
import CategoryLinearView from './CategoryLinearView.jsx';
import IdeaBench from './IdeaBench.jsx';
import AgendaForm from './AgendaForm.jsx';
import CategoryForm from './CategoryForm.jsx';
import './AgendaTimeline.css';

export default function AgendaPage() {
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [view, setView] = useState('overall');
  const [editingItem, setEditingItem] = useState(null);
  const [presetIdea, setPresetIdea] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [isDropActive, setIsDropActive] = useState(false);
  const [isScheduledDragging, setIsScheduledDragging] = useState(false);

  useEffect(() => {
    agendaApi.list().then(setItems);
    categoriesApi.list().then(setCategories);
  }, []);

  const scheduled = items.filter((i) => i.casZacatku && i.casKonce);
  const ideas = items.filter((i) => !i.casZacatku || !i.casKonce);

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
    if (!window.confirm(`Opravdu chcete smazat aktivitu „${item.nazev}“?`)) return;
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
        </div>
      </div>

      <ProgramToggle view={view} onChange={setView} />
      <CategoryLegend categories={categories} onDelete={handleDeleteCategory} />

      <div className="page-layout">
        <div
          className={`page-main ${isDropActive ? 'drop-target-active' : ''}`}
          onDragOver={(e) => { e.preventDefault(); setIsDropActive(true); }}
          onDragLeave={() => setIsDropActive(false)}
          onDrop={handleDropOnProgram}
        >
          {view === 'overall' ? (
            <OverallTimeline
                items={scheduled}
                categories={categories}
                onDelete={handleDelete}
                onEdit={openEdit}
                onReschedule={handleReschedule}
                onUnschedule={handleUnschedule}
                onScheduledDragChange={setIsScheduledDragging}
              />
          ) : (
            <CategoryLinearView items={scheduled} categories={categories} onDelete={handleDelete} onEdit={openEdit} />
          )}
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
          onSave={handleSave}
          onClose={closeForm}
        />
      )}
      {showCategoryForm && (
        <CategoryForm onSave={handleCreateCategory} onClose={() => setShowCategoryForm(false)} />
      )}
    </div>
  );
}
