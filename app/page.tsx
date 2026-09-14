import { scorePlayers } from "@/lib/scoring";
import { getConsensusPlayers } from "@/lib/consensus";
import { getFanscoutPlayers } from "@/lib/fanscout";
import { normalizeName } from "@/lib/names";
import legacyPositions from "@/data/players.json";
import AppShell from "./AppShell";

export default function Home() {
  const consensusPlayers = getConsensusPlayers();

  // Build a position lookup from our most reliable sources: the original
  // curated CSV first (clean single-tag positions), falling back to the
  // consensus source for anyone it doesn't cover.
  const posLookup = new Map<string, string>();
  for (const p of consensusPlayers) posLookup.set(normalizeName(p.name), p.pos);
  for (const p of legacyPositions as { name: string; pos: string }[]) {
    posLookup.set(normalizeName(p.name), p.pos);
  }

  const myPlayers = scorePlayers(posLookup);
  const fanscoutPlayers = getFanscoutPlayers(posLookup);

  return (
    <main className="min-h-screen bg-base">
      <AppShell
        myPlayers={myPlayers}
        consensusPlayers={consensusPlayers}
        fanscoutPlayers={fanscoutPlayers}
      />
    </main>
  );
}
