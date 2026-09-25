import fanscoutRaw from "@/data/fanscout.json";
import { normalizeName } from "./names";

export type FanscoutPlayerRaw = {
  rank: number;
  name: string;
  team: string;
  gamesPlayed: number | null;
  minutes: number | null;
  pts: number; tpm: number; oreb: number; dreb: number; ast: number;
  stl: number; blk: number; tov: number; ato: number;
  fgPct: number; fga: number; ftPct: number; fta: number;
  zPts: number; zTpm: number; zAst: number; zOreb: number; zDreb: number;
  zStl: number; zBlk: number; zTov: number; zAto: number; zFgPct: number; zFtPct: number;
  total: number;
};

export type FanscoutPlayer = FanscoutPlayerRaw & {
  pos: string;
  tpPct: number | null;
  tpa: number | null;
  zTpPct: number;
  tpDataAvailable: boolean;
  baseTotal: number; // FanScout's own Value score, before our 3P% addition
  baseRank: number;  // FanScout's own rank, before our 3P% addition
};

function mean(arr: number[]) {
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}
function stdev(arr: number[]) {
  const m = mean(arr);
  const variance = arr.reduce((a, b) => a + (b - m) ** 2, 0) / (arr.length - 1);
  return Math.sqrt(variance);
}

export function getFanscoutPlayers(
  posLookup: Map<string, string>,
  espnLookup?: Map<string, { tpPct: number; tpa: number }>
): FanscoutPlayer[] {
  const base = (fanscoutRaw as FanscoutPlayerRaw[]).map((p) => {
    const espn = espnLookup?.get(normalizeName(p.name));
    return {
      ...p,
      pos: posLookup.get(normalizeName(p.name)) ?? "—",
      tpPct: espn?.tpPct ?? null,
      tpa: espn?.tpa ?? null,
      tpDataAvailable: !!espn,
      baseTotal: p.total,
      baseRank: p.rank,
    };
  });

  // Compute a volume-weighted 3P% z-score (same methodology as FG%/FT%)
  // across whichever players we have real ESPN attempt data for, and fold
  // it into an adjusted total/rank — this is what completes the 11th
  // category FanScout itself couldn't provide.
  const withTp = base.filter((p) => p.tpDataAvailable && p.tpa !== null);
  let zTpPctByName = new Map<string, number>();
  if (withTp.length > 1) {
    const avgTpPct = mean(withTp.map((p) => p.tpPct!));
    const impacts = withTp.map((p) => (p.tpPct! - avgTpPct) * p.tpa!);
    const impactMean = mean(impacts);
    const impactStd = stdev(impacts);
    withTp.forEach((p, i) => {
      const z = impactStd === 0 ? 0 : (impacts[i] - impactMean) / impactStd;
      zTpPctByName.set(normalizeName(p.name), z);
    });
  }

  const enriched: FanscoutPlayer[] = base.map((p) => {
    const zTpPct = zTpPctByName.get(normalizeName(p.name)) ?? 0;
    return { ...p, zTpPct, total: p.baseTotal + zTpPct };
  });

  const sorted = [...enriched].sort((a, b) => b.total - a.total);
  const rankMap = new Map(sorted.map((p, i) => [normalizeName(p.name), i + 1]));

  return enriched
    .map((p) => ({ ...p, rank: rankMap.get(normalizeName(p.name))! }))
    .sort((a, b) => a.rank - b.rank);
}
