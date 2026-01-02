import React, { useState } from "react";
import {
  generateReport,
  downloadReport,
  getReportFilename,
  getDevelopmentsList,
  type ReportType,
  type ReportFormat,
} from "../services/reportService";

interface ReportModalProps {
  onClose: () => void;
  defaultType?: ReportType;
  defaultDevelopmentId?: string;
}

export function ReportModal({ onClose, defaultType, defaultDevelopmentId }: ReportModalProps) {
  const [reportType, setReportType] = useState<ReportType>(defaultType || "portfolio");
  const [format, setFormat] = useState<ReportFormat>("pdf");
  const [developmentId, setDevelopmentId] = useState<string>(defaultDevelopmentId || "");
  const [isGenerating, setIsGenerating] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const developments = getDevelopmentsList();

  const reportTypes: { id: ReportType; label: string; description: string; icon: React.ReactNode }[] = [
    {
      id: "portfolio",
      label: "Portfolio Summary",
      description: "Overview of all developments with key metrics and sales trends",
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      ),
    },
    {
      id: "development",
      label: "Development Detail",
      description: "Detailed report for a specific development with all units",
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
    },
    {
      id: "pipeline",
      label: "Sales Pipeline",
      description: "All units grouped by sales status across developments",
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        </svg>
      ),
    },
    {
      id: "documentation",
      label: "Documentation Status",
      description: "Units with incomplete documentation that need attention",
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
        </svg>
      ),
    },
  ];

  const handleGenerate = async (preview: boolean = false) => {
    if (reportType === "development" && !developmentId) {
      setError("Please select a development");
      return;
    }

    setIsGenerating(true);
    setError(null);
    setPreviewUrl(null);

    try {
      const result = await generateReport({
        type: reportType,
        format: preview ? "pdf" : format,
        developmentId: reportType === "development" ? developmentId : undefined,
      });

      if (preview && result.pdf) {
        const url = URL.createObjectURL(result.pdf);
        setPreviewUrl(url);
      } else {
        const devName = developments.find((d) => d.id === developmentId)?.name;

        if (result.pdf) {
          downloadReport(result.pdf, getReportFilename(reportType, "pdf", devName));
        }
        if (result.excel) {
          downloadReport(result.excel, getReportFilename(reportType, "excel", devName));
        }

        setSuccess(true);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate report");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleClosePreview = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
  };

  const selectedReport = reportTypes.find((r) => r.id === reportType);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 modal-backdrop animate-fade-in" />

      <div
        className="relative card-elevated w-full max-w-2xl max-h-[90vh] overflow-hidden animate-fade-in-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Decorative corners */}
        <div className="absolute top-0 left-0 w-16 h-16 border-t-2 border-l-2 border-[var(--accent-cyan)] opacity-40 rounded-tl-xl" />
        <div className="absolute top-0 right-0 w-16 h-16 border-t-2 border-r-2 border-[var(--accent-cyan)] opacity-40 rounded-tr-xl" />
        <div className="absolute bottom-0 left-0 w-16 h-16 border-b-2 border-l-2 border-[var(--accent-cyan)] opacity-40 rounded-bl-xl" />
        <div className="absolute bottom-0 right-0 w-16 h-16 border-b-2 border-r-2 border-[var(--accent-cyan)] opacity-40 rounded-br-xl" />

        {/* Header */}
        <div className="sticky top-0 z-10 glass border-b border-[var(--border-subtle)] px-6 py-4 flex items-center justify-between rounded-t-xl">
          <div>
            <p className="font-mono text-xs text-[var(--accent-cyan)] uppercase tracking-wider">Generate</p>
            <h2 className="font-display text-2xl font-bold text-[var(--text-primary)]">Reports</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg border border-[var(--border-subtle)] hover:border-[var(--accent-cyan)] hover:bg-[rgba(6,214,214,0.1)] transition-all group"
          >
            <svg
              className="w-5 h-5 text-[var(--text-muted)] group-hover:text-[var(--accent-cyan)] transition-colors"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
          {/* Success State */}
          {success && (
            <div className="text-center py-8">
              <div className="w-16 h-16 mx-auto bg-[var(--accent-emerald)]/20 rounded-full flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-[var(--accent-emerald)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="font-display text-xl font-bold text-[var(--text-primary)] mb-2">Report Downloaded!</h3>
              <p className="text-[var(--text-secondary)] mb-6">Your report has been generated and downloaded.</p>
              <div className="flex gap-3 justify-center">
                <button onClick={() => setSuccess(false)} className="btn-secondary">
                  Generate Another
                </button>
                <button onClick={onClose} className="btn-primary">
                  Done
                </button>
              </div>
            </div>
          )}

          {/* Preview State */}
          {previewUrl && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-display text-lg font-semibold text-[var(--text-primary)]">Preview</h3>
                <button onClick={handleClosePreview} className="btn-secondary text-sm">
                  Back to Options
                </button>
              </div>
              <div className="bg-[var(--bg-deep)] rounded-lg overflow-hidden border border-[var(--border-subtle)]">
                <iframe src={previewUrl} className="w-full h-[60vh]" title="Report Preview" />
              </div>
              <div className="mt-4 flex gap-3 justify-end">
                <button onClick={handleClosePreview} className="btn-secondary">
                  Cancel
                </button>
                <button onClick={() => handleGenerate(false)} className="btn-primary">
                  Download Report
                </button>
              </div>
            </div>
          )}

          {/* Form State */}
          {!success && !previewUrl && (
            <div className="space-y-6">
              {/* Report Type Selection */}
              <div>
                <label className="block font-display text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider mb-3">
                  Report Type
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {reportTypes.map((type) => (
                    <button
                      key={type.id}
                      onClick={() => setReportType(type.id)}
                      className={`p-4 rounded-lg border text-left transition-all ${
                        reportType === type.id
                          ? "bg-[var(--accent-cyan)]/10 border-[var(--accent-cyan)]/50"
                          : "bg-[var(--bg-deep)] border-[var(--border-subtle)] hover:border-[var(--accent-cyan)]/30"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={`p-2 rounded-lg ${
                            reportType === type.id ? "bg-[var(--accent-cyan)]/20 text-[var(--accent-cyan)]" : "bg-[var(--bg-card)] text-[var(--text-muted)]"
                          }`}
                        >
                          {type.icon}
                        </div>
                        <div>
                          <p
                            className={`font-display font-semibold ${
                              reportType === type.id ? "text-[var(--accent-cyan)]" : "text-[var(--text-primary)]"
                            }`}
                          >
                            {type.label}
                          </p>
                          <p className="text-xs text-[var(--text-muted)] mt-1">{type.description}</p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Development Selection (for Development Detail report) */}
              {reportType === "development" && (
                <div>
                  <label className="block font-display text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider mb-2">
                    Select Development
                  </label>
                  <select
                    value={developmentId}
                    onChange={(e) => setDevelopmentId(e.target.value)}
                    className="select"
                  >
                    <option value="">Choose a development...</option>
                    {developments.map((dev) => (
                      <option key={dev.id} value={dev.id}>
                        {dev.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Format Selection */}
              <div>
                <label className="block font-display text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider mb-3">
                  Export Format
                </label>
                <div className="flex gap-3">
                  {[
                    { id: "pdf" as const, label: "PDF", icon: "M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" },
                    { id: "excel" as const, label: "Excel", icon: "M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" },
                    { id: "both" as const, label: "Both", icon: "M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" },
                  ].map((fmt) => (
                    <button
                      key={fmt.id}
                      onClick={() => setFormat(fmt.id)}
                      className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-lg border transition-all ${
                        format === fmt.id
                          ? "bg-[var(--accent-cyan)]/10 border-[var(--accent-cyan)]/50 text-[var(--accent-cyan)]"
                          : "bg-[var(--bg-deep)] border-[var(--border-subtle)] text-[var(--text-secondary)] hover:border-[var(--accent-cyan)]/30"
                      }`}
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={fmt.icon} />
                      </svg>
                      <span className="font-display font-medium">{fmt.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Report Info */}
              {selectedReport && (
                <div className="p-4 bg-[var(--bg-deep)] rounded-lg border border-[var(--border-subtle)]">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-[var(--accent-cyan)]/10 text-[var(--accent-cyan)]">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div>
                      <p className="font-display font-semibold text-[var(--text-primary)]">{selectedReport.label}</p>
                      <p className="text-sm text-[var(--text-secondary)] mt-1">{selectedReport.description}</p>
                      <p className="text-xs text-[var(--text-muted)] mt-2">
                        Format: {format === "both" ? "PDF & Excel" : format.toUpperCase()}
                        {reportType === "development" && developmentId && (
                          <> | Development: {developments.find((d) => d.id === developmentId)?.name}</>
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Error message */}
              {error && (
                <div className="p-4 bg-[var(--accent-rose)]/10 border border-[var(--accent-rose)]/30 rounded-lg">
                  <div className="flex items-center gap-2 text-[var(--accent-rose)]">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="font-display font-medium">{error}</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {!success && !previewUrl && (
          <div className="sticky bottom-0 glass border-t border-[var(--border-subtle)] px-6 py-4 rounded-b-xl">
            <div className="flex gap-3 justify-between">
              <button
                onClick={() => handleGenerate(true)}
                disabled={isGenerating || (reportType === "development" && !developmentId)}
                className="btn-secondary disabled:opacity-50"
              >
                <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                Preview
              </button>
              <div className="flex gap-3">
                <button onClick={onClose} className="btn-secondary">
                  Cancel
                </button>
                <button
                  onClick={() => handleGenerate(false)}
                  disabled={isGenerating || (reportType === "development" && !developmentId)}
                  className="btn-primary disabled:opacity-50"
                >
                  {isGenerating ? (
                    <>
                      <svg className="w-4 h-4 mr-2 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Generating...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      Generate Report
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
