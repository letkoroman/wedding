import { useEffect, useState } from 'react';
import { TIME_OPTIONS, toMinutes, minutesToLabel, fmtDuration } from './timeUtils.js';
import { deriveColors } from './colors.js';

function buildEmptyForm(categories, presetIdea) {
  return {
    nazev: presetIdea?.nazev || '',
    kategorie: presetIdea?.kategorie || categories[0]?.key || '',
    misto: presetIdea?.misto || '',
    popis: presetIdea?.poznamka || '',
    casZacatku: '10:00',
    casKonce: '11:00'
  };
}

export default function AgendaForm({ item, presetIdea, categories, onSave, onClose }) {
  const isEdit = Boolean(item);
  const hasTimeAlready = Boolean(item?.casZacatku && item?.casKonce);

  const [mode, setMode] = useState(presetIdea || hasTimeAlready || !isEdit ? 'schedule' : 'idea');
  const [form, setForm] = useState(() =>
    item
      ? {
          nazev: item.nazev,
          kategorie: item.kategorie,
          misto: item.misto || '',
          popis: item.poznamka || '',
          casZacatku: item.casZacatku || '10:00',
          casKonce: item.casKonce || '11:00'
        }
      : buildEmptyForm(categories, presetIdea)
  );
  const [durationMin, setDurationMin] = useState(60);

  useEffect(() => {
    if (form.casZacatku && form.casKonce) {
      let diff = toMinutes(form.casKonce) - toMinutes(form.casZacatku);
      if (diff < 0) diff += 1440;
      if (diff > 0) setDurationMin(diff);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function update(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function handleStartChange(value) {
    const newEnd = minutesToLabel(toMinutes(value) + durationMin);
    setForm((prev) => ({ ...prev, casZacatku: value, casKonce: newEnd }));
  }

  function handleEndChange(value) {
    let diff = toMinutes(value) - toMinutes(form.casZacatku);
    if (diff < 0) diff += 1440;
    if (diff > 0) setDurationMin(diff);
    update('casKonce', value);
  }

  function step(field, dir) {
    const current = form[field];
    const idx = TIME_OPTIONS.indexOf(current);
    const nextIdx = (idx + dir + TIME_OPTIONS.length) % TIME_OPTIONS.length;
    const next = TIME_OPTIONS[nextIdx];
    if (field === 'casZacatku') handleStartChange(next); else handleEndChange(next);
  }

  function handleSubmit(e) {
    e.preventDefault();
    onSave({
      nazev: form.nazev,
      kategorie: form.kategorie,
      misto: form.misto,
      poznamka: form.popis,
      casZacatku: mode === 'schedule' ? form.casZacatku : null,
      casKonce: mode === 'schedule' ? form.casKonce : null
    });
  }

  const selectedCat = categories.find((c) => c.key === form.kategorie) || categories[0];
  const catColors = selectedCat ? deriveColors(selectedCat.accent) : null;
  const duration = mode === 'schedule' ? fmtDuration(form.casZacatku, form.casKonce) : null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>{isEdit ? 'Upravit aktivitu' : 'Přidat aktivitu'}</h3>
        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <label htmlFor="nazev">Název</label>
            <input id="nazev" type="text" value={form.nazev} onChange={(e) => update('nazev', e.target.value)} required />
          </div>

          <div className="form-row">
            <label htmlFor="kategorie">Kategorie</label>
            <select id="kategorie" value={form.kategorie} onChange={(e) => update('kategorie', e.target.value)}>
              {categories.map((c) => (
                <option key={c.key} value={c.key}>{c.icon} {c.label}</option>
              ))}
            </select>
            {selectedCat && catColors && (
              <div
                className="cat-preview-chip"
                style={{ background: catColors.bg, color: catColors.text, borderColor: catColors.border }}
              >
                {selectedCat.icon} {selectedCat.label}
              </div>
            )}
          </div>

          <div className="form-row">
            <label>Termín</label>
            <div className="seg-control" style={{ margin: 0 }}>
              <button type="button" className={`seg-btn ${mode === 'schedule' ? 'active' : ''}`} onClick={() => setMode('schedule')}>
                Naplánovat s časem
              </button>
              <button type="button" className={`seg-btn ${mode === 'idea' ? 'active' : ''}`} onClick={() => setMode('idea')}>
                Nápad bez termínu
              </button>
            </div>
          </div>

          {mode === 'schedule' && (
            <>
              <div className="form-row">
                <label>Čas (24h formát)</label>
                <div className="time-field-pair">
                  <div className="time-field">
                    <span className="time-field-label">Začátek</span>
                    <div className="time-stepper">
                      <button type="button" className="stepper-btn" onClick={() => step('casZacatku', -1)}>−</button>
                      <select value={form.casZacatku} onChange={(e) => handleStartChange(e.target.value)}>
                        {TIME_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
                      </select>
                      <button type="button" className="stepper-btn" onClick={() => step('casZacatku', 1)}>+</button>
                    </div>
                  </div>
                  <div className="time-field">
                    <span className="time-field-label">Konec</span>
                    <div className="time-stepper">
                      <button type="button" className="stepper-btn" onClick={() => step('casKonce', -1)}>−</button>
                      <select value={form.casKonce} onChange={(e) => handleEndChange(e.target.value)}>
                        {TIME_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
                      </select>
                      <button type="button" className="stepper-btn" onClick={() => step('casKonce', 1)}>+</button>
                    </div>
                  </div>
                </div>
              </div>
              <div className="form-row">
                <label>Délka trvání</label>
                <div className="form-computed-value">{duration || 'Konec musí být po začátku'}</div>
              </div>
            </>
          )}

          <div className="form-row">
            <label htmlFor="misto">Místo konání (volitelné)</label>
            <input id="misto" type="text" value={form.misto} onChange={(e) => update('misto', e.target.value)} />
          </div>

          <div className="form-row">
            <label htmlFor="popis">Popis (volitelné)</label>
            <textarea id="popis" rows={2} value={form.popis} onChange={(e) => update('popis', e.target.value)} />
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
