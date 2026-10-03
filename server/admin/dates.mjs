// node-pg reads a DATE column as a JavaScript Date at local midnight. Turning it
// into text with toISOString() would shift it a day back on any server that is
// not on UTC; the local parts are what the column held.
export function dateOnly(v) {
  if (v instanceof Date) {
    const p = (n) => String(n).padStart(2, "0");
    return v.getFullYear() + "-" + p(v.getMonth() + 1) + "-" + p(v.getDate());
  }
  return String(v || "").slice(0, 10);
}
