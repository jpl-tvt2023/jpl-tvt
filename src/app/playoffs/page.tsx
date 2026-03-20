"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

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
}

type TabType = "tvt" | "challenger";

function MatchCard({ tie, compact }: { tie: TieDisplay; compact?: boolean }) {
  const is2Leg = tie.gw2 !== null;
  const isPlaceholder = (side: TeamSide | null) => !side?.teamId;

  const teamLabel = (side: TeamSide | null) => {
    if (!side) return "TBD";
    return side.abbr || side.name || "TBD";
  };

  const teamClass = (side: TeamSide | null) => {
    if (tie.winnerId && side?.teamId && tie.winnerId === side.teamId) return "text-green-400 font-bold";
    if (isPlaceholder(side)) return "text-gray-500 italic";
    return "text-white";
  };

  return (
    <div className={`bg-slate-800/80 border border-white/10 rounded-lg ${compact ? "p-2" : "p-3"} text-sm`}>
      <div className="text-[10px] text-gray-500 uppercase tracking-wide mb-1">
        {tie.tieId} {is2Leg ? `(GW${tie.gw1}+${tie.gw2})` : `(GW${tie.gw1})`}
      </div>

      {/* Home team row */}
      <div className={`flex items-center justify-between gap-2 py-1 ${teamClass(tie.home)}`}>
        <span className="truncate flex-1">{teamLabel(tie.home)}</span>
        {!isPlaceholder(tie.home) && (
          is2Leg ? (
            <div className="flex gap-2 text-xs tabular-nums">
              <span className="w-5 text-center">{tie.home?.leg1Score ?? "–"}</span>
              <span className="w-5 text-center">{tie.home?.leg2Score ?? "–"}</span>
              <span className="w-6 text-center font-bold border-l border-white/20 pl-1">
                {tie.home?.aggregate ?? "–"}
              </span>
            </div>
          ) : (
            <span className="text-xs tabular-nums w-5 text-center">
              {tie.home?.leg1Score ?? "–"}
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
              <span className="w-5 text-center">{tie.away?.leg1Score ?? "–"}</span>
              <span className="w-5 text-center">{tie.away?.leg2Score ?? "–"}</span>
              <span className="w-6 text-center font-bold border-l border-white/20 pl-1">
                {tie.away?.aggregate ?? "–"}
              </span>
            </div>
          ) : (
            <span className="text-xs tabular-nums w-5 text-center">
              {tie.away?.leg1Score ?? "–"}
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

function RoundColumn({ title, ties, className }: { title: string; ties: TieDisplay[]; className?: string }) {
  if (ties.length === 0) return null;
  return (
    <div className={`flex flex-col gap-3 ${className || ""}`}>
      <h3 className="text-xs font-bold text-yellow-400 uppercase tracking-wider text-center">{title}</h3>
      <div className="flex flex-col gap-2 justify-around flex-1">
        {ties.map((tie) => (
          <MatchCard key={tie.tieId} tie={tie} />
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

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch("/api/playoffs/bracket");
        if (res.ok) {
          const bracket = await res.json();
          setData(bracket);
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
          <Link href="/rules" className="text-gray-300 hover:text-white transition">Rules</Link>
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
              <RoundColumn title="Round of 16" ties={data.tvt.ro16} />
              <RoundColumn title="Quarter-Finals" ties={data.tvt.qf} />
              <RoundColumn title="Semi-Finals" ties={data.tvt.sf} />
              <RoundColumn title="Grand Finale" ties={data.tvt.final} />
            </div>
          </div>
        )}

        {/* Challenger Series */}
        {activeTab === "challenger" && (
          <div className="space-y-6">
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
                    {ties.map(tie => <MatchCard key={tie.tieId} tie={tie} compact />)}
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
                    {ties.map(tie => <MatchCard key={tie.tieId} tie={tie} compact />)}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
