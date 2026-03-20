import { NextRequest, NextResponse } from "next/server";
import { db, users, teams } from "@/lib/db";
import { eq } from "drizzle-orm";
import { verifySession, SESSION_COOKIE_NAME } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
    if (!token) {
      return NextResponse.json({ authenticated: false }, { status: 200 });
    }

    const session = await verifySession(token);
    if (!session) {
      return NextResponse.json({ authenticated: false }, { status: 200 });
    }

    if (session.type === "admin") {
      const userList = await db.select().from(users).where(eq(users.id, session.id));
      const user = userList[0];
      if (user) {
        return NextResponse.json({
          authenticated: true,
          type: "admin",
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            isAdmin: user.isAdmin,
          },
        });
      }
    }

    if (session.type === "team") {
      const teamList = await db.select().from(teams).where(eq(teams.id, session.id));
      const team = teamList[0];
      if (team) {
        return NextResponse.json({
          authenticated: true,
          type: "team",
          team: {
            id: team.id,
            name: team.name,
            abbreviation: team.abbreviation,
            groupId: team.groupId,
            mustChangePassword: team.mustChangePassword,
          },
        });
      }
    }

    return NextResponse.json({ authenticated: false }, { status: 200 });
  } catch (error) {
    console.error("Auth check error:", error);
    return NextResponse.json({ authenticated: false }, { status: 200 });
  }
}
