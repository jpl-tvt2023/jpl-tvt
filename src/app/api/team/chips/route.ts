import { NextRequest, NextResponse } from "next/server";
import { db, teams, gameweeks, gameweekChips, groups, fixtures, settings } from "@/lib/db";
import { eq, and, desc } from "drizzle-orm";
import { generateId } from "@/lib/id";

// Determine chip set based on gameweek
function getChipSet(gwNumber: number): 1 | 2 | "playoffs" {
  if (gwNumber <= 15) return 1;
  if (gwNumber <= 30) return 2;
  return "playoffs";
}

/**
 * POST /api/team/chips
 * Submit a TVT chip for a gameweek
 */
export async function POST(request: NextRequest) {
  try {
    // Check if team is logged in
    const teamId = request.headers.get("x-session-id");
    if (!teamId) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await request.json();
    const { gameweek, chipType, challengedTeamId } = body;

    // Validate required fields
    if (!gameweek || !chipType) {
      return NextResponse.json(
        { error: "gameweek and chipType are required" },
        { status: 400 }
      );
    }

    const gameweekNumber = parseInt(gameweek);
    if (isNaN(gameweekNumber) || gameweekNumber < 1 || gameweekNumber > 38) {
      return NextResponse.json(
        { error: "Invalid gameweek number (must be 1-38)" },
        { status: 400 }
      );
    }

    // Validate chip type
    if (!["W", "D", "C"].includes(chipType)) {
      return NextResponse.json(
        { error: "Invalid chipType. Must be W (Win-Win), D (Double Pointer), or C (Challenge)" },
        { status: 400 }
      );
    }

    // Get team
    const team = await db.query.teams.findFirst({
      where: eq(teams.id, teamId),
      with: {
        group: true,
      },
    });

    if (!team) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 });
    }

    // Get gameweek
    const gw = await db.query.gameweeks.findFirst({
      where: eq(gameweeks.number, gameweekNumber),
    });

    if (!gw) {
      return NextResponse.json({ error: "Gameweek not found" }, { status: 404 });
    }

    // Check if chip announcements are enabled
    const chipSetting = await db.select().from(settings).where(eq(settings.key, "chipAnnouncementEnabled")).limit(1);
    if (chipSetting.length > 0 && chipSetting[0].value === "false") {
      return NextResponse.json(
        { error: "Chip announcements are currently disabled by the admin" },
        { status: 403 }
      );
    }

    // Check deadline
    const now = new Date();
    if (gw.deadline && gw.deadline < now) {
      return NextResponse.json(
        { error: "Deadline has passed for this gameweek" },
        { status: 400 }
      );
    }

    // Check chip set
    const chipSet = getChipSet(gameweekNumber);
    if (chipSet === "playoffs") {
      return NextResponse.json(
        { error: "TVT chips cannot be used in playoffs (GW31+)" },
        { status: 400 }
      );
    }

    // Check if chip is already used for this set
    const chipName = chipType === "D" ? "Double Pointer" : chipType === "C" ? "Challenge Chip" : "Win-Win";
    let alreadyUsed = false;

    if (chipSet === 1) {
      if (chipType === "D" && team.doublePointerSet1Used) alreadyUsed = true;
      if (chipType === "C" && team.challengeChipSet1Used) alreadyUsed = true;
      if (chipType === "W" && team.winWinSet1Used) alreadyUsed = true;
    } else {
      if (chipType === "D" && team.doublePointerSet2Used) alreadyUsed = true;
      if (chipType === "C" && team.challengeChipSet2Used) alreadyUsed = true;
      if (chipType === "W" && team.winWinSet2Used) alreadyUsed = true;
    }

    if (alreadyUsed) {
      return NextResponse.json(
        { error: `${chipName} has already been used for Set ${chipSet} (GW${chipSet === 1 ? "1-15" : "16-30"})` },
        { status: 400 }
      );
    }

    // Check if team has already submitted a chip for this gameweek
    const existingChip = await db.query.gameweekChips.findFirst({
      where: and(
        eq(gameweekChips.teamId, teamId),
        eq(gameweekChips.gameweekId, gw.id)
      ),
    });

    if (existingChip) {
      return NextResponse.json(
        { error: "You have already submitted a chip for this gameweek" },
        { status: 400 }
      );
    }

    // For Challenge Chip, validate the challenged team
    let validatedChallengedTeamId = null;
    if (chipType === "C") {
      if (!challengedTeamId) {
        return NextResponse.json(
          { error: "Challenge Chip requires selecting an opponent team" },
          { status: 400 }
        );
      }

      // Verify the challenged team is in the opposite group
      const challengedTeam = await db.query.teams.findFirst({
        where: eq(teams.id, challengedTeamId),
        with: { group: true },
      });

      if (!challengedTeam) {
        return NextResponse.json(
          { error: "Challenged team not found" },
          { status: 404 }
        );
      }

      if (challengedTeam.groupId === team.groupId) {
        return NextResponse.json(
          { error: "Challenge Chip can only be used against a team from the opposite group" },
          { status: 400 }
        );
      }

      validatedChallengedTeamId = challengedTeamId;
    }

    // Create the chip submission
    const chipId = generateId();
    await db.insert(gameweekChips).values({
      id: chipId,
      teamId: teamId,
      gameweekId: gw.id,
      chipType,
      challengedTeamId: validatedChallengedTeamId,
      isValid: true,
      isProcessed: false,
    });

    return NextResponse.json({
      success: true,
      message: `${chipName} submitted for GW${gameweekNumber}`,
      chip: {
        id: chipId,
        type: chipType,
        name: chipName,
        gameweek: gameweekNumber,
      },
    });
  } catch (error) {
    console.error("Chip submission error:", error);
    return NextResponse.json(
      { error: "Failed to submit chip" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/team/chips
 * Cancel a chip submission for a gameweek (before deadline)
 */
export async function DELETE(request: NextRequest) {
  try {
    // Check if team is logged in
    const teamId = request.headers.get("x-session-id");
    if (!teamId) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await request.json();
    const { gameweek } = body;

    if (!gameweek) {
      return NextResponse.json(
        { error: "gameweek is required" },
        { status: 400 }
      );
    }

    const gameweekNumber = parseInt(gameweek);

    // Get gameweek
    const gw = await db.query.gameweeks.findFirst({
      where: eq(gameweeks.number, gameweekNumber),
    });

    if (!gw) {
      return NextResponse.json({ error: "Gameweek not found" }, { status: 404 });
    }

    // Check deadline
    const now = new Date();
    if (gw.deadline && gw.deadline < now) {
      return NextResponse.json(
        { error: "Cannot cancel chip after deadline has passed" },
        { status: 400 }
      );
    }

    // Find the chip submission
    const existingChip = await db.query.gameweekChips.findFirst({
      where: and(
        eq(gameweekChips.teamId, teamId),
        eq(gameweekChips.gameweekId, gw.id),
        eq(gameweekChips.isProcessed, false)
      ),
    });

    if (!existingChip) {
      return NextResponse.json(
        { error: "No chip submission found for this gameweek" },
        { status: 404 }
      );
    }

    // Delete the chip
    await db.delete(gameweekChips).where(eq(gameweekChips.id, existingChip.id));

    return NextResponse.json({
      success: true,
      message: `Chip cancelled for GW${gameweekNumber}`,
    });
  } catch (error) {
    console.error("Chip cancellation error:", error);
    return NextResponse.json(
      { error: "Failed to cancel chip" },
      { status: 500 }
    );
  }
}
