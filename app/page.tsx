import { scorePlayers } from "@/lib/scoring";
import DraftBoard from "./DraftBoard";

export default function Home() {
  const players = scorePlayers();
  return (
    <main className="min-h-screen bg-slate-950">
      <DraftBoard players={players} />
    </main>
  );
}
