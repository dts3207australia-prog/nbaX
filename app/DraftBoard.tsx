"use client";

import { useEffect, useMemo, useState } from "react";
import type { ScoredPlayer } from "@/lib/scoring";
import type { ConsensusPlayer } from "@/lib/consensus";
import { normalizeName } from "@/lib/names";

type Source = "mine" | "consensus";

type MySortKey =
  | "rank" | "name" | "pos" | "total" | "fgPct" | "ftPct"
  | "tpm" | "tpPct" | "oreb" | "dreb" | "ast" | "ato" | "stl" | "blk" | "pts";

type ConsensusSortKey =
  | "rank" | "name" | "pos" | "total" | "fgZ" | "ftZ" | "tpmZ" | "tpPctZ"
  | "orebZ" | "drebZ" | "astZ" | "atoZ" | "stlZ" | "blkZ" | "ptsZ" | "catWins" | "tier";

const STORAGE_KEY = "nba-draft-manager-state-v2";

type DraftState = Record<string, { draftedBy: string; note: string }>;

export default function DraftBoard({
  myPlayers,
  consensusPlayers,
}: {
  myPlayers: ScoredPlayer[];
  consensusPlayers: ConsensusPlayer[];
}) {
  const [source, setSource] = useState<Source>("mine");
  const [mySortKey, setMySortKey] = useState<MySortKey>("rank");
  const [mySortAsc, setMySortAsc] = useState(true);
  const [cSortKey, setCSortKey] = useState<ConsensusSortKey>("rank");
  const [cSortAsc, setCSortAsc] = useState(true);
  const [search, setSearch] = useState("");
  const [posFilter, setPosFilter] = useState("ALL");
  const [hideDrafted, setHideDrafted] = useState(false);
  const [draftState, setDraftState] = useState<DraftState>({});
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        setDraftState(JSON.parse(saved));
      } catch {
        // ignore corrupt storage
      }
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (loaded) localStorage.setItem(STORAGE_KEY, JSON.stringify(draftState));
  }, [draftState, loaded]);

  const activePlayers = source === "mine" ? myPlayers : consensusPlayers;

  const positions = useMemo(() => {
    const set = new Set(activePlayers.map((p) => p.pos));
    return ["ALL", ...Array.from(set).sort()];
  }, [activePlayers]);

  const filtered = useMemo(() => {
    let list = activePlayers.filter((p) =>
      p.name.toLowerCase().includes(search.toLowerCase())
    );
    if (posFilter !== "ALL") list = list.filter((p) => p.pos === posFilter);
    if (hideDrafted) {
      list = list.filter((p) => !draftState[normalizeName(p.name)]?.draftedBy);
    }
    return list;
  }, [activePlayers, search, posFilter, hideDrafted, draftState]);

  const sortKey = source === "mine" ? mySortKey : cSortKey;
  const sortAsc = source === "mine" ? mySortAsc : cSortAsc;

  const sorted = useMemo(() => {
    const getValue = (p: ScoredPlayer | ConsensusPlayer): number | string => {
      // @ts-expect-error - narrowed by source at call sites
      const v = p[sortKey];
      return v;
    };
    const arr = [...filtered];
    arr.sort((a, b) => {
      const av = getValue(a);
      const bv = getValue(b);
      const cmp = typeof av === "string"
        ? (av as string).localeCompare(bv as string)
        : (av as number) - (bv as number);
      return sortAsc ? cmp : -cmp;
    });
    return arr;
  }, [filtered, sortKey, sortAsc]);

  const toggleSort = (key: MySortKey | ConsensusSortKey) => {
    if (source === "mine") {
      const k = key as MySortKey;
      if (mySortKey === k) setMySortAsc(!mySortAsc);
      else {
        setMySortKey(k);
        setMySortAsc(k === "rank" || k === "name" || k === "pos");
      }
    } else {
      const k = key as ConsensusSortKey;
      if (cSortKey === k) setCSortAsc(!cSortAsc);
      else {
        setCSortKey(k);
        setCSortAsc(k === "rank" || k === "name" || k === "pos" || k === "tier");
      }
    }
  };

  const updateDrafted = (name: string, draftedBy: string) => {
    const key = normalizeName(name);
    setDraftState((prev) => ({
      ...prev,
      [key]: { draftedBy, note: prev[key]?.note ?? "" },
    }));
  };
  const updateNote = (name: string, note: string) => {
    const key = normalizeName(name);
    setDraftState((prev) => ({
      ...prev,
      [key]: { draftedBy: prev[key]?.draftedBy ?? "", note },
    }));
  };
  const clearAll = () => {
    if (confirm("Clear all drafted-by tags and notes?")) {
      setDraftState({});
    }
  };

  const draftedCount = Object.values(draftState).filter((v) => v.draftedBy).length;

  const headerCell = (label: string, key: MySortKey | ConsensusSortKey, extraClass = "") => (
    <th
      onClick={() => toggleSort(key)}
      className={`px-2 py-2 text-left text-xs font-semibold uppercase tracking-wide cursor-pointer select-none whitespace-nowrap hover:bg-slate-700 ${extraClass}`}
    >
      {label} {sortKey === key ? (sortAsc ? "▲" : "▼") : ""}
    </th>
  );

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6">
      <header className="mb-4">
        <h1 className="text-2xl md:text-3xl font-bold text-slate-100">
          NBA Draft Manager
        </h1>
        <p className="text-slate-400 text-sm mt-1">
          {source === "mine"
            ? "Your custom rankings — z-scores computed from raw 2025-26 per-game stats."
            : "Consensus rankings — a second, independently pre-scored ranking source (projected + estimated categories)."}
          {" "}{draftedCount} of {activePlayers.length} drafted.
        </p>
      </header>

      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setSource("mine")}
          className={`px-4 py-2 rounded text-sm font-medium border ${
            source === "mine"
              ? "bg-blue-600 border-blue-500 text-white"
              : "bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700"
          }`}
        >
          My Rankings
        </button>
        <button
          onClick={() => setSource("consensus")}
          className={`px-4 py-2 rounded text-sm font-medium border ${
            source === "consensus"
              ? "bg-blue-600 border-blue-500 text-white"
              : "bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700"
          }`}
        >
          Consensus Rankings
        </button>
      </div>

      <div className="flex flex-wrap gap-3 mb-4 items-center">
        <input
          type="text"
          placeholder="Search player..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        <select
          value={posFilter}
          onChange={(e) => setPosFilter(e.target.value)}
          className="bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm text-slate-100"
        >
          {positions.map((p) => (
            <option key={p} value={p}>{p === "ALL" ? "All positions" : p}</option>
          ))}
        </select>
        <label className="flex items-center gap-2 text-sm text-slate-300">
          <input
            type="checkbox"
            checked={hideDrafted}
            onChange={(e) => setHideDrafted(e.target.checked)}
          />
          Hide drafted
        </label>
        <button
          onClick={clearAll}
          className="ml-auto text-xs text-red-400 hover:text-red-300 underline"
        >
          Reset draft board
        </button>
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-700">
        <table className="min-w-full text-sm text-slate-200">
          <thead className="bg-slate-800 text-slate-300 sticky top-0">
            <tr>
              {headerCell("Rank", "rank")}
              {headerCell("Player", "name")}
              {headerCell("Pos", "pos")}
              {headerCell("Score", "total")}
              {source === "mine" ? (
                <>
                  {headerCell("FG%", "fgPct")}
                  {headerCell("FT%", "ftPct")}
                  {headerCell("3PM", "tpm")}
                  {headerCell("3P%", "tpPct")}
                  {headerCell("OREB", "oreb")}
                  {headerCell("DREB", "dreb")}
                  {headerCell("AST", "ast")}
                  {headerCell("A/TO", "ato")}
                  {headerCell("STL", "stl")}
                  {headerCell("BLK", "blk")}
                  {headerCell("PTS", "pts")}
                </>
              ) : (
                <>
                  {headerCell("FG% z", "fgZ")}
                  {headerCell("FT% z", "ftZ")}
                  {headerCell("3PM z", "tpmZ")}
                  {headerCell("3P% z", "tpPctZ")}
                  {headerCell("OREB z", "orebZ")}
                  {headerCell("DREB z", "drebZ")}
                  {headerCell("AST z", "astZ")}
                  {headerCell("A/TO z", "atoZ")}
                  {headerCell("STL z", "stlZ")}
                  {headerCell("BLK z", "blkZ")}
                  {headerCell("PTS z", "ptsZ")}
                  {headerCell("Cat Wins", "catWins")}
                  {headerCell("Tier", "tier")}
                </>
              )}
              <th className="px-2 py-2 text-left text-xs font-semibold uppercase tracking-wide">Drafted By</th>
              <th className="px-2 py-2 text-left text-xs font-semibold uppercase tracking-wide">Notes</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((p) => {
              const key = normalizeName(p.name);
              const isDrafted = !!draftState[key]?.draftedBy;
              const isMine = source === "mine";
              const mp = p as ScoredPlayer;
              const cp = p as ConsensusPlayer;
              return (
                <tr
                  key={p.name}
                  className={`border-t border-slate-800 ${
                    isDrafted ? "bg-slate-900/60 opacity-50" : "hover:bg-slate-800/50"
                  }`}
                >
                  <td className="px-2 py-1.5 font-mono">{p.rank}</td>
                  <td className="px-2 py-1.5 font-medium whitespace-nowrap">{p.name}</td>
                  <td className="px-2 py-1.5 text-slate-400">{p.pos}</td>
                  <td className="px-2 py-1.5 font-mono">{p.total.toFixed(2)}</td>
                  {isMine ? (
                    <>
                      <td className="px-2 py-1.5 font-mono">{(mp.fgPct * 100).toFixed(1)}%</td>
                      <td className="px-2 py-1.5 font-mono">{(mp.ftPct * 100).toFixed(1)}%</td>
                      <td className="px-2 py-1.5 font-mono">{mp.tpm.toFixed(1)}</td>
                      <td className="px-2 py-1.5 font-mono">{(mp.tpPct * 100).toFixed(1)}%</td>
                      <td className="px-2 py-1.5 font-mono">{mp.oreb.toFixed(1)}</td>
                      <td className="px-2 py-1.5 font-mono">{mp.dreb.toFixed(1)}</td>
                      <td className="px-2 py-1.5 font-mono">{mp.ast.toFixed(1)}</td>
                      <td className="px-2 py-1.5 font-mono">{mp.ato.toFixed(2)}</td>
                      <td className="px-2 py-1.5 font-mono">{mp.stl.toFixed(1)}</td>
                      <td className="px-2 py-1.5 font-mono">{mp.blk.toFixed(1)}</td>
                      <td className="px-2 py-1.5 font-mono">{mp.pts.toFixed(1)}</td>
                    </>
                  ) : (
                    <>
                      <td className="px-2 py-1.5 font-mono">{cp.fgZ.toFixed(2)}</td>
                      <td className="px-2 py-1.5 font-mono">{cp.ftZ.toFixed(2)}</td>
                      <td className="px-2 py-1.5 font-mono">{cp.tpmZ.toFixed(2)}</td>
                      <td className="px-2 py-1.5 font-mono">{cp.tpPctZ.toFixed(2)}</td>
                      <td className="px-2 py-1.5 font-mono">{cp.orebZ.toFixed(2)}</td>
                      <td className="px-2 py-1.5 font-mono">{cp.drebZ.toFixed(2)}</td>
                      <td className="px-2 py-1.5 font-mono">{cp.astZ.toFixed(2)}</td>
                      <td className="px-2 py-1.5 font-mono">{cp.atoZ.toFixed(2)}</td>
                      <td className="px-2 py-1.5 font-mono">{cp.stlZ.toFixed(2)}</td>
                      <td className="px-2 py-1.5 font-mono">{cp.blkZ.toFixed(2)}</td>
                      <td className="px-2 py-1.5 font-mono">{cp.ptsZ.toFixed(2)}</td>
                      <td className="px-2 py-1.5 font-mono">{cp.catWins}</td>
                      <td className="px-2 py-1.5">{cp.tier}</td>
                    </>
                  )}
                  <td className="px-2 py-1.5">
                    <input
                      type="text"
                      value={draftState[key]?.draftedBy ?? ""}
                      onChange={(e) => updateDrafted(p.name, e.target.value)}
                      placeholder="Team name"
                      className="w-24 bg-slate-800 border border-slate-700 rounded px-1.5 py-0.5 text-xs text-slate-100"
                    />
                  </td>
                  <td className="px-2 py-1.5">
                    <input
                      type="text"
                      value={draftState[key]?.note ?? ""}
                      onChange={(e) => updateNote(p.name, e.target.value)}
                      placeholder="Note"
                      className="w-32 bg-slate-800 border border-slate-700 rounded px-1.5 py-0.5 text-xs text-slate-100"
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-slate-500 mt-3">
        Drafted-by tags and notes are shared between both ranking lists (matched by
        player name) and saved locally in your browser only.
      </p>
    </div>
  );
}
