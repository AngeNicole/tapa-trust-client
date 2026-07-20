import { describe, it, expect } from 'vitest';
import { scoreForDistance, MATCH_THRESHOLD } from './faceMatch.js';

// The face-match calibration is core custom logic: it maps face-api's descriptor
// distance to a 0–100 similarity so that the standard 0.6 "same person" cutoff
// lands exactly on the displayed 65% pass bar.
describe('scoreForDistance calibration', () => {
  it('maps distance 0 (identical) to 100%', () => {
    expect(scoreForDistance(0)).toBe(100);
  });

  it('maps the 0.6 cutoff to exactly the 65% pass bar', () => {
    expect(scoreForDistance(0.6)).toBe(MATCH_THRESHOLD);
    expect(scoreForDistance(0.6)).toBe(65);
  });

  it('scores a genuine same-person match (0.3–0.5) above the bar', () => {
    expect(scoreForDistance(0.3)).toBeGreaterThanOrEqual(65);
    expect(scoreForDistance(0.5)).toBeGreaterThanOrEqual(65);
  });

  it('scores a different person (0.7+) below the bar', () => {
    expect(scoreForDistance(0.7)).toBeLessThan(65);
    expect(scoreForDistance(0.9)).toBeLessThan(65);
  });

  it('is monotonically non-increasing as distance grows', () => {
    let prev = 101;
    for (let d = 0; d <= 1.2; d += 0.1) {
      const s = scoreForDistance(d);
      expect(s).toBeLessThanOrEqual(prev);
      prev = s;
    }
  });

  it('clamps to [0, 100] for out-of-range distances', () => {
    expect(scoreForDistance(2)).toBe(0);
    expect(scoreForDistance(-1)).toBe(100);
  });
});
