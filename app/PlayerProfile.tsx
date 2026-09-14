"use client";

import type { ScoredPlayer } from "@/lib/scoring";
import type { ConsensusPlayer } from "@/lib/consensus";
import { normalizeName } from "@/lib/names";

export default function PlayerProfile({
  name,
  myPlayers,
  consensusPlayers,
  onClose,
}: {
  name: string;
  myPlayers: ScoredPlayer[];
  consensusPlayers: ConsensusPlayer[];
  onClose: () => void;
}) {
  const key = normalizeName(name);
  const mine = myPlayers.find((p) => normalizeName(p.name) === key);
  const consensus = consensusPlayers.find((p) => normalizeName(p.name) === key);

  const sources = [
    mine && { label: "My Rankings", rank: mine.rank, total: mine.total, outOf: myPlayers.length },
    consensus && { label: "Consensus", rank: consensus.rank, total: consensus.total, outOf: consensusPlayers.length },
  ].filter(Boolean) as { label: string; rank: number; total: number; outOf: number }[];

  const ranks = sources.map((s) => s.rank);
  const rankRange = ranks.length > 1 ? `#${Math.min(...ranks)}–${Math.max(...ranks)}` : ranks.length ? `#${ranks[0]}` : "—";
  const spread = ranks.length > 1 ? Math.max(...ranks) - Math.min(...ranks) : 0;
  const highVariance = spread >= 15;

  const row = (label: string, mineVal: string | undefined, consVal: string | undefined) => (
    <tr className="border-t border-slate-800">
      <td className="px-3 py-1.5 text-slate-400">{label}</td>
      <td className="px-3 py-1.5 font-mono text-slate-100">{mineVal ?? "—"}</td>
      <td className="px-3 py-1.5 font-mono text-slate-100">{consVal ?? "—"}</td>
    </tr>
  );

  return (
    <div
      className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-slate-900 border border-slate-700 rounded-lg max-w-2xl w-full max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-5 border-b border-slate-800 flex justify-between items-start">
          <div>
            <h2 className="text-xl font-bold text-slate-100">{name}</h2>
            <p className="text-sm text-slate-400 mt-1">
              {mine?.pos ?? consensus?.pos ?? ""}
              {consensus?.team ? ` · ${consensus.team}` : ""}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-100 text-sm px-2 py-1"
          >
            ✕ Close
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-slate-800 rounded p-3">
              <div className="text-xs text-slate-400 uppercase">Consensus rank</div>
              <div className="text-lg font-bold text-slate-100">{rankRange}</div>
            </div>
            <div className="bg-slate-800 rounded p-3">
              <div className="text-xs text-slate-400 uppercase">Sources</div>
              <div className="text-lg font-bold text-slate-100">{sources.length}</div>
            </div>
            <div className={`rounded p-3 ${highVariance ? "bg-amber-900/40 border border-amber-700" : "bg-slate-800"}`}>
              <div className="text-xs text-slate-400 uppercase">Variance</div>
              <div className="text-lg font-bold text-slate-100">
                {highVariance ? "⚠️ High" : sources.length > 1 ? "Low" : "N/A"}
              </div>
            </div>
          </div>

          {highVariance && (
            <p className="text-sm text-amber-400 bg-amber-900/20 border border-amber-800 rounded px-3 py-2">
              Sources disagree by {spread} spots on this player — one view may
              be pricing in something (role change, injury risk, upside) the
              other isn&apos;t. Worth a second look before you draft off just one number.
            </p>
          )}

          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-slate-400 uppercase">
                <th className="px-3 py-1.5 text-left">Source</th>
                <th className="px-3 py-1.5 text-left">Rank</th>
                <th className="px-3 py-1.5 text-left">Score</th>
              </tr>
            </thead>
            <tbody>
              {sources.map((s) => (
                <tr key={s.label} className="border-t border-slate-800">
                  <td className="px-3 py-1.5 text-slate-200">{s.label}</td>
                  <td className="px-3 py-1.5 font-mono">#{s.rank} <span className="text-slate-500">/ {s.outOf}</span></td>
                  <td className="px-3 py-1.5 font-mono">{s.total.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div>
            <h3 className="text-sm font-semibold text-slate-300 mb-2">Category breakdown</h3>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-slate-400 uppercase">
                  <th className="px-3 py-1.5 text-left">Category</th>
                  <th className="px-3 py-1.5 text-left">My Rankings</th>
                  <th className="px-3 py-1.5 text-left">Consensus (z)</th>
                </tr>
              </thead>
              <tbody>
                {row("FG%", mine ? `${(mine.fgPct * 100).toFixed(1)}%` : undefined, consensus?.fgZ.toFixed(2))}
                {row("FT%", mine ? `${(mine.ftPct * 100).toFixed(1)}%` : undefined, consensus?.ftZ.toFixed(2))}
                {row("3PM", mine?.tpm.toFixed(1), consensus?.tpmZ.toFixed(2))}
                {row("3P%", mine ? `${(mine.tpPct * 100).toFixed(1)}%` : undefined, consensus?.tpPctZ.toFixed(2))}
                {row("OREB", mine?.oreb.toFixed(1), consensus?.orebZ.toFixed(2))}
                {row("DREB", mine?.dreb.toFixed(1), consensus?.drebZ.toFixed(2))}
                {row("AST", mine?.ast.toFixed(1), consensus?.astZ.toFixed(2))}
                {row("A/TO", mine?.ato.toFixed(2), consensus?.atoZ.toFixed(2))}
                {row("STL", mine?.stl.toFixed(1), consensus?.stlZ.toFixed(2))}
                {row("BLK", mine?.blk.toFixed(1), consensus?.blkZ.toFixed(2))}
                {row("PTS", mine?.pts.toFixed(1), consensus?.ptsZ.toFixed(2))}
              </tbody>
            </table>
            <p className="text-xs text-slate-500 mt-2">
              &quot;My Rankings&quot; shows raw per-game stats; &quot;Consensus&quot; shows that
              source&apos;s own pre-computed z-score per category, so the two columns aren&apos;t
              on the same scale — compare direction and rank, not the raw numbers.
            </p>
          </div>

          {consensus && (
            <div className="text-xs text-slate-500">
              Consensus tier: <span className="text-slate-300">{consensus.tier}</span> ·
              Cat wins: <span className="text-slate-300">{consensus.catWins}</span> ·
              {consensus.note}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
