import { useState } from 'react';

const EMPTY_TASK = {
  nazev: '',
  prirazeno: '',
  termin: '',
  stav: 'nesplneno',
  priorita: 'stredni',
  poznamka: ''
};

export default function TaskForm({ task, onSave, onClose }) {
  const [form, setForm] = useState(task ? { ...task, termin: task.termin || '' } : { ...EMPTY_TASK });

  function update(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    onSave({ ...form, termin: form.termin || null });
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>{task ? 'Upravit úkol' : 'Přidat úkol'}</h3>
        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <label htmlFor="nazev">Název úkolu</label>
            <input
              id="nazev"
              type="text"
              value={form.nazev}
              onChange={(e) => update('nazev', e.target.value)}
              required
            />
          </div>
          <div className="form-row">
            <label htmlFor="prirazeno">Přiřazeno</label>
            <input
              id="prirazeno"
              type="text"
              value={form.prirazeno}
              onChange={(e) => update('prirazeno', e.target.value)}
            />
          </div>
          <div className="form-row">
            <label htmlFor="termin">Termín</label>
            <input
              id="termin"
              type="date"
              value={form.termin}
              onChange={(e) => update('termin', e.target.value)}
            />
          </div>
          <div className="form-row">
            <label htmlFor="stav">Stav</label>
            <select id="stav" value={form.stav} onChange={(e) => update('stav', e.target.value)}>
              <option value="nesplneno">Nesplněno</option>
              <option value="probiha">Probíhá</option>
              <option value="splneno">Splněno</option>
            </select>
          </div>
          <div className="form-row">
            <label htmlFor="priorita">Priorita</label>
            <select id="priorita" value={form.priorita} onChange={(e) => update('priorita', e.target.value)}>
              <option value="nizka">Nízká</option>
              <option value="stredni">Střední</option>
              <option value="vysoka">Vysoká</option>
            </select>
          </div>
          <div className="form-row">
            <label htmlFor="poznamka">Poznámka</label>
            <textarea
              id="poznamka"
              rows={2}
              value={form.poznamka}
              onChange={(e) => update('poznamka', e.target.value)}
            />
          </div>
          <div className="form-actions">
            <button type="button" className="btn btn-outline" onClick={onClose}>Zrušit</button>
            <button type="submit" className="btn">Uložit</button>
          </div>
        </form>
      </div>
    </div>
  );
}
