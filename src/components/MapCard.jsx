// A simple, keyless map (OpenStreetMap embed) centred on Kigali with a marker.
// Used to show task / service-area location. No API key or dependency needed.
const KIGALI_BBOX = '30.0200,-1.9950,30.1300,-1.9050';
const KIGALI_MARKER = '-1.9536,30.0606';

export function MapCard({ location, title = 'Location', height = 220 }) {
  const src =
    `https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(KIGALI_BBOX)}` +
    `&layer=mapnik&marker=${encodeURIComponent(KIGALI_MARKER)}`;
  return (
    <div className="card">
      <div className="card-head" style={{ marginBottom: '0.6rem' }}>
        <div className="card-title">{title}</div>
        <span className="meta">📍 {location && location.trim() ? location : 'Kigali, Rwanda'}</span>
      </div>
      <div className="map-wrap" style={{ height }}>
        <iframe title={title} src={src} loading="lazy" referrerPolicy="no-referrer" />
      </div>
    </div>
  );
}
