import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900">
      {/* Nav */}
      <nav className="sticky top-0 z-50 border-b border-white/10 bg-slate-900/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-yellow-400 to-orange-500 font-extrabold text-slate-900 text-sm">
              JPL
            </div>
            <span className="hidden text-lg font-bold text-white sm:inline">JPL Sports</span>
          </div>
          <Link
            href="/signin"
            className="rounded-full bg-gradient-to-r from-yellow-400 to-orange-500 px-5 py-2 text-sm font-bold text-slate-900 transition hover:from-yellow-300 hover:to-orange-400"
          >
            Sign In
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="mx-auto max-w-4xl px-6 py-20 text-center">
        <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-yellow-400">
          JPL Sports
        </p>
        <h1 className="text-5xl font-extrabold tracking-tight text-white sm:text-6xl">
          Fantasy League Hub
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-gray-400">
          Choose your league and compete. Multiple formats, one platform.
        </p>
      </section>

      {/* League Cards */}
      <section className="mx-auto max-w-5xl px-4 pb-24 sm:px-6">
        <div className="grid gap-6 sm:grid-cols-2">
          {/* FPL TVT Card */}
          <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-purple-900/60 via-blue-900/40 to-slate-900/60 p-8 shadow-xl">
            <div className="absolute -right-8 -top-8 h-40 w-40 rounded-full bg-purple-600/10 blur-2xl" />
            <div className="relative">
              <div className="mb-5 flex items-center gap-3">
                <span className="text-4xl">⚽</span>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-2xl font-extrabold text-white">FPL TVT</h2>
                    <span className="inline-flex items-center gap-1 rounded-full bg-green-500/20 px-2.5 py-0.5 text-xs font-semibold text-green-400">
                      <span className="relative flex h-1.5 w-1.5">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
                        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-green-500" />
                      </span>
                      Live
                    </span>
                  </div>
                  <p className="text-sm text-gray-400">Season 2025-26</p>
                </div>
              </div>
              <p className="mb-6 text-sm text-gray-300">
                Team-based Fantasy Premier League. Pair up, play head-to-head, and fight through playoffs to claim the title.
              </p>
              <div className="flex flex-wrap gap-3">
                <Link
                  href="/standings"
                  className="rounded-full bg-purple-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-purple-500"
                >
                  Standings
                </Link>
                <Link
                  href="/fixtures"
                  className="rounded-full border border-white/20 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
                >
                  Fixtures
                </Link>
                <Link
                  href="/playoffs"
                  className="rounded-full border border-white/20 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
                >
                  Playoffs
                </Link>
              </div>
            </div>
          </div>

          {/* Cricket TVT Card */}
          <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-emerald-900/40 via-teal-900/30 to-slate-900/60 p-8 shadow-xl">
            <div className="absolute -right-8 -top-8 h-40 w-40 rounded-full bg-emerald-600/10 blur-2xl" />
            <div className="relative">
              <div className="mb-5 flex items-center gap-3">
                <span className="text-4xl">🏏</span>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-2xl font-extrabold text-white">Cricket TVT</h2>
                    <span className="rounded-full bg-yellow-500/20 px-2.5 py-0.5 text-xs font-semibold text-yellow-400">
                      Coming Soon
                    </span>
                  </div>
                  <p className="text-sm text-gray-400">IPL 2026</p>
                </div>
              </div>
              <p className="mb-6 text-sm text-gray-300">
                Fantasy cricket in the same head-to-head TVT format. Draft your IPL squad and battle for cricket bragging rights.
              </p>
              <div className="flex flex-wrap gap-3">
                <span className="cursor-not-allowed rounded-full bg-emerald-700/40 px-4 py-2 text-sm font-semibold text-emerald-300/50">
                  Standings
                </span>
                <span className="cursor-not-allowed rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white/30">
                  Fixtures
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 bg-slate-900/50 py-8 text-center text-sm text-gray-500">
        JPL Sports © 2026 &mdash; Multiple fantasy sports, one league platform.
      </footer>
    </div>
  );
}

