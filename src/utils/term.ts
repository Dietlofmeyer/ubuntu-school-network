export function getCurrentTerm() {
  const now = new Date();
  const month = now.getMonth() + 1;
  if (month <= 3) return { term: 1, year: now.getFullYear() };
  if (month <= 6) return { term: 2, year: now.getFullYear() };
  if (month <= 9) return { term: 3, year: now.getFullYear() };
  return { term: 4, year: now.getFullYear() };
}
