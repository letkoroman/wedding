import { useState } from 'react';

const EMPTY_GUEST = {
  jmeno: '',
  typ: 'jednotlivec',
  pocetDeti: 0,
  potvrzeni: 'ceka',
  mustHave: false,
  poznamka: '',
  pocetIzieb: 0,
  ubytovaniOd: '',
  ubytovaniDo: ''
};

export default function GuestForm({ guest, onSave, onClose }) {
  const [form, setForm] = useState(
    guest
      ? { ...guest, ubytovaniOd: guest.ubytovaniOd || '', ubytovaniDo: guest.ubytovaniDo || '' }
      : { ...EMPTY_GUEST }
  );

  function update(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function updatePocetIzieb(value) {
    setForm((prev) => ({
      ...prev,
      pocetIzieb: value,
      ubytovaniOd: value > 0 ? prev.ubytovaniOd : '',
      ubytovaniDo: value > 0 ? prev.ubytovaniDo : ''
    }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    onSave({
      ...form,
      ubytovaniOd: form.ubytovaniOd || null,
      ubytovaniDo: form.ubytovaniDo || null
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
          {form.typ === 'rodina' && (
            <div className="form-row">
              <label htmlFor="pocetDeti">Počet dětí</label>
              <select
                id="pocetDeti"
                value={form.pocetDeti}
                onChange={(e) => update('pocetDeti', Number(e.target.value))}
              >
                <option value={0}>0</option>
                <option value={1}>1</option>
                <option value={2}>2</option>
                <option value={3}>3</option>
              </select>
            </div>
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
              Must-have host
            </label>
          </div>
          <div className="form-row">
            <label htmlFor="pocetIzieb">Počet pokojů</label>
            <input
              id="pocetIzieb"
              type="number"
              min="0"
              step="1"
              value={form.pocetIzieb}
              onChange={(e) => updatePocetIzieb(Number(e.target.value))}
            />
          </div>
          {form.pocetIzieb > 0 && (
            <>
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
