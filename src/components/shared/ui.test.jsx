import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import {
  rwf, duration, monthLabel, StatusBadge, TierBadge, VerifyBadge, Stars,
} from './ui.jsx';

describe('formatting helpers', () => {
  it('rwf formats Rwandan francs with thousands separators', () => {
    expect(rwf(25000)).toBe('RWF 25,000');
    expect(rwf(0)).toBe('RWF 0');
    expect(rwf(null)).toBe('RWF 0'); // defensive: null → 0
  });

  it('duration renders elapsed time between check-in and check-out', () => {
    const start = '2026-01-01T10:00:00Z';
    expect(duration(start, '2026-01-01T11:30:00Z')).toBe('1h 30m');
    expect(duration(start, '2026-01-01T10:45:00Z')).toBe('45m');
    expect(duration(start, null)).toBeNull();          // missing timestamp
    expect(duration('2026-01-01T11:00:00Z', start)).toBeNull(); // end before start
  });

  it('monthLabel maps an ISO date to a short month', () => {
    expect(monthLabel('2026-07-14')).toBe('Jul');
    expect(monthLabel('2026-01-01')).toBe('Jan');
  });
});

describe('badge components', () => {
  it('StatusBadge shows a human label for a status', () => {
    render(<StatusBadge status="in_progress" />);
    expect(screen.getByText('In progress')).toBeInTheDocument();
  });

  it('TierBadge renders the two supported tiers', () => {
    const { rerender } = render(<TierBadge tier="Admin-Certified" />);
    expect(screen.getByText('Admin-Certified')).toBeInTheDocument();
    rerender(<TierBadge tier="Unverified" />);
    expect(screen.getByText('Unverified')).toBeInTheDocument();
  });

  it('VerifyBadge falls back to Unverified for an unknown status', () => {
    render(<VerifyBadge status="something-else" />);
    expect(screen.getByText('Unverified')).toBeInTheDocument();
  });

  it('Stars renders the numeric rating', () => {
    render(<Stars rating={4.2} />);
    expect(screen.getByText(/4\.2/)).toBeInTheDocument();
  });
});
