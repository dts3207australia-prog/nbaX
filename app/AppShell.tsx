"use client";

import { useEffect, useState } from "react";
import type { ScoredPlayer } from "@/lib/scoring";
import type { ConsensusPlayer } from "@/lib/consensus";
import { normalizeName } from "@/lib/names";
import { NUM_TEAMS } from "@/lib/roster";
import { defaultTeams, TEAMS_STORAGE_KEY } from "@/lib/teams";
import DraftBoard from "./DraftBoard";
import MyTeam from "./MyTeam";
import PlayerProfile from "./PlayerProfile";

const STORAGE_KEY = "nba-draft-manager-state-v2";

export type DraftState = Record<string, { draftedBy: string; note: string }>;

type Tab = "board" | "myteam";

export default function AppShell({
  myPlayers,
  consensusPlayers,
}: {
  myPlayers: ScoredPlayer[];
  consensusPlayers: ConsensusPlayer[];
}) {
  const [tab, setTab] = useState<Tab>("board");
  const [draftState, setDraftState] = useState<DraftState>({});
  const [teams, setTeams] = useState<string[]>(defaultTeams(NUM_TEAMS));
  const [editingTeams, setEditingTeams] = useState(false);
  const [profilePlayer, setProfilePlayer] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

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

  const syncWithEspn = async () => {
    setSyncing(true);
    setSyncMessage(null);
    try {
      const res = await fetch("/api/espn");
      const data = await res.json();
      if (!res.ok) {
        setSyncMessage(`⚠️ ${data.error ?? "Sync failed."}`);
        return;
      }
      type EspnTeam = { espnTeamId: number; name: string; isMe: boolean; players: string[] };
      const espnTeams: EspnTeam[] = data.teams ?? [];
      if (espnTeams.length === 0) {
        setSyncMessage("⚠️ ESPN returned no teams — check the league ID and cookies.");
        return;
      }

      // Reorder so "my" team is first, matching how the app treats teams[0].
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
            if (!inPool) {
              unmatched++;
              continue;
            }
            matched++;
            next[key] = { draftedBy: t.name, note: next[key]?.note ?? "" };
          }
        }
        return next;
      });
      setSyncMessage(
        `✅ Synced ${ordered.length} teams — ${matched} players matched${unmatched ? `, ${unmatched} not found in your player pool` : ""}.`
      );
    } catch (err) {
      setSyncMessage(`⚠️ Sync failed: ${String(err)}`);
    } finally {
      setSyncing(false);
    }
  };

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

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6">
      <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-100">NBA Draft Manager</h1>
          <p className="text-slate-400 text-sm mt-1">Dunk it Dunk it! — 8-team Rotisserie</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={syncWithEspn}
            disabled={syncing}
            className="text-xs bg-slate-800 border border-slate-700 hover:bg-slate-700 text-slate-200 rounded px-3 py-1.5 disabled:opacity-50"
          >
            {syncing ? "Syncing..." : "🔄 Sync with ESPN"}
          </button>
          <button
            onClick={() => setEditingTeams(!editingTeams)}
            className="text-xs text-slate-400 hover:text-slate-200 underline"
          >
            {editingTeams ? "Done editing teams" : "Edit team names"}
          </button>
        </div>
      </header>

      {syncMessage && (
        <p className="text-sm mb-4 px-3 py-2 rounded bg-slate-900 border border-slate-700 text-slate-300">
          {syncMessage}
        </p>
      )}

      {editingTeams && (
        <div className="mb-4 p-3 bg-slate-900 border border-slate-700 rounded-lg grid grid-cols-2 md:grid-cols-4 gap-2">
          {teams.map((t, i) => (
            <input
              key={i}
              value={t}
              onChange={(e) => {
                const next = [...teams];
                next[i] = e.target.value;
                setTeams(next);
              }}
              className={`bg-slate-800 border rounded px-2 py-1 text-sm text-slate-100 ${
                i === 0 ? "border-blue-500" : "border-slate-700"
              }`}
            />
          ))}
          <p className="col-span-full text-xs text-slate-500">
            First slot (blue border) is treated as your team for the My Team tab.
          </p>
        </div>
      )}

      <div className="flex gap-2 mb-4 border-b border-slate-800">
        <button
          onClick={() => setTab("board")}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
            tab === "board" ? "border-blue-500 text-slate-100" : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          Draft Board
        </button>
        <button
          onClick={() => setTab("myteam")}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
            tab === "myteam" ? "border-blue-500 text-slate-100" : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          My Team
        </button>
      </div>

      {tab === "board" ? (
        <DraftBoard
          myPlayers={myPlayers}
          consensusPlayers={consensusPlayers}
          teams={teams}
          draftState={draftState}
          setDraftState={setDraftState}
          onSelectPlayer={setProfilePlayer}
        />
      ) : (
        <MyTeam players={myRosterPlayers} />
      )}

      {profilePlayer && (
        <PlayerProfile
          name={profilePlayer}
          myPlayers={myPlayers}
          consensusPlayers={consensusPlayers}
          onClose={() => setProfilePlayer(null)}
        />
      )}
    </div>
  );
}
