import { toMinutes } from './timeUtils.js';

export function layoutOverall(items) {
  const withMin = items
    .map((i) => ({ ...i, startMin: toMinutes(i.casZacatku), endMin: toMinutes(i.casKonce) }))
    .sort((a, b) => a.startMin - b.startMin);

  const columnEnds = [];
  const withCols = withMin.map((item) => {
    let col = columnEnds.findIndex((end) => end <= item.startMin);
    if (col === -1) { col = columnEnds.length; columnEnds.push(0); }
    columnEnds[col] = item.endMin;
    return { ...item, col };
  });

  return withCols.map((item) => {
    const concurrent = withCols.filter((o) => o.startMin < item.endMin && o.endMin > item.startMin);
    const maxCols = Math.max(...concurrent.map((o) => o.col + 1));
    return { ...item, maxCols };
  });
}

export function clusterOverall(laidItems) {
  const sorted = [...laidItems].sort((a, b) => a.startMin - b.startMin);
  const clusters = [];
  let current = null;
  for (const item of sorted) {
    if (!current || item.startMin >= current.maxEnd) {
      current = { items: [item], minStart: item.startMin, maxEnd: item.endMin };
      clusters.push(current);
    } else {
      current.items.push(item);
      current.maxEnd = Math.max(current.maxEnd, item.endMin);
    }
  }
  return clusters;
}
