import { randomBytes } from 'crypto';

export function generateTrackingCode(prefix = 'TRK', length = 10) {
  // Generates something like: TRK-8F3K9A1BCD
  const code = randomBytes(Math.ceil(length / 2))
    .toString('hex')
    .toUpperCase()
    .slice(0, length);

  return `${prefix}-${code}`;
}
