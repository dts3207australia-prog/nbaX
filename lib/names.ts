// Normalizes a player name so the same person matches across ranking
// sources that spell things slightly differently (Jr./III, nicknames,
// punctuation). Used only as a lookup key for shared draft-day state.
export function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // strip accents
    .replace(/\b(jr|sr|ii|iii|iv)\b\.?/g, "") // strip suffixes
    .replace(/[^a-z\s]/g, "") // strip punctuation/periods/apostrophes
    .replace(/\s+/g, " ")
    .trim();
}
