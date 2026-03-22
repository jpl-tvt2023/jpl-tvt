import { NextRequest, NextResponse } from "next/server";
import { db, teams, fixtures, results, gameweeks, gameweekCaptains } from "@/lib/db";
import { eq, and, asc, desc } from "drizzle-orm";

function getFplTeamUrl(fplId: string, gameweek?: number): string {
  if (gameweek) {
    return `https://fantasy.premierleague.com/entry/${fplId}/event/${gameweek}`;
  }
  return `https://fantasy.premierleague.com/entry/${fplId}/history`;
}

/**
 * GET /api/team/dashboard/gw-result?gw=N
 * Lightweight endpoint — returns ONLY the GW result data for navigation.
 * No FPL deadline sync, no standings, no chip/captain status refresh.
 */
export async function GET(request: NextRequest) {
  try {
    const teamId = request.headers.get("x-session-id");
    if (!teamId) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const url = new URL(request.url);
    const gwParam = url.searchParams.get("gw");
    if (!gwParam) {
      return NextResponse.json({ error: "gw parameter required" }, { status: 400 });
    }
    const requestedGw = parseInt(gwParam, 10);
    if (isNaN(requestedGw) || requestedGw < 1) {
      return NextResponse.json({ error: "Invalid gw parameter" }, { status: 400 });
    }

    // Get team with players
    const team = await db.query.teams.findFirst({
      where: eq(teams.id, teamId),
      with: {
        players: true,
        homeFixtures: {
          with: {
            result: true,
            gameweek: true,
            awayTeam: { with: { players: true } },
          },
        },
        awayFixtures: {
          with: {
            result: true,
            gameweek: true,
            homeTeam: { with: { players: true } },
          },
        },
      },
    });

    if (!team) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 });
    }

    // All completed fixtures
    const allFixtures = [...team.homeFixtures, ...team.awayFixtures]
      .filter(f => f.result)
      .sort((a, b) => b.gameweek.number - a.gameweek.number);

    if (allFixtures.length === 0) {
      return NextResponse.json({ lastGwResult: null, minCompletedGw: null, maxCompletedGw: null });
    }

    // Min/max for navigation
    const completedGwNumbers = allFixtures.map(f => f.gameweek.number);
    const minCompletedGw = Math.min(...completedGwNumbers);
    const maxCompletedGw = Math.max(...completedGwNumbers);

    // Find the requested fixture
    const lastF: any = allFixtures.find(f => f.gameweek.number === requestedGw) || allFixtures[0];

    const isHome = lastF.homeTeamId === teamId;
    const myScore = isHome ? lastF.result!.homeScore : lastF.result!.awayScore;
    const oppScore = isHome ? lastF.result!.awayScore : lastF.result!.homeScore;
    const myPoints = isHome ? lastF.result!.homeMatchPoints : lastF.result!.awayMatchPoints;
    const gotBonus = isHome ? lastF.result!.homeGotBonus : lastF.result!.awayGotBonus;

    let result: "W" | "D" | "L";
    if (myPoints === 2) result = "W";
    else if (myPoints === 1) result = "D";
    else result = "L";

    const opponentTeam = isHome
      ? team.homeFixtures.find(f => f.id === lastF.id)?.awayTeam
      : team.awayFixtures.find(f => f.id === lastF.id)?.homeTeam;

    // Get captain info for this gameweek
    const lastGwCaptains = await db.query.gameweekCaptains.findMany({
      where: eq(gameweekCaptains.gameweekId, lastF.gameweek.id),
      with: { player: true },
    });

    const myCaptain = lastGwCaptains.find(c => c.player.teamId === teamId);
    const oppCaptain = opponentTeam ? lastGwCaptains.find(c => c.player.teamId === opponentTeam.id) : null;

    const inferScores = (total: number, players: { name: string }[]) => {
      const captainBase = Math.floor((total - 1) / 3);
      const captainDoubled = captainBase * 2;
      const nonCaptainScore = total - captainDoubled;
      const sortedPlayers = [...players].sort((a, b) => a.name.localeCompare(b.name));
      return sortedPlayers.map((p, i) => ({
        name: p.name,
        isCaptain: i === 0,
        fplScore: i === 0 ? captainBase : nonCaptainScore,
        transferHits: 0,
        finalScore: i === 0 ? captainDoubled : nonCaptainScore,
        isInferred: true,
      }));
    };

    // Build my player scores
    let myPlayerScores: any[] = [];
    let hasMyCaptainData = false;

    if (myCaptain) {
      hasMyCaptainData = true;
      myPlayerScores = team.players.map(p => {
        const isCaptain = myCaptain.playerId === p.id;
        const fplUrl = getFplTeamUrl(p.fplId, lastF.gameweek.number);
        if (isCaptain) {
          return {
            name: p.name, isCaptain: true,
            fplScore: myCaptain.fplScore, transferHits: myCaptain.transferHits,
            finalScore: myCaptain.doubledScore, fplId: p.fplId, fplUrl,
          };
        } else {
          const nonCaptainScore = myScore - myCaptain.doubledScore;
          return {
            name: p.name, isCaptain: false,
            fplScore: nonCaptainScore, transferHits: 0,
            finalScore: nonCaptainScore, fplId: p.fplId, fplUrl,
          };
        }
      });
    } else {
      myPlayerScores = team.players.map((p, i) => {
        const inferred = inferScores(myScore, team.players)[i];
        const fplUrl = getFplTeamUrl(p.fplId, lastF.gameweek.number);
        return { ...inferred, fplId: p.fplId, fplUrl };
      });
    }

    // Build opponent player scores
    let oppPlayerScores: any[] = [];
    let hasOppCaptainData = false;

    if (oppCaptain && opponentTeam) {
      hasOppCaptainData = true;
      oppPlayerScores = opponentTeam.players.map(p => {
        const isCaptain = oppCaptain.playerId === p.id;
        const fplUrl = getFplTeamUrl(p.fplId, lastF.gameweek.number);
        if (isCaptain) {
          return {
            name: p.name, isCaptain: true,
            fplScore: oppCaptain.fplScore, transferHits: oppCaptain.transferHits,
            finalScore: oppCaptain.doubledScore, fplId: p.fplId, fplUrl,
          };
        } else {
          const nonCaptainScore = oppScore - oppCaptain.doubledScore;
          return {
            name: p.name, isCaptain: false,
            fplScore: nonCaptainScore, transferHits: 0,
            finalScore: nonCaptainScore, fplId: p.fplId, fplUrl,
          };
        }
      });
    } else if (opponentTeam) {
      oppPlayerScores = opponentTeam.players.map((p, i) => {
        const inferred = inferScores(oppScore, opponentTeam.players)[i];
        const fplUrl = getFplTeamUrl(p.fplId, lastF.gameweek.number);
        return { ...inferred, fplId: p.fplId, fplUrl };
      });
    }

    const lastGwResult = {
      gameweek: lastF.gameweek.number,
      result,
      myScore,
      oppScore,
      gotBonus,
      isHome,
      myTeamName: team.name,
      myTeamAbbr: team.abbreviation,
      opponent: opponentTeam?.name || "Unknown",
      opponentAbbr: opponentTeam?.abbreviation || "??",
      hasMyCaptainData,
      hasOppCaptainData,
      myPlayerScores,
      oppPlayerScores,
      isPlayoff: lastF.isPlayoff || false,
      roundName: lastF.roundName || null,
      tieId: lastF.tieId || null,
      leg: lastF.leg || null,
    };

    return NextResponse.json({ lastGwResult, minCompletedGw, maxCompletedGw });
  } catch (error) {
    console.error("GW result error:", error);
    return NextResponse.json({ error: "Failed to fetch GW result" }, { status: 500 });
  }
}
