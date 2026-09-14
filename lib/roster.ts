// Matches the "Dunk it Dunk it!" league settings: 8 teams, 14-man rosters,
// 10 starters (1 C, 3 G, 2 F, 1 F/C, 3 UTIL) + 4 bench (incl. 1 IR).

export type SlotType = "C" | "G" | "F" | "F/C" | "UTIL" | "BE" | "IR";

export const ROSTER_SLOTS: SlotType[] = [
  "C",
  "G", "G", "G",
  "F", "F",
  "F/C",
  "UTIL", "UTIL", "UTIL",
  "BE", "BE", "BE",
  "IR",
];

export const NUM_TEAMS = 8;

export function positionList(pos: string): string[] {
  return pos.split(",").map((p) => p.trim().toUpperCase());
}

export function isEligible(pos: string, slot: SlotType): boolean {
  const positions = positionList(pos);
  switch (slot) {
    case "C":
      return positions.includes("C");
    case "G":
      return positions.includes("PG") || positions.includes("SG");
    case "F":
      return positions.includes("SF") || positions.includes("PF");
    case "F/C":
      return positions.includes("SF") || positions.includes("PF") || positions.includes("C");
    case "UTIL":
    case "BE":
    case "IR":
      return true;
  }
}

export type RosterPlayer = { name: string; pos: string; score: number };
export type RosterAssignment = { slot: SlotType; player: RosterPlayer | null };

// Greedy slot-fill: strongest players first, into the most restrictive
// open slot they qualify for. Not a true optimal assignment, but a
// reasonable illustration of how a roster shapes up.
export function assignRoster(players: RosterPlayer[]): RosterAssignment[] {
  const sorted = [...players].sort((a, b) => b.score - a.score);
  const slots: RosterAssignment[] = ROSTER_SLOTS.map((slot) => ({ slot, player: null }));
  const used = new Set<string>();

  const slotFlexibility = (slot: SlotType): number => {
    switch (slot) {
      case "C": return 1;
      case "G": return 2;
      case "F": return 2;
      case "F/C": return 3;
      case "UTIL": return 5;
      case "BE": return 6;
      case "IR": return 6;
    }
  };

  for (const p of sorted) {
    if (used.has(p.name)) continue;
    const candidateSlots = slots
      .map((s, i) => ({ ...s, i }))
      .filter((s) => s.player === null && isEligible(p.pos, s.slot))
      .sort((a, b) => slotFlexibility(a.slot) - slotFlexibility(b.slot));
    if (candidateSlots.length > 0) {
      slots[candidateSlots[0].i].player = p;
      used.add(p.name);
    }
  }
  return slots;
}
