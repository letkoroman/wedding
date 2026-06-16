import { useState } from 'react';

const TYP_IZBY_OPTIONS = [
  { value: 'double', label: 'Dvoulůžkový (double bed)' },
  { value: 'double_pristylka', label: 'Dvoulůžkový (double bed) + přistýlka' },
  { value: 'twin', label: 'Dvoulůžkový (twin beds)' },
  { value: 'twin_pristylka', label: 'Dvoulůžkový (twin beds) + přistýlka' }
];

const EMPTY_GUEST = {
  jmeno: '',
  typ: 'jednotlivec',
  pocetDospelych: 1,
  maDite: false,
  pocetDeti: 1,
  vekDeti: [''],
  potvrzeni: 'ceka',
  mustHave: false,
  poznamka: '',
  potrebujeUbytovani: false,
  pocetIzieb: 1,
  ubytovaniOd: '2026-08-20',
  ubytovaniDo: '2026-08-23',
  typIzby: 'double',
  pocetOsob: 1,
  rezervaciaId: ''
};

function parseVekDeti(vekDeti, pocetDeti) {
  if (!vekDeti) return Array(pocetDeti).fill('');
  const parts = vekDeti.split(',').map((s) => s.trim());
  return Array.from({ length: pocetDeti }, (_, i) => parts[i] || '');
}

export default function GuestForm({ guest, accommodations = [], onSave, onClose }) {
  const initPocetDeti = guest?.maDite ? (guest.pocetDeti || 1) : 1;
  const [form, setForm] = useState(
    guest
      ? {
          ...guest,
          pocetDospelych: guest.pocetDospelych || 1,
          pocetDeti: initPocetDeti,
          vekDeti: parseVekDeti(guest.vekDeti, initPocetDeti),
          ubytovaniOd: guest.ubytovaniOd || '2026-08-20',
          ubytovaniDo: guest.ubytovaniDo || '2026-08-23',
          typIzby: guest.typIzby || 'double',
          rezervaciaId: guest.rezervaciaId || '',
          potrebujeUbytovani: guest.potrebujeUbytovanie || false
        }
      : { ...EMPTY_GUEST }
  );

  function update(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function updateMaDite(checked) {
    setForm((prev) => ({
      ...prev,
      maDite: checked,
      pocetDeti: checked ? prev.pocetDeti : 1,
      vekDeti: checked ? prev.vekDeti : ['']
    }));
  }

  function updatePocetDeti(n) {
    setForm((prev) => ({
      ...prev,
      pocetDeti: n,
      vekDeti: Array.from({ length: n }, (_, i) => prev.vekDeti[i] || '')
    }));
  }

  function updateVekDite(index, value) {
    setForm((prev) => {
      const arr = [...prev.vekDeti];
      arr[index] = value;
      return { ...prev, vekDeti: arr };
    });
  }

  function updatePotrUbyt(checked) {
    setForm((prev) => ({
      ...prev,
      potrebujeUbytovani: checked,
      pocetIzieb: checked ? prev.pocetIzieb : 1,
      ubytovaniOd: checked ? prev.ubytovaniOd : '2026-08-20',
      ubytovaniDo: checked ? prev.ubytovaniDo : '2026-08-23',
      typIzby: checked ? prev.typIzby : 'double',
      pocetOsob: checked ? prev.pocetOsob : 1,
      rezervaciaId: checked ? prev.rezervaciaId : ''
    }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    onSave({
      ...form,
      potrebujeUbytovanie: form.potrebujeUbytovani,
      ubytovaniOd: form.potrebujeUbytovani ? (form.ubytovaniOd || null) : null,
      ubytovaniDo: form.potrebujeUbytovani ? (form.ubytovaniDo || null) : null,
      vekDeti: form.maDite ? (form.vekDeti.filter(Boolean).join(', ') || null) : null,
      rezervaciaId: form.rezervaciaId || null
    });
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>{guest ? 'Upravit hosta' : 'Přidat hosta'}</h3>
        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <label htmlFor="jmeno">Jméno</label>
            <input
              id="jmeno"
              type="text"
              value={form.jmeno}
              onChange={(e) => update('jmeno', e.target.value)}
              required
            />
          </div>
          <div className="form-row">
            <label htmlFor="pocetDospelych">Počet dospělých</label>
            <input
              id="pocetDospelych"
              type="number"
              min="1"
              step="1"
              value={form.pocetDospelych}
              onChange={(e) => update('pocetDospelych', Number(e.target.value))}
            />
          </div>
          <div className="form-row form-row-checkbox">
            <label>
              <input
                type="checkbox"
                checked={form.maDite}
                onChange={(e) => updateMaDite(e.target.checked)}
              />
              Má dítě?
            </label>
          </div>
          {form.maDite && (
            <>
              <div className="form-row">
                <label htmlFor="pocetDeti">Počet dětí</label>
                <select
                  id="pocetDeti"
                  value={form.pocetDeti}
                  onChange={(e) => updatePocetDeti(Number(e.target.value))}
                >
                  <option value={1}>1</option>
                  <option value={2}>2</option>
                  <option value={3}>3</option>
                  <option value={4}>4</option>
                </select>
              </div>
              {Array.from({ length: form.pocetDeti }, (_, i) => (
                <div className="form-row" key={i}>
                  <label htmlFor={`vek-${i}`}>Věk {i + 1}. dítěte (roky)</label>
                  <input
                    id={`vek-${i}`}
                    type="number"
                    min="0"
                    step="1"
                    placeholder="0"
                    value={form.vekDeti[i] || ''}
                    onChange={(e) => updateVekDite(i, e.target.value)}
                  />
                </div>
              ))}
            </>
          )}
          <div className="form-row">
            <label htmlFor="potvrzeni">Potvrzení účasti</label>
            <select id="potvrzeni" value={form.potvrzeni} onChange={(e) => update('potvrzeni', e.target.value)}>
              <option value="ceka">Čeká na odpověď</option>
              <option value="potvrzeno">Potvrzeno</option>
              <option value="nepride">Nepřijde</option>
            </select>
          </div>
          <div className="form-row form-row-checkbox">
            <label>
              <input
                type="checkbox"
                checked={form.mustHave}
                onChange={(e) => update('mustHave', e.target.checked)}
              />
              Must-have na obřad a oběd
            </label>
          </div>
          <div className="form-row form-row-checkbox">
            <label>
              <input
                type="checkbox"
                checked={form.potrebujeUbytovani}
                onChange={(e) => updatePotrUbyt(e.target.checked)}
              />
              Potřebuje ubytování?
            </label>
          </div>
          {form.potrebujeUbytovani && (
            <>
              <div className="form-row">
                <label htmlFor="pocetIzieb">Počet pokojů</label>
                <input
                  id="pocetIzieb"
                  type="number"
                  min="1"
                  step="1"
                  value={form.pocetIzieb}
                  onChange={(e) => update('pocetIzieb', Number(e.target.value))}
                />
              </div>
              <div className="form-row">
                <label htmlFor="typIzby">Typ pokoje</label>
                <select
                  id="typIzby"
                  value={form.typIzby}
                  onChange={(e) => update('typIzby', e.target.value)}
                >
                  {TYP_IZBY_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
              <div className="form-row">
                <label htmlFor="pocetOsob">Počet osob v pokoji</label>
                <input
                  id="pocetOsob"
                  type="number"
                  min="1"
                  step="1"
                  value={form.pocetOsob}
                  onChange={(e) => update('pocetOsob', Number(e.target.value))}
                />
              </div>
              <div className="form-row">
                <label htmlFor="ubytovaniOd">Ubytování od</label>
                <input
                  id="ubytovaniOd"
                  type="date"
                  value={form.ubytovaniOd}
                  onChange={(e) => update('ubytovaniOd', e.target.value)}
                  required
                />
              </div>
              <div className="form-row">
                <label htmlFor="ubytovaniDo">Ubytování do</label>
                <input
                  id="ubytovaniDo"
                  type="date"
                  value={form.ubytovaniDo}
                  onChange={(e) => update('ubytovaniDo', e.target.value)}
                  required
                />
              </div>
              <div className="form-row">
                <label htmlFor="rezervaciaId">Rezervace ubytování</label>
                <select
                  id="rezervaciaId"
                  value={form.rezervaciaId}
                  onChange={(e) => update('rezervaciaId', e.target.value)}
                >
                  <option value="">— nepřiřazeno —</option>
                  {accommodations.map((a) => (
                    <option key={a.id} value={a.id}>{a.nazev}</option>
                  ))}
                </select>
              </div>
            </>
          )}
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
