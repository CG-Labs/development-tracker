import { useState } from "react";
import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import { Dashboard } from "./components/Dashboard";
import { DevelopmentDetail } from "./components/DevelopmentDetail";
import { AuditLog } from "./components/AuditLog";
import { Login } from "./components/Login";
import { Signup } from "./components/Signup";
import { AuthProvider, useAuth } from "./contexts/AuthContext";

function AppContent() {
  const { currentUser, loading, logout } = useAuth();
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await logout();
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      setLoggingOut(false);
    }
  }

  // Loading state while checking auth
  if (loading) {
    return (
      <div className="min-h-screen blueprint-grid flex items-center justify-center">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 mb-4">
            <div className="relative w-full h-full">
              <div className="absolute inset-0 bg-gradient-to-br from-[var(--accent-cyan)] to-[var(--accent-purple)] rounded-xl opacity-20 animate-pulse" />
              <div className="absolute inset-[3px] bg-[var(--bg-deep)] rounded-[10px] flex items-center justify-center">
                <svg
                  className="w-8 h-8 text-[var(--accent-cyan)] animate-spin"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              </div>
            </div>
          </div>
          <p className="text-[var(--text-secondary)]">Loading...</p>
        </div>
      </div>
    );
  }

  // Not authenticated - show login/signup
  if (!currentUser) {
    if (authMode === "signup") {
      return <Signup onSwitchToLogin={() => setAuthMode("login")} />;
    }
    return <Login onSwitchToSignup={() => setAuthMode("signup")} />;
  }

  // Authenticated - show main app
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

              {/* Header right section - Navigation, User info & Logout */}
              <div className="flex items-center gap-4">
                {/* Audit Log Link */}
                <Link
                  to="/audit-log"
                  className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card)] border border-transparent hover:border-[var(--border-subtle)] transition-all"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
                    />
                  </svg>
                  <span className="font-display text-sm">Audit Log</span>
                </Link>

                <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--bg-card)] border border-[var(--border-subtle)]">
                  <div className="w-2 h-2 rounded-full bg-[var(--accent-emerald)] animate-pulse" />
                  <span className="font-mono text-xs text-[var(--text-secondary)]">
                    Live Data
                  </span>
                </div>

                {/* User info */}
                <div className="flex items-center gap-3">
                  <div className="hidden sm:block text-right">
                    <p className="font-display text-sm font-medium text-[var(--text-primary)]">
                      {currentUser.displayName || "User"}
                    </p>
                    <p className="font-mono text-[10px] text-[var(--text-muted)]">
                      {currentUser.email}
                    </p>
                  </div>

                  {/* User avatar */}
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[var(--accent-cyan)] to-[var(--accent-purple)] flex items-center justify-center">
                    <span className="font-display text-sm font-bold text-white">
                      {(currentUser.displayName || currentUser.email || "U").charAt(0).toUpperCase()}
                    </span>
                  </div>

                  {/* Logout button */}
                  <button
                    onClick={handleLogout}
                    disabled={loggingOut}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card)] border border-transparent hover:border-[var(--border-subtle)] transition-all disabled:opacity-50"
                    title="Logout"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                      />
                    </svg>
                    <span className="hidden md:inline font-display text-sm">Logout</span>
                  </button>
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
            <Route path="/audit-log" element={<AuditLog />} />
          </Routes>
        </main>

        {/* Footer accent line */}
        <div className="fixed bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[var(--accent-cyan)] to-transparent opacity-30" />
      </div>
    </BrowserRouter>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
