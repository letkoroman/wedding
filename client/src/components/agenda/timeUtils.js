export function toMinutes(t) {
  if (!t) return 0;
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

export function minutesToLabel(m) {
  m = ((m % 1440) + 1440) % 1440;
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;
}

export function fmtDuration(start, end) {
  if (!start || !end) return null;
  let diff = toMinutes(end) - toMinutes(start);
  if (diff < 0) diff += 1440;
  if (diff <= 0) return null;
  const h = Math.floor(diff / 60);
  const m = diff % 60;
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h} h`;
  return `${h} h ${m} min`;
}

export const TIME_OPTIONS = (() => {
  const opts = [];
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 15) {
      opts.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
    }
  }
  return opts;
})();
