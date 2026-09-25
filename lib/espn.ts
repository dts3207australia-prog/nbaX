import espnRaw from "@/data/espn-projections.json";

export type EspnPlayer = {
  espnId: number;
  name: string;
  team: string;
  pos: string;
  gamesPlayed: number;
  minutes: number;
  pts: number; reb: number; ast: number; stl: number; blk: number; tov: number;
  fgm: number; fga: number; fgPct: number;
  ftm: number; fta: number; ftPct: number;
  tpm: number; tpa: number; tpPct: number;
};

export function getEspnPlayers(): EspnPlayer[] {
  return espnRaw as EspnPlayer[];
}
