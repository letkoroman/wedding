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
  maDite: false,
  pocetDeti: 0,
  vekDeti: '',
  potvrzeni: 'ceka',
  mustHave: false,
  poznamka: '',
  potrebujeUbytovanie: false,
  pocetIzieb: 1,
  ubytovaniOd: '',
  ubytovaniDo: '',
  typIzby: 'double',
  pocetOsob: 1,
  rezervaciaId: ''
};

export default function GuestForm({ guest, accommodations = [], onSave, onClose }) {
  const [form, setForm] = useState(
    guest
      ? {
          ...guest,
          ubytovaniOd: guest.ubytovaniOd || '',
          ubytovaniDo: guest.ubytovaniDo || '',
          typIzby: guest.typIzby || 'double',
          rezervaciaId: guest.rezervaciaId || '',
          vekDeti: guest.vekDeti || ''
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
      pocetDeti: checked ? prev.pocetDeti : 0,
      vekDeti: checked ? prev.vekDeti : ''
    }));
  }

  function updatePotrUbyt(checked) {
    setForm((prev) => ({
      ...prev,
      potrebujeUbytovanie: checked,
      pocetIzieb: checked ? prev.pocetIzieb : 1,
      ubytovaniOd: checked ? prev.ubytovaniOd : '',
      ubytovaniDo: checked ? prev.ubytovaniDo : '',
      typIzby: checked ? prev.typIzby : 'double',
      pocetOsob: checked ? prev.pocetOsob : 1,
      rezervaciaId: checked ? prev.rezervaciaId : ''
    }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    onSave({
      ...form,
      ubytovaniOd: form.ubytovaniOd || null,
      ubytovaniDo: form.ubytovaniDo || null,
      vekDeti: form.vekDeti || null,
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
            <label htmlFor="typ">Typ</label>
            <select id="typ" value={form.typ} onChange={(e) => update('typ', e.target.value)}>
              <option value="jednotlivec">Jednotlivec</option>
              <option value="par">Pár</option>
              <option value="rodina">Rodina</option>
            </select>
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
                  onChange={(e) => update('pocetDeti', Number(e.target.value))}
                >
                  <option value={1}>1</option>
                  <option value={2}>2</option>
                  <option value={3}>3</option>
                  <option value={4}>4</option>
                </select>
              </div>
              <div className="form-row">
                <label htmlFor="vekDeti">Věk dítěte / dětí</label>
                <input
                  id="vekDeti"
                  type="text"
                  placeholder="napr. 3, 7"
                  value={form.vekDeti}
                  onChange={(e) => update('vekDeti', e.target.value)}
                />
              </div>
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
              Must-have na obrad a obed
            </label>
          </div>
          <div className="form-row form-row-checkbox">
            <label>
              <input
                type="checkbox"
                checked={form.potrebujeUbytovanie}
                onChange={(e) => updatePotrUbyt(e.target.checked)}
              />
              Potrebuje ubytovanie?
            </label>
          </div>
          {form.potrebujeUbytovanie && (
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
                <label htmlFor="typIzby">Typ izby</label>
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
                <label htmlFor="rezervaciaId">Rezervácia ubytowania</label>
                <select
                  id="rezervaciaId"
                  value={form.rezervaciaId}
                  onChange={(e) => update('rezervaciaId', e.target.value)}
                >
                  <option value="">— nepriradené —</option>
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
