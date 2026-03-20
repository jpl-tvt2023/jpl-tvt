import { NextRequest, NextResponse } from "next/server";
import { db, gameweeks, fixtures, results } from "@/lib/db";
import { eq, asc, isNull } from "drizzle-orm";

/**
 * GET /api/cron/process-scores
 * Vercel Cron Job — reprocesses scores for the current gameweek.
 * Authenticated via CRON_SECRET (checked in middleware).
 */
export async function GET(request: NextRequest) {
  try {
    // Find gameweeks that have fixtures but incomplete results (need processing)
    const allGameweeks = await db
      .select()
      .from(gameweeks)
      .orderBy(asc(gameweeks.number));

    // Find the latest gameweek whose deadline has passed and has pending fixtures
    const now = new Date();
    let targetGW: number | null = null;

    for (const gw of allGameweeks) {
      if (gw.deadline > now) continue; // deadline hasn't passed yet

      // Check if this GW has unprocessed fixtures
      const gwFixtures = await db
        .select({ id: fixtures.id, resultId: results.id })
        .from(fixtures)
        .leftJoin(results, eq(results.fixtureId, fixtures.id))
        .where(eq(fixtures.gameweekId, gw.id));

      if (gwFixtures.length === 0) continue; // no fixtures

      const unprocessed = gwFixtures.filter((f) => f.resultId === null).length;
      const processed = gwFixtures.length - unprocessed;

      // Target this GW if it has any fixtures (reprocess with force)
      // Prefer the latest GW with a passed deadline
      if (gwFixtures.length > 0) {
        targetGW = gw.number;
      }
    }

    if (!targetGW) {
      return NextResponse.json({
        success: true,
        message: "No gameweek needs processing",
      });
    }

    // Call the existing gameweek processing endpoint internally
    const baseUrl = request.nextUrl.origin;
    const processUrl = `${baseUrl}/api/gameweeks/${targetGW}?force=true`;

    const response = await fetch(processUrl, {
      method: "POST",
      headers: {
        // Pass through the cron authorization so middleware injects admin headers
        Authorization: request.headers.get("Authorization") || "",
      },
    });

    const result = await response.json();

    if (!response.ok) {
      console.error(`Cron: Failed to process GW${targetGW}:`, result);
      return NextResponse.json(
        {
          success: false,
          gameweek: targetGW,
          error: result.error || "Processing failed",
        },
        { status: 500 }
      );
    }

    console.log(`Cron: Successfully processed GW${targetGW}`, {
      processed: result.processed,
      failed: result.failed,
    });

    return NextResponse.json({
      success: true,
      gameweek: targetGW,
      processed: result.processed,
      failed: result.failed,
    });
  } catch (error) {
    console.error("Cron process-scores error:", error);
    return NextResponse.json(
      { error: "Cron job failed" },
      { status: 500 }
    );
  }
}
