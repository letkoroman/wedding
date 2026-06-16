import { useEffect, useState } from 'react';
import { guestsApi, accommodationsApi } from '../../api.js';
import GuestSummaryCard from './GuestSummaryCard.jsx';
import GuestFilter from './GuestFilter.jsx';
import GuestList from './GuestList.jsx';
import GuestForm from './GuestForm.jsx';
import './GuestList.css';

export default function GuestsPage() {
  const [guests, setGuests] = useState([]);
  const [accommodations, setAccommodations] = useState([]);
  const [filter, setFilter] = useState('vsichni');
  const [editingGuest, setEditingGuest] = useState(null);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    guestsApi.list().then(setGuests);
    accommodationsApi.list().then(setAccommodations);
  }, []);

  const filtered = guests.filter((g) => {
    if (filter === 'potvrzeni') return g.potvrzeni === 'potvrzeno';
    if (filter === 'must-have') return g.mustHave;
    if (filter === 'cekajici') return g.potvrzeni === 'ceka';
    return true;
  });

  async function handleSave(data) {
    if (editingGuest) {
      const updated = await guestsApi.update(editingGuest.id, data);
      setGuests((prev) => prev.map((g) => (g.id === updated.id ? updated : g)));
    } else {
      const created = await guestsApi.create(data);
      setGuests((prev) => [...prev, created]);
    }
    setShowForm(false);
    setEditingGuest(null);
  }

  async function handleDelete(id) {
    await guestsApi.remove(id);
    setGuests((prev) => prev.filter((g) => g.id !== id));
  }

  function openEdit(guest) {
    setEditingGuest(guest);
    setShowForm(true);
  }

  function openAdd() {
    setEditingGuest(null);
    setShowForm(true);
  }

  return (
    <div>
      <GuestSummaryCard guests={guests} />
      <div className="page-header">
        <GuestFilter active={filter} onChange={setFilter} />
        <button className="btn" onClick={openAdd}>+ Přidat hosta</button>
      </div>
      <GuestList guests={filtered} onEdit={openEdit} onDelete={handleDelete} />
      {showForm && (
        <GuestForm
          guest={editingGuest}
          accommodations={accommodations}
          onSave={handleSave}
          onClose={() => { setShowForm(false); setEditingGuest(null); }}
        />
      )}
    </div>
  );
}
