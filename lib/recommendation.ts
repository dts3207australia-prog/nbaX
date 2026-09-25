import type { FanscoutPlayer } from "./fanscout";
import { normalizeName } from "./names";
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

const CATEGORY_KEYS = [
  "zFgPct", "zFtPct", "zTpm", "zTpPct", "zOreb", "zDreb", "zAst", "zAto", "zStl", "zBlk", "zPts",
] as const;
type CategoryKey = (typeof CATEGORY_KEYS)[number];

const CATEGORY_LABEL: Record<CategoryKey, string> = {
  zPts: "PTS", zTpm: "3PM", zAst: "AST", zOreb: "OREB", zDreb: "DREB",
  zStl: "STL", zBlk: "BLK", zAto: "A/TO", zFgPct: "FG%", zFtPct: "FT%", zTpPct: "3P%",
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

  // --- Positional needs: deficit ratio per dedicated slot type ---
  const assignment = assignRoster(myRosterPlayers);
  const needDeficit: Record<string, number> = {};
  for (const slot of NEED_SLOT_TYPES) {
    const total = totalStarterSlotsOfType(slot);
    const filled = assignment.filter((a) => a.slot === slot && a.player).length;
    needDeficit[slot] = total > 0 ? (total - filled) / total : 0;
  }
  const biggestNeed = NEED_SLOT_TYPES.reduce((best, slot) =>
    needDeficit[slot] > needDeficit[best] ? slot : best, NEED_SLOT_TYPES[0]);
  const rosterHasOpenNeedSlot = NEED_SLOT_TYPES.some((s) => needDeficit[s] > 0);

  // --- Positional scarcity: how many top-40 available players are eligible per slot ---
  const top40 = [...availablePlayers].sort((a, b) => b.total - a.total).slice(0, 40);
  const scarcity: Record<string, number> = {};
  for (const slot of NEED_SLOT_TYPES) {
    const count = top40.filter((p) => isEligible(p.pos, slot)).length;
    scarcity[slot] = 1 - Math.min(count, 40) / 40;
  }

  // --- Category balance: what is the roster actually weak in so far? ---
  // Position-slot need only covers the 7 dedicated starter slots (C/G/F/F-C);
  // UTIL and bench have no positional pressure at all, so without this the
  // engine would just keep stacking whichever position dominates the top of
  // the rankings once those 7 fill — exactly what produced a 10-guard roster
  // in practice. This looks at the roster's actual category z-score totals
  // instead, so weakness is measured directly rather than via a position proxy.
  const rosterFull = myRosterPlayers
    .map((rp) => allPlayers.find((p) => normalizeName(p.name) === normalizeName(rp.name)))
    .filter((p): p is FanscoutPlayer => !!p);
  const categorySums: Record<CategoryKey, number> = Object.fromEntries(
    CATEGORY_KEYS.map((k) => [k, 0])
  ) as Record<CategoryKey, number>;
  for (const p of rosterFull) {
    for (const k of CATEGORY_KEYS) categorySums[k] += p[k];
  }
  // Categories below this are "weak" and get a fit bonus; only kicks in once
  // a few picks are in, so early picks aren't distorted by a near-empty roster.
  const weakCategories: CategoryKey[] =
    rosterFull.length >= 3
      ? CATEGORY_KEYS.filter((k) => categorySums[k] < 0).sort((a, b) => categorySums[a] - categorySums[b])
      : [];

  // --- Value normalization across available pool (FanScout's own Value score) ---
  const totals = availablePlayers.map((p) => p.total);
  const minTotal = Math.min(...totals);
  const maxTotal = Math.max(...totals);
  const valueRange = maxTotal - minTotal || 1;

  // Normalize category-fit scores across the available pool too, so it's on
  // the same 0-1 scale as value/need/scarcity rather than raw z-score units.
  const rawFitScores = availablePlayers.map((player) =>
    weakCategories.slice(0, 5).reduce((sum, k, i) => sum + Math.max(0, player[k]) * (5 - i), 0)
  );
  const maxFit = Math.max(...rawFitScores, 1);

  const scored: Recommendation[] = availablePlayers.map((player, i) => {
    const eligibleNeedSlots = NEED_SLOT_TYPES.filter((s) => isEligible(player.pos, s));
    const needScore = eligibleNeedSlots.length
      ? Math.max(...eligibleNeedSlots.map((s) => needDeficit[s]))
      : 0;
    const scarcityScore = eligibleNeedSlots.length
      ? Math.max(...eligibleNeedSlots.map((s) => scarcity[s]))
      : 0;
    const normalizedValue = (player.total - minTotal) / valueRange;
    const categoryFitScore = maxFit > 0 ? rawFitScores[i] / maxFit : 0;

    // Once dedicated position slots are all filled, hand more weight to
    // category balance instead of value alone — this is what stops the
    // engine from blindly stacking guards through UTIL/bench just because
    // guards happen to top the rankings.
    const weights = rosterHasOpenNeedSlot
      ? { value: 0.55, need: 0.25, scarcity: 0.10, fit: 0.10 }
      : { value: 0.45, need: 0.05, scarcity: 0.05, fit: 0.45 };

    const draftScore = Math.max(0, Math.min(100,
      100 * (weights.value * normalizedValue + weights.need * needScore + weights.scarcity * scarcityScore + weights.fit * categoryFitScore)
    ));

    const reasons: Recommendation["reasons"] = [];
    if (eligibleNeedSlots.includes(biggestNeed) && needDeficit[biggestNeed] > 0) {
      reasons.push({ icon: "need", text: `${SLOT_LABEL[biggestNeed]} is your biggest need` });
    }
    if (!rosterHasOpenNeedSlot && weakCategories.length > 0) {
      const topWeak = weakCategories.slice(0, 3).filter((k) => player[k] > 0.5);
      if (topWeak.length > 0) {
        reasons.push({ icon: "need", text: `Helps your weak ${topWeak.map((k) => CATEGORY_LABEL[k]).join("/")}` });
      }
    }
    const catEntries: [CategoryKey, number][] = CATEGORY_KEYS
      .filter((k) => k !== "zTpPct" || player.tpDataAvailable)
      .map((k) => [k, player[k]]);
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
