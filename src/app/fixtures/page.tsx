"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface Fixture {
  id: string;
  homeTeam: { name: string; abbreviation: string };
  awayTeam: { name: string; abbreviation: string };
  group: { name: string };
  gameweek: { number: number; deadline: Date };
  result?: {
    homeScore: number;
    awayScore: number;
    homeMatchPoints: number;
    awayMatchPoints: number;
  } | null;
}

interface GameweekFixtures {
  [key: number]: Fixture[];
}

function FixtureCard({
  fixture,
}: {
  fixture: Fixture;
}) {
  const result = fixture.result;
  const isResult = result !== undefined && result !== null;
  const homeWin = isResult && result.homeScore > result.awayScore;
  const awayWin = isResult && result.awayScore > result.homeScore;
  const draw = isResult && result.homeScore === result.awayScore;

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur">
      {isResult && (
        <div className="flex justify-end mb-2">
          <span
            className={`text-xs font-medium px-2 py-0.5 rounded ${
              draw ? "bg-gray-500/20 text-gray-400" : "bg-green-500/20 text-green-400"
            }`}
          >
            {draw ? "Draw" : "Final"}
          </span>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className={`flex-1 text-left ${homeWin ? "text-green-400" : "text-white"}`}>
          <div className="font-semibold text-sm">{fixture.homeTeam.name}</div>
        </div>

        <div className="flex items-center gap-2 px-3">
          {isResult ? (
            <>
              <span
                className={`text-xl font-bold ${
                  homeWin ? "text-green-400" : draw ? "text-gray-400" : "text-white"
                }`}
              >
                {result.homeScore}
              </span>
              <span className="text-gray-500">-</span>
              <span
                className={`text-xl font-bold ${
                  awayWin ? "text-green-400" : draw ? "text-gray-400" : "text-white"
                }`}
              >
                {result.awayScore}
              </span>
            </>
          ) : (
            <span className="text-gray-500 font-medium text-sm">VS</span>
          )}
        </div>

        <div className={`flex-1 text-right ${awayWin ? "text-green-400" : "text-white"}`}>
          <div className="font-semibold text-sm">{fixture.awayTeam.name}</div>
        </div>
      </div>
    </div>
  );
}

export default function FixturesPage() {
  const [fixtures, setFixtures] = useState<GameweekFixtures>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [selectedGW, setSelectedGW] = useState<number | null>(null);
  const [availableGWs, setAvailableGWs] = useState<number[]>([]);

  useEffect(() => {
    // Check auth status
    const checkAuth = async () => {
      try {
        const res = await fetch("/api/auth/me");
        const data = await res.json();
        if (res.ok && data.authenticated) {
          setIsLoggedIn(true);
          setIsAdmin(data.type === "admin");
        } else {
          setIsLoggedIn(false);
          setIsAdmin(false);
        }
      } catch {
        setIsLoggedIn(false);
        setIsAdmin(false);
      }
    };
    checkAuth();
  }, []);

  const handleSignOut = async () => {
    await fetch("/api/auth/signout", { method: "POST" });
    window.location.href = "/signin";
  };

  useEffect(() => {
    const fetchFixtures = async () => {
      try {
        const response = await fetch("/api/fixtures");
        if (!response.ok) {
          throw new Error("Failed to fetch fixtures");
        }
        const data = await response.json();
        const fixturesData = data.fixtures || {};
        setFixtures(fixturesData);
        
        // Get available gameweeks and determine current/default
        const gws = Object.keys(fixturesData).map(Number).filter(gw => gw <= 30).sort((a, b) => a - b);
        setAvailableGWs(gws);
        
        if (gws.length > 0) {
          // Find current GW: first GW with pending fixtures, or last GW with results
          let currentGW = gws[0];
          for (const gw of gws) {
            const gwFixtures = fixturesData[gw] || [];
            const hasResults = gwFixtures.some((f: Fixture) => f.result);
            const allProcessed = gwFixtures.every((f: Fixture) => f.result);
            
            if (hasResults && !allProcessed) {
              // Partially processed - this is current
              currentGW = gw;
              break;
            } else if (!hasResults) {
              // First upcoming - this is current
              currentGW = gw;
              break;
            } else {
              // All processed - keep looking, but remember this one
              currentGW = gw;
            }
          }
          setSelectedGW(currentGW);
        }
      } catch (err) {
        console.error("Error fetching fixtures:", err);
        setError("Failed to load fixtures. Please try again later.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchFixtures();
  }, []);

  // Get fixtures for selected gameweek, split by group
  const selectedFixtures = selectedGW ? fixtures[selectedGW] || [] : [];
  const groupAFixtures = selectedFixtures.filter((f: Fixture) => f.group.name === "A");
  const groupBFixtures = selectedFixtures.filter((f: Fixture) => f.group.name === "B");
  
  const hasResults = selectedFixtures.some((f: Fixture) => f.result);
  const deadline = selectedFixtures[0]?.gameweek?.deadline;

  const formatDeadline = (deadline: Date) => {
    const date = new Date(deadline);
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-purple-900 to-slate-900">
      {/* Navigation */}
      <nav className="flex items-center justify-between px-6 py-4 lg:px-12 border-b border-white/10">
        <Link href={isAdmin ? "/admin" : isLoggedIn ? "/dashboard" : "/"} className="flex items-center gap-2">
          <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center font-bold text-slate-900">
            TVT
          </div>
          <span className="text-xl font-bold text-white">Fantasy Super League</span>
        </Link>
        <div className="flex items-center gap-4">
          {isAdmin ? (
            <Link href="/admin" className="text-gray-300 hover:text-white transition">Home</Link>
          ) : isLoggedIn ? (
            <Link href="/dashboard" className="text-gray-300 hover:text-white transition">Dashboard</Link>
          ) : (
            <Link href="/" className="text-gray-300 hover:text-white transition">Home</Link>
          )}
          <Link href="/standings" className="text-gray-300 hover:text-white transition">
            Standings
          </Link>
          <Link href="/fixtures" className="text-yellow-400 font-semibold transition">
            Fixtures
          </Link>
          <Link href="/playoffs" className="text-gray-300 hover:text-white transition">
            Playoffs
          </Link>
          <Link href="/rules" className="text-gray-300 hover:text-white transition">
            Rules
          </Link>
          {isLoggedIn ? (
            <button
              onClick={handleSignOut}
              className="rounded-full bg-white/10 px-6 py-2 font-semibold text-white hover:bg-white/20 transition"
            >
              Sign Out
            </button>
          ) : (
            <Link
              href="/signin"
              className="rounded-full bg-gradient-to-r from-yellow-400 to-orange-500 px-6 py-2 font-semibold text-slate-900 hover:from-yellow-300 hover:to-orange-400 transition"
            >
              Sign In
            </Link>
          )}
        </div>
      </nav>

      <div className="mx-auto max-w-6xl px-6 py-12">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-4">Fixtures & Results</h1>
          <p className="text-gray-400">View upcoming matches and past results</p>
        </div>

        {isLoading ? (
          <div className="text-center text-gray-400 py-12">Loading fixtures...</div>
        ) : error ? (
          <div className="text-center text-red-400 py-12">{error}</div>
        ) : availableGWs.length === 0 ? (
          <div className="text-center py-12">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-8 backdrop-blur">
              <h2 className="text-xl font-semibold text-white mb-2">No Fixtures Yet</h2>
              <p className="text-gray-400">Fixtures will appear here once the league admin generates them.</p>
            </div>
          </div>
        ) : (
          <>
            {/* Gameweek Filter */}
            <div className="flex items-center justify-center gap-4 mb-8">
              <button
                onClick={() => setSelectedGW(prev => {
                  const idx = availableGWs.indexOf(prev!);
                  return idx > 0 ? availableGWs[idx - 1] : prev;
                })}
                disabled={selectedGW === availableGWs[0]}
                className="p-2 rounded-lg bg-white/10 text-white hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed transition"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              
              <select
                value={selectedGW || ""}
                onChange={(e) => setSelectedGW(Number(e.target.value))}
                className="bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white font-semibold min-w-[180px] text-center appearance-none cursor-pointer hover:bg-white/20 transition"
              >
                {availableGWs.map((gw) => (
                  <option key={gw} value={gw} className="bg-slate-800 text-white">
                    Gameweek {gw}
                  </option>
                ))}
              </select>

              <button
                onClick={() => setSelectedGW(prev => {
                  const idx = availableGWs.indexOf(prev!);
                  return idx < availableGWs.length - 1 ? availableGWs[idx + 1] : prev;
                })}
                disabled={selectedGW === availableGWs[availableGWs.length - 1]}
                className="p-2 rounded-lg bg-white/10 text-white hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed transition"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>

            {/* Status Badge */}
            <div className="flex items-center justify-center gap-4 mb-6">
              {hasResults ? (
                <span className="px-4 py-1 rounded-full bg-green-500/20 text-green-400 text-sm font-medium">
                  Results Available
                </span>
              ) : (
                <span className="px-4 py-1 rounded-full bg-yellow-500/20 text-yellow-400 text-sm font-medium flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-yellow-400 animate-pulse"></span>
                  Upcoming
                </span>
              )}
              {deadline && !hasResults && (
                <span className="text-sm text-gray-400">Deadline: {formatDeadline(deadline)}</span>
              )}
            </div>

            {/* Two-Column Layout: Group A | Group B */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Group A */}
              <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur">
                <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full bg-blue-500"></span>
                  Group A
                </h2>
                <div className="space-y-3">
                  {groupAFixtures.length > 0 ? (
                    groupAFixtures.map((fixture: Fixture) => (
                      <FixtureCard key={fixture.id} fixture={fixture} />
                    ))
                  ) : (
                    <div className="text-center text-gray-400 py-8">No fixtures</div>
                  )}
                </div>
              </div>

              {/* Group B */}
              <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur">
                <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full bg-purple-500"></span>
                  Group B
                </h2>
                <div className="space-y-3">
                  {groupBFixtures.length > 0 ? (
                    groupBFixtures.map((fixture: Fixture) => (
                      <FixtureCard key={fixture.id} fixture={fixture} />
                    ))
                  ) : (
                    <div className="text-center text-gray-400 py-8">No fixtures</div>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
