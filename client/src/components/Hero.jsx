import { useMemo } from 'react';
import './Hero.css';

function getDaysUntilWedding() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const wedding = new Date(2026, 7, 22); // 22. 8. 2026 (month is 0-indexed)
  wedding.setHours(0, 0, 0, 0);
  const diffMs = wedding - today;
  return Math.max(0, Math.round(diffMs / (1000 * 60 * 60 * 24)));
}

export default function Hero() {
  const days = useMemo(() => getDaysUntilWedding(), []);

  return (
    <header className="hero">
      <div className="hero-content">
        <h1 className="hero-title">Míša <span>&amp;</span> Roman</h1>
        <p className="hero-date">22. 8. 2026</p>
        <div className="hero-countdown">
          <span className="hero-countdown-number">{days}</span>
          <span className="hero-countdown-label">dní do svatby</span>
        </div>
      </div>
    </header>
  );
}
