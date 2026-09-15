"use client";

import { getScheduleStrength } from "@/lib/schedule";

export default function ScheduleStrength() {
  const teams = getScheduleStrength();
  const maxAvg = Math.max(...teams.map((t) => t.avgOpponentWinTotal));
  const minAvg = Math.min(...teams.map((t) => t.avgOpponentWinTotal));
  const range = maxAvg - minAvg || 1;

  return (
    <div className="max-w-3xl">
      <div className="mb-5">
        <h2 className="font-display text-xl font-medium text-text-primary tracking-wide">
          Strength of Schedule
        </h2>
        <p className="text-sm text-text-muted mt-1">
          Ranked by average projected win total of each team&apos;s 2026-27 regular-season
          opponents (BetMGM win totals, Aug 23). Higher average opponent win total = tougher
          schedule. The spread is naturally modest — NBA schedules are fairly balanced since
          every team plays every other team at least twice.
        </p>
      </div>

      <div className="rounded-xl border border-border-subtle bg-surface divide-y divide-border-subtle overflow-hidden">
        {teams.map((t) => {
          const barPct = ((t.avgOpponentWinTotal - minAvg) / range) * 100;
          return (
            <div key={t.team} className="flex items-center gap-3 px-4 py-2.5 text-sm">
              <span className="w-6 text-text-muted tabular text-xs">{t.sosRank}</span>
              <span className="flex-1 text-text-primary font-medium">{t.team}</span>
              <span className="text-text-muted text-xs tabular w-20">{t.winTotal.toFixed(1)} wins</span>
              <div className="w-24 h-1.5 rounded-full bg-surface-raised overflow-hidden">
                <div
                  className={`h-full rounded-full ${
                    t.sosRank <= 10 ? "bg-status-negative" : t.sosRank > 20 ? "bg-status-positive" : "bg-accent"
                  }`}
                  style={{ width: `${Math.max(barPct, 4)}%` }}
                />
              </div>
              <span className="tabular text-text-secondary text-xs w-10 text-right">
                {t.avgOpponentWinTotal.toFixed(1)}
              </span>
            </div>
          );
        })}
      </div>
      <p className="text-xs text-text-muted mt-3">
        Red = top-10 toughest schedule · Green = bottom-10 easiest. In a Rotisserie league,
        opponent quality doesn&apos;t directly reduce a player&apos;s own counting stats the way it
        would in a weekly head-to-head format — treat this as context, not a hard adjustment
        to Draft Score.
      </p>
    </div>
  );
}
