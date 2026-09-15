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

export function getScheduleStrength(): TeamScheduleStrength[] {
  const schedule = scheduleRaw as Record<string, ScheduleGame[]>;
  const winTotals = winTotalsRaw as Record<string, number>;

  const rows: Omit<TeamScheduleStrength, "sosRank">[] = Object.entries(schedule).map(
    ([team, games]) => {
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

  const sorted = [...rows].sort((a, b) => b.avgOpponentWinTotal - a.avgOpponentWinTotal);
  const rankMap = new Map(sorted.map((r, i) => [r.team, i + 1]));

  return rows
    .map((r) => ({ ...r, sosRank: rankMap.get(r.team)! }))
    .sort((a, b) => a.sosRank - b.sosRank);
}

export function getTeamSchedule(team: string): ScheduleGame[] {
  const schedule = scheduleRaw as Record<string, ScheduleGame[]>;
  return schedule[team] ?? [];
}
