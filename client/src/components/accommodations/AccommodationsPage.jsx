import { useEffect, useState } from 'react';
import { accommodationsApi, guestsApi } from '../../api.js';
import AccommodationList from './AccommodationList.jsx';
import AccommodationForm from './AccommodationForm.jsx';
import './AccommodationList.css';

function overlaps(guest, reservation) {
  return guest.ubytovaniOd <= reservation.terminDo && guest.ubytovaniDo >= reservation.terminOd;
}

function computePotrebujeme(reservation, guests) {
  return guests
    .filter((g) => g.pocetIzieb > 0 && g.ubytovaniOd && g.ubytovaniDo)
    .filter((g) => overlaps(g, reservation))
    .reduce((sum, g) => sum + g.pocetIzieb, 0);
}

export default function AccommodationsPage() {
  const [reservations, setReservations] = useState([]);
  const [guests, setGuests] = useState([]);
  const [editingReservation, setEditingReservation] = useState(null);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    accommodationsApi.list().then(setReservations);
    guestsApi.list().then(setGuests);
  }, []);

  async function handleSave(data) {
    if (editingReservation) {
      const updated = await accommodationsApi.update(editingReservation.id, data);
      setReservations((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
    } else {
      const created = await accommodationsApi.create(data);
      setReservations((prev) => [...prev, created]);
    }
    setShowForm(false);
    setEditingReservation(null);
  }

  async function handleDelete(id) {
    await accommodationsApi.remove(id);
    setReservations((prev) => prev.filter((r) => r.id !== id));
  }

  function openEdit(reservation) {
    setEditingReservation(reservation);
    setShowForm(true);
  }

  function openAdd() {
    setEditingReservation(null);
    setShowForm(true);
  }

  const withCapacity = reservations.map((r) => ({
    ...r,
    potrebujeme: computePotrebujeme(r, guests)
  }));

  return (
    <div>
      <div className="page-header">
        <h2>Ubytování</h2>
        <button className="btn" onClick={openAdd}>+ Přidat rezervaci</button>
      </div>
      <AccommodationList reservations={withCapacity} onEdit={openEdit} onDelete={handleDelete} />
      {showForm && (
        <AccommodationForm
          reservation={editingReservation}
          onSave={handleSave}
          onClose={() => { setShowForm(false); setEditingReservation(null); }}
        />
      )}
    </div>
  );
}
