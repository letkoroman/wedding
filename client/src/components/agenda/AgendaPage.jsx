import { useEffect, useState } from 'react';
import { agendaApi } from '../../api.js';
import AgendaTimeline from './AgendaTimeline.jsx';
import AgendaForm from './AgendaForm.jsx';
import './AgendaTimeline.css';

export default function AgendaPage() {
  const [items, setItems] = useState([]);
  const [editingItem, setEditingItem] = useState(null);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    agendaApi.list().then(setItems);
  }, []);

  async function handleSave(data) {
    if (editingItem) {
      const updated = await agendaApi.update(editingItem.id, data);
      setItems((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
    } else {
      const created = await agendaApi.create(data);
      setItems((prev) => [...prev, created]);
    }
    setShowForm(false);
    setEditingItem(null);
  }

  async function handleDelete(id) {
    await agendaApi.remove(id);
    setItems((prev) => prev.filter((i) => i.id !== id));
  }

  function openEdit(item) {
    setEditingItem(item);
    setShowForm(true);
  }

  function openAdd() {
    setEditingItem(null);
    setShowForm(true);
  }

  return (
    <div>
      <div className="page-header">
        <h2>Program svatebního dne</h2>
        <button className="btn" onClick={openAdd}>+ Přidat položku</button>
      </div>
      <AgendaTimeline items={items} onEdit={openEdit} onDelete={handleDelete} />
      {showForm && (
        <AgendaForm
          item={editingItem}
          onSave={handleSave}
          onClose={() => { setShowForm(false); setEditingItem(null); }}
        />
      )}
    </div>
  );
}
