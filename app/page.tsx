import { scorePlayers } from "@/lib/scoring";
import { getConsensusPlayers } from "@/lib/consensus";
import { getFanscoutPlayers } from "@/lib/fanscout";
import { normalizeName } from "@/lib/names";
import AppShell from "./AppShell";

export default function Home() {
  const myPlayers = scorePlayers();
  const consensusPlayers = getConsensusPlayers();

  const posLookup = new Map<string, string>();
  for (const p of consensusPlayers) posLookup.set(normalizeName(p.name), p.pos);
  for (const p of myPlayers) posLookup.set(normalizeName(p.name), p.pos); // "mine" wins ties

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
