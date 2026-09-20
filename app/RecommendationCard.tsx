"use client";

import type { Recommendation, Confidence } from "@/lib/recommendation";

const CONFIDENCE_COLOR: Record<Confidence, string> = {
  HIGH: "text-status-positive border-status-positive/30 bg-[color:var(--status-positive-bg)]",
  MEDIUM: "text-status-warning border-status-warning/30 bg-[color:var(--status-warning-bg)]",
  LOW: "text-text-muted border-border-subtle bg-surface-raised",
};

const ICON: Record<Recommendation["reasons"][number]["icon"], string> = {
  need: "🔴",
  strength: "🟢",
  caution: "🟡",
};

export default function RecommendationCard({
  recommendations,
  onSelectPlayer,
  hasComparisonData,
  onDraftPlayer,
}: {
  recommendations: Recommendation[];
  onSelectPlayer: (name: string) => void;
  hasComparisonData: boolean;
  onDraftPlayer?: (name: string) => void;
}) {
  if (recommendations.length === 0) {
    return (
      <div className="rounded-xl border border-border-subtle bg-surface p-5 mb-6 text-sm text-text-muted">
        No available players to recommend — everyone in your pool is marked drafted.
      </div>
    );
  }

  const [best, ...next] = recommendations;

  return (
    <div className="rounded-xl border border-accent/30 bg-gradient-to-br from-surface to-surface-raised p-5 mb-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex-1 min-w-[240px]">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-accent text-sm">⭐</span>
            <span className="text-xs font-medium text-text-muted uppercase tracking-wider">Best pick</span>
          </div>
          <button
            onClick={() => onSelectPlayer(best.player.name)}
            className="font-display text-2xl font-medium text-text-primary hover:text-accent transition-colors text-left"
          >
            {best.player.name}
          </button>
          <div className="text-text-muted text-sm mt-0.5">{best.player.pos}</div>

          <ul className="mt-3 space-y-1">
            {best.reasons.map((r, i) => (
              <li key={i} className="text-sm text-text-secondary flex items-center gap-2">
                <span>{ICON[r.icon]}</span>
                <span>{r.text}</span>
              </li>
            ))}
            {best.reasons.length === 0 && (
              <li className="text-sm text-text-muted">Solid value pick — no standout category or need signal.</li>
            )}
          </ul>
        </div>

        <div className="flex flex-col items-end gap-2">
          <div className="text-right">
            <div className="font-display text-3xl font-medium text-accent tabular">
              {best.draftScore.toFixed(1)}
            </div>
            <div className="text-xs text-text-muted">Draft Score</div>
          </div>
          <span className={`text-xs font-medium border rounded-full px-2.5 py-1 ${CONFIDENCE_COLOR[best.confidence]}`}>
            Confidence: {best.confidence}
          </span>
          {onDraftPlayer && (
            <button
              onClick={() => onDraftPlayer(best.player.name)}
              className="text-sm font-medium bg-accent text-[#0A0E14] rounded-lg px-4 py-2 hover:brightness-110 transition-all"
            >
              Draft {best.player.name.split(" ").slice(-1)[0]}
            </button>
          )}
        </div>
      </div>

      {next.length > 0 && (
        <div className="mt-4 pt-4 border-t border-border-subtle flex flex-wrap gap-x-2 gap-y-2">
          {next.map((r) => (
            <div key={r.player.name} className="flex items-center gap-1.5 bg-surface-raised border border-border-subtle rounded-lg pl-3 pr-1.5 py-1">
              <button
                onClick={() => onSelectPlayer(r.player.name)}
                className="text-sm text-text-secondary hover:text-accent transition-colors"
              >
                {r.player.name} <span className="tabular font-medium">{r.draftScore.toFixed(1)}</span>
              </button>
              {onDraftPlayer && (
                <button
                  onClick={() => onDraftPlayer(r.player.name)}
                  className="text-xs bg-accent/90 text-[#0A0E14] rounded px-2 py-1 font-medium hover:bg-accent transition-colors"
                >
                  Draft
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {!hasComparisonData && (
        <p className="text-xs text-text-muted mt-3">
          Confidence ratings are limited without a second source to compare against.
        </p>
      )}
      <p className="text-xs text-text-muted mt-1">
        ADP isn&apos;t factored in yet — add ESPN/Yahoo ranking exports to sharpen this further.
      </p>
    </div>
  );
}
