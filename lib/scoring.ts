import playersRaw from "@/data/players.json";

export type Player = {
  name: string;
  pos: string;
  fgm: number; fga: number;
  ftm: number; fta: number;
  tpm: number; tpa: number;
  oreb: number; dreb: number;
  ast: number; stl: number; blk: number; tov: number;
  pts: number;
};

export type ScoredPlayer = Player & {
  fgPct: number;
  ftPct: number;
  tpPct: number;
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

// Categories: FG%, FT%, 3PM, 3P%, OREB, DREB, AST, A/TO, STL, BLK, PTS (11 total)
export function scorePlayers(): ScoredPlayer[] {
  const players = playersRaw as Player[];

  const derived = players.map((p) => ({
    ...p,
    fgPct: p.fga > 0 ? p.fgm / p.fga : 0,
    ftPct: p.fta > 0 ? p.ftm / p.fta : 0,
    tpPct: p.tpa > 0 ? p.tpm / p.tpa : 0,
    ato: p.tov > 0 ? p.ast / p.tov : p.ast,
  }));

  const avgFgPct = mean(derived.map((p) => p.fgPct));
  const avgFtPct = mean(derived.map((p) => p.ftPct));
  const avgTpPct = mean(derived.map((p) => p.tpPct));

  // volume-weighted percentage impact, same approach as the spreadsheet
  const fgImpact = derived.map((p) => (p.fgPct - avgFgPct) * p.fga);
  const ftImpact = derived.map((p) => (p.ftPct - avgFtPct) * p.fta);
  const tpPctImpact = derived.map((p) => (p.tpPct - avgTpPct) * p.tpa);

  const tpmArr = derived.map((p) => p.tpm);
  const orebArr = derived.map((p) => p.oreb);
  const drebArr = derived.map((p) => p.dreb);
  const astArr = derived.map((p) => p.ast);
  const atoArr = derived.map((p) => p.ato);
  const stlArr = derived.map((p) => p.stl);
  const blkArr = derived.map((p) => p.blk);
  const ptsArr = derived.map((p) => p.pts);

  const scored: Omit<ScoredPlayer, "rank">[] = derived.map((p, i) => {
    const categoryZ = {
      fg: zScore(fgImpact[i], fgImpact),
      ft: zScore(ftImpact[i], ftImpact),
      tpm: zScore(p.tpm, tpmArr),
      tpPct: zScore(tpPctImpact[i], tpPctImpact),
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
