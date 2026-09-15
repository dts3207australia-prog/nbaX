"use client";

import type { ScoredPlayer } from "@/lib/scoring";
import type { ConsensusPlayer } from "@/lib/consensus";
import type { FanscoutPlayer } from "@/lib/fanscout";
import { normalizeName } from "@/lib/names";
import { getScheduleStrength } from "@/lib/schedule";
import { TEAM_ABBR_TO_NAME } from "@/lib/teams.reference";

export default function PlayerProfile({
  name,
  myPlayers,
  consensusPlayers,
  fanscoutPlayers,
  onClose,
}: {
  name: string;
  myPlayers: ScoredPlayer[];
  consensusPlayers: ConsensusPlayer[];
  fanscoutPlayers: FanscoutPlayer[];
  onClose: () => void;
}) {
  const key = normalizeName(name);
  const mine = myPlayers.find((p) => normalizeName(p.name) === key);
  const consensus = consensusPlayers.find((p) => normalizeName(p.name) === key);
  const fanscout = fanscoutPlayers.find((p) => normalizeName(p.name) === key);

  const teamFullName = fanscout ? TEAM_ABBR_TO_NAME[fanscout.team] : undefined;
  const teamSos = teamFullName
    ? getScheduleStrength().find((t) => t.team === teamFullName)
    : undefined;

  const sources = [
    mine && { label: "My Rankings", rank: mine.rank, total: mine.total, outOf: myPlayers.length },
    consensus && { label: "Consensus", rank: consensus.rank, total: consensus.total, outOf: consensusPlayers.length },
    fanscout && { label: "FanScout", rank: fanscout.rank, total: fanscout.total, outOf: fanscoutPlayers.length },
  ].filter(Boolean) as { label: string; rank: number; total: number; outOf: number }[];

  // Normalize each source's rank onto a common 200-player scale before
  // comparing — pool sizes differ (My Rankings/FanScout: 481, Consensus: 200).
  const scaledRanks = sources.map((s) => (s.rank / s.outOf) * 200);
  const rankRange = sources.length > 1
    ? `#${Math.round(Math.min(...scaledRanks))}–${Math.round(Math.max(...scaledRanks))}`
    : sources.length ? `#${sources[0].rank}` : "—";
  const spread = scaledRanks.length > 1 ? Math.max(...scaledRanks) - Math.min(...scaledRanks) : 0;
  const highVariance = spread >= 15;

  const row = (label: string, mineVal: string | undefined, consVal: string | undefined) => (
    <tr className="border-b border-border-subtle last:border-b-0">
      <td className="px-3 py-2 text-text-muted text-sm">{label}</td>
      <td className="px-3 py-2 font-medium tabular text-text-primary text-sm">{mineVal ?? "—"}</td>
      <td className="px-3 py-2 font-medium tabular text-text-primary text-sm">{consVal ?? "—"}</td>
    </tr>
  );

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
            <h2 className="font-display text-2xl font-medium text-text-primary tracking-wide">{name}</h2>
            <p className="text-sm text-text-muted mt-0.5">
              {mine?.pos ?? consensus?.pos ?? ""}
              {(consensus?.team ?? fanscout?.team) ? ` · ${consensus?.team ?? fanscout?.team}` : ""}
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
              <div className="text-xs text-text-muted">Rank range (normalized /200)</div>
              <div className="font-display text-xl font-medium text-text-primary mt-0.5 tabular">{rankRange}</div>
            </div>
            <div className="bg-surface-raised border border-border-subtle rounded-xl p-3">
              <div className="text-xs text-text-muted">Sources</div>
              <div className="font-display text-xl font-medium text-text-primary mt-0.5 tabular">{sources.length}</div>
            </div>
            <div
              className={`rounded-xl p-3 border ${
                highVariance
                  ? "bg-[color:var(--status-warning-bg)] border-status-warning/30"
                  : "bg-surface-raised border-border-subtle"
              }`}
            >
              <div className="text-xs text-text-muted">Variance</div>
              <div
                className={`font-display text-xl font-medium mt-0.5 ${
                  highVariance ? "text-status-warning" : "text-text-primary"
                }`}
              >
                {highVariance ? "High" : sources.length > 1 ? "Low" : "N/A"}
              </div>
            </div>
          </div>

          {highVariance && (
            <p className="text-sm text-status-warning bg-[color:var(--status-warning-bg)] border border-status-warning/30 rounded-lg px-3 py-2.5">
              Sources disagree by roughly {Math.round(spread)} spots (normalized to a 200-player scale) on this player — one view may
              be pricing in something (role change, injury risk, upside) the
              other isn&apos;t. Worth a second look before you draft off just one number.
            </p>
          )}

          <div className="rounded-xl border border-border-subtle overflow-hidden">
            <table className="w-full">
              <thead className="bg-surface-raised">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-text-muted uppercase tracking-wider">Source</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-text-muted uppercase tracking-wider">Rank</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-text-muted uppercase tracking-wider">Score</th>
                </tr>
              </thead>
              <tbody>
                {sources.map((s) => (
                  <tr key={s.label} className="border-t border-border-subtle">
                    <td className="px-3 py-2 text-text-secondary text-sm">{s.label}</td>
                    <td className="px-3 py-2 tabular text-sm text-text-primary">#{s.rank} <span className="text-text-muted">/ {s.outOf}</span></td>
                    <td className="px-3 py-2 tabular text-sm font-medium text-accent">{s.total.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div>
            <h3 className="font-display text-sm text-text-secondary mb-2 tracking-wide">Category breakdown</h3>
            <div className="rounded-xl border border-border-subtle overflow-hidden">
              <table className="w-full">
                <thead className="bg-surface-raised">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-text-muted uppercase tracking-wider">Category</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-text-muted uppercase tracking-wider">My Rankings</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-text-muted uppercase tracking-wider">Consensus (z)</th>
                  </tr>
                </thead>
                <tbody>
                  {row("FG%", mine ? `${(mine.fgPct * 100).toFixed(1)}%` : undefined, consensus?.fgZ.toFixed(2))}
                  {row("FT%", mine ? `${(mine.ftPct * 100).toFixed(1)}%` : undefined, consensus?.ftZ.toFixed(2))}
                  {row("3PM", mine?.tpm.toFixed(1), consensus?.tpmZ.toFixed(2))}
                  {row("3P%", mine ? (mine.tpDataAvailable ? `${(mine.tpPct * 100).toFixed(1)}%` : "—") : undefined, consensus?.tpPctZ.toFixed(2))}
                  {row("OREB", mine?.oreb.toFixed(1), consensus?.orebZ.toFixed(2))}
                  {row("DREB", mine?.dreb.toFixed(1), consensus?.drebZ.toFixed(2))}
                  {row("AST", mine?.ast.toFixed(1), consensus?.astZ.toFixed(2))}
                  {row("A/TO", mine?.ato.toFixed(2), consensus?.atoZ.toFixed(2))}
                  {row("STL", mine?.stl.toFixed(1), consensus?.stlZ.toFixed(2))}
                  {row("BLK", mine?.blk.toFixed(1), consensus?.blkZ.toFixed(2))}
                  {row("PTS", mine?.pts.toFixed(1), consensus?.ptsZ.toFixed(2))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-text-muted mt-2">
              &quot;My Rankings&quot; shows raw per-game stats; &quot;Consensus&quot; shows that
              source&apos;s own pre-computed z-score per category, so the two columns aren&apos;t
              on the same scale — compare direction and rank, not the raw numbers.
            </p>
          </div>

          {fanscout && (
            <div>
              <h3 className="font-display text-sm text-text-secondary mb-2 tracking-wide">FanScout projection (2026-27)</h3>
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
                    <tr className="border-t border-border-subtle"><td className="px-3 py-2 text-text-muted text-sm">PTS</td><td className="px-3 py-2 tabular text-sm text-text-primary">{fanscout.pts.toFixed(1)}</td><td className="px-3 py-2 tabular text-sm text-text-primary">{fanscout.zPts.toFixed(2)}</td></tr>
                    <tr className="border-t border-border-subtle"><td className="px-3 py-2 text-text-muted text-sm">3PM</td><td className="px-3 py-2 tabular text-sm text-text-primary">{fanscout.tpm.toFixed(1)}</td><td className="px-3 py-2 tabular text-sm text-text-primary">{fanscout.zTpm.toFixed(2)}</td></tr>
                    <tr className="border-t border-border-subtle"><td className="px-3 py-2 text-text-muted text-sm">OREB</td><td className="px-3 py-2 tabular text-sm text-text-primary">{fanscout.oreb.toFixed(1)}</td><td className="px-3 py-2 tabular text-sm text-text-primary">{fanscout.zOreb.toFixed(2)}</td></tr>
                    <tr className="border-t border-border-subtle"><td className="px-3 py-2 text-text-muted text-sm">DREB</td><td className="px-3 py-2 tabular text-sm text-text-primary">{fanscout.dreb.toFixed(1)}</td><td className="px-3 py-2 tabular text-sm text-text-primary">{fanscout.zDreb.toFixed(2)}</td></tr>
                    <tr className="border-t border-border-subtle"><td className="px-3 py-2 text-text-muted text-sm">AST</td><td className="px-3 py-2 tabular text-sm text-text-primary">{fanscout.ast.toFixed(1)}</td><td className="px-3 py-2 tabular text-sm text-text-primary">{fanscout.zAst.toFixed(2)}</td></tr>
                    <tr className="border-t border-border-subtle"><td className="px-3 py-2 text-text-muted text-sm">A/TO</td><td className="px-3 py-2 tabular text-sm text-text-primary">{fanscout.ato.toFixed(2)}</td><td className="px-3 py-2 tabular text-sm text-text-primary">{fanscout.zAto.toFixed(2)}</td></tr>
                    <tr className="border-t border-border-subtle"><td className="px-3 py-2 text-text-muted text-sm">STL</td><td className="px-3 py-2 tabular text-sm text-text-primary">{fanscout.stl.toFixed(1)}</td><td className="px-3 py-2 tabular text-sm text-text-primary">{fanscout.zStl.toFixed(2)}</td></tr>
                    <tr className="border-t border-border-subtle"><td className="px-3 py-2 text-text-muted text-sm">BLK</td><td className="px-3 py-2 tabular text-sm text-text-primary">{fanscout.blk.toFixed(1)}</td><td className="px-3 py-2 tabular text-sm text-text-primary">{fanscout.zBlk.toFixed(2)}</td></tr>
                    <tr className="border-t border-border-subtle"><td className="px-3 py-2 text-text-muted text-sm">FG%</td><td className="px-3 py-2 tabular text-sm text-text-primary">{(fanscout.fgPct * 100).toFixed(1)}% <span className="text-text-muted">({fanscout.fga.toFixed(1)} FGA)</span></td><td className="px-3 py-2 tabular text-sm text-text-primary">{fanscout.zFgPct.toFixed(2)}</td></tr>
                    <tr className="border-t border-border-subtle"><td className="px-3 py-2 text-text-muted text-sm">FT%</td><td className="px-3 py-2 tabular text-sm text-text-primary">{(fanscout.ftPct * 100).toFixed(1)}% <span className="text-text-muted">({fanscout.fta.toFixed(1)} FTA)</span></td><td className="px-3 py-2 tabular text-sm text-text-primary">{fanscout.zFtPct.toFixed(2)}</td></tr>
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-text-muted mt-2">
                {fanscout.team} · projected {fanscout.gamesPlayed ?? "—"} games, {fanscout.minutes?.toFixed(1) ?? "—"} min/game.
                Matches 10 of your league&apos;s 11 categories — only 3P% isn&apos;t available from this source.
              </p>
              {teamSos && (
                <p className="text-xs text-text-muted mt-2">
                  {teamSos.team} schedule: ranked <span className="text-text-secondary">#{teamSos.sosRank} of 30</span> toughest
                  (avg opponent win total {teamSos.avgOpponentWinTotal.toFixed(1)}). See the Schedule tab for full league context.
                </p>
              )}
            </div>
          )}

          {consensus && (
            <div className="text-xs text-text-muted flex flex-wrap gap-x-4 gap-y-1">
              <span>Consensus tier: <span className="text-text-secondary">{consensus.tier}</span></span>
              <span>Cat wins: <span className="text-text-secondary">{consensus.catWins}</span></span>
              <span>{consensus.note}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
