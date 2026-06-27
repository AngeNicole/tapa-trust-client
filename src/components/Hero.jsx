// Purple gradient hero banner with a black pill CTA and faint sparkle accents.
export function Hero({ kicker, title, ctaLabel, onCta }) {
  return (
    <div className="hero">
      <span className="hero-spark" style={{ top: '-30px', right: '40px', fontSize: '170px', lineHeight: 1 }}>✦</span>
      <span className="hero-spark" style={{ bottom: '-40px', right: '190px', fontSize: '90px', lineHeight: 1 }}>✦</span>
      <div style={{ position: 'relative' }}>
        {kicker && <div className="hero-kicker">{kicker}</div>}
        <div className="hero-title">{title}</div>
        {ctaLabel && (
          <button type="button" className="hero-cta" onClick={onCta}>
            {ctaLabel} <span aria-hidden="true">→</span>
          </button>
        )}
      </div>
    </div>
  );
}
