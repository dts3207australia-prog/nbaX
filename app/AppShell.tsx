"use client";

import { useEffect, useState } from "react";
import type { ScoredPlayer } from "@/lib/scoring";
import type { ConsensusPlayer } from "@/lib/consensus";
import type { FanscoutPlayer } from "@/lib/fanscout";
import { normalizeName } from "@/lib/names";
import { NUM_TEAMS } from "@/lib/roster";
import { defaultTeams, TEAMS_STORAGE_KEY } from "@/lib/teams";
import { computeRecommendations } from "@/lib/recommendation";
import DraftBoard from "./DraftBoard";
import MyTeam from "./MyTeam";
import ScheduleStrength from "./ScheduleStrength";
import MockDraft from "./MockDraft";
import PlayerProfile from "./PlayerProfile";
import RecommendationCard from "./RecommendationCard";

const STORAGE_KEY = "nba-draft-manager-state-v2";

export type DraftState = Record<string, { draftedBy: string; note: string }>;

type Tab = "board" | "myteam" | "schedule" | "mockdraft";

const DRAFT_DATE = new Date("2026-10-17T14:00:00+11:00");

export default function AppShell({
  myPlayers,
  consensusPlayers,
  fanscoutPlayers,
}: {
  myPlayers: ScoredPlayer[];
  consensusPlayers: ConsensusPlayer[];
  fanscoutPlayers: FanscoutPlayer[];
}) {
  const [tab, setTab] = useState<Tab>("board");
  const [draftState, setDraftState] = useState<DraftState>({});
  const [teams, setTeams] = useState<string[]>(defaultTeams(NUM_TEAMS));
  const [editingTeams, setEditingTeams] = useState(false);
  const [profilePlayer, setProfilePlayer] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<{ text: string; ok: boolean } | null>(null);

  useEffect(() => {
    const savedState = localStorage.getItem(STORAGE_KEY);
    if (savedState) {
      try { setDraftState(JSON.parse(savedState)); } catch {}
    }
    const savedTeams = localStorage.getItem(TEAMS_STORAGE_KEY);
    if (savedTeams) {
      try { setTeams(JSON.parse(savedTeams)); } catch {}
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (loaded) localStorage.setItem(STORAGE_KEY, JSON.stringify(draftState));
  }, [draftState, loaded]);

  useEffect(() => {
    if (loaded) localStorage.setItem(TEAMS_STORAGE_KEY, JSON.stringify(teams));
  }, [teams, loaded]);

  const myTeamName = teams[0] ?? "My Team";
  const draftedCount = Object.values(draftState).filter((v) => v.draftedBy).length;
  const daysUntilDraft = Math.max(
    0,
    Math.ceil((DRAFT_DATE.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
  );

  const myRosterPlayers = Object.entries(draftState)
    .filter(([, v]) => v.draftedBy === myTeamName)
    .map(([key]) => {
      const mine = myPlayers.find((p) => normalizeName(p.name) === key);
      const consensus = consensusPlayers.find((p) => normalizeName(p.name) === key);
      const source = mine ?? consensus;
      if (!source) return null;
      return {
        name: source.name,
        pos: source.pos,
        score: mine ? mine.total : consensus ? consensus.total : 0,
      };
    })
    .filter((p): p is { name: string; pos: string; score: number } => p !== null);

  const availableMyPlayers = myPlayers.filter(
    (p) => !draftState[normalizeName(p.name)]?.draftedBy
  );
  const availableConsensus = consensusPlayers.filter(
    (p) => !draftState[normalizeName(p.name)]?.draftedBy
  );
  const recommendations = computeRecommendations({
    availableMyPlayers,
    availableConsensus,
    allMyPlayers: myPlayers,
    allConsensus: consensusPlayers,
    myRosterPlayers,
  });

  const syncWithEspn = async () => {
    setSyncing(true);
    setSyncMessage(null);
    try {
      const res = await fetch("/api/espn");
      const data = await res.json();
      if (!res.ok) {
        setSyncMessage({ text: data.error ?? "Sync failed.", ok: false });
        return;
      }
      type EspnTeam = { espnTeamId: number; name: string; isMe: boolean; players: string[] };
      const espnTeams: EspnTeam[] = data.teams ?? [];
      if (espnTeams.length === 0) {
        setSyncMessage({ text: "ESPN returned no teams — check the league ID and cookies.", ok: false });
        return;
      }
      const ordered = [
        ...espnTeams.filter((t) => t.isMe),
        ...espnTeams.filter((t) => !t.isMe),
      ];
      setTeams(ordered.map((t) => t.name));

      let matched = 0;
      let unmatched = 0;
      setDraftState((prev) => {
        const next = { ...prev };
        for (const t of ordered) {
          for (const playerName of t.players) {
            const key = normalizeName(playerName);
            const inPool =
              myPlayers.some((p) => normalizeName(p.name) === key) ||
              consensusPlayers.some((p) => normalizeName(p.name) === key);
            if (!inPool) { unmatched++; continue; }
            matched++;
            next[key] = { draftedBy: t.name, note: next[key]?.note ?? "" };
          }
        }
        return next;
      });
      setSyncMessage({
        text: `Synced ${ordered.length} teams — ${matched} players matched${unmatched ? `, ${unmatched} not found in your player pool` : ""}.`,
        ok: true,
      });
    } catch (err) {
      setSyncMessage({ text: `Sync failed: ${String(err)}`, ok: false });
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="min-h-screen bg-base">
      {/* Top bar */}
      <div className="sticky top-0 z-30 bg-surface border-b border-border-subtle">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl font-medium text-text-primary tracking-wide">
              NBA Draft Manager
            </h1>
            <p className="text-text-muted text-xs mt-0.5">Dunk it Dunk it! · 8-team Rotisserie</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={syncWithEspn}
              disabled={syncing}
              className="inline-flex items-center gap-1.5 text-sm font-medium bg-surface-raised border border-border-strong hover:border-accent text-text-primary rounded-lg px-3.5 py-2 transition-colors disabled:opacity-50"
            >
              <span className={syncing ? "animate-spin" : ""}>⟳</span>
              {syncing ? "Syncing…" : "Sync with ESPN"}
            </button>
            <button
              onClick={() => setEditingTeams(!editingTeams)}
              className="text-sm font-medium text-text-secondary hover:text-text-primary border border-border-subtle hover:border-border-strong rounded-lg px-3.5 py-2 transition-colors"
            >
              {editingTeams ? "Done" : "Edit teams"}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-6 py-6">
        {/* Stat strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <StatCard label="Players drafted" value={`${draftedCount} / ${myPlayers.length}`} />
          <StatCard label="Your team" value={myTeamName} accent />
          <StatCard label="Draft date" value="Oct 17, 2026" sub={daysUntilDraft > 0 ? `${daysUntilDraft} days away` : "Today"} />
          <StatCard label="Teams" value={String(teams.length)} />
        </div>

        {syncMessage && (
          <div
            className={`mb-5 px-4 py-2.5 rounded-lg text-sm border ${
              syncMessage.ok
                ? "bg-[color:var(--status-positive-bg)] border-status-positive/30 text-status-positive"
                : "bg-[color:var(--status-warning-bg)] border-status-warning/30 text-status-warning"
            }`}
          >
            {syncMessage.ok ? "✓ " : "⚠ "}{syncMessage.text}
          </div>
        )}

        {editingTeams && (
          <div className="mb-6 p-4 bg-surface border border-border-subtle rounded-xl">
            <h3 className="font-display text-sm text-text-secondary mb-3 tracking-wide">Team names</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {teams.map((t, i) => (
                <input
                  key={i}
                  value={t}
                  onChange={(e) => {
                    const next = [...teams];
                    next[i] = e.target.value;
                    setTeams(next);
                  }}
                  className={`bg-surface-raised border rounded-lg px-3 py-1.5 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent ${
                    i === 0 ? "border-accent" : "border-border-subtle"
                  }`}
                />
              ))}
            </div>
            <p className="text-xs text-text-muted mt-3">
              First slot (orange border) is treated as your team for the My Team tab.
            </p>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-6 mb-6 border-b border-border-subtle">
          <TabButton active={tab === "board"} onClick={() => setTab("board")}>
            Draft Board
          </TabButton>
          <TabButton active={tab === "myteam"} onClick={() => setTab("myteam")}>
            My Team
          </TabButton>
          <TabButton active={tab === "schedule"} onClick={() => setTab("schedule")}>
            Schedule
          </TabButton>
          <TabButton active={tab === "mockdraft"} onClick={() => setTab("mockdraft")}>
            Mock Draft
          </TabButton>
        </div>

        {tab === "board" ? (
          <>
            <RecommendationCard
              recommendations={recommendations}
              onSelectPlayer={setProfilePlayer}
              hasComparisonData={consensusPlayers.length > 0}
            />
            <DraftBoard
              myPlayers={myPlayers}
              consensusPlayers={consensusPlayers}
              fanscoutPlayers={fanscoutPlayers}
              teams={teams}
              draftState={draftState}
              setDraftState={setDraftState}
              onSelectPlayer={setProfilePlayer}
            />
          </>
        ) : tab === "myteam" ? (
          <MyTeam players={myRosterPlayers} />
        ) : tab === "schedule" ? (
          <ScheduleStrength />
        ) : (
          <MockDraft myPlayers={myPlayers} consensusPlayers={consensusPlayers} fanscoutPlayers={fanscoutPlayers} onSelectPlayer={setProfilePlayer} />
        )}

        {profilePlayer && (
          <PlayerProfile
            name={profilePlayer}
            myPlayers={myPlayers}
            consensusPlayers={consensusPlayers}
            fanscoutPlayers={fanscoutPlayers}
            onClose={() => setProfilePlayer(null)}
          />
        )}
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: boolean;
}) {
  return (
    <div className="bg-surface border border-border-subtle rounded-xl px-4 py-3">
      <div className="text-text-muted text-xs">{label}</div>
      <div
        className={`font-display text-xl font-medium mt-0.5 tabular truncate ${
          accent ? "text-accent" : "text-text-primary"
        }`}
      >
        {value}
      </div>
      {sub && <div className="text-text-muted text-xs mt-0.5">{sub}</div>}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`pb-3 text-sm font-medium border-b-2 -mb-px transition-colors ${
        active
          ? "border-accent text-text-primary"
          : "border-transparent text-text-muted hover:text-text-secondary"
      }`}
    >
      {children}
    </button>
  );
}
