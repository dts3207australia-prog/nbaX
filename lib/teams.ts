export const TEAMS_STORAGE_KEY = "nba-draft-manager-teams-v1";

export function defaultTeams(numTeams: number): string[] {
  return ["My Team", ...Array.from({ length: numTeams - 1 }, (_, i) => `Team ${i + 2}`)];
}
