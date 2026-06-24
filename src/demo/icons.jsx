// Shared inline icons for the dashboard shells (no icon dependency).
const base = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
};

export const Icons = {
  user: <svg {...base}><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 4-6 8-6s8 2 8 6" /></svg>,
  calendar: <svg {...base}><rect x="3" y="4" width="18" height="17" rx="2" /><path d="M3 9h18M8 2v4M16 2v4" /></svg>,
  dollar: <svg {...base}><path d="M12 2v20M17 6H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>,
  pin: <svg {...base}><path d="M12 21s7-6.3 7-11a7 7 0 1 0-14 0c0 4.7 7 11 7 11Z" /><circle cx="12" cy="10" r="2.5" /></svg>,
  check: <svg {...base}><rect x="3" y="3" width="18" height="18" rx="4" /><path d="m8 12 3 3 5-6" /></svg>,
  plus: <svg {...base}><path d="M12 5v14M5 12h14" /></svg>,
  clock: <svg {...base}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>,
  bookmark: <svg {...base}><path d="M6 3h12a1 1 0 0 1 1 1v17l-7-4-7 4V4a1 1 0 0 1 1-1Z" /></svg>,
  briefcase: <svg {...base}><rect x="3" y="7" width="18" height="13" rx="2" /><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>,
  wallet: <svg {...base}><rect x="3" y="6" width="18" height="13" rx="2" /><path d="M16 12h4M3 9h14a2 2 0 0 1 2 2" /></svg>,
  search: <svg {...base}><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></svg>,
  mail: <svg {...base}><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></svg>,
  bell: <svg {...base}><path d="M6 8a6 6 0 0 1 12 0c0 7 3 8 3 8H3s3-1 3-8M10.5 21a2 2 0 0 0 3 0" /></svg>,
  logout: <svg {...base}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" /></svg>,
  spark: <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2c.5 4.5 3 7 7 7-4 .5-7 3-7 7-.5-4-3-6.5-7-7 4.5-.5 6.5-3 7-7Z" /></svg>,
};
