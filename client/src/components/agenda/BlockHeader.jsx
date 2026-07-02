import { useState } from 'react';
import { computeBlockRange } from './blockRange.js';

export default function BlockHeader({ block, items }) {
  const range = computeBlockRange(block, items);
  const dismissKey = range.expandedByNames.join(',');
  const [dismissedKey, setDismissedKey] = useState(null);
  const showNotice = range.isExpanded && dismissedKey !== dismissKey;

  return (
    <>
      <div className="block-header">
        <span className="bh-name">{block.nazev}</span>
        <span className={`bh-time${range.isExpanded ? ' bh-time-adjusted' : ''}`}>
          {range.isExpanded && <span aria-hidden="true">⚠️ </span>}
          {range.startLabel} – {range.endLabel}
        </span>
      </div>
      {showNotice && (
        <div className="block-time-notice">
          <span>
            Čas bloku byl automaticky upraven — aktivita „{range.expandedByNames[0]}" přesahuje původní rozsah.
          </span>
          <button type="button" aria-label="Skrýt upozornění" onClick={() => setDismissedKey(dismissKey)}>✕</button>
        </div>
      )}
    </>
  );
}
