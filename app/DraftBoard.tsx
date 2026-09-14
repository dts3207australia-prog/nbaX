"use client";

import { useEffect, useMemo, useState } from "react";
import type { ScoredPlayer } from "@/lib/scoring";

type SortKey =
  | "rank" | "name" | "pos" | "total" | "fgPct" | "ftPct"
  | "tpm" | "tpPct" | "oreb" | "dreb" | "ast" | "ato" | "stl" | "blk" | "pts";

const STORAGE_KEY = "nba-draft-manager-state-v1";

type DraftState = Record<string, { draftedBy: string; note: string }>;

export default function DraftBoard({ players }: { players: ScoredPlayer[] }) {
  const [sortKey, setSortKey] = useState<SortKey>("rank");
  const [sortAsc, setSortAsc] = useState(true);
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

  const positions = useMemo(() => {
    const set = new Set(players.map((p) => p.pos));
    return ["ALL", ...Array.from(set).sort()];
  }, [players]);

  const filtered = useMemo(() => {
    let list = players.filter((p) =>
      p.name.toLowerCase().includes(search.toLowerCase())
    );
    if (posFilter !== "ALL") list = list.filter((p) => p.pos === posFilter);
    if (hideDrafted) list = list.filter((p) => !draftState[p.name]?.draftedBy);
    return list;
  }, [players, search, posFilter, hideDrafted, draftState]);

  const sorted = useMemo(() => {
    const getValue = (p: ScoredPlayer): number | string => {
      switch (sortKey) {
        case "rank": return p.rank;
        case "name": return p.name;
        case "pos": return p.pos;
        case "total": return p.total;
        case "fgPct": return p.fgPct;
        case "ftPct": return p.ftPct;
        case "tpm": return p.tpm;
        case "tpPct": return p.tpPct;
        case "oreb": return p.oreb;
        case "dreb": return p.dreb;
        case "ast": return p.ast;
        case "ato": return p.ato;
        case "stl": return p.stl;
        case "blk": return p.blk;
        case "pts": return p.pts;
      }
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

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(key === "rank" || key === "name" || key === "pos");
    }
  };

  const updateDrafted = (name: string, draftedBy: string) => {
    setDraftState((prev) => ({
      ...prev,
      [name]: { draftedBy, note: prev[name]?.note ?? "" },
    }));
  };
  const updateNote = (name: string, note: string) => {
    setDraftState((prev) => ({
      ...prev,
      [name]: { draftedBy: prev[name]?.draftedBy ?? "", note },
    }));
  };
  const clearAll = () => {
    if (confirm("Clear all drafted-by tags and notes?")) {
      setDraftState({});
    }
  };

  const draftedCount = Object.values(draftState).filter((v) => v.draftedBy).length;

  const headerCell = (label: string, key: SortKey, extraClass = "") => (
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
          Rotisserie category rankings — FG%, FT%, 3PM, 3P%, OREB, DREB, AST,
          A/TO, STL, BLK, PTS. {draftedCount} of {players.length} drafted.
        </p>
      </header>

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
              <th className="px-2 py-2 text-left text-xs font-semibold uppercase tracking-wide">Drafted By</th>
              <th className="px-2 py-2 text-left text-xs font-semibold uppercase tracking-wide">Notes</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((p) => {
              const isDrafted = !!draftState[p.name]?.draftedBy;
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
                  <td className="px-2 py-1.5 font-mono">{(p.fgPct * 100).toFixed(1)}%</td>
                  <td className="px-2 py-1.5 font-mono">{(p.ftPct * 100).toFixed(1)}%</td>
                  <td className="px-2 py-1.5 font-mono">{p.tpm.toFixed(1)}</td>
                  <td className="px-2 py-1.5 font-mono">{(p.tpPct * 100).toFixed(1)}%</td>
                  <td className="px-2 py-1.5 font-mono">{p.oreb.toFixed(1)}</td>
                  <td className="px-2 py-1.5 font-mono">{p.dreb.toFixed(1)}</td>
                  <td className="px-2 py-1.5 font-mono">{p.ast.toFixed(1)}</td>
                  <td className="px-2 py-1.5 font-mono">{p.ato.toFixed(2)}</td>
                  <td className="px-2 py-1.5 font-mono">{p.stl.toFixed(1)}</td>
                  <td className="px-2 py-1.5 font-mono">{p.blk.toFixed(1)}</td>
                  <td className="px-2 py-1.5 font-mono">{p.pts.toFixed(1)}</td>
                  <td className="px-2 py-1.5">
                    <input
                      type="text"
                      value={draftState[p.name]?.draftedBy ?? ""}
                      onChange={(e) => updateDrafted(p.name, e.target.value)}
                      placeholder="Team name"
                      className="w-24 bg-slate-800 border border-slate-700 rounded px-1.5 py-0.5 text-xs text-slate-100"
                    />
                  </td>
                  <td className="px-2 py-1.5">
                    <input
                      type="text"
                      value={draftState[p.name]?.note ?? ""}
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
        Source: 2025-26 NBA regular season per-game stats. Draft-day picks and
        notes are saved locally in your browser only.
      </p>
    </div>
  );
}
