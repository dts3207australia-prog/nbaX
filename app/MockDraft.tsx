"use client";

import { useEffect, useMemo, useState } from "react";
import type { FanscoutPlayer } from "@/lib/fanscout";
import { normalizeName } from "@/lib/names";
import {
  MOCK_NUM_TEAMS, MOCK_ROUNDS, type MockPick,
  teamIndexForOverallPick, teamRosterFromPicks, simulateCpuPick,
  teamCategorySummary, CATEGORY_KEYS,
} from "@/lib/mockDraft";
import { computeRecommendations } from "@/lib/recommendation";
import RecommendationCard from "./RecommendationCard";

const STORAGE_KEY = "nba-draft-manager-mock-v2";
const TOTAL_PICKS = MOCK_NUM_TEAMS * MOCK_ROUNDS;
const CATEGORY_LABEL: Record<string, string> = {
  zFgPct: "FG%", zFtPct: "FT%", zTpm: "3PM", zOreb: "OREB", zDreb: "DREB",
  zAst: "AST", zAto: "A/TO", zStl: "STL", zBlk: "BLK", zPts: "PTS",
};

type MockState = { picks: MockPick[]; userTeamIndex: number | null };

export default function MockDraft({
  players,
  onSelectPlayer,
}: {
  players: FanscoutPlayer[];
  onSelectPlayer: (name: string) => void;
}) {
  const [state, setState] = useState<MockState>({ picks: [], userTeamIndex: null });
  const [loaded, setLoaded] = useState(false);
  const [search, setSearch] = useState("");
  const [viewTeam, setViewTeam] = useState<number | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try { setState(JSON.parse(saved)); } catch {}
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (loaded) localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state, loaded]);

  const { picks, userTeamIndex } = state;
  const draftedKeys = useMemo(() => new Set(picks.map((p) => normalizeName(p.playerName))), [picks]);
  const available = useMemo(() => players.filter((p) => !draftedKeys.has(normalizeName(p.name))), [players, draftedKeys]);

  const nextOverall = picks.length + 1;
  const draftComplete = picks.length >= TOTAL_PICKS;
  const current = draftComplete ? null : teamIndexForOverallPick(nextOverall);
  const isUserTurn = current !== null && userTeamIndex !== null && current.teamIndex === userTeamIndex;

  useEffect(() => {
    if (userTeamIndex === null || draftComplete || !current) return;
    if (current.teamIndex === userTeamIndex) return;
    const timer = setTimeout(() => {
      const playerName = simulateCpuPick(current.teamIndex, picks, players);
      if (!playerName) return;
      setState((prev) => ({
        ...prev,
        picks: [...prev.picks, { ...current, overallPick: nextOverall, playerName }],
      }));
    }, 180);
    return () => clearTimeout(timer);
  }, [picks, userTeamIndex, draftComplete, current, nextOverall, players]);

  const userRoster = userTeamIndex !== null ? teamRosterFromPicks(picks, userTeamIndex, players) : [];

  const recommendations = useMemo(() => {
    if (!isUserTurn) return [];
    return computeRecommendations({
      availablePlayers: available,
      allPlayers: players,
      myRosterPlayers: userRoster,
    });
  }, [isUserTurn, available, players, userRoster]);

  const draftPlayer = (name: string) => {
    if (!current) return;
    setState((prev) => ({
      ...prev,
      picks: [...prev.picks, { ...current, overallPick: nextOverall, playerName: name }],
    }));
  };

  const reset = () => {
    if (confirm("Start a new mock draft? This clears the current one.")) {
      setState({ picks: [], userTeamIndex: null });
      setViewTeam(null);
    }
  };

  const teamLabel = (idx: number) => (idx === userTeamIndex ? "You" : `Team ${idx + 1}`);

  const filteredAvailable = useMemo(
    () => available.filter((p) => p.name.toLowerCase().includes(search.toLowerCase())).slice(0, 60),
    [available, search]
  );

  if (userTeamIndex === null) {
    return (
      <div className="max-w-xl">
        <h2 className="font-display text-xl font-medium text-text-primary tracking-wide mb-2">
          Mock Draft
        </h2>
        <p className="text-sm text-text-muted mb-5">
          Practice a full {MOCK_NUM_TEAMS}-team, {MOCK_ROUNDS}-round snake draft against CPU
          opponents that draft using the same recommendation engine as you — roster-need aware,
          not just best-player-available. Pick your draft slot to start.
        </p>
        <div className="grid grid-cols-4 gap-2">
          {Array.from({ length: MOCK_NUM_TEAMS }, (_, i) => (
            <button
              key={i}
              onClick={() => setState({ picks: [], userTeamIndex: i })}
              className="bg-surface border border-border-subtle hover:border-accent rounded-lg py-3 text-sm font-medium text-text-primary transition-colors"
            >
              Pick {i + 1}
            </button>
          ))}
        </div>
      </div>
    );
  }

  const selectedTeam = viewTeam ?? userTeamIndex;
  const selectedRoster = teamRosterFromPicks(picks, selectedTeam, players);
  const categorySummary = teamCategorySummary(picks, selectedTeam, players);
  const maxAbsCat = Math.max(1, ...CATEGORY_KEYS.map((k) => Math.abs(categorySummary[k])));

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <h2 className="font-display text-xl font-medium text-text-primary tracking-wide">
            Mock Draft — {draftComplete ? "Complete" : `Round ${current!.round}, Pick ${current!.pickInRound}`}
          </h2>
          <p className="text-sm text-text-muted mt-0.5">
            {draftComplete
              ? `All ${TOTAL_PICKS} picks made.`
              : `Overall #${nextOverall} of ${TOTAL_PICKS} — ${teamLabel(current!.teamIndex)}${!isUserTurn ? " is picking…" : ""}`}
          </p>
        </div>
        <button onClick={reset} className="text-xs text-status-negative/80 hover:text-status-negative underline">
          Start new mock draft
        </button>
      </div>

      {isUserTurn && !draftComplete && (
        <>
          <RecommendationCard
            recommendations={recommendations}
            onSelectPlayer={onSelectPlayer}
            onDraftPlayer={draftPlayer}
          />
          <div className="mb-2">
            <h3 className="font-display text-sm text-text-secondary tracking-wide mb-2">
              Or pick anyone else — available players (top 60 shown, search to narrow)
            </h3>
            <input
              type="text"
              placeholder="Search all available players..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-surface border border-border-subtle rounded-lg px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:ring-1 focus:ring-accent w-72"
            />
          </div>
          <div className="rounded-xl border border-border-subtle bg-surface overflow-hidden mb-6 max-h-72 overflow-y-auto">
            {filteredAvailable.map((p) => (
              <div key={p.name} className="flex items-center justify-between px-4 py-2 border-b border-border-subtle last:border-b-0 hover:bg-surface-raised">
                <button onClick={() => onSelectPlayer(p.name)} className="text-sm text-text-primary hover:text-accent transition-colors text-left">
                  {p.name} <span className="text-text-muted text-xs">{p.pos}</span>
                </button>
                <button
                  onClick={() => draftPlayer(p.name)}
                  className="text-xs bg-accent text-[#0A0E14] rounded px-3 py-1 font-medium hover:brightness-110 transition-all"
                >
                  Draft
                </button>
              </div>
            ))}
            {filteredAvailable.length === 0 && (
              <div className="px-4 py-3 text-sm text-text-muted italic">No matches</div>
            )}
          </div>
        </>
      )}

      <div className="mb-6">
        <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
          <h3 className="font-display text-sm text-text-secondary tracking-wide">Team roster</h3>
          <div className="flex flex-wrap gap-1">
            {Array.from({ length: MOCK_NUM_TEAMS }, (_, i) => (
              <button
                key={i}
                onClick={() => setViewTeam(i)}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                  selectedTeam === i
                    ? "bg-accent text-[#0A0E14]"
                    : "bg-surface border border-border-subtle text-text-secondary hover:text-text-primary"
                }`}
              >
                {teamLabel(i)}
              </button>
            ))}
          </div>
        </div>

        <div className="grid lg:grid-cols-5 gap-4">
          <div className="lg:col-span-3 rounded-xl border border-border-subtle bg-surface overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-surface-raised text-text-muted">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider">Player</th>
                  <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider">Pos</th>
                  <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider">Rank</th>
                  <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider">Value</th>
                </tr>
              </thead>
              <tbody>
                {selectedRoster.length === 0 && (
                  <tr><td colSpan={4} className="px-3 py-4 text-sm text-text-muted italic">No picks yet</td></tr>
                )}
                {selectedRoster.map((rp) => {
                  const key = normalizeName(rp.name);
                  const player = players.find((p) => normalizeName(p.name) === key);
                  return (
                    <tr key={rp.name} className="border-t border-border-subtle">
                      <td className="px-3 py-2">
                        <button onClick={() => onSelectPlayer(rp.name)} className="text-text-primary hover:text-accent transition-colors text-left font-medium">
                          {rp.name}
                        </button>
                      </td>
                      <td className="px-3 py-2 text-text-muted text-xs">{rp.pos}</td>
                      <td className="px-3 py-2 tabular text-text-secondary text-xs">
                        {player ? `#${player.rank}` : "—"}
                      </td>
                      <td className="px-3 py-2 tabular text-accent text-xs font-medium">
                        {player ? player.total.toFixed(2) : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="lg:col-span-2 rounded-xl border border-border-subtle bg-surface p-4">
            <h4 className="text-xs font-medium text-text-muted uppercase tracking-wider mb-3">
              Category strength ({teamLabel(selectedTeam)})
            </h4>
            <div className="space-y-1.5">
              {CATEGORY_KEYS.map((k) => {
                const v = categorySummary[k];
                const pct = (Math.abs(v) / maxAbsCat) * 50;
                return (
                  <div key={k} className="flex items-center gap-2 text-xs">
                    <span className="w-10 text-text-muted">{CATEGORY_LABEL[k]}</span>
                    <div className="flex-1 h-3 flex items-center relative bg-surface-raised rounded overflow-hidden">
                      <div className="absolute left-1/2 top-0 bottom-0 w-px bg-border-strong" />
                      <div
                        className={`h-full ${v >= 0 ? "bg-status-positive" : "bg-status-negative"}`}
                        style={{
                          width: `${pct}%`,
                          marginLeft: v >= 0 ? "50%" : `${50 - pct}%`,
                        }}
                      />
                    </div>
                    <span className={`w-12 tabular text-right ${v >= 0 ? "text-status-positive" : "text-status-negative"}`}>
                      {v.toFixed(1)}
                    </span>
                  </div>
                );
              })}
            </div>
            <p className="text-xs text-text-muted mt-3">
              Sum of each player&apos;s FanScout category z-score. 3P% isn&apos;t shown — not
              available from the underlying projection source.
            </p>
          </div>
        </div>
      </div>

      <div>
        <h3 className="font-display text-sm text-text-secondary mb-2 tracking-wide">Draft log</h3>
        <div className="rounded-xl border border-border-subtle bg-surface divide-y divide-border-subtle max-h-96 overflow-y-auto">
          {[...picks].reverse().map((p) => (
            <div key={p.overallPick} className="flex items-center justify-between px-4 py-2 text-sm">
              <span className="text-text-muted text-xs tabular w-16">R{p.round}.{p.pickInRound}</span>
              <span className="flex-1 text-text-primary">{p.playerName}</span>
              <span className={`text-xs ${p.teamIndex === userTeamIndex ? "text-accent font-medium" : "text-text-muted"}`}>
                {teamLabel(p.teamIndex)}
              </span>
            </div>
          ))}
          {picks.length === 0 && <div className="px-4 py-3 text-sm text-text-muted italic">No picks yet</div>}
        </div>
      </div>
    </div>
  );
}
