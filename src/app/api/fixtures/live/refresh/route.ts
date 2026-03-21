import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { fixtures, gameweeks, gameweekCaptains } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { fetchTeamGameweekPicks } from "@/lib/fpl";
import type { LiveFixtureScore, LiveGameweekData } from "@/lib/fpl-cache";

/**
 * GET /api/fixtures/live/refresh?gameweek=N
 * Force-fetches fresh live scores from FPL API (no caching)
 * Used when user clicks refresh button on a match card
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const gwParam = searchParams.get("gameweek");

    if (!gwParam) {
      return NextResponse.json({ error: "gameweek parameter required" }, { status: 400 });
    }

    const gwNumber = parseInt(gwParam);
    if (isNaN(gwNumber) || gwNumber < 1 || gwNumber > 38) {
      return NextResponse.json({ error: "Invalid gameweek" }, { status: 400 });
    }

    // Find gameweek
    const gwRecords = await db.select().from(gameweeks).where(eq(gameweeks.number, gwNumber));
    if (gwRecords.length === 0) {
      return NextResponse.json({ error: "Gameweek not found" }, { status: 404 });
    }
    const gw = gwRecords[0];

    // Get fixtures
    const gwFixtures = await db.query.fixtures.findMany({
      where: eq(fixtures.gameweekId, gw.id),
      with: {
        homeTeam: { with: { players: true } },
        awayTeam: { with: { players: true } },
      },
    });

    if (gwFixtures.length === 0) {
      return NextResponse.json({ error: "No fixtures found" }, { status: 404 });
    }

    // Get captain picks
    const captainPicks = await db.query.gameweekCaptains.findMany({
      where: eq(gameweekCaptains.gameweekId, gw.id),
      with: { player: true },
    });

    const captainByTeam = new Map<string, string>();
    for (const pick of captainPicks) {
      captainByTeam.set(pick.player.teamId, pick.player.id);
    }

    // Fetch fresh scores from FPL API (always fresh, never cached)
    const liveFixtures: LiveFixtureScore[] = [];

    for (const fixture of gwFixtures) {
      try {
        const homeScore = await calculateLiveTeamScore(
          fixture.homeTeam.players,
          captainByTeam.get(fixture.homeTeamId),
          gwNumber
        );
        const awayScore = await calculateLiveTeamScore(
          fixture.awayTeam.players,
          captainByTeam.get(fixture.awayTeamId),
          gwNumber
        );

        liveFixtures.push({
          fixtureId: fixture.id,
          gameweek: gwNumber,
          homeTeamName: fixture.homeTeam.name,
          awayTeamName: fixture.awayTeam.name,
          homeTeamAbbr: fixture.homeTeam.abbreviation,
          awayTeamAbbr: fixture.awayTeam.abbreviation,
          homeScore: homeScore.total,
          awayScore: awayScore.total,
          homePlayers: homeScore.players,
          awayPlayers: awayScore.players,
        });
      } catch (err) {
        console.error(`Refresh: Score error for fixture ${fixture.id}:`, err);
        liveFixtures.push({
          fixtureId: fixture.id,
          gameweek: gwNumber,
          homeTeamName: fixture.homeTeam.name,
          awayTeamName: fixture.awayTeam.name,
          homeTeamAbbr: fixture.homeTeam.abbreviation,
          awayTeamAbbr: fixture.awayTeam.abbreviation,
          homeScore: 0,
          awayScore: 0,
          homePlayers: [],
          awayPlayers: [],
        });
      }
    }

    const liveData: LiveGameweekData = {
      gameweek: gwNumber,
      fixtures: liveFixtures,
      cachedAt: new Date().toISOString(),
    };

    return NextResponse.json(liveData);
  } catch (error) {
    console.error("Refresh error:", error);
    return NextResponse.json({ error: "Failed to refresh scores" }, { status: 500 });
  }
}

/**
 * Calculate live score for a TVT team (2 FPL players + captaincy doubling)
 */
async function calculateLiveTeamScore(
  teamPlayers: { id: string; name: string; fplId: string }[],
  captainPlayerId: string | undefined,
  gameweek: number
): Promise<{
  total: number;
  players: { name: string; fplScore: number; transferHits: number; isCaptain: boolean; finalScore: number }[];
}> {
  const playerScores = [];
  let total = 0;

  for (const player of teamPlayers) {
    try {
      const picks = await fetchTeamGameweekPicks(player.fplId, gameweek);
      const fplScore = picks.entry_history.points;
      const transferHits = picks.entry_history.event_transfers_cost;
      const netScore = fplScore - transferHits;
      const isCaptain = captainPlayerId === player.id;
      const finalScore = isCaptain ? netScore * 2 : netScore;

      playerScores.push({
        name: player.name,
        fplScore,
        transferHits,
        isCaptain,
        finalScore,
      });

      total += finalScore;
    } catch (err) {
      console.error(`Failed to fetch FPL data for player ${player.fplId} in GW${gameweek}:`, err);
      playerScores.push({
        name: player.name,
        fplScore: 0,
        transferHits: 0,
        isCaptain: false,
        finalScore: 0,
      });
    }
  }

  return { total, players: playerScores };
}
