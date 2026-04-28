import { formatGBP } from './format';

// Intl.NumberFormat may emit a non-breaking space (U+00A0) between symbol and digits in some
// runtimes. Normalise both for comparison so the test is deterministic across environments.
const norm = (s: string) => s.replace(/\u00A0/g, ' ');

describe('formatGBP', () => {
  it('formats whole pounds', () => {
    expect(norm(formatGBP(100))).toBe('£1.00');
  });

  it('formats fractional pounds', () => {
    expect(norm(formatGBP(1299))).toBe('£12.99');
  });

  it('formats zero', () => {
    expect(norm(formatGBP(0))).toBe('£0.00');
  });
});
