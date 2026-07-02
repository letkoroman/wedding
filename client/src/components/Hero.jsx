import { useMemo, useState } from 'react';
import './Hero.css';

function getDaysUntilWedding() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const wedding = new Date(2026, 7, 22); // 22. 8. 2026 (month is 0-indexed)
  wedding.setHours(0, 0, 0, 0);
  const diffMs = wedding - today;
  return Math.max(0, Math.round(diffMs / (1000 * 60 * 60 * 24)));
}

const SLIDES = [
  { src: '/images/photo1.jpg', alt: 'Míša a Roman', position: 'center 20%' },
  { src: '/images/photo2.jpg', alt: 'Míša a Roman na kole u moře při západu slunce', position: 'center center' },
  { src: '/images/photo3.jpg', alt: 'Míša a Roman před sochou Krista Vykupitele v Riu de Janeiru', position: 'center center' }
];

export default function Hero() {
  const days = useMemo(() => getDaysUntilWedding(), []);
  const [slideIndex, setSlideIndex] = useState(0);

  function goTo(index) {
    setSlideIndex((index + SLIDES.length) % SLIDES.length);
  }

  return (
    <header className="hero">
      <div className="hero-photos">
        {SLIDES.map((slide, i) => (
          <img
            key={slide.src}
            src={slide.src}
            alt={slide.alt}
            className={`hero-photo${i === slideIndex ? ' is-active' : ''}`}
            style={{ objectPosition: slide.position }}
          />
        ))}
        <div className="hero-photo-overlay" />
      </div>

      <div className="hero-content">
        <h1 className="hero-title">Míša <span>&amp;</span> Roman</h1>
        <p className="hero-date">22. 8. 2026</p>
        <div className="hero-countdown">
          <span className="hero-countdown-number">{days}</span>
          <span className="hero-countdown-label">dní do svatby</span>
        </div>
      </div>

      {SLIDES.length > 1 && (
        <div className="hero-nav">
          <button type="button" className="hero-nav-arrow" aria-label="Předchozí fotka" onClick={() => goTo(slideIndex - 1)}>‹</button>
          <div className="hero-dots" role="tablist" aria-label="Výběr fotky">
            {SLIDES.map((slide, i) => (
              <button
                key={slide.src}
                type="button"
                role="tab"
                aria-selected={i === slideIndex}
                aria-label={`Fotka ${i + 1}`}
                className={`hero-dot${i === slideIndex ? ' is-active' : ''}`}
                onClick={() => goTo(i)}
              />
            ))}
          </div>
          <button type="button" className="hero-nav-arrow" aria-label="Další fotka" onClick={() => goTo(slideIndex + 1)}>›</button>
        </div>
      )}
    </header>
  );
}
