/**
 * Generates a random value around a mean using a simple approximation of
 * a normal distribution (sum of 12 uniforms), clamped to be non‑negative
 * and rounded to 2 decimal places.
 *
 * Callers are responsible for choosing an appropriate stdDevRatio and for
 * any additional guards (e.g. handling non‑positive means).
 */
export function randomAroundMean(mean: number, stdDevRatio: number): number {
  const stdDev = mean * stdDevRatio;
  let z = 0;
  for (let i = 0; i < 12; i++) z += Math.random();
  z = (z - 6) * stdDev;
  const value = Math.max(0, mean + z);
  return Math.round(value * 100) / 100;
}

