import { scorePlayers } from "@/lib/scoring";
import { getConsensusPlayers } from "@/lib/consensus";
import DraftBoard from "./DraftBoard";

export default function Home() {
  const myPlayers = scorePlayers();
  const consensusPlayers = getConsensusPlayers();
  return (
    <main className="min-h-screen bg-slate-950">
      <DraftBoard myPlayers={myPlayers} consensusPlayers={consensusPlayers} />
    </main>
  );
}
