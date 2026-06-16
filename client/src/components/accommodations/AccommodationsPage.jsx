import { useEffect, useState } from 'react';
import { accommodationsApi, guestsApi } from '../../api.js';
import AccommodationList from './AccommodationList.jsx';
import AccommodationForm from './AccommodationForm.jsx';
import './AccommodationList.css';

function roomsLabel(count) {
  if (count === 1) return 'pokoj';
  if (count >= 2 && count <= 4) return 'pokoje';
  return 'pokojů';
}

function formatDate(isoDate) {
  if (!isoDate) return '';
  const [year, month, day] = isoDate.split('-');
  return `${Number(day)}.${Number(month)}.${year}`;
}

function analyzeConflicts(guestsNeedingRoom, reservations) {
  const guestsWithDates = guestsNeedingRoom.filter((g) => g.ubytovaniOd && g.ubytovaniDo);
  if (guestsWithDates.length === 0 || reservations.length === 0) return [];

  const allDatesSet = new Set();
  guestsWithDates.forEach((g) => {
    let d = new Date(g.ubytovaniOd + 'T00:00:00');
    const end = new Date(g.ubytovaniDo + 'T00:00:00');
    while (d < end) {
      allDatesSet.add(d.toISOString().slice(0, 10));
      d.setDate(d.getDate() + 1);
    }
  });

  const sortedDates = Array.from(allDatesSet).sort();

  const days = sortedDates.map((date) => {
    const roomsNeeded = guestsWithDates.reduce((sum, g) => {
      if (g.ubytovaniOd <= date && g.ubytovaniDo > date) return sum + (g.pocetIzieb || 1);
      return sum;
    }, 0);
    const roomsAvailable = reservations.reduce((sum, r) => {
      if (r.terminOd <= date && r.terminDo > date) return sum + (r.pocetIzieb || 0);
      return sum;
    }, 0);
    return { date, roomsNeeded, roomsAvailable, shortage: Math.max(0, roomsNeeded - roomsAvailable) };
  });

  const conflicts = [];
  let i = 0;
  while (i < days.length) {
    if (days[i].shortage > 0) {
      const startIdx = i;
      while (i < days.length && days[i].shortage > 0) i++;
      const maxShortage = Math.max(...days.slice(startIdx, i).map((d) => d.shortage));
      const endDate = new Date(days[i - 1].date + 'T00:00:00');
      endDate.setDate(endDate.getDate() + 1);
      conflicts.push({
        from: days[startIdx].date,
        to: endDate.toISOString().slice(0, 10),
        shortage: maxShortage
      });
    } else {
      i++;
    }
  }
  return conflicts;
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

  const guestsNeedingRoom = guests.filter((g) => g.potrebujeUbytovanie && g.pocetIzieb > 0);
  const guestsUnassigned = guestsNeedingRoom.filter((g) => !g.rezervaciaId);
  const totalRoomsNeeded = guestsNeedingRoom.reduce((s, g) => s + g.pocetIzieb, 0);
  const totalRoomsReserved = reservations.reduce((s, r) => s + r.pocetIzieb, 0);
  const totalShortfall = totalRoomsNeeded - totalRoomsReserved;

  const conflicts = analyzeConflicts(guestsNeedingRoom, reservations);

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
          <span className="stat-label">Hosté s ubytováním</span>
          <span className="stat-value">
            {guestsNeedingRoom.length} ({totalRoomsNeeded} {roomsLabel(totalRoomsNeeded)})
          </span>
        </div>
        <div className="stat-row">
          <span className="stat-label">Celkem rezervováno</span>
          <span className="stat-value">{totalRoomsReserved} {roomsLabel(totalRoomsReserved)}</span>
        </div>
        <div className={`stat-row stat-total ${totalShortfall > 0 ? 'stat-warning' : 'stat-ok'}`}>
          <span className="stat-label">{totalShortfall > 0 ? '⚠ Chybí' : '✓ Přebytek / OK'}</span>
          <span className="stat-value">
            {Math.abs(totalShortfall)} {roomsLabel(Math.abs(totalShortfall))}
          </span>
        </div>
        {guestsUnassigned.length > 0 && (
          <div className="stat-row stat-warning">
            <span className="stat-label">⚠ Nepřiřazení hosté</span>
            <span className="stat-value">{guestsUnassigned.map((g) => g.jmeno).join(', ')}</span>
          </div>
        )}
        {conflicts.map((c, idx) => (
          <div key={idx} className="stat-row stat-warning">
            <span className="stat-label">⚠ Chybí {c.shortage} {roomsLabel(c.shortage)}</span>
            <span className="stat-value">
              {formatDate(c.from)} – {formatDate(c.to)}
            </span>
          </div>
        ))}
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
