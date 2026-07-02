import { toMinutes, minutesToLabel } from './timeUtils.js';

// items must be non-empty; each item needs nazev/casZacatku/casKonce (already-enriched agenda items).
export function computeBlockRange(block, items) {
  const manualStart = block.casZacatku ? toMinutes(block.casZacatku) : null;
  const manualEnd = block.casKonce ? toMinutes(block.casKonce) : null;

  let earliest = items[0];
  let latest = items[0];
  for (const item of items) {
    if (toMinutes(item.casZacatku) < toMinutes(earliest.casZacatku)) earliest = item;
    if (toMinutes(item.casKonce) > toMinutes(latest.casKonce)) latest = item;
  }
  const earliestStart = toMinutes(earliest.casZacatku);
  const latestEnd = toMinutes(latest.casKonce);

  const effectiveStart = manualStart === null ? earliestStart : Math.min(manualStart, earliestStart);
  const effectiveEnd = manualEnd === null ? latestEnd : Math.max(manualEnd, latestEnd);

  const expandedStart = manualStart !== null && earliestStart < manualStart;
  const expandedEnd = manualEnd !== null && latestEnd > manualEnd;

  const expandedByNames = [];
  if (expandedStart) expandedByNames.push(earliest.nazev);
  if (expandedEnd && latest.nazev !== earliest.nazev) expandedByNames.push(latest.nazev);
  else if (expandedEnd) expandedByNames.push(latest.nazev);

  return {
    startMin: effectiveStart,
    endMin: effectiveEnd,
    startLabel: minutesToLabel(effectiveStart),
    endLabel: minutesToLabel(effectiveEnd),
    isExpanded: expandedStart || expandedEnd,
    expandedByNames
  };
}
