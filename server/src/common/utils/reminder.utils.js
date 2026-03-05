export function padRef(id) {
  return String(id ?? "").padStart(4, "0");
}

export function hoursUntil(dateStr) {
  if (!dateStr) return null;
  const now = new Date();
  const end = new Date(dateStr);
  return Math.floor((end.getTime() - now.getTime()) / (1000 * 60 * 60));
}

