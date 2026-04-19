import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { gameweeks, challengerSurvivalEntries, gameweekCaptains, players, teams } from "@/lib/db/schema";
import { eq, inArray } from "drizzle-orm";
import { fetchTeamGameweekPicks } from "@/lib/fpl";

interface PlayerScore {
  name: string;
  fplId: string;
  fplScore: number;
  transferHits: number;
  isCaptain: boolean;
  finalScore: number;
}

interface SurvivalDisplay {
  teamId: string;
  name: string;
  abbr: string;
  score: number;
  rank: number | null;
  advanced: boolean;
  players: PlayerScore[];
}

/**
 * GET /api/playoffs/survival/refresh?gameweek=33
 * Ephemeral live refresh for Challenger Survival. Never writes to DB —
 * matches the contract of /api/fixtures/live/refresh. Survival scoring: no
 * captain doubling (finalScore = fplScore - transferHits).
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const gwParam = searchParams.get("gameweek");
    const gwNumber = gwParam ? parseInt(gwParam) : 33;
    if (isNaN(gwNumber) || gwNumber !== 33) {
      return NextResponse.json({ error: "Only GW33 supported" }, { status: 400 });
    }

    const gw = await db.query.gameweeks.findFirst({ where: eq(gameweeks.number, gwNumber) });
    if (!gw) return NextResponse.json({ error: "Gameweek not found" }, { status: 404 });

    const entries = await db.select().from(challengerSurvivalEntries)
      .where(eq(challengerSurvivalEntries.gameweekId, gw.id));
    if (entries.length === 0) {
      return NextResponse.json({ gameweek: gwNumber, entries: [] });
    }

    const teamIds = entries.map(e => e.teamId);
    const allPlayers = await db.select().from(players).where(inArray(players.teamId, teamIds));
    const playersByTeamId = new Map<string, typeof allPlayers>();
    for (const p of allPlayers) {
      const arr = playersByTeamId.get(p.teamId) ?? [];
      arr.push(p);
      playersByTeamId.set(p.teamId, arr);
    }

    const captainPicks = await db.select().from(gameweekCaptains)
      .where(eq(gameweekCaptains.gameweekId, gw.id));
    const captainByTeam = new Map<string, string>();
    for (const pick of captainPicks) {
      const owner = allPlayers.find(p => p.id === pick.playerId);
      if (owner) captainByTeam.set(owner.teamId, pick.playerId);
    }

    const allTeams = await db.select().from(teams).where(inArray(teams.id, teamIds));
    const teamInfoById = new Map(allTeams.map(t => [t.id, t]));

    const result: SurvivalDisplay[] = [];
    for (const entry of entries) {
      const teamPlayers = playersByTeamId.get(entry.teamId) ?? [];
      const captainPlayerId = captainByTeam.get(entry.teamId);
      const breakdown: PlayerScore[] = [];
      let total = 0;

      for (const p of teamPlayers) {
        let fplScore = 0;
        let transferHits = 0;
        try {
          const picks = await fetchTeamGameweekPicks(p.fplId, gwNumber);
          fplScore = picks.entry_history.points;
          transferHits = picks.entry_history.event_transfers_cost;
        } catch (err) {
          console.error(`Live FPL fetch failed for fplId ${p.fplId} GW${gwNumber}:`, err);
        }
        const isCaptain = captainPlayerId === p.id;
        const finalScore = fplScore - transferHits; // no captain doubling for survival
        total += finalScore;
        breakdown.push({
          name: p.name,
          fplId: p.fplId,
          fplScore,
          transferHits,
          isCaptain,
          finalScore,
        });
      }

      const info = teamInfoById.get(entry.teamId);
      result.push({
        teamId: entry.teamId,
        name: info?.name ?? "Unknown",
        abbr: info?.abbreviation ?? "?",
        score: total,
        rank: entry.rank,
        advanced: entry.advanced,
        players: breakdown,
      });
    }

    result.sort((a, b) => b.score - a.score);

    return NextResponse.json({ gameweek: gwNumber, entries: result });
  } catch (error) {
    console.error("Survival refresh error:", error);
    return NextResponse.json({ error: "Failed to refresh survival scores" }, { status: 500 });
  }
}
