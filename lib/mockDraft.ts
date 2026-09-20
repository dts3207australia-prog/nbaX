import type { ScoredPlayer } from "./scoring";
import type { ConsensusPlayer } from "./consensus";
import { computeRecommendations } from "./recommendation";
import { ROSTER_SLOTS, type RosterPlayer } from "./roster";
import { normalizeName } from "./names";

export const MOCK_NUM_TEAMS = 8;
export const MOCK_ROUNDS = ROSTER_SLOTS.length; // 14, matches your league roster size

export type MockPick = {
  overallPick: number;
  round: number;
  pickInRound: number;
  teamIndex: number; // 0-based, 0..7
  playerName: string;
};

// Standard snake order: odd rounds go 1..N, even rounds go N..1.
export function pickOrderForRound(round: number): number[] {
  const order = Array.from({ length: MOCK_NUM_TEAMS }, (_, i) => i);
  return round % 2 === 1 ? order : [...order].reverse();
}

export function teamIndexForOverallPick(overallPick: number): { round: number; pickInRound: number; teamIndex: number } {
  const round = Math.ceil(overallPick / MOCK_NUM_TEAMS);
  const pickInRound = overallPick - (round - 1) * MOCK_NUM_TEAMS;
  const teamIndex = pickOrderForRound(round)[pickInRound - 1];
  return { round, pickInRound, teamIndex };
}

export function teamRosterFromPicks(picks: MockPick[], teamIndex: number, myPlayers: ScoredPlayer[]): RosterPlayer[] {
  return picks
    .filter((p) => p.teamIndex === teamIndex)
    .map((p) => {
      const player = myPlayers.find((mp) => normalizeName(mp.name) === normalizeName(p.playerName));
      if (!player) return null;
      return { name: player.name, pos: player.pos, score: player.total };
    })
    .filter((p): p is RosterPlayer => p !== null);
}

// CPU teams draft using the same recommendation engine as the human user,
// scored against their own roster needs so they don't stack five centers.
export const CATEGORY_KEYS = [
  "fg", "ft", "tpm", "tpPct", "oreb", "dreb", "ast", "ato", "stl", "blk", "pts",
] as const;
export type CategoryKey = (typeof CATEGORY_KEYS)[number];

export function teamCategorySummary(
  picks: MockPick[],
  teamIndex: number,
  myPlayers: ScoredPlayer[]
): Record<CategoryKey, number> {
  const sums = Object.fromEntries(CATEGORY_KEYS.map((k) => [k, 0])) as Record<CategoryKey, number>;
  const names = picks.filter((p) => p.teamIndex === teamIndex).map((p) => p.playerName);
  for (const name of names) {
    const player = myPlayers.find((p) => normalizeName(p.name) === normalizeName(name));
    if (!player) continue;
    for (const k of CATEGORY_KEYS) sums[k] += player.categoryZ[k];
  }
  return sums;
}

export function simulateCpuPick(
  teamIndex: number,
  picks: MockPick[],
  myPlayers: ScoredPlayer[],
  consensusPlayers: ConsensusPlayer[]
): string | null {
  const draftedKeys = new Set(picks.map((p) => normalizeName(p.playerName)));
  const available = myPlayers.filter((p) => !draftedKeys.has(normalizeName(p.name)));
  if (available.length === 0) return null;
  const availableConsensus = consensusPlayers.filter((p) => !draftedKeys.has(normalizeName(p.name)));

  const roster = teamRosterFromPicks(picks, teamIndex, myPlayers);
  const recs = computeRecommendations({
    availableMyPlayers: available,
    availableConsensus,
    allMyPlayers: myPlayers,
    allConsensus: consensusPlayers,
    myRosterPlayers: roster,
    limit: 1,
  });
  return recs[0]?.player.name ?? available[0].name;
}
