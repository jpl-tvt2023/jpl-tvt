"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

interface LiveFixtureScore {
  fixtureId: string;
  gameweek: number;          // Track which GW this score is from (to distinguish leg1 from leg2)
  homeTeamName: string;
  awayTeamName: string;
  homeTeamAbbr: string;
  awayTeamAbbr: string;
  homeScore: number;
  awayScore: number;
  homePlayers: { name: string; fplScore: number; transferHits: number; isCaptain: boolean; finalScore: number }[];
  awayPlayers: { name: string; fplScore: number; transferHits: number; isCaptain: boolean; finalScore: number }[];
}

interface TeamSide {
  teamId: string | null;
  name: string;
  abbr: string;
  leg1Score: number | null;
  leg2Score: number | null;
  aggregate: number | null;
}

interface TieDisplay {
  tieId: string;
  roundName: string;
  status: string;
  gw1: number;
  gw2: number | null;
  home: TeamSide | null;
  away: TeamSide | null;
  winnerId: string | null;
  loserId: string | null;
}

interface SurvivalDisplay {
  teamId: string;
  name: string;
  abbr: string;
  score: number;
  rank: number | null;
  advanced: boolean;
}

interface BracketData {
  mode: "tentative" | "projected" | "live";
  latestCompletedGw: number;
  tvt: {
    ro16: TieDisplay[];
    qf: TieDisplay[];
    sf: TieDisplay[];
    final: TieDisplay[];
  };
  challenger: {
    c31: TieDisplay[];
    c32: TieDisplay[];
    c33: SurvivalDisplay[];
    c34: TieDisplay[];
    c35: TieDisplay[];
    c36: TieDisplay[];
    c37: TieDisplay[];
    c38: TieDisplay[];
  };
  liveScores?: Record<number, LiveFixtureScore[]>; // Live scores by gameweek
}

type TabType = "tvt" | "challenger";

function MatchCard({ 
  tie, 
  compact, 
  liveScores,
  isRefreshing,
  onRefresh
}: { 
  tie: TieDisplay; 
  compact?: boolean; 
  liveScores?: LiveFixtureScore[];
  isRefreshing?: boolean;
  onRefresh?: (gw: number, fixtureId: string) => void;
}) {
  const is2Leg = tie.gw2 !== null;
  const isPlaceholder = (side: TeamSide | null) => !side?.teamId;

  // NEW: Get live score for a specific gameweek (leg) to distinguish leg1 from leg2
  const getLiveScoreForGW = (gwNumber: number): LiveFixtureScore | undefined => {
    if (!liveScores || !tie.home?.abbr || !tie.away?.abbr) return undefined;
    return liveScores.find((l) => {
      const homeAbbr = tie.home!.abbr;
      const awayAbbr = tie.away!.abbr;
      return (
        l.gameweek === gwNumber &&
        ((l.homeTeamAbbr === homeAbbr && l.awayTeamAbbr === awayAbbr) ||
         (l.homeTeamAbbr === awayAbbr && l.awayTeamAbbr === homeAbbr))
      );
    });
  };

  // Get live scores for leg1 and leg2 (if 2-leg tie)
  const liveScoreLeg1 = getLiveScoreForGW(tie.gw1);
  const liveScoreLeg2 = is2Leg ? getLiveScoreForGW(tie.gw2!) : undefined;

  // Show live if fresh data exists (overrides stale DB data)
  const showLiveLeg1 = !!liveScoreLeg1;  // Fresh GW1 data exists
  const showLiveLeg2 = !!liveScoreLeg2;  // Fresh GW2 data exists
  const showLive = showLiveLeg1 || showLiveLeg2;  // Any leg is live

  const teamLabel = (side: TeamSide | null) => {
    if (!side) return "TBD";
    return side.abbr || side.name || "TBD";
  };

  const teamClass = (side: TeamSide | null) => {
    if (tie.winnerId && side?.teamId && tie.winnerId === side.teamId) return "text-green-400 font-bold";
    if (isPlaceholder(side)) return "text-gray-500 italic";
    return "text-white";
  };

  // Helper to extract score for a specific team from live fixture data
  const getLiveScore = (side: TeamSide | null, liveFixture: LiveFixtureScore | undefined): number | null => {
    if (!liveFixture || !side?.abbr) return null;
    if (liveFixture.homeTeamAbbr === side.abbr) return liveFixture.homeScore;
    if (liveFixture.awayTeamAbbr === side.abbr) return liveFixture.awayScore;
    return null;
  };

  return (
    <div className={`bg-slate-800/80 border rounded-lg ${compact ? "p-2" : "p-3"} text-sm ${
      (showLive || showLiveLeg2) ? "border-green-500/30" : "border-white/10"
    }`}>
      <div className="flex items-center justify-between text-[10px] text-gray-500 uppercase tracking-wide mb-1">
        <span>{tie.tieId} {is2Leg ? `(GW${tie.gw1}+${tie.gw2})` : `(GW${tie.gw1})`}</span>
        <div className="flex items-center gap-2">
          {(showLive || showLiveLeg2) && (
            <span className="text-green-400 flex items-center gap-1 normal-case">
              <span className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse"></span>
              LIVE
            </span>
          )}
          {(showLive || showLiveLeg2) && onRefresh && (
            <button
              onClick={() => onRefresh(tie.gw1, tie.tieId)}
              disabled={isRefreshing}
              className="text-green-400 hover:text-green-300 disabled:opacity-50 transition-opacity"
              title="Refresh live scores"
            >
              {isRefreshing ? "⟳" : "⟳"}
            </button>
          )}
        </div>
      </div>

      {/* Home team row */}
      <div className={`flex items-center justify-between gap-2 py-1 ${teamClass(tie.home)}`}>
        <span className="truncate flex-1">{teamLabel(tie.home)}</span>
        {!isPlaceholder(tie.home) && (
          is2Leg ? (
            <div className="flex gap-2 text-xs tabular-nums">
              {/* LEG 1: Show fresh live score if available, else DB value */}
              <span className={`w-5 text-center ${showLiveLeg1 ? "text-green-400" : ""}`}>
                {showLiveLeg1 ? getLiveScore(tie.home, liveScoreLeg1) ?? "–" : (tie.home?.leg1Score ?? "–")}
              </span>
              {/* LEG 2: Show fresh live score if available, else DB value */}
              <span className={`w-5 text-center ${showLiveLeg2 ? "text-green-400" : ""}`}>
                {showLiveLeg2 ? getLiveScore(tie.home, liveScoreLeg2) ?? "–" : (tie.home?.leg2Score ?? "–")}
              </span>
              {/* AGGREGATE: Recalculate using live values when available */}
              <span className="w-6 text-center font-bold border-l border-white/20 pl-1">
                {(() => {
                  const leg1Val = showLiveLeg1 ? (getLiveScore(tie.home, liveScoreLeg1) ?? 0) : (tie.home?.leg1Score ?? 0);
                  const leg2Val = showLiveLeg2 ? (getLiveScore(tie.home, liveScoreLeg2) ?? 0) : (tie.home?.leg2Score ?? 0);
                  return leg1Val + leg2Val;
                })()}
              </span>
            </div>
          ) : (
            <span className={`text-xs tabular-nums w-5 text-center ${showLive ? "text-green-400" : ""}`}>
              {showLive ? getLiveScore(tie.home, liveScoreLeg1) ?? "–" : (tie.home?.leg1Score ?? "–")}
            </span>
          )
        )}
      </div>

      {/* Away team row */}
      <div className={`flex items-center justify-between gap-2 py-1 ${teamClass(tie.away)}`}>
        <span className="truncate flex-1">{teamLabel(tie.away)}</span>
        {!isPlaceholder(tie.away) && (
          is2Leg ? (
            <div className="flex gap-2 text-xs tabular-nums">
              {/* LEG 1: Show fresh live score if available, else DB value */}
              <span className={`w-5 text-center ${showLiveLeg1 ? "text-green-400" : ""}`}>
                {showLiveLeg1 ? getLiveScore(tie.away, liveScoreLeg1) ?? "–" : (tie.away?.leg1Score ?? "–")}
              </span>
              {/* LEG 2: Show fresh live score if available, else DB value */}
              <span className={`w-5 text-center ${showLiveLeg2 ? "text-green-400" : ""}`}>
                {showLiveLeg2 ? getLiveScore(tie.away, liveScoreLeg2) ?? "–" : (tie.away?.leg2Score ?? "–")}
              </span>
              {/* AGGREGATE: Recalculate using live values when available */}
              <span className="w-6 text-center font-bold border-l border-white/20 pl-1">
                {(() => {
                  const leg1Val = showLiveLeg1 ? (getLiveScore(tie.away, liveScoreLeg1) ?? 0) : (tie.away?.leg1Score ?? 0);
                  const leg2Val = showLiveLeg2 ? (getLiveScore(tie.away, liveScoreLeg2) ?? 0) : (tie.away?.leg2Score ?? 0);
                  return leg1Val + leg2Val;
                })()}
              </span>
            </div>
          ) : (
            <span className={`text-xs tabular-nums w-5 text-center ${showLive ? "text-green-400" : ""}`}>
              {showLive ? getLiveScore(tie.away, liveScoreLeg1) ?? "–" : (tie.away?.leg1Score ?? "–")}
            </span>
          )
        )}
      </div>

      {is2Leg && !isPlaceholder(tie.home) && (
        <div className="flex justify-end text-[10px] text-gray-500 gap-2 mt-0.5">
          <span className="w-5 text-center">L1</span>
          <span className="w-5 text-center">L2</span>
          <span className="w-6 text-center pl-1">Agg</span>
        </div>
      )}
    </div>
  );
}

function RoundColumn({ 
  title, 
  ties, 
  className, 
  liveScores,
  refreshing,
  tempLiveScores,
  onRefresh
}: { 
  title: string; 
  ties: TieDisplay[]; 
  className?: string; 
  liveScores?: Record<number, LiveFixtureScore[]>;
  refreshing?: string | null;
  tempLiveScores?: Record<number, LiveFixtureScore[]>;
  onRefresh?: (gw: number, fixtureId: string) => void;
}) {
  if (ties.length === 0) return null;
  
  // Merge cached and temporary live scores (temp takes priority)
  const tempScores = tempLiveScores ? Object.values(tempLiveScores).flat() : [];
  const cachedScores = liveScores ? Object.values(liveScores).flat() : [];
  const mergedScores = [...tempScores, ...cachedScores];
  
  return (
    <div className={`flex flex-col gap-3 ${className || ""}`}>
      <h3 className="text-xs font-bold text-yellow-400 uppercase tracking-wider text-center">{title}</h3>
      <div className="flex flex-col gap-2 justify-around flex-1">
        {ties.map((tie) => (
          <MatchCard 
            key={tie.tieId} 
            tie={tie} 
            liveScores={mergedScores}
            isRefreshing={refreshing === tie.tieId}
            onRefresh={onRefresh}
          />
        ))}
      </div>
    </div>
  );
}

function SurvivalTable({ entries }: { entries: SurvivalDisplay[] }) {
  if (entries.length === 0) return null;
  return (
    <div>
      <h3 className="text-xs font-bold text-yellow-400 uppercase tracking-wider mb-2">
        C-33 Survival (GW33) — Top 8 Advance
      </h3>
      <div className="bg-slate-800/80 border border-white/10 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-gray-400 text-xs border-b border-white/10">
              <th className="text-left px-3 py-2 w-10">#</th>
              <th className="text-left px-3 py-2">Team</th>
              <th className="text-right px-3 py-2">Score</th>
              <th className="text-center px-3 py-2 w-16">Status</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((e, i) => (
              <tr key={e.teamId || `placeholder-${i}`} className={`border-b border-white/5 ${e.advanced ? "bg-green-900/20" : i >= 8 ? "bg-red-900/10" : ""}`}>
                <td className="px-3 py-2 text-gray-400">{e.rank ?? i + 1}</td>
                <td className={`px-3 py-2 ${e.advanced ? "text-green-400 font-semibold" : "text-white"}`}>{e.abbr}</td>
                <td className="px-3 py-2 text-right tabular-nums text-white">{e.score || "–"}</td>
                <td className="px-3 py-2 text-center">
                  {e.advanced ? (
                    <span className="text-green-400 text-xs">✓</span>
                  ) : e.rank && e.rank > 8 ? (
                    <span className="text-red-400 text-xs">✗</span>
                  ) : (
                    <span className="text-gray-500 text-xs">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  );
}

export default function PlayoffsPage() {
  const [data, setData] = useState<BracketData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>("tvt");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [liveScores, setLiveScores] = useState<LiveFixtureScore[]>([]);
  const [refreshing, setRefreshing] = useState<string | null>(null);  // fixtureId being refreshed
  const [tempLiveScores, setTempLiveScores] = useState<Record<number, LiveFixtureScore[]>>({});  // Temp fresh scores

  const fetchLiveScores = useCallback(async (latestGw: number) => {
    // Try fetching live scores for the current GW and next (in case we're between legs)
    // latestGw is the latest GW with any result, may be partially complete
    // Playoff GWs are 31-38
    for (let gw = latestGw; gw <= Math.min(latestGw + 1, 38); gw++) {
      if (gw < 31) continue;
      try {
        const res = await fetch(`/api/fixtures/live?gameweek=${gw}`);
        if (res.ok) {
          const liveData = await res.json();
          if (liveData.isLive && liveData.fixtures?.length > 0) {
            setLiveScores(liveData.fixtures);
            return;
          }
        }
      } catch {}
    }
    setLiveScores([]);
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch("/api/playoffs/bracket");
        if (res.ok) {
          const bracket = await res.json();
          setData(bracket);
          // Fetch live scores for playoff GWs
          if (bracket.latestCompletedGw >= 30) {
            fetchLiveScores(bracket.latestCompletedGw);
          }
        }
      } catch (err) {
        console.error("Failed to fetch bracket:", err);
      } finally {
        setIsLoading(false);
      }
    };

    const checkAuth = async () => {
      try {
        const res = await fetch("/api/auth/me");
        const me = await res.json();
        if (res.ok && me.authenticated) {
          setIsLoggedIn(true);
          setIsAdmin(me.type === "admin");
        }
      } catch {}
    };

    fetchData();
    checkAuth();
  }, []);

  const handleSignOut = async () => {
    await fetch("/api/auth/signout", { method: "POST" });
    window.location.href = "/signin";
  };

  const handleRefreshMatch = async (gwNumber: number, fixtureId: string) => {
    setRefreshing(fixtureId);
    try {
      const res = await fetch(`/api/fixtures/live/refresh?gameweek=${gwNumber}`);
      if (res.ok) {
        const freshData = await res.json();
        // Store temp fresh scores for this GW
        setTempLiveScores(prev => ({
          ...prev,
          [gwNumber]: freshData.fixtures || []
        }));
      }
    } catch (err) {
      console.error("Refresh failed:", err);
    } finally {
      setRefreshing(null);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading playoffs bracket...</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-red-400 text-xl">Failed to load playoffs bracket</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-purple-900 to-slate-900">
      {/* Navigation */}
      <nav className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 sm:px-6 sm:py-4 lg:px-12 border-b border-white/10">
        <Link href={isAdmin ? "/admin" : isLoggedIn ? "/dashboard" : "/"} className="flex items-center gap-2">
          <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center font-bold text-slate-900 shrink-0">
            TVT
          </div>
          <span className="text-xl font-bold text-white hidden sm:inline">Fantasy Super League</span>
        </Link>
        <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-sm sm:text-base">
          {isAdmin ? (
            <Link href="/admin" className="text-gray-300 hover:text-white transition">Home</Link>
          ) : isLoggedIn ? (
            <Link href="/dashboard" className="text-gray-300 hover:text-white transition">Dashboard</Link>
          ) : (
            <Link href="/" className="text-gray-300 hover:text-white transition">Home</Link>
          )}
          <Link href="/standings" className="text-gray-300 hover:text-white transition">Standings</Link>
          <Link href="/fixtures" className="text-gray-300 hover:text-white transition">Fixtures</Link>
          <Link href="/playoffs" className="text-yellow-400 font-semibold transition">Playoffs</Link>
          {isLoggedIn && <Link href="/rules" className="text-gray-300 hover:text-white transition">Rules</Link>}
          {isLoggedIn ? (
            <button onClick={handleSignOut} className="rounded-full bg-white/10 px-6 py-2 font-semibold text-white hover:bg-white/20 transition">
              Sign Out
            </button>
          ) : (
            <Link href="/signin" className="rounded-full bg-gradient-to-r from-yellow-400 to-orange-500 px-6 py-2 font-semibold text-slate-900 hover:from-yellow-300 hover:to-orange-400 transition">
              Sign In
            </Link>
          )}
        </div>
      </nav>

      <div className="mx-auto max-w-7xl px-6 py-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-white mb-2">Playoffs Bracket</h1>
          {data.mode === "tentative" && (
            <div className="inline-flex items-center gap-2 bg-yellow-500/20 border border-yellow-500/40 rounded-lg px-4 py-2">
              <span className="text-yellow-400 text-sm font-semibold">&#9888; TENTATIVE</span>
              <span className="text-yellow-200/80 text-sm">Projected from current standings. Fixtures lock after GW30.</span>
            </div>
          )}
          {data.mode === "projected" && (
            <div className="inline-flex items-center gap-2 bg-blue-500/20 border border-blue-500/40 rounded-lg px-4 py-2">
              <span className="text-blue-400 text-sm font-semibold">Based on final group standings</span>
              <span className="text-blue-200/80 text-sm">Fixtures will be generated by admin shortly.</span>
            </div>
          )}
        </div>

        {/* Tab toggle */}
        <div className="flex gap-1 mb-6 bg-slate-800/50 rounded-lg p-1 w-fit">
          <button
            onClick={() => setActiveTab("tvt")}
            className={`px-4 py-2 rounded-md text-sm font-semibold transition ${
              activeTab === "tvt" ? "bg-yellow-500 text-slate-900" : "text-gray-400 hover:text-white"
            }`}
          >
            TVT Main Draw
          </button>
          <button
            onClick={() => setActiveTab("challenger")}
            className={`px-4 py-2 rounded-md text-sm font-semibold transition ${
              activeTab === "challenger" ? "bg-yellow-500 text-slate-900" : "text-gray-400 hover:text-white"
            }`}
          >
            Challenger Series
          </button>
        </div>

        {/* TVT Main Draw Bracket */}
        {activeTab === "tvt" && (
          <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
            <div className="grid grid-cols-4 gap-3 sm:gap-4 min-w-[700px] min-h-[600px]">
              <RoundColumn 
                title="Round of 16" 
                ties={data.tvt.ro16} 
                liveScores={data.liveScores}
                refreshing={refreshing}
                tempLiveScores={tempLiveScores}
                onRefresh={handleRefreshMatch}
              />
              <RoundColumn 
                title="Quarter-Finals" 
                ties={data.tvt.qf} 
                liveScores={data.liveScores}
                refreshing={refreshing}
                tempLiveScores={tempLiveScores}
                onRefresh={handleRefreshMatch}
              />
              <RoundColumn 
                title="Semi-Finals" 
                ties={data.tvt.sf} 
                liveScores={data.liveScores}
                refreshing={refreshing}
                tempLiveScores={tempLiveScores}
                onRefresh={handleRefreshMatch}
              />
              <RoundColumn 
                title="Grand Finale" 
                ties={data.tvt.final} 
                liveScores={data.liveScores}
                refreshing={refreshing}
                tempLiveScores={tempLiveScores}
                onRefresh={handleRefreshMatch}
              />
            </div>
          </div>
        )}

        {/* Challenger Series */}
        {activeTab === "challenger" && (
          <div className="space-y-6">
            {(() => {
              const allLiveScores = data.liveScores ? Object.values(data.liveScores).flat() : [];
              const tempScores = tempLiveScores ? Object.values(tempLiveScores).flat() : [];
              const mergedScores = [...tempScores, ...allLiveScores];
              return (
                <>
                  {[
                    { key: "c31", label: "C-31 (GW31) — Round of 12", data: data.challenger.c31 },
                    { key: "c32", label: "C-32 (GW32) — Round of 6", data: data.challenger.c32 },
                  ].map(({ key, label, data: roundTies }) => {
                    const ties = roundTies as TieDisplay[];
                    if (!ties || ties.length === 0) return null;
                    return (
                      <div key={key}>
                        <h3 className="text-xs font-bold text-yellow-400 uppercase tracking-wider mb-2">{label}</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                          {ties.map(tie => (
                            <MatchCard 
                              key={tie.tieId} 
                              tie={tie} 
                              compact 
                              liveScores={mergedScores}
                              isRefreshing={refreshing === tie.tieId}
                              onRefresh={handleRefreshMatch}
                            />
                          ))}
                        </div>
                      </div>
                    );
                  })}

                  {/* C-33 Survival */}
                  {data.challenger.c33.length > 0 && (
                    <SurvivalTable entries={data.challenger.c33 as SurvivalDisplay[]} />
                  )}

                  {/* C-34 through C-38 */}
                  {[
                    { key: "c34", label: "C-34 (GW34) — Quarter-Finals", data: data.challenger.c34 },
                    { key: "c35", label: "C-35 (GW35) — QF Losers vs C-34 Winners", data: data.challenger.c35 },
                    { key: "c36", label: "C-36 (GW36) — Round of 4", data: data.challenger.c36 },
                    { key: "c37", label: "C-37 (GW37) — Challenger Semi-Finals", data: data.challenger.c37 },
                    { key: "c38", label: "C-38 (GW38) — Challenger Final", data: data.challenger.c38 },
                  ].map(({ key, label, data: roundData }) => {
                    const ties = roundData as TieDisplay[];
                    if (!ties || ties.length === 0) return null;
                    return (
                      <div key={key}>
                        <h3 className="text-xs font-bold text-yellow-400 uppercase tracking-wider mb-2">{label}</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                          {ties.map(tie => (
                            <MatchCard 
                              key={tie.tieId} 
                              tie={tie} 
                              compact 
                              liveScores={mergedScores}
                              isRefreshing={refreshing === tie.tieId}
                              onRefresh={handleRefreshMatch}
                            />
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </>
              );
            })()}
          </div>
        )}
      </div>
    </div>
  );
}
