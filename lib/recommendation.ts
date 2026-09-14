import type { ScoredPlayer } from "./scoring";
import type { ConsensusPlayer } from "./consensus";
import { normalizeName } from "./names";
import { assignRoster, isEligible, type RosterPlayer, type SlotType } from "./roster";

export type Confidence = "HIGH" | "MEDIUM" | "LOW";

export type Recommendation = {
  player: ScoredPlayer;
  draftScore: number; // 0-100
  confidence: Confidence;
  reasons: { icon: "need" | "strength" | "caution"; text: string }[];
};

const NEED_SLOT_TYPES: SlotType[] = ["C", "G", "F", "F/C"];
const SLOT_LABEL: Record<SlotType, string> = {
  C: "Center", G: "Guard", F: "Forward", "F/C": "Forward/Center",
  UTIL: "Utility", BE: "Bench", IR: "IR",
};

const CATEGORY_LABEL: Record<keyof ScoredPlayer["categoryZ"], string> = {
  fg: "FG%", ft: "FT%", tpm: "3PM", tpPct: "3P%",
  oreb: "OREB", dreb: "DREB", ast: "AST", ato: "A/TO",
  stl: "STL", blk: "BLK", pts: "PTS",
};

function totalStarterSlotsOfType(slot: SlotType): number {
  // From ROSTER_SLOTS: 1 C, 3 G, 2 F, 1 F/C
  switch (slot) {
    case "C": return 1;
    case "G": return 3;
    case "F": return 2;
    case "F/C": return 1;
    default: return 0;
  }
}

export function computeRecommendations({
  availableMyPlayers,
  availableConsensus,
  allMyPlayers,
  allConsensus,
  myRosterPlayers,
  limit = 6,
}: {
  availableMyPlayers: ScoredPlayer[];
  availableConsensus: ConsensusPlayer[];
  allMyPlayers: ScoredPlayer[];
  allConsensus: ConsensusPlayer[];
  myRosterPlayers: RosterPlayer[];
  limit?: number;
}): Recommendation[] {
  if (availableMyPlayers.length === 0) return [];

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
  const top40 = [...availableMyPlayers].sort((a, b) => b.total - a.total).slice(0, 40);
  const scarcity: Record<string, number> = {};
  for (const slot of NEED_SLOT_TYPES) {
    const count = top40.filter((p) => isEligible(p.pos, slot)).length;
    scarcity[slot] = 1 - Math.min(count, 40) / 40; // higher = scarcer
  }

  // --- Value normalization across available pool ---
  const totals = availableMyPlayers.map((p) => p.total);
  const minTotal = Math.min(...totals);
  const maxTotal = Math.max(...totals);
  const valueRange = maxTotal - minTotal || 1;

  const consensusByKey = new Map(availableConsensus.map((p) => [normalizeName(p.name), p]));
  const allConsensusByKey = new Map(allConsensus.map((p) => [normalizeName(p.name), p]));

  const scored: Recommendation[] = availableMyPlayers.map((player) => {
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

    // Confidence from cross-source rank variance, on a percentile basis —
    // pool sizes differ (481 "mine" vs 200 consensus), so raw rank
    // differences aren't comparable without normalizing first.
    const consensusFull = allConsensusByKey.get(normalizeName(player.name));
    let confidence: Confidence = "LOW";
    let variancePct: number | null = null;
    if (consensusFull) {
      const myPercentile = (player.rank / allMyPlayers.length) * 100;
      const consPercentile = (consensusFull.rank / allConsensus.length) * 100;
      variancePct = Math.abs(myPercentile - consPercentile);
      confidence = variancePct <= 5 ? "HIGH" : variancePct <= 12 ? "MEDIUM" : "LOW";
    }

    const reasons: Recommendation["reasons"] = [];
    if (eligibleNeedSlots.includes(biggestNeed) && needDeficit[biggestNeed] > 0) {
      reasons.push({ icon: "need", text: `${SLOT_LABEL[biggestNeed]} is your biggest need` });
    }
    const catEntries = Object.entries(player.categoryZ) as [keyof ScoredPlayer["categoryZ"], number][];
    const topCats = catEntries
      .filter(([, z]) => z > 0.75)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 2);
    for (const [cat, z] of topCats) {
      const qualifier = z > 1.5 ? "Excellent" : "Strong";
      reasons.push({ icon: "strength", text: `${qualifier} ${CATEGORY_LABEL[cat]}` });
    }
    if (variancePct !== null && variancePct > 12) {
      reasons.push({ icon: "caution", text: `Sources disagree substantially on this player — worth a second look` });
    }
    if (!consensusByKey.has(normalizeName(player.name)) && availableConsensus.length > 0) {
      // present in "mine" but not matched in consensus at all
    }

    return { player, draftScore, confidence, reasons };
  });

  return scored.sort((a, b) => b.draftScore - a.draftScore).slice(0, limit);
}
