"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

export default function Home() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    // Check auth status
    const checkAuth = async () => {
      try {
        const res = await fetch("/api/auth/me");
        const data = await res.json();
        setIsLoggedIn(res.ok && data.authenticated);
      } catch {
        setIsLoggedIn(false);
      }
      setIsChecking(false);
    };
    checkAuth();
  }, []);

  const handleSignOut = async () => {
    await fetch("/api/auth/signout", { method: "POST" });
    window.location.href = "/signin";
  };

  // Show nothing while checking auth to avoid flash
  if (isChecking) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-purple-900 to-slate-900">
      {/* Hero Section */}
      <header className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))]"></div>
        <nav className="relative z-10 flex flex-wrap items-center justify-between gap-2 px-4 py-3 sm:px-6 sm:py-4 lg:px-12">
          <div className="flex items-center gap-2">
            <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center font-bold text-slate-900 shrink-0">
              TVT
            </div>
            <span className="text-xl font-bold text-white hidden sm:inline">Fantasy Super League</span>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-sm sm:text-base">
            {isLoggedIn && (
              <Link href="/dashboard" className="text-yellow-400 font-semibold hover:text-yellow-300 transition">
                Dashboard
              </Link>
            )}
            <Link href="/standings" className="text-gray-300 hover:text-white transition">
              Standings
            </Link>
            <Link href="/fixtures" className="text-gray-300 hover:text-white transition">
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

        <div className="relative z-10 mx-auto max-w-7xl px-6 py-24 text-center lg:py-32">
          <div className="inline-flex items-center gap-2 rounded-full border border-purple-500/30 bg-purple-500/10 px-4 py-1.5 text-sm text-purple-300 mb-8">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
            </span>
            Season 2025/26 Now Live
          </div>
          
          <h1 className="text-5xl font-extrabold tracking-tight text-white sm:text-7xl">
            <span className="bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 bg-clip-text text-transparent">
              TVT Fantasy
            </span>
            <br />
            Super League
          </h1>
          
          <p className="mx-auto mt-6 max-w-2xl text-lg text-gray-300">
            The ultimate team-based fantasy football experience. Partner up, strategize together, and compete for glory in the most exciting FPL variant league.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/standings"
              className="w-full sm:w-auto rounded-full bg-gradient-to-r from-yellow-400 to-orange-500 px-8 py-4 text-lg font-bold text-slate-900 hover:from-yellow-300 hover:to-orange-400 transition shadow-lg shadow-orange-500/25"
            >
              View Standings
            </Link>
            <Link
              href="/rules"
              className="w-full sm:w-auto rounded-full border border-white/20 bg-white/5 px-8 py-4 text-lg font-semibold text-white hover:bg-white/10 transition"
            >
              View Rules
            </Link>
          </div>
        </div>
      </header>

      {/* Stats Section */}
      <section className="relative z-10 border-y border-white/10 bg-slate-900/50 backdrop-blur">
        <div className="mx-auto max-w-7xl px-6 py-12">
          <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
            <div className="text-center">
              <div className="text-4xl font-bold text-yellow-400">32</div>
              <div className="mt-1 text-sm text-gray-400">Teams</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-yellow-400">2</div>
              <div className="mt-1 text-sm text-gray-400">Groups</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-yellow-400">38</div>
              <div className="mt-1 text-sm text-gray-400">Gameweeks</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-yellow-400">1</div>
              <div className="mt-1 text-sm text-gray-400">Champion</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="relative z-10 mx-auto max-w-7xl px-6 py-24">
        <h2 className="text-center text-3xl font-bold text-white mb-12">How It Works</h2>
        <div className="grid gap-8 md:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-8 backdrop-blur">
            <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-purple-500/20 text-2xl">
              👥
            </div>
            <h3 className="mb-2 text-xl font-bold text-white">Team Up</h3>
            <p className="text-gray-400">
              Form a duo with a partner. Each team consists of 2 players combining their FPL scores.
            </p>
          </div>
          
          <div className="rounded-2xl border border-white/10 bg-white/5 p-8 backdrop-blur">
            <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-orange-500/20 text-2xl">
              ⚔️
            </div>
            <h3 className="mb-2 text-xl font-bold text-white">Compete</h3>
            <p className="text-gray-400">
              Face opponents weekly in head-to-head battles. Win matches to climb the league standings.
            </p>
          </div>
          
          <div className="rounded-2xl border border-white/10 bg-white/5 p-8 backdrop-blur">
            <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-yellow-500/20 text-2xl">
              🏆
            </div>
            <h3 className="mb-2 text-xl font-bold text-white">Win Glory</h3>
            <p className="text-gray-400">
              Top 8 qualify for Title Play-offs. Use special chips strategically to secure your path to victory.
            </p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative z-10 mx-auto max-w-7xl px-6 py-24">
        <div className="rounded-3xl bg-gradient-to-r from-purple-600 to-orange-500 p-12 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Get Started</h2>
          <p className="text-white/80 max-w-xl mx-auto">
            Please contact the TVT administrators to receive your login credentials. Upon your first sign-in, you will be prompted to update your password for security purposes.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 bg-slate-900/50">
        <div className="mx-auto max-w-7xl px-6 py-12">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center font-bold text-slate-900 text-sm">
                TVT
              </div>
              <span className="text-sm text-gray-400">TVT Fantasy Super League © 2026</span>
            </div>
            <div className="flex items-center gap-6 text-sm text-gray-400">
              <Link href="/rules" className="hover:text-white transition">Rules</Link>
              <Link href="/standings" className="hover:text-white transition">Standings</Link>
              <Link href="/fixtures" className="hover:text-white transition">Fixtures</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

