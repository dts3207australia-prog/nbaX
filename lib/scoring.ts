import fanscoutRaw from "@/data/fanscout.json";
import type { FanscoutPlayerRaw } from "./fanscout";
import { normalizeName } from "./names";

export type ScoredPlayer = {
  name: string;
  pos: string;
  fgPct: number; fga: number;
  ftPct: number; fta: number;
  tpm: number; tpPct: number; tpDataAvailable: boolean;
  oreb: number; dreb: number;
  ast: number; stl: number; blk: number; pts: number;
  ato: number;
  categoryZ: {
    fg: number; ft: number; tpm: number; tpPct: number;
    oreb: number; dreb: number; ast: number; ato: number;
    stl: number; blk: number; pts: number;
  };
  total: number;
  rank: number;
};

function mean(arr: number[]) {
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}
function stdev(arr: number[]) {
  const m = mean(arr);
  const variance = arr.reduce((a, b) => a + (b - m) ** 2, 0) / (arr.length - 1);
  return Math.sqrt(variance);
}
function zScore(value: number, arr: number[]) {
  const sd = stdev(arr);
  return sd === 0 ? 0 : (value - mean(arr)) / sd;
}

// "My Rankings" — our own 11-category z-score engine, run on FanScout's
// real 2026-27 per-game projections rather than last season's actuals.
// 3P% is excluded (contributes 0) since the source has no 3-point-attempts
// data to compute it from; every other category is a genuine volume-aware
// z-score matching the league's exact rules.
export function scorePlayers(posLookup: Map<string, string>): ScoredPlayer[] {
  const raw = fanscoutRaw as FanscoutPlayerRaw[];

  const base = raw.map((p) => ({
    name: p.name,
    pos: posLookup.get(normalizeName(p.name)) ?? "—",
    fgPct: p.fgPct, fga: p.fga,
    ftPct: p.ftPct, fta: p.fta,
    tpm: p.tpm, tpPct: 0, tpDataAvailable: false,
    oreb: p.oreb, dreb: p.dreb,
    ast: p.ast, stl: p.stl, blk: p.blk, pts: p.pts,
    ato: p.ato,
  }));

  const avgFgPct = mean(base.map((p) => p.fgPct));
  const avgFtPct = mean(base.map((p) => p.ftPct));

  // volume-weighted percentage impact
  const fgImpact = base.map((p) => (p.fgPct - avgFgPct) * p.fga);
  const ftImpact = base.map((p) => (p.ftPct - avgFtPct) * p.fta);

  const tpmArr = base.map((p) => p.tpm);
  const orebArr = base.map((p) => p.oreb);
  const drebArr = base.map((p) => p.dreb);
  const astArr = base.map((p) => p.ast);
  const atoArr = base.map((p) => p.ato);
  const stlArr = base.map((p) => p.stl);
  const blkArr = base.map((p) => p.blk);
  const ptsArr = base.map((p) => p.pts);

  const scored: Omit<ScoredPlayer, "rank">[] = base.map((p, i) => {
    const categoryZ = {
      fg: zScore(fgImpact[i], fgImpact),
      ft: zScore(ftImpact[i], ftImpact),
      tpm: zScore(p.tpm, tpmArr),
      tpPct: 0, // no 3PA data available from this source
      oreb: zScore(p.oreb, orebArr),
      dreb: zScore(p.dreb, drebArr),
      ast: zScore(p.ast, astArr),
      ato: zScore(p.ato, atoArr),
      stl: zScore(p.stl, stlArr),
      blk: zScore(p.blk, blkArr),
      pts: zScore(p.pts, ptsArr),
    };
    const total = Object.values(categoryZ).reduce((a, b) => a + b, 0);
    return { ...p, categoryZ, total };
  });

  const sorted = [...scored].sort((a, b) => b.total - a.total);
  const rankMap = new Map(sorted.map((p, i) => [p.name, i + 1]));

  return scored
    .map((p) => ({ ...p, rank: rankMap.get(p.name)! }))
    .sort((a, b) => a.rank - b.rank);
}
