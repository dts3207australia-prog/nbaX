import consensusRaw from "@/data/consensus.json";

export type ConsensusPlayer = {
  name: string;
  team: string;
  pos: string;
  fgZ: number; ftZ: number; tpmZ: number; tpPctZ: number;
  orebZ: number; drebZ: number; astZ: number; atoZ: number;
  stlZ: number; blkZ: number; ptsZ: number;
  total: number;
  catWins: number;
  tier: string;
  note: string;
  rank: number;
};

export function getConsensusPlayers(): ConsensusPlayer[] {
  return consensusRaw as ConsensusPlayer[];
}
