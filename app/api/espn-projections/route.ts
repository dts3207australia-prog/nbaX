import { NextResponse } from "next/server";

// Server-only. Pulls ESPN's actual season-long fantasy PROJECTIONS for the
// full player pool, using the same ESPN_S2/ESPN_SWID cookies already
// configured for roster sync. This hits ESPN's private, undocumented
// Fantasy API (kona_player_info view) — it is not officially documented,
// so the exact response shape is based on well-established community
// patterns (the espn-api open-source library uses this same approach),
// not something verifiable from this sandbox. First real test happens
// once this is deployed with live cookies.

const LEAGUE_ID = process.env.ESPN_LEAGUE_ID ?? "85907";
const SEASON_ID = process.env.ESPN_SEASON_ID ?? "2027";

export async function GET() {
  const s2 = process.env.ESPN_S2;
  const swid = process.env.ESPN_SWID;

  if (!s2 || !swid) {
    return NextResponse.json(
      { error: "ESPN_S2 and ESPN_SWID environment variables are not set on this deployment." },
      { status: 400 }
    );
  }

  const url = `https://lm-api-reads.fantasy.espn.com/apis/v3/games/fba/seasons/${SEASON_ID}/segments/0/leagues/${LEAGUE_ID}?view=kona_player_info`;

  // filterStatsForSourceIds: 1 = projected stats (0 = actual stats).
  // limit is set high to try to capture the full rosterable player pool.
  const filter = {
    players: {
      filterStatus: { value: ["FREEAGENT", "WAIVERS", "ONTEAM"] },
      limit: 600,
      sortDraftRanks: { sortPriority: 100, sortAsc: true, value: "STANDARD" },
      filterStatsForSourceIds: { value: [1] },
      filterStatsForSeasonIds: { value: [Number(SEASON_ID)] },
    },
  };

  let res: Response;
  try {
    res = await fetch(url, {
      headers: {
        Cookie: `espn_s2=${s2}; SWID=${swid}`,
        "x-fantasy-filter": JSON.stringify(filter),
      },
      cache: "no-store",
    });
  } catch (err) {
    return NextResponse.json({ error: "Could not reach ESPN.", detail: String(err) }, { status: 502 });
  }

  if (!res.ok) {
    let body: unknown = null;
    try {
      body = await res.json();
    } catch {
      try {
        body = await res.text();
      } catch {
        body = null;
      }
    }
    return NextResponse.json(
      {
        error: `ESPN returned ${res.status}. Cookies may be expired, or this filter format may need adjusting.`,
        espnStatus: res.status,
        espnResponseBody: body,
        requestUrl: url,
        requestFilter: filter,
      },
      { status: res.status }
    );
  }

  let data: unknown;
  try {
    data = await res.json();
  } catch (err) {
    return NextResponse.json({ error: "ESPN response was not valid JSON.", detail: String(err) }, { status: 502 });
  }

  const raw = data as { players?: unknown[] };
  const rawPlayers = Array.isArray(raw.players) ? raw.players : [];

  if (rawPlayers.length === 0) {
    // Return the raw top-level shape so we can see what ESPN actually sent
    // back and fix the parsing in the next pass, rather than silently
    // returning an empty, useless result.
    return NextResponse.json({
      warning: "No players found in ESPN's response — the filter or view may need adjusting.",
      topLevelKeys: typeof data === "object" && data !== null ? Object.keys(data) : [],
      sample: data,
    });
  }

  type EspnPlayerEntry = {
    player?: {
      id?: number;
      fullName?: string;
      proTeamId?: number;
      defaultPositionId?: number;
      stats?: { statSourceId?: number; seasonId?: number; stats?: Record<string, number>; appliedTotal?: number; appliedAverage?: number }[];
    };
  };

  const players = (rawPlayers as EspnPlayerEntry[]).map((entry) => {
    const player = entry.player ?? {};
    const projectedEntry = (player.stats ?? []).find(
      (s) => s.statSourceId === 1 && s.seasonId === Number(SEASON_ID)
    );
    return {
      espnId: player.id,
      name: player.fullName,
      proTeamId: player.proTeamId,
      defaultPositionId: player.defaultPositionId,
      projectedStats: projectedEntry?.stats ?? null,
      appliedTotal: projectedEntry?.appliedTotal ?? null,
      appliedAverage: projectedEntry?.appliedAverage ?? null,
    };
  });

  const matchedProjections = players.filter((p) => p.projectedStats !== null).length;

  return NextResponse.json({
    count: players.length,
    matchedProjections,
    players,
    fetchedAt: new Date().toISOString(),
    // Include one full raw entry so the stat-ID-to-category mapping can be
    // verified/fixed against real data if projectedStats objects came back
    // with unfamiliar numeric keys.
    rawSampleEntry: rawPlayers[0] ?? null,
  });
}
