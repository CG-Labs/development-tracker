import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import { Dashboard } from "./components/Dashboard";
import { DevelopmentDetail } from "./components/DevelopmentDetail";

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen blueprint-grid">
        {/* Header */}
        <header className="sticky top-0 z-50 glass border-b border-[var(--border-subtle)]">
          <div className="max-w-[1400px] mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <Link to="/" className="flex items-center gap-3 group">
                {/* Logo mark */}
                <div className="relative w-10 h-10">
                  <div className="absolute inset-0 bg-gradient-to-br from-[var(--accent-cyan)] to-[var(--accent-purple)] rounded-lg opacity-20 group-hover:opacity-30 transition-opacity" />
                  <div className="absolute inset-[2px] bg-[var(--bg-deep)] rounded-[6px] flex items-center justify-center">
                    <svg
                      className="w-5 h-5 text-[var(--accent-cyan)]"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                      />
                    </svg>
                  </div>
                  {/* Corner accents */}
                  <div className="absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 border-[var(--accent-cyan)] rounded-tl-lg opacity-60" />
                  <div className="absolute bottom-0 right-0 w-2 h-2 border-b-2 border-r-2 border-[var(--accent-cyan)] rounded-br-lg opacity-60" />
                </div>
                {/* Brand text */}
                <div>
                  <h1 className="font-display text-xl font-bold tracking-tight text-[var(--text-primary)] group-hover:text-[var(--accent-cyan)] transition-colors">
                    DevTrack
                  </h1>
                  <p className="font-mono text-[10px] text-[var(--text-muted)] uppercase tracking-[0.2em]">
                    Portfolio Manager
                  </p>
                </div>
              </Link>

              {/* Header right section */}
              <div className="flex items-center gap-4">
                <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--bg-card)] border border-[var(--border-subtle)]">
                  <div className="w-2 h-2 rounded-full bg-[var(--accent-emerald)] animate-pulse" />
                  <span className="font-mono text-xs text-[var(--text-secondary)]">
                    Live Data
                  </span>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Main content */}
        <main className="max-w-[1400px] mx-auto px-6 py-8">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/development/:id" element={<DevelopmentDetail />} />
          </Routes>
        </main>

        {/* Footer accent line */}
        <div className="fixed bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[var(--accent-cyan)] to-transparent opacity-30" />
      </div>
    </BrowserRouter>
  );
}

export default App;
