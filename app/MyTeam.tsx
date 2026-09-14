"use client";

import { assignRoster, ROSTER_SLOTS, type RosterPlayer } from "@/lib/roster";

export default function MyTeam({ players }: { players: RosterPlayer[] }) {
  const assignment = assignRoster(players);
  const filledCount = assignment.filter((a) => a.player).length;

  const slotColor = (slot: string) => {
    if (slot === "BE" || slot === "IR") return "text-slate-500";
    return "text-slate-300";
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-slate-100">
          My Roster — {filledCount} / {ROSTER_SLOTS.length} slots filled
        </h2>
        <p className="text-sm text-slate-400 mt-1">
          Auto-slotted by your active ranking source&apos;s score into your league&apos;s
          real position requirements (1 C, 3 G, 2 F, 1 F/C, 3 UTIL, 3 BE, 1 IR).
        </p>
      </div>

      <div className="rounded-lg border border-slate-700 overflow-hidden">
        {assignment.map((a, i) => (
          <div
            key={i}
            className={`flex items-center justify-between px-4 py-2.5 text-sm ${
              i % 2 === 0 ? "bg-slate-900" : "bg-slate-900/60"
            } ${i < ROSTER_SLOTS.length - 4 ? "border-b border-slate-800" : ""}`}
          >
            <span className={`w-14 font-mono font-semibold ${slotColor(a.slot)}`}>
              {a.slot}
            </span>
            {a.player ? (
              <>
                <span className="flex-1 text-slate-100 font-medium">{a.player.name}</span>
                <span className="text-slate-400 text-xs w-16">{a.player.pos}</span>
                <span className="font-mono text-slate-300 w-16 text-right">
                  {a.player.score.toFixed(2)}
                </span>
              </>
            ) : (
              <span className="flex-1 text-slate-600 italic">Empty</span>
            )}
          </div>
        ))}
      </div>

      {players.length === 0 && (
        <p className="text-sm text-slate-500 mt-4">
          No players tagged as your team yet — set a player&apos;s &quot;Drafted By&quot;
          to your team name on the Draft Board to see your roster here.
        </p>
      )}
    </div>
  );
}
