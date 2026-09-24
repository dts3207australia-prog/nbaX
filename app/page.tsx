import { getConsensusPlayers } from "@/lib/consensus";
import { getFanscoutPlayers } from "@/lib/fanscout";
import { normalizeName } from "@/lib/names";
import legacyPositions from "@/data/players.json";
import AppShell from "./AppShell";

export default function Home() {
  // Consensus and the original curated CSV are no longer shown as ranking
  // sources — they're used here only to backfill position data, since
  // FanScout (our sole ranking source for now) doesn't include positions.
  const consensusPlayers = getConsensusPlayers();
  const posLookup = new Map<string, string>();
  for (const p of consensusPlayers) posLookup.set(normalizeName(p.name), p.pos);
  for (const p of legacyPositions as { name: string; pos: string }[]) {
    posLookup.set(normalizeName(p.name), p.pos);
  }

  const players = getFanscoutPlayers(posLookup);

  return (
    <main className="min-h-screen bg-base">
      <AppShell players={players} />
    </main>
  );
}
