"use client";

import { useMemo, useState } from "react";
import type { ScoredPlayer } from "@/lib/scoring";
import type { ConsensusPlayer } from "@/lib/consensus";
import type { FanscoutPlayer } from "@/lib/fanscout";
import { normalizeName } from "@/lib/names";
import type { DraftState } from "./AppShell";

type Source = "mine" | "consensus" | "fanscout";

type AnyPlayer = ScoredPlayer | ConsensusPlayer | FanscoutPlayer;

type MySortKey =
  | "rank" | "name" | "pos" | "total" | "fgPct" | "ftPct"
  | "tpm" | "tpPct" | "oreb" | "dreb" | "ast" | "ato" | "stl" | "blk" | "pts";

type ConsensusSortKey =
  | "rank" | "name" | "pos" | "total" | "fgZ" | "ftZ" | "tpmZ" | "tpPctZ"
  | "orebZ" | "drebZ" | "astZ" | "atoZ" | "stlZ" | "blkZ" | "ptsZ" | "catWins" | "tier";

type FanscoutSortKey =
  | "rank" | "name" | "pos" | "total" | "pts" | "tpm" | "oreb" | "dreb" | "ast"
  | "stl" | "blk" | "ato" | "fgPct" | "ftPct";

type SortKey = MySortKey | ConsensusSortKey | FanscoutSortKey;

const TIER_COLOR: Record<string, string> = {
  Elite: "text-accent",
  Strong: "text-status-positive",
  Solid: "text-info",
  "Mid-Round": "text-text-secondary",
  Late: "text-text-muted",
};

export default function DraftBoard({
  myPlayers,
  consensusPlayers,
  fanscoutPlayers,
  teams,
  draftState,
  setDraftState,
  onSelectPlayer,
}: {
  myPlayers: ScoredPlayer[];
  consensusPlayers: ConsensusPlayer[];
  fanscoutPlayers: FanscoutPlayer[];
  teams: string[];
  draftState: DraftState;
  setDraftState: (updater: (prev: DraftState) => DraftState) => void;
  onSelectPlayer: (name: string) => void;
}) {
  const [source, setSource] = useState<Source>("mine");
  const [sortKeyBySource, setSortKeyBySource] = useState<Record<Source, SortKey>>({
    mine: "rank", consensus: "rank", fanscout: "rank",
  });
  const [sortAscBySource, setSortAscBySource] = useState<Record<Source, boolean>>({
    mine: true, consensus: true, fanscout: true,
  });
  const [search, setSearch] = useState("");
  const [posFilter, setPosFilter] = useState("ALL");
  const [hideDrafted, setHideDrafted] = useState(false);

  const activePlayers: AnyPlayer[] =
    source === "mine" ? myPlayers : source === "consensus" ? consensusPlayers : fanscoutPlayers;

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

  const sortKey = sortKeyBySource[source];
  const sortAsc = sortAscBySource[source];

  const sorted = useMemo(() => {
    const getValue = (p: AnyPlayer): number | string => {
      // @ts-expect-error - narrowed by source at call sites
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
    if (sortKeyBySource[source] === key) {
      setSortAscBySource((prev) => ({ ...prev, [source]: !prev[source] }));
    } else {
      setSortKeyBySource((prev) => ({ ...prev, [source]: key }));
      setSortAscBySource((prev) => ({
        ...prev,
        [source]: key === "rank" || key === "name" || key === "pos" || key === "tier",
      }));
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

  const sourceLabel: Record<Source, string> = {
    mine: "Your custom rankings — z-scores computed from raw 2025-26 per-game stats.",
    consensus: "Consensus rankings — a second, independently pre-scored source (projected + estimated categories).",
    fanscout: "FanScout projections — real 2026-27 per-game projections with their own value score (10 of 11 categories match your league; only 3P% is missing).",
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="inline-flex rounded-lg border border-border-subtle bg-surface p-1">
          <SourceButton active={source === "mine"} onClick={() => setSource("mine")}>My Rankings</SourceButton>
          <SourceButton active={source === "consensus"} onClick={() => setSource("consensus")}>Consensus</SourceButton>
          <SourceButton active={source === "fanscout"} onClick={() => setSource("fanscout")}>FanScout</SourceButton>
        </div>
        <p className="text-text-muted text-xs tabular">
          {draftedCount} of {activePlayers.length} drafted
        </p>
      </div>

      <p className="text-text-secondary text-sm mb-4">{sourceLabel[source]}</p>

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
                {headerCell("Score", "total")}
                {source === "mine" && (
                  <>
                    {headerCell("FG%", "fgPct")}{headerCell("FT%", "ftPct")}{headerCell("3PM", "tpm")}
                    {headerCell("3P%", "tpPct")}{headerCell("OREB", "oreb")}{headerCell("DREB", "dreb")}
                    {headerCell("AST", "ast")}{headerCell("A/TO", "ato")}{headerCell("STL", "stl")}
                    {headerCell("BLK", "blk")}{headerCell("PTS", "pts")}
                  </>
                )}
                {source === "consensus" && (
                  <>
                    {headerCell("FG% z", "fgZ")}{headerCell("FT% z", "ftZ")}{headerCell("3PM z", "tpmZ")}
                    {headerCell("3P% z", "tpPctZ")}{headerCell("OREB z", "orebZ")}{headerCell("DREB z", "drebZ")}
                    {headerCell("AST z", "astZ")}{headerCell("A/TO z", "atoZ")}{headerCell("STL z", "stlZ")}
                    {headerCell("BLK z", "blkZ")}{headerCell("PTS z", "ptsZ")}{headerCell("Cat Wins", "catWins")}
                    {headerCell("Tier", "tier")}
                  </>
                )}
                {source === "fanscout" && (
                  <>
                    {headerCell("PTS", "pts")}{headerCell("3PM", "tpm")}{headerCell("OREB", "oreb")}
                    {headerCell("DREB", "dreb")}{headerCell("AST", "ast")}{headerCell("A/TO", "ato")}
                    {headerCell("STL", "stl")}{headerCell("BLK", "blk")}{headerCell("FG%", "fgPct")}
                    {headerCell("FT%", "ftPct")}
                  </>
                )}
                <th className="px-3 py-2.5 text-left text-xs font-medium text-text-muted uppercase tracking-wider">Drafted By</th>
                <th className="px-3 py-2.5 text-left text-xs font-medium text-text-muted uppercase tracking-wider">Notes</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((p, idx) => {
                const key = normalizeName(p.name);
                const isDrafted = !!draftState[key]?.draftedBy;
                const mp = p as ScoredPlayer;
                const cp = p as ConsensusPlayer;
                const fp = p as FanscoutPlayer;
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
                    {source === "mine" && (
                      <>
                        <td className="px-3 py-2 tabular text-text-secondary">{(mp.fgPct * 100).toFixed(1)}%</td>
                        <td className="px-3 py-2 tabular text-text-secondary">{(mp.ftPct * 100).toFixed(1)}%</td>
                        <td className="px-3 py-2 tabular text-text-secondary">{mp.tpm.toFixed(1)}</td>
                        <td className="px-3 py-2 tabular text-text-secondary">{(mp.tpPct * 100).toFixed(1)}%</td>
                        <td className="px-3 py-2 tabular text-text-secondary">{mp.oreb.toFixed(1)}</td>
                        <td className="px-3 py-2 tabular text-text-secondary">{mp.dreb.toFixed(1)}</td>
                        <td className="px-3 py-2 tabular text-text-secondary">{mp.ast.toFixed(1)}</td>
                        <td className="px-3 py-2 tabular text-text-secondary">{mp.ato.toFixed(2)}</td>
                        <td className="px-3 py-2 tabular text-text-secondary">{mp.stl.toFixed(1)}</td>
                        <td className="px-3 py-2 tabular text-text-secondary">{mp.blk.toFixed(1)}</td>
                        <td className="px-3 py-2 tabular text-text-secondary">{mp.pts.toFixed(1)}</td>
                      </>
                    )}
                    {source === "consensus" && (
                      <>
                        <td className="px-3 py-2 tabular text-text-secondary">{cp.fgZ.toFixed(2)}</td>
                        <td className="px-3 py-2 tabular text-text-secondary">{cp.ftZ.toFixed(2)}</td>
                        <td className="px-3 py-2 tabular text-text-secondary">{cp.tpmZ.toFixed(2)}</td>
                        <td className="px-3 py-2 tabular text-text-secondary">{cp.tpPctZ.toFixed(2)}</td>
                        <td className="px-3 py-2 tabular text-text-secondary">{cp.orebZ.toFixed(2)}</td>
                        <td className="px-3 py-2 tabular text-text-secondary">{cp.drebZ.toFixed(2)}</td>
                        <td className="px-3 py-2 tabular text-text-secondary">{cp.astZ.toFixed(2)}</td>
                        <td className="px-3 py-2 tabular text-text-secondary">{cp.atoZ.toFixed(2)}</td>
                        <td className="px-3 py-2 tabular text-text-secondary">{cp.stlZ.toFixed(2)}</td>
                        <td className="px-3 py-2 tabular text-text-secondary">{cp.blkZ.toFixed(2)}</td>
                        <td className="px-3 py-2 tabular text-text-secondary">{cp.ptsZ.toFixed(2)}</td>
                        <td className="px-3 py-2 tabular text-text-secondary">{cp.catWins}</td>
                        <td className={`px-3 py-2 text-xs font-medium ${TIER_COLOR[cp.tier] ?? "text-text-secondary"}`}>{cp.tier}</td>
                      </>
                    )}
                    {source === "fanscout" && (
                      <>
                        <td className="px-3 py-2 tabular text-text-secondary">{fp.pts.toFixed(1)}</td>
                        <td className="px-3 py-2 tabular text-text-secondary">{fp.tpm.toFixed(1)}</td>
                        <td className="px-3 py-2 tabular text-text-secondary">{fp.oreb.toFixed(1)}</td>
                        <td className="px-3 py-2 tabular text-text-secondary">{fp.dreb.toFixed(1)}</td>
                        <td className="px-3 py-2 tabular text-text-secondary">{fp.ast.toFixed(1)}</td>
                        <td className="px-3 py-2 tabular text-text-secondary">{fp.ato.toFixed(2)}</td>
                        <td className="px-3 py-2 tabular text-text-secondary">{fp.stl.toFixed(1)}</td>
                        <td className="px-3 py-2 tabular text-text-secondary">{fp.blk.toFixed(1)}</td>
                        <td className="px-3 py-2 tabular text-text-secondary">{(fp.fgPct * 100).toFixed(1)}%</td>
                        <td className="px-3 py-2 tabular text-text-secondary">{(fp.ftPct * 100).toFixed(1)}%</td>
                      </>
                    )}
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
        Click a player&apos;s name for their full multi-source profile. Drafted-by
        tags, notes, and team names are saved locally in your browser only.
      </p>
    </div>
  );
}

function SourceButton({
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
      className={`px-3.5 py-1.5 rounded-md text-sm font-medium transition-colors ${
        active ? "bg-accent text-[#0A0E14]" : "text-text-secondary hover:text-text-primary"
      }`}
    >
      {children}
    </button>
  );
}
