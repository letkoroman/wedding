import { useEffect, useState } from 'react';
import { accommodationsApi, guestsApi } from '../../api.js';
import AccommodationList from './AccommodationList.jsx';
import AccommodationForm from './AccommodationForm.jsx';
import './AccommodationList.css';

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

  const guestsNeedingRoom = guests.filter((g) => g.potrebujeUbytovanie && g.pocetIzieb > 0);
  const guestsUnassigned = guestsNeedingRoom.filter((g) => !g.rezervaciaId);
  const totalRoomsNeeded = guestsNeedingRoom.reduce((s, g) => s + g.pocetIzieb, 0);
  const totalRoomsReserved = reservations.reduce((s, r) => s + r.pocetIzieb, 0);
  const totalShortfall = totalRoomsNeeded - totalRoomsReserved;

  const reservationsWithGuests = reservations.map((r) => ({
    ...r,
    assignedGuests: guestsNeedingRoom.filter((g) => g.rezervaciaId === r.id)
  }));

  return (
    <div>
      <div className="page-header">
        <h2>Ubytování</h2>
        <button className="btn" onClick={openAdd}>+ Přidat rezervaci</button>
      </div>

      <div className="accommodation-stats card">
        <div className="stat-row">
          <span className="stat-label">Hostia s ubytovaním</span>
          <span className="stat-value">{guestsNeedingRoom.length} ({totalRoomsNeeded} {totalRoomsNeeded === 1 ? 'pokoj' : totalRoomsNeeded <= 4 ? 'pokoje' : 'pokojů'})</span>
        </div>
        <div className="stat-row">
          <span className="stat-label">Celkom rezervovaných</span>
          <span className="stat-value">{totalRoomsReserved} {totalRoomsReserved === 1 ? 'pokoj' : totalRoomsReserved <= 4 ? 'pokoje' : 'pokojů'}</span>
        </div>
        <div className={`stat-row stat-total ${totalShortfall > 0 ? 'stat-warning' : 'stat-ok'}`}>
          <span className="stat-label">{totalShortfall > 0 ? '⚠ Chýba' : '✓ Prebytok / OK'}</span>
          <span className="stat-value">
            {Math.abs(totalShortfall)} {Math.abs(totalShortfall) === 1 ? 'pokoj' : Math.abs(totalShortfall) <= 4 ? 'pokoje' : 'pokojů'}
          </span>
        </div>
        {guestsUnassigned.length > 0 && (
          <div className="stat-row stat-warning">
            <span className="stat-label">⚠ Nepriradení hostia</span>
            <span className="stat-value">{guestsUnassigned.map((g) => g.jmeno).join(', ')}</span>
          </div>
        )}
      </div>

      <AccommodationList
        reservations={reservationsWithGuests}
        onEdit={openEdit}
        onDelete={handleDelete}
      />

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
