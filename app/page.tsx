import { scorePlayers } from "@/lib/scoring";
import { getConsensusPlayers } from "@/lib/consensus";
import AppShell from "./AppShell";

export default function Home() {
  const myPlayers = scorePlayers();
  const consensusPlayers = getConsensusPlayers();
  return (
    <main className="min-h-screen bg-slate-950">
      <AppShell myPlayers={myPlayers} consensusPlayers={consensusPlayers} />
    </main>
  );
}
