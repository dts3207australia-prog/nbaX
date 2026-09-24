import type { FanscoutPlayer } from "./fanscout";
import { assignRoster, isEligible, type RosterPlayer, type SlotType } from "./roster";

export type Recommendation = {
  player: FanscoutPlayer;
  draftScore: number; // 0-100
  reasons: { icon: "need" | "strength" | "caution"; text: string }[];
};

const NEED_SLOT_TYPES: SlotType[] = ["C", "G", "F", "F/C"];
const SLOT_LABEL: Record<SlotType, string> = {
  C: "Center", G: "Guard", F: "Forward", "F/C": "Forward/Center",
  UTIL: "Utility", BE: "Bench", IR: "IR",
};

const CATEGORY_LABEL: Record<string, string> = {
  zPts: "PTS", zTpm: "3PM", zAst: "AST", zOreb: "OREB", zDreb: "DREB",
  zStl: "STL", zBlk: "BLK", zAto: "A/TO", zFgPct: "FG%", zFtPct: "FT%",
};

function totalStarterSlotsOfType(slot: SlotType): number {
  switch (slot) {
    case "C": return 1;
    case "G": return 3;
    case "F": return 2;
    case "F/C": return 1;
    default: return 0;
  }
}

export function computeRecommendations({
  availablePlayers,
  allPlayers,
  myRosterPlayers,
  limit = 6,
}: {
  availablePlayers: FanscoutPlayer[];
  allPlayers: FanscoutPlayer[];
  myRosterPlayers: RosterPlayer[];
  limit?: number;
}): Recommendation[] {
  if (availablePlayers.length === 0) return [];

  // --- Team needs: deficit ratio per specific slot type (UTIL/BE/IR excluded) ---
  const assignment = assignRoster(myRosterPlayers);
  const needDeficit: Record<string, number> = {};
  for (const slot of NEED_SLOT_TYPES) {
    const total = totalStarterSlotsOfType(slot);
    const filled = assignment.filter((a) => a.slot === slot && a.player).length;
    needDeficit[slot] = total > 0 ? (total - filled) / total : 0;
  }
  const biggestNeed = NEED_SLOT_TYPES.reduce((best, slot) =>
    needDeficit[slot] > needDeficit[best] ? slot : best, NEED_SLOT_TYPES[0]);

  // --- Positional scarcity: how many top-40 available players are eligible per slot ---
  const top40 = [...availablePlayers].sort((a, b) => b.total - a.total).slice(0, 40);
  const scarcity: Record<string, number> = {};
  for (const slot of NEED_SLOT_TYPES) {
    const count = top40.filter((p) => isEligible(p.pos, slot)).length;
    scarcity[slot] = 1 - Math.min(count, 40) / 40;
  }

  // --- Value normalization across available pool (FanScout's own Value score) ---
  const totals = availablePlayers.map((p) => p.total);
  const minTotal = Math.min(...totals);
  const maxTotal = Math.max(...totals);
  const valueRange = maxTotal - minTotal || 1;

  const scored: Recommendation[] = availablePlayers.map((player) => {
    const eligibleNeedSlots = NEED_SLOT_TYPES.filter((s) => isEligible(player.pos, s));
    const needScore = eligibleNeedSlots.length
      ? Math.max(...eligibleNeedSlots.map((s) => needDeficit[s]))
      : 0;
    const scarcityScore = eligibleNeedSlots.length
      ? Math.max(...eligibleNeedSlots.map((s) => scarcity[s]))
      : 0;
    const normalizedValue = (player.total - minTotal) / valueRange;

    const draftScore = Math.max(0, Math.min(100,
      100 * (0.60 * normalizedValue + 0.25 * needScore + 0.15 * scarcityScore)
    ));

    const reasons: Recommendation["reasons"] = [];
    if (eligibleNeedSlots.includes(biggestNeed) && needDeficit[biggestNeed] > 0) {
      reasons.push({ icon: "need", text: `${SLOT_LABEL[biggestNeed]} is your biggest need` });
    }
    const catEntries: [string, number][] = [
      ["zPts", player.zPts], ["zTpm", player.zTpm], ["zAst", player.zAst],
      ["zOreb", player.zOreb], ["zDreb", player.zDreb], ["zStl", player.zStl],
      ["zBlk", player.zBlk], ["zAto", player.zAto], ["zFgPct", player.zFgPct], ["zFtPct", player.zFtPct],
    ];
    const topCats = catEntries
      .filter(([, z]) => z > 0.75)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 2);
    for (const [cat, z] of topCats) {
      const qualifier = z > 1.5 ? "Excellent" : "Strong";
      reasons.push({ icon: "strength", text: `${qualifier} ${CATEGORY_LABEL[cat]}` });
    }

    return { player, draftScore, reasons };
  });

  return scored.sort((a, b) => b.draftScore - a.draftScore).slice(0, limit);
}
