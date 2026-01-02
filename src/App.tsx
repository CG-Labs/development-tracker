import { useState, useEffect, useRef, lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Link, useNavigate } from "react-router-dom";
import { Dashboard } from "./components/Dashboard";
import { Login } from "./components/Login";
import { Signup } from "./components/Signup";
import { ImportModal } from "./components/ImportModal";
import { ExportModal } from "./components/ExportModal";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { loadUnitOverrides } from "./services/excelImportService";
import { ROLE_INFO } from "./types/roles";

// Lazy load non-critical components
const DevelopmentDetail = lazy(() => import("./components/DevelopmentDetail").then(m => ({ default: m.DevelopmentDetail })));
const AuditLog = lazy(() => import("./components/AuditLog").then(m => ({ default: m.AuditLog })));
const ReportModal = lazy(() => import("./components/ReportModal").then(m => ({ default: m.ReportModal })));
const ManageDevelopments = lazy(() => import("./components/ManageDevelopments").then(m => ({ default: m.ManageDevelopments })));
const UserManagement = lazy(() => import("./components/UserManagement").then(m => ({ default: m.UserManagement })));

// Dynamic import for report functions (only loaded when needed)
const getReportService = () => import("./services/reportService");

function AuthenticatedApp() {
  const { currentUser, logout, can } = useAuth();
  const navigate = useNavigate();
  const [loggingOut, setLoggingOut] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadUnitOverrides();
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function handleLogout() {
    setLoggingOut(true);
    setShowUserMenu(false);
    try {
      await logout();
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      setLoggingOut(false);
    }
  }

  async function handleQuickReport(reportType: "portfolio" | "pipeline" | "documentation") {
    setShowUserMenu(false);
    const reportService = await getReportService();
    switch (reportType) {
      case "portfolio":
        reportService.downloadPortfolioReport("pdf");
        break;
      case "pipeline":
        reportService.downloadPipelineReport("pdf");
        break;
      case "documentation":
        reportService.downloadDocumentationReport("pdf");
        break;
    }
  }

  return (
    <div className="min-h-screen blueprint-grid">
      {/* Clean Header */}
      <header className="sticky top-0 z-50 glass border-b border-[var(--border-subtle)]">
        <div className="max-w-[1400px] mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center gap-3 group">
              <div className="relative w-10 h-10">
                <div className="absolute inset-0 bg-gradient-to-br from-[var(--accent-cyan)] to-[var(--accent-purple)] rounded-lg opacity-20 group-hover:opacity-30 transition-opacity" />
                <div className="absolute inset-[2px] bg-[var(--bg-deep)] rounded-[6px] flex items-center justify-center">
                  <svg className="w-5 h-5 text-[var(--accent-cyan)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <div className="absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 border-[var(--accent-cyan)] rounded-tl-lg opacity-60" />
                <div className="absolute bottom-0 right-0 w-2 h-2 border-b-2 border-r-2 border-[var(--accent-cyan)] rounded-br-lg opacity-60" />
              </div>
              <div>
                <h1 className="font-display text-xl font-bold tracking-tight text-[var(--text-primary)] group-hover:text-[var(--accent-cyan)] transition-colors">
                  DevTrack
                </h1>
                <p className="font-mono text-[10px] text-[var(--text-muted)] uppercase tracking-[0.2em]">
                  Portfolio Manager
                </p>
              </div>
            </Link>

            {/* Avatar with Dropdown */}
            <div className="relative" ref={userMenuRef}>
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="w-10 h-10 rounded-full bg-gradient-to-br from-[var(--accent-cyan)] to-[var(--accent-purple)] flex items-center justify-center hover:ring-2 hover:ring-[var(--accent-cyan)]/50 transition-all cursor-pointer"
              >
                <span className="font-display text-sm font-bold text-white">
                  {(currentUser?.displayName || currentUser?.email || "U").charAt(0).toUpperCase()}
                </span>
              </button>

              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-72 bg-[var(--bg-card)] rounded-xl shadow-2xl border border-[var(--border-subtle)] overflow-hidden animate-fade-in z-50">
                  {/* Data Management - Show if user can import or export */}
                  {(can("importData") || can("exportData")) && (
                    <>
                      <div className="p-2">
                        <p className="px-3 py-2 font-mono text-[10px] text-[var(--text-muted)] uppercase tracking-wider font-semibold">Data Management</p>
                        {can("importData") && (
                          <button onClick={() => { setShowImportModal(true); setShowUserMenu(false); }} className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-deep)] transition-colors">
                            <svg className="w-4 h-4 text-[var(--accent-cyan)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                            <span className="text-sm">Import Units</span>
                          </button>
                        )}
                        {can("exportData") && (
                          <button onClick={() => { setShowExportModal(true); setShowUserMenu(false); }} className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-deep)] transition-colors">
                            <svg className="w-4 h-4 text-[var(--accent-cyan)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                            <span className="text-sm">Export Units</span>
                          </button>
                        )}
                      </div>
                      <div className="border-t border-[var(--border-subtle)]" />
                    </>
                  )}

                  {/* Reports - Available to all roles */}
                  {can("generateReports") && (
                    <>
                      <div className="p-2">
                        <p className="px-3 py-2 font-mono text-[10px] text-[var(--text-muted)] uppercase tracking-wider font-semibold">Reports</p>
                        <button onClick={() => handleQuickReport("portfolio")} className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-deep)] transition-colors">
                          <svg className="w-4 h-4 text-[var(--accent-purple)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                          <span className="text-sm">Portfolio Summary</span>
                        </button>
                        <button onClick={() => handleQuickReport("pipeline")} className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-deep)] transition-colors">
                          <svg className="w-4 h-4 text-[var(--accent-purple)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
                          <span className="text-sm">Sales Pipeline Report</span>
                        </button>
                        <button onClick={() => handleQuickReport("documentation")} className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-deep)] transition-colors">
                          <svg className="w-4 h-4 text-[var(--accent-purple)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
                          <span className="text-sm">Documentation Status Report</span>
                        </button>
                        <button onClick={() => { setShowReportModal(true); setShowUserMenu(false); }} className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-deep)] transition-colors">
                          <svg className="w-4 h-4 text-[var(--accent-purple)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                          <span className="text-sm">Custom Report...</span>
                        </button>
                      </div>
                      <div className="border-t border-[var(--border-subtle)]" />
                    </>
                  )}

                  {/* Administration - Admin only */}
                  {(can("viewAuditLog") || can("editDevelopment") || can("manageUsers")) && (
                    <>
                      <div className="p-2">
                        <p className="px-3 py-2 font-mono text-[10px] text-[var(--text-muted)] uppercase tracking-wider font-semibold">Administration</p>
                        {can("manageUsers") && (
                          <button onClick={() => { setShowUserMenu(false); navigate("/users"); }} className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-deep)] transition-colors">
                            <svg className="w-4 h-4 text-[var(--accent-gold-bright)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                            <span className="text-sm">Manage Users</span>
                          </button>
                        )}
                        {can("viewAuditLog") && (
                          <button onClick={() => { setShowUserMenu(false); navigate("/audit-log"); }} className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-deep)] transition-colors">
                            <svg className="w-4 h-4 text-[var(--accent-gold-bright)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>
                            <span className="text-sm">Audit Log</span>
                          </button>
                        )}
                        {can("editDevelopment") && (
                          <button onClick={() => { setShowUserMenu(false); navigate("/manage-developments"); }} className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-deep)] transition-colors">
                            <svg className="w-4 h-4 text-[var(--accent-gold-bright)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                            <span className="text-sm">Manage Developments</span>
                          </button>
                        )}
                      </div>
                      <div className="border-t border-[var(--border-subtle)]" />
                    </>
                  )}

                  {/* Account */}
                  <div className="p-2">
                    <p className="px-3 py-2 font-mono text-[10px] text-[var(--text-muted)] uppercase tracking-wider font-semibold">Account</p>
                    <div className="px-3 py-2">
                      <div className="text-sm text-[var(--text-primary)]">{currentUser?.displayName || currentUser?.email}</div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-[var(--text-muted)]">{currentUser?.email}</span>
                        <span className={`px-1.5 py-0.5 text-[10px] font-medium rounded ${
                          currentUser?.role === "admin"
                            ? "bg-red-500/20 text-red-400"
                            : currentUser?.role === "editor"
                            ? "bg-blue-500/20 text-blue-400"
                            : "bg-gray-500/20 text-gray-400"
                        }`}>
                          {currentUser?.role && ROLE_INFO[currentUser.role].label}
                        </span>
                      </div>
                    </div>
                    <button onClick={handleLogout} disabled={loggingOut} className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors disabled:opacity-50">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                      <span className="text-sm">{loggingOut ? "Signing out..." : "Sign Out"}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-[1400px] mx-auto px-6 py-8">
        <Suspense fallback={<div className="flex items-center justify-center py-12"><div className="w-8 h-8 border-2 border-[var(--accent-cyan)] border-t-transparent rounded-full animate-spin" /></div>}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/development/:id" element={<DevelopmentDetail />} />
            <Route path="/audit-log" element={<AuditLog />} />
            <Route path="/manage-developments" element={<ManageDevelopments />} />
            <Route path="/users" element={<UserManagement />} />
          </Routes>
        </Suspense>
      </main>

      <div className="fixed bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[var(--accent-cyan)] to-transparent opacity-30" />

      {showReportModal && (
        <Suspense fallback={null}>
          <ReportModal onClose={() => setShowReportModal(false)} />
        </Suspense>
      )}

      {showImportModal && (
        <ImportModal
          onClose={() => setShowImportModal(false)}
          onComplete={() => { setShowImportModal(false); window.location.reload(); }}
        />
      )}

      {showExportModal && (
        <ExportModal onClose={() => setShowExportModal(false)} />
      )}
    </div>
  );
}

function LoadingSpinner() {
  return (
    <div className="min-h-screen blueprint-grid flex items-center justify-center">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 mb-4">
          <div className="relative w-full h-full">
            <div className="absolute inset-0 bg-gradient-to-br from-[var(--accent-cyan)] to-[var(--accent-purple)] rounded-xl opacity-20 animate-pulse" />
            <div className="absolute inset-[3px] bg-[var(--bg-deep)] rounded-[10px] flex items-center justify-center">
              <svg className="w-8 h-8 text-[var(--accent-cyan)] animate-spin" fill="none" viewBox="0 0 24 24">
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

function AppRoutes() {
  const { currentUser, loading } = useAuth();
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!currentUser) {
    if (authMode === "signup") {
      return <Signup onSwitchToLogin={() => setAuthMode("login")} />;
    }
    return <Login onSwitchToSignup={() => setAuthMode("signup")} />;
  }

  return <AuthenticatedApp />;
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
