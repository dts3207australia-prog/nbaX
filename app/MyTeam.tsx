"use client";

import { assignRoster, ROSTER_SLOTS, type RosterPlayer } from "@/lib/roster";

export default function MyTeam({ players }: { players: RosterPlayer[] }) {
  const assignment = assignRoster(players);
  const filledCount = assignment.filter((a) => a.player).length;

  return (
    <div className="max-w-3xl">
      <div className="mb-5">
        <h2 className="font-display text-xl font-medium text-text-primary tracking-wide">
          My Roster
        </h2>
        <p className="text-sm text-text-muted mt-1">
          <span className="text-accent tabular font-medium">{filledCount}</span>
          <span className="tabular"> / {ROSTER_SLOTS.length} slots filled</span>
          {" · "}Auto-slotted by your active ranking source into your league&apos;s real
          position requirements (1 C, 3 G, 2 F, 1 F/C, 3 UTIL, 3 BE, 1 IR).
        </p>
      </div>

      <div className="rounded-xl border border-border-subtle bg-surface divide-y divide-border-subtle overflow-hidden">
        {assignment.map((a, i) => {
          const isBench = a.slot === "BE" || a.slot === "IR";
          return (
            <div
              key={i}
              className={`flex items-center gap-4 px-4 py-3 ${isBench ? "bg-surface/60" : ""}`}
            >
              <span
                className={`w-12 text-center font-display text-xs font-medium rounded-md py-1 border ${
                  a.player
                    ? isBench
                      ? "border-border-strong text-text-secondary"
                      : "border-accent/40 text-accent bg-accent/10"
                    : "border-border-subtle text-text-muted"
                }`}
              >
                {a.slot}
              </span>
              {a.player ? (
                <>
                  <span className="flex-1 text-text-primary font-medium text-sm">{a.player.name}</span>
                  <span className="text-text-muted text-xs w-16">{a.player.pos}</span>
                  <span className="tabular text-sm font-medium text-text-secondary w-16 text-right">
                    {a.player.score.toFixed(2)}
                  </span>
                </>
              ) : (
                <span className="flex-1 text-text-muted text-sm italic">Empty</span>
              )}
            </div>
          );
        })}
      </div>

      {players.length === 0 && (
        <p className="text-sm text-text-muted mt-4">
          No players tagged as your team yet — set a player&apos;s &quot;Drafted By&quot;
          to your team name on the Draft Board to see your roster here.
        </p>
      )}
    </div>
  );
}
