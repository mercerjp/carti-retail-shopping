import { formatGBP } from './format';

describe('formatGBP', () => {
  it('formats whole pounds', () => {
    expect(formatGBP(100)).toMatch(/£1\.00/);
  });

  it('formats fractional pounds', () => {
    expect(formatGBP(1299)).toMatch(/£12\.99/);
  });

  it('formats zero', () => {
    expect(formatGBP(0)).toMatch(/£0\.00/);
  });
});
