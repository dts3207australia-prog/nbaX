import scheduleRaw from "@/data/schedule.json";
import winTotalsRaw from "@/data/win-totals.json";

export type ScheduleGame = { date: string; opponent: string; home: boolean };

export type TeamScheduleStrength = {
  team: string;
  winTotal: number;
  games: number;
  avgOpponentWinTotal: number;
  sosRank: number; // 1 = toughest schedule, 30 = easiest
};

function computeStrength(
  schedule: Record<string, ScheduleGame[]>,
  winTotals: Record<string, number>,
  filterGames: (games: ScheduleGame[]) => ScheduleGame[]
): TeamScheduleStrength[] {
  const rows: Omit<TeamScheduleStrength, "sosRank">[] = Object.entries(schedule).map(
    ([team, allGames]) => {
      const games = filterGames(allGames);
      const oppTotals = games
        .map((g) => winTotals[g.opponent])
        .filter((w): w is number => typeof w === "number");
      const avgOpponentWinTotal =
        oppTotals.length > 0 ? oppTotals.reduce((a, b) => a + b, 0) / oppTotals.length : 0;
      return {
        team,
        winTotal: winTotals[team] ?? 0,
        games: games.length,
        avgOpponentWinTotal,
      };
    }
  );

  // Rank only among teams that actually have games in this window —
  // teams with zero games sort last and don't distort the ranking.
  const withGames = rows.filter((r) => r.games > 0);
  const sorted = [...withGames].sort((a, b) => b.avgOpponentWinTotal - a.avgOpponentWinTotal);
  const rankMap = new Map(sorted.map((r, i) => [r.team, i + 1]));

  return rows
    .map((r) => ({ ...r, sosRank: rankMap.get(r.team) ?? withGames.length + 1 }))
    .sort((a, b) => a.sosRank - b.sosRank);
}

export function getScheduleStrength(): TeamScheduleStrength[] {
  const schedule = scheduleRaw as Record<string, ScheduleGame[]>;
  const winTotals = winTotalsRaw as Record<string, number>;
  return computeStrength(schedule, winTotals, (games) => games);
}

// Anchors "today" to the season opener if the real current date is before
// the season has started (e.g. looking ahead during the preseason).
export function getSeasonWindowStart(): Date {
  const schedule = scheduleRaw as Record<string, ScheduleGame[]>;
  const allDates = Object.values(schedule).flat().map((g) => g.date).sort();
  const earliest = allDates.length > 0 ? new Date(allDates[0]) : new Date();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today < earliest ? earliest : today;
}

export function getScheduleStrengthForWindow(days: number): {
  teams: TeamScheduleStrength[];
  windowStart: string;
  windowEnd: string;
} {
  const schedule = scheduleRaw as Record<string, ScheduleGame[]>;
  const winTotals = winTotalsRaw as Record<string, number>;

  const start = getSeasonWindowStart();
  const end = new Date(start);
  end.setDate(end.getDate() + days);

  const startStr = start.toISOString().slice(0, 10);
  const endStr = end.toISOString().slice(0, 10);

  const teams = computeStrength(schedule, winTotals, (games) =>
    games.filter((g) => g.date >= startStr && g.date < endStr)
  );

  return { teams, windowStart: startStr, windowEnd: endStr };
}

export function getTeamSchedule(team: string): ScheduleGame[] {
  const schedule = scheduleRaw as Record<string, ScheduleGame[]>;
  return schedule[team] ?? [];
}
