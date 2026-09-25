import { getConsensusPlayers } from "@/lib/consensus";
import { getFanscoutPlayers } from "@/lib/fanscout";
import { getEspnPlayers } from "@/lib/espn";
import { normalizeName } from "@/lib/names";
import legacyPositions from "@/data/players.json";
import AppShell from "./AppShell";

export default function Home() {
  // Consensus and the original curated CSV are used here only to backfill
  // position data — FanScout itself doesn't include positions.
  const consensusPlayers = getConsensusPlayers();
  const posLookup = new Map<string, string>();
  for (const p of consensusPlayers) posLookup.set(normalizeName(p.name), p.pos);
  for (const p of legacyPositions as { name: string; pos: string }[]) {
    posLookup.set(normalizeName(p.name), p.pos);
  }

  const espnPlayers = getEspnPlayers();
  const espnLookup = new Map<string, { tpPct: number; tpa: number }>();
  for (const p of espnPlayers) {
    // ESPN's tpa is a SEASON TOTAL, but FanScout's own volume figures
    // (e.g. fga) are per-game — convert to per-game here so the 3P%
    // volume-weighting uses the same units as the other categories.
    if (p.gamesPlayed > 0) {
      espnLookup.set(normalizeName(p.name), { tpPct: p.tpPct, tpa: p.tpa / p.gamesPlayed });
    }
  }

  const players = getFanscoutPlayers(posLookup, espnLookup);

  return (
    <main className="min-h-screen bg-base">
      <AppShell players={players} espnPlayers={espnPlayers} />
    </main>
  );
}
