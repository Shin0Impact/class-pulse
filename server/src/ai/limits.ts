// Hourly caps on the expensive things (AI calls, uploads), counted per class AND per teacher (or
// per IP when accounts are off), so opening more classes doesn't multiply anyone's allowance.

const HOUR = 60 * 60 * 1000;
const buckets = new Map<string, number[]>();

setInterval(() => {
  const now = Date.now();
  for (const [key, times] of buckets) {
    const fresh = times.filter((t) => now - t < HOUR);
    if (fresh.length) buckets.set(key, fresh);
    else buckets.delete(key);
  }
}, 10 * 60 * 1000).unref();

// True (and counted) if every key is under its limit; false (nothing counted) otherwise.
export function takeHourly(checks: Array<[key: string, limit: number]>): boolean {
  const now = Date.now();
  const recent = checks.map(([key, limit]) => {
    const times = (buckets.get(key) ?? []).filter((t) => now - t < HOUR);
    return { key, limit, times };
  });
  if (recent.some((r) => r.times.length >= r.limit)) return false;
  for (const r of recent) buckets.set(r.key, [...r.times, now]);
  return true;
}
