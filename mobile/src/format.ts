export function formatGBP(cents: number): string {
  const pounds = cents / 100;
  return pounds.toLocaleString('en-GB', { style: 'currency', currency: 'GBP' });
}
