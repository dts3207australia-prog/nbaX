import { NextResponse } from "next/server";

// Server-only. ESPN_S2 and ESPN_SWID are read from Vercel environment
// variables and never sent to the browser — this route only returns the
// simplified team/roster data derived from them.

const LEAGUE_ID = process.env.ESPNLEAGUEID ?? "85907";
const SEASON_ID = process.env.ESPNSEASONID ?? "2027";
const MY_TEAM_ID = process.env.ESPNTEAMID ?? "20";

type EspnPlayer = {
  fullName: string;
  defaultPositionId: number;
};

type EspnRosterEntry = {
  playerPoolEntry: { player: EspnPlayer };
};

type EspnTeam = {
  id: number;
  name?: string;
  location?: string;
  nickname?: string;
  roster?: { entries: EspnRosterEntry[] };
};

export async function GET() {
  const s2 = process.env.ESPNS2;
  const swid = process.env.ESPNSWID;

  if (!s2 || !swid) {
    return NextResponse.json(
      { error: "ESPNS2 and ESPNSWID environment variables are not set on this deployment." },
      { status: 400 }
    );
  }

  const url = `https://lm-api-reads.fantasy.espn.com/apis/v3/games/fba/seasons/${SEASON_ID}/segments/0/leagues/${LEAGUE_ID}?view=mTeam&view=mRoster`;

  let res: Response;
  try {
    res = await fetch(url, {
      headers: {
        Cookie: `espn_s2=${s2}; SWID=${swid}`,
      },
      cache: "no-store",
    });
  } catch (err) {
    return NextResponse.json({ error: "Could not reach ESPN.", detail: String(err) }, { status: 502 });
  }

  if (!res.ok) {
    return NextResponse.json(
      { error: `ESPN returned ${res.status}. Cookies may be expired — re-copy espn_s2 and SWID and update ESPNS2/ESPNSWID in Vercel.` },
      { status: res.status }
    );
  }

  const data = await res.json();
  const teams: EspnTeam[] = data.teams ?? [];

  const simplified = teams.map((t) => {
    const fallbackName = `${t.location ?? ""} ${t.nickname ?? ""}`.trim();
    const name = t.name ?? (fallbackName || `Team ${t.id}`);
    const players = (t.roster?.entries ?? []).map((e) => e.playerPoolEntry.player.fullName);
    return {
      espnTeamId: t.id,
      name,
      isMe: String(t.id) === MY_TEAM_ID,
      players,
    };
  });

  return NextResponse.json({ teams: simplified, fetchedAt: new Date().toISOString() });
}
