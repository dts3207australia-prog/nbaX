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

export type FanscoutPlayer = FanscoutPlayerRaw & { pos: string };

export function getFanscoutPlayers(posLookup: Map<string, string>): FanscoutPlayer[] {
  return (fanscoutRaw as FanscoutPlayerRaw[]).map((p) => ({
    ...p,
    pos: posLookup.get(normalizeName(p.name)) ?? "—",
  }));
}
