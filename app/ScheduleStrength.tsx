"use client";

import { useEffect, useMemo, useState } from "react";
import { getScheduleStrength, getScheduleStrengthForWindow } from "@/lib/schedule";

type WindowOption = 7 | 14 | 30 | "full";

export default function ScheduleStrength() {
  const [window, setWindow] = useState<WindowOption>(30);
  // Avoids a hydration mismatch: this reads the real current date, which
  // will differ between the static build snapshot and whenever the page is
  // actually opened. Render nothing date-dependent until after mount.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const { teams, windowLabel } = useMemo(() => {
    if (!mounted) return { teams: [], windowLabel: "" };
    if (window === "full") {
      return { teams: getScheduleStrength(), windowLabel: "Full 2026-27 season" };
    }
    const { teams, windowStart, windowEnd } = getScheduleStrengthForWindow(window);
    return {
      teams: teams.filter((t) => t.games > 0),
      windowLabel: `${windowStart} to ${windowEnd}`,
    };
  }, [window, mounted]);

  if (!mounted) {
    return <div className="max-w-3xl text-sm text-text-muted">Loading schedule…</div>;
  }

  const maxAvg = Math.max(...teams.map((t) => t.avgOpponentWinTotal));
  const minAvg = Math.min(...teams.map((t) => t.avgOpponentWinTotal));
  const range = maxAvg - minAvg || 1;
  const n = teams.length;

  return (
    <div className="max-w-3xl">
      <div className="mb-4">
        <h2 className="font-display text-xl font-medium text-text-primary tracking-wide">
          Strength of Schedule
        </h2>
        <p className="text-sm text-text-muted mt-1">
          Ranked by average projected win total of opponents (BetMGM win totals, Aug 23).
          Lower = easier stretch, worth targeting for streaming or a bench swap.
        </p>
      </div>

      <div className="inline-flex rounded-lg border border-border-subtle bg-surface p-1 mb-4">
        {([7, 14, 30, "full"] as WindowOption[]).map((w) => (
          <button
            key={w}
            onClick={() => setWindow(w)}
            className={`px-3.5 py-1.5 rounded-md text-sm font-medium transition-colors ${
              window === w ? "bg-accent text-[#0A0E14]" : "text-text-secondary hover:text-text-primary"
            }`}
          >
            {w === "full" ? "Full season" : `Next ${w} days`}
          </button>
        ))}
      </div>

      <p className="text-xs text-text-muted mb-3">
        {window === "full" ? "All 80 scheduled games per team." : `Window: ${windowLabel}`}
        {window !== "full" && new Date() < new Date("2026-10-21") && " (anchored to opening night, since the season hasn't started yet)"}
      </p>

      <div className="rounded-xl border border-border-subtle bg-surface divide-y divide-border-subtle overflow-hidden">
        {teams.map((t) => {
          const barPct = ((t.avgOpponentWinTotal - minAvg) / range) * 100;
          const isTough = t.sosRank <= Math.ceil(n * 0.33);
          const isEasy = t.sosRank > Math.floor(n * 0.67);
          return (
            <div key={t.team} className="flex items-center gap-3 px-4 py-2.5 text-sm">
              <span className="w-6 text-text-muted tabular text-xs">{t.sosRank}</span>
              <span className="flex-1 text-text-primary font-medium">{t.team}</span>
              <span className="text-text-muted text-xs tabular w-16">{t.games} gm</span>
              <div className="w-24 h-1.5 rounded-full bg-surface-raised overflow-hidden">
                <div
                  className={`h-full rounded-full ${
                    isTough ? "bg-status-negative" : isEasy ? "bg-status-positive" : "bg-accent"
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
        Red = toughest third · Green = easiest third. Teams with a soft stretch and a healthy
        number of games in that window are the ones worth streaming a bench piece from, or
        prioritizing in a trade, over the next few weeks. In Rotisserie, opponent quality doesn&apos;t
        directly change a player&apos;s own stats the way it would in weekly head-to-head — this is
        a timing signal, not a value adjustment.
      </p>
    </div>
  );
}
