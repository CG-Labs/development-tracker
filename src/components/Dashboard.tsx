import { developments } from "../data/realDevelopments";
import type { Development, PortfolioStats } from "../types";
import { DevelopmentCard } from "./DevelopmentCard";
import { ProgressMonitoring } from "./ProgressMonitoring";

function calculatePortfolioStats(devs: Development[]): PortfolioStats {
  const stats: PortfolioStats = {
    totalDevelopments: devs.length,
    totalUnits: 0,
    notReleased: 0,
    forSale: 0,
    underOffer: 0,
    contracted: 0,
    complete: 0,
  };

  devs.forEach((dev) => {
    dev.units.forEach((unit) => {
      stats.totalUnits++;
      switch (unit.salesStatus) {
        case "Not Released":
          stats.notReleased++;
          break;
        case "For Sale":
          stats.forSale++;
          break;
        case "Under Offer":
          stats.underOffer++;
          break;
        case "Contracted":
          stats.contracted++;
          break;
        case "Complete":
          stats.complete++;
          break;
      }
    });
  });

  return stats;
}

export function Dashboard() {
  const stats = calculatePortfolioStats(developments);
  const completePercentage = Math.round((stats.complete / stats.totalUnits) * 100);

  return (
    <div className="space-y-10">
      {/* Portfolio Overview Section */}
      <section className="animate-fade-in-up">
        {/* Section header */}
        <div className="flex items-center gap-4 mb-6">
          <div className="flex items-center gap-2">
            <div className="w-1 h-6 bg-gradient-to-b from-[var(--accent-cyan)] to-[var(--accent-purple)] rounded-full" />
            <h2 className="font-display text-2xl font-bold text-[var(--text-primary)]">
              Portfolio Overview
            </h2>
          </div>
          <div className="flex-1 h-px bg-gradient-to-r from-[var(--border-accent)] to-transparent" />
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <StatCard
            label="Developments"
            value={stats.totalDevelopments}
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3.75h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008z" />
              </svg>
            }
            accentColor="cyan"
            delay={1}
          />
          <StatCard
            label="Total Units"
            value={stats.totalUnits}
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
              </svg>
            }
            accentColor="purple"
            delay={2}
          />
          <StatCard
            label="Complete"
            value={stats.complete}
            subtitle={`${completePercentage}% of total`}
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z" />
              </svg>
            }
            accentColor="gold"
            delay={3}
          />
          <StatCard
            label="Contracted"
            value={stats.contracted}
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 01-.982-3.172M9.497 14.25a7.454 7.454 0 00.981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 007.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M7.73 9.728a6.726 6.726 0 002.748 1.35m8.272-6.842V4.5c0 2.108-.966 3.99-2.48 5.228m2.48-5.492a46.32 46.32 0 012.916.52 6.003 6.003 0 01-5.395 4.972m0 0a6.726 6.726 0 01-2.749 1.35m0 0a6.772 6.772 0 01-3.044 0" />
              </svg>
            }
            accentColor="purple"
            delay={4}
          />
          <StatCard
            label="Under Offer"
            value={stats.underOffer}
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
            accentColor="orange"
            delay={5}
          />
          <StatCard
            label="For Sale"
            value={stats.forSale}
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 21v-7.5a.75.75 0 01.75-.75h3a.75.75 0 01.75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349m-16.5 11.65V9.35m0 0a3.001 3.001 0 003.75-.615A2.993 2.993 0 009.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 002.25 1.016c.896 0 1.7-.393 2.25-1.016a3.001 3.001 0 003.75.614m-16.5 0a3.004 3.004 0 01-.621-4.72L4.318 3.44A1.5 1.5 0 015.378 3h13.243a1.5 1.5 0 011.06.44l1.19 1.189a3 3 0 01-.621 4.72m-13.5 8.65h3.75a.75.75 0 00.75-.75V13.5a.75.75 0 00-.75-.75H6.75a.75.75 0 00-.75.75v3.75c0 .415.336.75.75.75z" />
              </svg>
            }
            accentColor="cyan"
            delay={6}
          />
        </div>
      </section>

      {/* Developments Grid Section */}
      <section className="animate-fade-in-up stagger-2" style={{ opacity: 0 }}>
        {/* Section header */}
        <div className="flex items-center gap-4 mb-6">
          <div className="flex items-center gap-2">
            <div className="w-1 h-6 bg-gradient-to-b from-[var(--accent-gold)] to-[var(--accent-orange)] rounded-full" />
            <h2 className="font-display text-2xl font-bold text-[var(--text-primary)]">
              Active Developments
            </h2>
          </div>
          <div className="flex-1 h-px bg-gradient-to-r from-[var(--border-accent)] to-transparent" />
          <span className="font-mono text-sm text-[var(--text-muted)]">
            {developments.length} projects
          </span>
        </div>

        {/* Developments grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {developments.map((dev, index) => (
            <DevelopmentCard key={dev.id} development={dev} index={index} />
          ))}
        </div>
      </section>

      {/* Progress Monitoring Section */}
      <ProgressMonitoring />
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: number;
  subtitle?: string;
  icon: React.ReactNode;
  accentColor: "cyan" | "gold" | "emerald" | "purple" | "orange" | "rose";
  delay: number;
}

const accentClasses = {
  cyan: {
    glow: "stat-glow-cyan",
    text: "text-[var(--accent-cyan)]",
    border: "border-[rgba(6,214,214,0.3)]",
    bg: "from-[rgba(6,214,214,0.1)] to-transparent",
  },
  gold: {
    glow: "stat-glow-gold",
    text: "text-[var(--accent-gold-bright)]",
    border: "border-[rgba(245,158,11,0.3)]",
    bg: "from-[rgba(245,158,11,0.1)] to-transparent",
  },
  emerald: {
    glow: "stat-glow-emerald",
    text: "text-[var(--accent-emerald)]",
    border: "border-[rgba(16,185,129,0.3)]",
    bg: "from-[rgba(16,185,129,0.1)] to-transparent",
  },
  purple: {
    glow: "stat-glow-purple",
    text: "text-[var(--accent-purple)]",
    border: "border-[rgba(139,92,246,0.3)]",
    bg: "from-[rgba(139,92,246,0.1)] to-transparent",
  },
  orange: {
    glow: "stat-glow-orange",
    text: "text-[var(--accent-orange)]",
    border: "border-[rgba(249,115,22,0.3)]",
    bg: "from-[rgba(249,115,22,0.1)] to-transparent",
  },
  rose: {
    glow: "stat-glow-rose",
    text: "text-[var(--accent-rose)]",
    border: "border-[rgba(244,63,94,0.3)]",
    bg: "from-[rgba(244,63,94,0.1)] to-transparent",
  },
};

function StatCard({ label, value, subtitle, icon, accentColor, delay }: StatCardProps) {
  const accent = accentClasses[accentColor];

  return (
    <div
      className={`card p-5 ${accent.glow} animate-fade-in-up stagger-${delay} relative overflow-hidden group`}
      style={{ opacity: 0 }}
    >
      {/* Background gradient */}
      <div className={`absolute inset-0 bg-gradient-to-br ${accent.bg} opacity-50`} />

      {/* Content */}
      <div className="relative">
        {/* Icon */}
        <div className={`${accent.text} mb-3 opacity-70 group-hover:opacity-100 transition-opacity`}>
          {icon}
        </div>

        {/* Value */}
        <p className="font-mono text-3xl font-bold text-[var(--text-primary)] mb-1">
          {value.toLocaleString()}
        </p>

        {/* Label */}
        <p className="font-display text-sm font-medium text-[var(--text-secondary)] uppercase tracking-wide">
          {label}
        </p>

        {/* Subtitle */}
        {subtitle && (
          <p className={`font-mono text-xs ${accent.text} mt-1`}>
            {subtitle}
          </p>
        )}
      </div>

      {/* Corner accent */}
      <div className={`absolute top-0 right-0 w-12 h-12 ${accent.text} opacity-5`}>
        <svg viewBox="0 0 100 100" fill="currentColor">
          <polygon points="100,0 100,100 0,0" />
        </svg>
      </div>
    </div>
  );
}
