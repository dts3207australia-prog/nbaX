"use client";

import { useEffect, useMemo, useState } from "react";
import type { ScoredPlayer } from "@/lib/scoring";
import type { ConsensusPlayer } from "@/lib/consensus";
import { normalizeName } from "@/lib/names";
import {
  MOCK_NUM_TEAMS, MOCK_ROUNDS, type MockPick,
  teamIndexForOverallPick, teamRosterFromPicks, simulateCpuPick,
} from "@/lib/mockDraft";
import { computeRecommendations } from "@/lib/recommendation";
import RecommendationCard from "./RecommendationCard";

const STORAGE_KEY = "nba-draft-manager-mock-v1";
const TOTAL_PICKS = MOCK_NUM_TEAMS * MOCK_ROUNDS;

type MockState = { picks: MockPick[]; userTeamIndex: number | null };

export default function MockDraft({
  myPlayers,
  consensusPlayers,
  onSelectPlayer,
}: {
  myPlayers: ScoredPlayer[];
  consensusPlayers: ConsensusPlayer[];
  onSelectPlayer: (name: string) => void;
}) {
  const [state, setState] = useState<MockState>({ picks: [], userTeamIndex: null });
  const [loaded, setLoaded] = useState(false);
  const [search, setSearch] = useState("");

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
  const available = useMemo(() => myPlayers.filter((p) => !draftedKeys.has(normalizeName(p.name))), [myPlayers, draftedKeys]);

  const nextOverall = picks.length + 1;
  const draftComplete = picks.length >= TOTAL_PICKS;
  const current = draftComplete ? null : teamIndexForOverallPick(nextOverall);
  const isUserTurn = current !== null && userTeamIndex !== null && current.teamIndex === userTeamIndex;

  // Auto-advance CPU turns.
  useEffect(() => {
    if (userTeamIndex === null || draftComplete || !current) return;
    if (current.teamIndex === userTeamIndex) return;
    const timer = setTimeout(() => {
      const playerName = simulateCpuPick(current.teamIndex, picks, myPlayers, consensusPlayers);
      if (!playerName) return;
      setState((prev) => ({
        ...prev,
        picks: [...prev.picks, { ...current, overallPick: nextOverall, playerName }],
      }));
    }, 180);
    return () => clearTimeout(timer);
  }, [picks, userTeamIndex, draftComplete, current, nextOverall, myPlayers, consensusPlayers]);

  const userRoster = userTeamIndex !== null ? teamRosterFromPicks(picks, userTeamIndex, myPlayers) : [];

  const recommendations = useMemo(() => {
    if (!isUserTurn) return [];
    const availableConsensus = consensusPlayers.filter((p) => !draftedKeys.has(normalizeName(p.name)));
    return computeRecommendations({
      availableMyPlayers: available,
      availableConsensus,
      allMyPlayers: myPlayers,
      allConsensus: consensusPlayers,
      myRosterPlayers: userRoster,
    });
  }, [isUserTurn, available, myPlayers, userRoster, consensusPlayers, draftedKeys]);

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
              : `Overall #${nextOverall} of ${TOTAL_PICKS} — ${draftComplete ? "" : teamLabel(current!.teamIndex)}${!draftComplete && !isUserTurn ? " is picking…" : ""}`}
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
            hasComparisonData={consensusPlayers.length > 0}
          />
          <div className="mb-4">
            <input
              type="text"
              placeholder="Or search any player to draft..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-surface border border-border-subtle rounded-lg px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:ring-1 focus:ring-accent w-72"
            />
          </div>
          {search && (
            <div className="rounded-xl border border-border-subtle bg-surface overflow-hidden mb-6 max-h-72 overflow-y-auto">
              {filteredAvailable.map((p) => (
                <div key={p.name} className="flex items-center justify-between px-4 py-2 border-b border-border-subtle last:border-b-0 hover:bg-surface-raised">
                  <span className="text-sm text-text-primary">{p.name} <span className="text-text-muted text-xs">{p.pos}</span></span>
                  <button
                    onClick={() => draftPlayer(p.name)}
                    className="text-xs bg-accent text-[#0A0E14] rounded px-3 py-1 font-medium"
                  >
                    Draft
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <h3 className="font-display text-sm text-text-secondary mb-2 tracking-wide">Your roster so far</h3>
          <div className="rounded-xl border border-border-subtle bg-surface divide-y divide-border-subtle">
            {userRoster.length === 0 && <div className="px-4 py-3 text-sm text-text-muted italic">No picks yet</div>}
            {userRoster.map((p) => (
              <div key={p.name} className="flex items-center justify-between px-4 py-2 text-sm">
                <span className="text-text-primary">{p.name}</span>
                <span className="text-text-muted text-xs">{p.pos}</span>
              </div>
            ))}
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
    </div>
  );
}
