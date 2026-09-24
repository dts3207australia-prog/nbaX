"use client";

import type { FanscoutPlayer } from "@/lib/fanscout";
import { normalizeName } from "@/lib/names";
import { getScheduleStrength } from "@/lib/schedule";
import { TEAM_ABBR_TO_NAME } from "@/lib/teams.reference";

export default function PlayerProfile({
  name,
  players,
  onClose,
}: {
  name: string;
  players: FanscoutPlayer[];
  onClose: () => void;
}) {
  const key = normalizeName(name);
  const player = players.find((p) => normalizeName(p.name) === key);

  const teamFullName = player ? TEAM_ABBR_TO_NAME[player.team] : undefined;
  const teamSos = teamFullName
    ? getScheduleStrength().find((t) => t.team === teamFullName)
    : undefined;

  const row = (label: string, perGame: string | undefined, z: string | undefined) => (
    <tr className="border-t border-border-subtle last:border-b-0">
      <td className="px-3 py-2 text-text-muted text-sm">{label}</td>
      <td className="px-3 py-2 font-medium tabular text-text-primary text-sm">{perGame ?? "—"}</td>
      <td className="px-3 py-2 font-medium tabular text-text-primary text-sm">{z ?? "—"}</td>
    </tr>
  );

  if (!player) {
    return (
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
        <div className="bg-surface border border-border-strong rounded-2xl max-w-md w-full p-5" onClick={(e) => e.stopPropagation()}>
          <p className="text-text-secondary">No data found for {name}.</p>
          <button onClick={onClose} className="mt-3 text-sm text-accent">Close</button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-surface border border-border-strong rounded-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-5 border-b border-border-subtle flex justify-between items-start bg-surface-raised rounded-t-2xl">
          <div>
            <h2 className="font-display text-2xl font-medium text-text-primary tracking-wide">{player.name}</h2>
            <p className="text-sm text-text-muted mt-0.5">
              {player.pos} · {player.team} · rank #{player.rank}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-text-muted hover:text-text-primary text-sm px-2 py-1 transition-colors"
          >
            ✕
          </button>
        </div>

        <div className="p-5 space-y-5">
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-surface-raised border border-border-subtle rounded-xl p-3">
              <div className="text-xs text-text-muted">FanScout rank</div>
              <div className="font-display text-xl font-medium text-text-primary mt-0.5 tabular">#{player.rank}</div>
            </div>
            <div className="bg-surface-raised border border-border-subtle rounded-xl p-3">
              <div className="text-xs text-text-muted">Value score</div>
              <div className="font-display text-xl font-medium text-accent mt-0.5 tabular">{player.total.toFixed(2)}</div>
            </div>
            <div className="bg-surface-raised border border-border-subtle rounded-xl p-3">
              <div className="text-xs text-text-muted">Games / Minutes</div>
              <div className="font-display text-xl font-medium text-text-primary mt-0.5 tabular">
                {player.gamesPlayed ?? "—"} / {player.minutes?.toFixed(0) ?? "—"}
              </div>
            </div>
          </div>

          <div>
            <h3 className="font-display text-sm text-text-secondary mb-2 tracking-wide">2026-27 projection</h3>
            <div className="rounded-xl border border-border-subtle overflow-hidden">
              <table className="w-full">
                <thead className="bg-surface-raised">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-text-muted uppercase tracking-wider">Stat</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-text-muted uppercase tracking-wider">Per game</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-text-muted uppercase tracking-wider">z-score</th>
                  </tr>
                </thead>
                <tbody>
                  {row("PTS", player.pts.toFixed(1), player.zPts.toFixed(2))}
                  {row("3PM", player.tpm.toFixed(1), player.zTpm.toFixed(2))}
                  {row("OREB", player.oreb.toFixed(1), player.zOreb.toFixed(2))}
                  {row("DREB", player.dreb.toFixed(1), player.zDreb.toFixed(2))}
                  {row("AST", player.ast.toFixed(1), player.zAst.toFixed(2))}
                  {row("A/TO", player.ato.toFixed(2), player.zAto.toFixed(2))}
                  {row("STL", player.stl.toFixed(1), player.zStl.toFixed(2))}
                  {row("BLK", player.blk.toFixed(1), player.zBlk.toFixed(2))}
                  {row("FG%", `${(player.fgPct * 100).toFixed(1)}% (${player.fga.toFixed(1)} FGA)`, player.zFgPct.toFixed(2))}
                  {row("FT%", `${(player.ftPct * 100).toFixed(1)}% (${player.fta.toFixed(1)} FTA)`, player.zFtPct.toFixed(2))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-text-muted mt-2">
              3P% isn&apos;t available from this source (no 3-point-attempts data) — 10 of your league&apos;s
              11 categories are covered here.
            </p>
          </div>

          {teamSos && (
            <p className="text-xs text-text-muted">
              {teamSos.team} schedule: ranked <span className="text-text-secondary">#{teamSos.sosRank} of 30</span> toughest
              (avg opponent win total {teamSos.avgOpponentWinTotal.toFixed(1)}). See the Schedule tab for full league context.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
