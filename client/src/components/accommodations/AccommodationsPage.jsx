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

function formatNights(from, to) {
  if (!from || !to) return '';
  const [fy, fm, fd] = from.split('-').map(Number);
  const [ty, , td] = to.split('-').map(Number);
  const nights = Math.round((new Date(to + 'T00:00:00') - new Date(from + 'T00:00:00')) / 86400000);
  const label = nights === 1 ? '1 noc' : nights >= 2 && nights <= 4 ? `${nights} noci` : `${nights} nocí`;
  return `${fd}.–${td}. ${fm}. ${fy} (${label})`;
}

function analyzeDays(guestsNeedingRoom, reservations) {
  const guestsWithDates = guestsNeedingRoom.filter((g) => g.ubytovaniOd && g.ubytovaniDo);
  if (guestsWithDates.length === 0 || reservations.length === 0) return [];

  const allDatesSet = new Set();
  guestsWithDates.forEach((g) => {
    let d = new Date(g.ubytovaniOd + 'T00:00:00');
    const end = new Date(g.ubytovaniDo + 'T00:00:00');
    while (d < end) { allDatesSet.add(d.toISOString().slice(0, 10)); d.setDate(d.getDate() + 1); }
  });

  return Array.from(allDatesSet).sort().map((date) => {
    const roomsNeeded = guestsWithDates.reduce((sum, g) =>
      g.ubytovaniOd <= date && g.ubytovaniDo > date ? sum + (g.pocetIzieb || 1) : sum, 0);
    const roomsAvailable = reservations.reduce((sum, r) =>
      r.terminOd <= date && r.terminDo > date ? sum + (r.pocetIzieb || 0) : sum, 0);
    return { date, roomsNeeded, roomsAvailable, shortage: Math.max(0, roomsNeeded - roomsAvailable) };
  });
}

function groupConflicts(days) {
  const conflicts = [];
  let i = 0;
  while (i < days.length) {
    if (days[i].shortage > 0) {
      const startIdx = i;
      while (i < days.length && days[i].shortage > 0) i++;
      const maxShortage = Math.max(...days.slice(startIdx, i).map((d) => d.shortage));
      const endDate = new Date(days[i - 1].date + 'T00:00:00');
      endDate.setDate(endDate.getDate() + 1);
      conflicts.push({ from: days[startIdx].date, to: endDate.toISOString().slice(0, 10), shortage: maxShortage });
    } else { i++; }
  }
  return conflicts;
}

function computeDateRangeGroups(guestsNeedingRoom, reservations) {
  const groups = {};
  guestsNeedingRoom.filter((g) => g.ubytovaniOd && g.ubytovaniDo).forEach((g) => {
    const key = `${g.ubytovaniOd}__${g.ubytovaniDo}`;
    if (!groups[key]) groups[key] = { from: g.ubytovaniOd, to: g.ubytovaniDo, guests: [], roomsNeeded: 0 };
    groups[key].guests.push(g);
    groups[key].roomsNeeded += g.pocetIzieb || 0;
  });

  return Object.values(groups).map((group) => {
    const nights = [];
    let d = new Date(group.from + 'T00:00:00');
    const end = new Date(group.to + 'T00:00:00');
    while (d < end) { nights.push(d.toISOString().slice(0, 10)); d.setDate(d.getDate() + 1); }
    const minAvailable = nights.length > 0
      ? Math.min(...nights.map((night) =>
          reservations.reduce((sum, r) => r.terminOd <= night && r.terminDo > night ? sum + r.pocetIzieb : sum, 0)))
      : 0;
    return { ...group, roomsAvailable: minAvailable, shortage: Math.max(0, group.roomsNeeded - minAvailable) };
  }).sort((a, b) => a.from.localeCompare(b.from));
}

function MiniCalendar({ dayAnalysisMap }) {
  const YEAR = 2026;
  const MONTH = 7;
  const firstDayJS = new Date(YEAR, MONTH, 1).getDay();
  const startOffset = (firstDayJS + 6) % 7;
  const DAY_NAMES = ['Po', 'Út', 'St', 'Čt', 'Pá', 'So', 'Ne'];

  const cells = [];
  for (let i = 0; i < startOffset; i++) cells.push({ empty: true });
  for (let day = 1; day <= 31; day++) {
    const dateStr = `${YEAR}-08-${String(day).padStart(2, '0')}`;
    cells.push({ day, dateStr, analysis: dayAnalysisMap[dateStr] || null });
  }

  function cellClass(cell) {
    if (cell.empty) return 'mini-cal-cell mini-cal-empty';
    const a = cell.analysis;
    if (!a || a.roomsNeeded === 0) return 'mini-cal-cell mini-cal-neutral';
    if (a.shortage >= 2) return 'mini-cal-cell mini-cal-red';
    if (a.shortage === 1) return 'mini-cal-cell mini-cal-orange';
    return 'mini-cal-cell mini-cal-green';
  }

  return (
    <div className="mini-calendar card">
      <div className="mini-calendar-header">
        <span className="mini-calendar-title">Přehled nocí – Srpen 2026</span>
        <div className="mini-calendar-legend">
          <span className="mini-cal-dot mini-cal-green" /> OK
          <span className="mini-cal-dot mini-cal-orange" /> Chybí 1
          <span className="mini-cal-dot mini-cal-red" /> Chybí 2+
        </div>
      </div>
      <div className="mini-calendar-grid">
        {DAY_NAMES.map((n) => (
          <div key={n} className="mini-cal-dayname">{n}</div>
        ))}
        {cells.map((cell, i) => (
          <div
            key={i}
            className={cellClass(cell)}
            title={cell.analysis && cell.analysis.roomsNeeded > 0
              ? `${cell.day}. 8.: potřeba ${cell.analysis.roomsNeeded} pokojů, k dispozici ${cell.analysis.roomsAvailable}`
              : undefined}
          >
            {cell.empty ? '' : cell.day}
          </div>
        ))}
      </div>
    </div>
  );
}

function DateRangeCard({ group }) {
  const severityClass = group.shortage >= 2 ? 'severity-high' : group.shortage === 1 ? 'severity-low' : 'severity-ok';
  return (
    <div className={`date-range-card ${severityClass}`}>
      <div className="date-range-card-header">
        <span className="date-range-card-date">{formatNights(group.from, group.to)}</span>
        {group.shortage > 0 && (
          <span className="date-range-card-shortage">
            ⚠ Chybí {group.shortage} {roomsLabel(group.shortage)}
          </span>
        )}
        {group.shortage === 0 && (
          <span className="date-range-card-ok">✓ Pokryto</span>
        )}
      </div>
      <div className="date-range-card-guests">
        {group.guests.map((g) => g.jmeno).join(', ')}
      </div>
      <div className="date-range-card-rooms">
        Potřeba: {group.roomsNeeded} {roomsLabel(group.roomsNeeded)} · K dispozici: {group.roomsAvailable} {roomsLabel(group.roomsAvailable)}
      </div>
    </div>
  );
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

  const guestsNeedingRoom = guests.filter((g) => g.potrebujeUbytovanie && g.pocetIzieb > 0);
  const guestsUnassigned = guestsNeedingRoom.filter((g) => !g.rezervaciaId);
  const totalRoomsNeeded = guestsNeedingRoom.reduce((s, g) => s + g.pocetIzieb, 0);
  const totalRoomsReserved = reservations.reduce((s, r) => s + r.pocetIzieb, 0);
  const totalShortfall = totalRoomsNeeded - totalRoomsReserved;

  const dayAnalysis = analyzeDays(guestsNeedingRoom, reservations);
  const conflictPeriods = groupConflicts(dayAnalysis);
  const dayAnalysisMap = Object.fromEntries(dayAnalysis.map((d) => [d.date, d]));
  const dateRangeGroups = computeDateRangeGroups(guestsNeedingRoom, reservations);

  const totalConflictRooms = conflictPeriods.reduce((s, c) => s + c.shortage, 0);

  const reservationsWithGuests = reservations.map((r) => ({
    ...r,
    assignedGuests: guestsNeedingRoom.filter((g) => g.rezervaciaId === r.id)
  }));

  return (
    <div>
      <div className="page-header">
        <h2>Ubytování</h2>
        <button className="btn" onClick={() => { setEditingReservation(null); setShowForm(true); }}>+ Přidat rezervaci</button>
      </div>

      {/* Stats card */}
      <div className="accommodation-stats card">
        <div className="stat-row">
          <span className="stat-label">Hosté s ubytováním</span>
          <span className="stat-value">{guestsNeedingRoom.length} ({totalRoomsNeeded} {roomsLabel(totalRoomsNeeded)})</span>
        </div>
        <div className="stat-row">
          <span className="stat-label">Celkem rezervováno</span>
          <span className="stat-value">{totalRoomsReserved} {roomsLabel(totalRoomsReserved)}</span>
        </div>
        <div className={`stat-row stat-total ${totalShortfall > 0 ? 'stat-warning' : 'stat-ok'}`}>
          <span className="stat-label">{totalShortfall > 0 ? '⚠ Chybí' : '✓ Přebytek / OK'}</span>
          <span className="stat-value">{Math.abs(totalShortfall)} {roomsLabel(Math.abs(totalShortfall))}</span>
        </div>
        {guestsUnassigned.length > 0 && (
          <div className="stat-row stat-warning">
            <span className="stat-label">⚠ Nepřiřazení hosté</span>
            <span className="stat-value">{guestsUnassigned.map((g) => g.jmeno).join(', ')}</span>
          </div>
        )}
      </div>

      {/* Conflict banner + date range cards */}
      {conflictPeriods.length > 0 && (
        <>
          <div className="conflict-banner">
            ⚠ Celkem chybí {totalConflictRooms} {roomsLabel(totalConflictRooms)} v {conflictPeriods.length} {conflictPeriods.length === 1 ? 'termínu' : conflictPeriods.length <= 4 ? 'termínech' : 'termínech'}
          </div>
          <div className="date-range-cards">
            {dateRangeGroups.map((g, i) => (
              <DateRangeCard key={i} group={g} />
            ))}
          </div>
        </>
      )}

      {/* Mini August calendar */}
      {dayAnalysis.length > 0 && <MiniCalendar dayAnalysisMap={dayAnalysisMap} />}

      {/* Reservation list */}
      <AccommodationList
        reservations={reservationsWithGuests}
        onEdit={(r) => { setEditingReservation(r); setShowForm(true); }}
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
