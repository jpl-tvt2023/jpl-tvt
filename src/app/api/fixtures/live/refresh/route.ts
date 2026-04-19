import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { fixtures, gameweeks, gameweekCaptains } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { fetchTeamGameweekPicks, fetchLiveGameweek } from "@/lib/fpl";
import { pickLowestScorerAsCaptain } from "@/lib/scoring";
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
 * Calculate live score for a TVT team (2 FPL teams + captaincy doubling)
 */
async function calculateLiveTeamScore(
  teamPlayers: { id: string; name: string; fplId: string }[],
  captainPlayerId: string | undefined,
  gameweek: number
): Promise<{
  total: number;
  players: { name: string; fplId: string; fplScore: number; transferHits: number; isCaptain: boolean; finalScore: number }[];
}> {
  // Fetch live gameweek data once (reused for all players)
  const liveData = await fetchLiveGameweek(gameweek);
  const liveElementsMap = new Map(liveData.elements.map((e) => [e.id, e]));

  // Pass 1: compute each player's net FPL score (with VC activation logic intact).
  const fetched = await Promise.all(teamPlayers.map(async (player) => {
    try {
      const picks = await fetchTeamGameweekPicks(player.fplId, gameweek);
      const transferHits = picks.entry_history.event_transfers_cost;

      const captainPick = picks.picks.find((p) => p.is_captain);
      const captainLive = captainPick ? liveElementsMap.get(captainPick.element) : null;
      const captainPlayed = captainLive ? captainLive.stats.minutes > 0 : false;

      let teamScore = 0;
      for (const pick of picks.picks) {
        const liveElement = liveElementsMap.get(pick.element);
        if (!liveElement) continue;
        let multiplier = pick.multiplier;
        if (!captainPlayed) {
          if (pick.is_captain) multiplier = 0;
          else if (pick.is_vice_captain) multiplier = captainPick?.multiplier ?? 2;
        }
        if (multiplier > 0) teamScore += liveElement.stats.total_points * multiplier;
      }

      const netScore = teamScore - transferHits;
      return { player, netScore, transferHits, ok: true as const };
    } catch (err) {
      console.error(`Failed to fetch live FPL data for team ${player.fplId} in GW${gameweek}:`, err);
      return { player, netScore: 0, transferHits: 0, ok: false as const };
    }
  }));

  const effectiveCaptainId = captainPlayerId ?? pickLowestScorerAsCaptain(
    fetched.filter(f => f.ok).map(f => ({ id: f.player.id, name: f.player.name, netScore: f.netScore }))
  );

  const playerScores = fetched.map(({ player, netScore, transferHits, ok }) => {
    if (!ok) return { name: player.name, fplId: player.fplId, fplScore: 0, transferHits: 0, isCaptain: false, finalScore: 0 };
    const isCaptain = effectiveCaptainId === player.id;
    return {
      name: player.name,
      fplId: player.fplId,
      fplScore: netScore, // Net FPL score after transfer hits (matches original field meaning)
      transferHits,
      isCaptain,
      finalScore: isCaptain ? netScore * 2 : netScore,
    };
  });
  const total = playerScores.reduce((s, p) => s + p.finalScore, 0);

  return { total, players: playerScores };
}
