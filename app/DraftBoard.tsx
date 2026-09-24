"use client";

import { useMemo, useState } from "react";
import type { FanscoutPlayer } from "@/lib/fanscout";
import { normalizeName } from "@/lib/names";
import type { DraftState } from "./AppShell";

type SortKey =
  | "rank" | "name" | "pos" | "total" | "pts" | "tpm" | "oreb" | "dreb" | "ast"
  | "ato" | "stl" | "blk" | "fgPct" | "ftPct";

export default function DraftBoard({
  players,
  teams,
  draftState,
  setDraftState,
  onSelectPlayer,
}: {
  players: FanscoutPlayer[];
  teams: string[];
  draftState: DraftState;
  setDraftState: (updater: (prev: DraftState) => DraftState) => void;
  onSelectPlayer: (name: string) => void;
}) {
  const [sortKey, setSortKey] = useState<SortKey>("rank");
  const [sortAsc, setSortAsc] = useState(true);
  const [search, setSearch] = useState("");
  const [posFilter, setPosFilter] = useState("ALL");
  const [hideDrafted, setHideDrafted] = useState(false);

  const positions = useMemo(() => {
    const set = new Set(players.map((p) => p.pos));
    return ["ALL", ...Array.from(set).sort()];
  }, [players]);

  const filtered = useMemo(() => {
    let list = players.filter((p) =>
      p.name.toLowerCase().includes(search.toLowerCase())
    );
    if (posFilter !== "ALL") list = list.filter((p) => p.pos === posFilter);
    if (hideDrafted) {
      list = list.filter((p) => !draftState[normalizeName(p.name)]?.draftedBy);
    }
    return list;
  }, [players, search, posFilter, hideDrafted, draftState]);

  const sorted = useMemo(() => {
    const getValue = (p: FanscoutPlayer): number | string => {
      return p[sortKey];
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
      setDraftState(() => ({}));
    }
  };

  const draftedCount = Object.values(draftState).filter((v) => v.draftedBy).length;

  const headerCell = (label: string, key: SortKey) => (
    <th
      onClick={() => toggleSort(key)}
      className="px-3 py-2.5 text-left text-xs font-medium text-text-muted uppercase tracking-wider cursor-pointer select-none whitespace-nowrap hover:text-text-secondary transition-colors"
    >
      {label} {sortKey === key ? (sortAsc ? "↑" : "↓") : ""}
    </th>
  );

  return (
    <div>
      <p className="text-text-secondary text-sm mb-4">
        FanScout&apos;s real 2026-27 per-game projections, with their own pre-computed Value score.{" "}
        <span className="text-text-muted tabular">{draftedCount} of {players.length} drafted.</span>
      </p>

      <div className="flex flex-wrap gap-3 mb-4 items-center">
        <input
          type="text"
          placeholder="Search player..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="bg-surface border border-border-subtle rounded-lg px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent w-48"
        />
        <select
          value={posFilter}
          onChange={(e) => setPosFilter(e.target.value)}
          className="bg-surface border border-border-subtle rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent"
        >
          {positions.map((p) => (
            <option key={p} value={p}>{p === "ALL" ? "All positions" : p}</option>
          ))}
        </select>
        <label className="flex items-center gap-2 text-sm text-text-secondary select-none cursor-pointer">
          <input type="checkbox" checked={hideDrafted} onChange={(e) => setHideDrafted(e.target.checked)} className="accent-[var(--accent)]" />
          Hide drafted
        </label>
        <button onClick={clearAll} className="ml-auto text-xs text-status-negative/80 hover:text-status-negative underline">
          Reset draft board
        </button>
      </div>

      <div className="rounded-xl border border-border-subtle bg-surface overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-surface-raised text-text-muted border-b border-border-subtle sticky top-0">
              <tr>
                {headerCell("Rank", "rank")}
                {headerCell("Player", "name")}
                {headerCell("Pos", "pos")}
                {headerCell("Value", "total")}
                {headerCell("PTS", "pts")}
                {headerCell("3PM", "tpm")}
                {headerCell("OREB", "oreb")}
                {headerCell("DREB", "dreb")}
                {headerCell("AST", "ast")}
                {headerCell("A/TO", "ato")}
                {headerCell("STL", "stl")}
                {headerCell("BLK", "blk")}
                {headerCell("FG%", "fgPct")}
                {headerCell("FT%", "ftPct")}
                <th className="px-3 py-2.5 text-left text-xs font-medium text-text-muted uppercase tracking-wider">Drafted By</th>
                <th className="px-3 py-2.5 text-left text-xs font-medium text-text-muted uppercase tracking-wider">Notes</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((p, idx) => {
                const key = normalizeName(p.name);
                const isDrafted = !!draftState[key]?.draftedBy;
                return (
                  <tr
                    key={p.name}
                    className={`border-b border-border-subtle last:border-b-0 transition-colors ${
                      isDrafted ? "opacity-40" : idx % 2 === 0 ? "bg-surface" : "bg-surface-raised/40"
                    } hover:bg-surface-raised`}
                  >
                    <td className="px-3 py-2 tabular text-text-muted">{p.rank}</td>
                    <td className="px-3 py-2 font-medium whitespace-nowrap">
                      <button onClick={() => onSelectPlayer(p.name)} className="text-text-primary hover:text-accent transition-colors text-left">
                        {p.name}
                      </button>
                    </td>
                    <td className="px-3 py-2 text-text-muted text-xs">{p.pos}</td>
                    <td className="px-3 py-2 tabular font-medium text-accent">{p.total.toFixed(2)}</td>
                    <td className="px-3 py-2 tabular text-text-secondary">{p.pts.toFixed(1)}</td>
                    <td className="px-3 py-2 tabular text-text-secondary">{p.tpm.toFixed(1)}</td>
                    <td className="px-3 py-2 tabular text-text-secondary">{p.oreb.toFixed(1)}</td>
                    <td className="px-3 py-2 tabular text-text-secondary">{p.dreb.toFixed(1)}</td>
                    <td className="px-3 py-2 tabular text-text-secondary">{p.ast.toFixed(1)}</td>
                    <td className="px-3 py-2 tabular text-text-secondary">{p.ato.toFixed(2)}</td>
                    <td className="px-3 py-2 tabular text-text-secondary">{p.stl.toFixed(1)}</td>
                    <td className="px-3 py-2 tabular text-text-secondary">{p.blk.toFixed(1)}</td>
                    <td className="px-3 py-2 tabular text-text-secondary">{(p.fgPct * 100).toFixed(1)}%</td>
                    <td className="px-3 py-2 tabular text-text-secondary">{(p.ftPct * 100).toFixed(1)}%</td>
                    <td className="px-3 py-2">
                      <select
                        value={draftState[key]?.draftedBy ?? ""}
                        onChange={(e) => updateDrafted(p.name, e.target.value)}
                        className={`bg-surface-raised border rounded-md px-2 py-1 text-xs w-28 focus:outline-none focus:ring-1 focus:ring-accent ${
                          isDrafted ? "border-status-negative/40 text-status-negative" : "border-border-subtle text-text-secondary"
                        }`}
                      >
                        <option value="">Available</option>
                        {teams.map((t) => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="text"
                        value={draftState[key]?.note ?? ""}
                        onChange={(e) => updateNote(p.name, e.target.value)}
                        placeholder="—"
                        className="w-32 bg-transparent border-b border-transparent hover:border-border-subtle focus:border-accent focus:outline-none px-1 py-1 text-xs text-text-secondary placeholder-text-muted transition-colors"
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-xs text-text-muted mt-3">
        Click a player&apos;s name for their full profile. Drafted-by tags, notes, and team names
        are saved locally in your browser only.
      </p>
    </div>
  );
}
