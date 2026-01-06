import { useState, useEffect } from "react";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import type { IncentiveScheme, IncentiveSchemeFormData, IncentiveBenefit, IncentiveRequirement, IncentiveRequirementType } from "../types/incentive";
import {
  getIncentiveSchemes,
  createIncentiveScheme,
  updateIncentiveScheme,
  deleteIncentiveScheme,
  formatBenefitValue,
  calculateTotalBenefitValue,
} from "../services/incentiveService";

type FilterTab = "active" | "inactive" | "all";

const BENEFIT_TYPES = [
  "White Goods Voucher",
  "Flooring Voucher",
  "Cash Back",
  "Stamp Duty Contribution",
  "Legal Fees Contribution",
  "Furniture Voucher",
  "Other",
];

const CURRENCIES = ["EUR", "GBP"];

const REQUIREMENT_TYPES: { value: IncentiveRequirementType; label: string }[] = [
  { value: "contract_signed_days", label: "Contract signed within X days of issue" },
  { value: "sale_closed_days", label: "Sale closed within X days of reference" },
  { value: "bcms_days", label: "BCMS received within X days of planned" },
  { value: "custom", label: "Custom requirement" },
];

export function IncentiveSchemesPage() {
  const { currentUser, can } = useAuth();
  const [schemes, setSchemes] = useState<IncentiveScheme[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterTab, setFilterTab] = useState<FilterTab>("active");
  const [showModal, setShowModal] = useState(false);
  const [editingScheme, setEditingScheme] = useState<IncentiveScheme | null>(null);
  const [deletingScheme, setDeletingScheme] = useState<IncentiveScheme | null>(null);

  useEffect(() => {
    loadSchemes();
  }, []);

  // Permission guard - redirect unauthorized users (must be after all hooks)
  if (!can("editUnit") && !can("editDevelopment")) {
    return <Navigate to="/" replace />;
  }

  async function loadSchemes() {
    setLoading(true);
    try {
      const data = await getIncentiveSchemes();
      setSchemes(data);
    } catch (error) {
      console.error("Failed to load schemes:", error);
    } finally {
      setLoading(false);
    }
  }

  const filteredSchemes = schemes.filter((scheme) => {
    if (filterTab === "active") return scheme.active;
    if (filterTab === "inactive") return !scheme.active;
    return true;
  });

  const handleEdit = (scheme: IncentiveScheme) => {
    setEditingScheme(scheme);
    setShowModal(true);
  };

  const handleDelete = async () => {
    if (!deletingScheme) return;
    try {
      await deleteIncentiveScheme(deletingScheme.id);
      setSchemes((prev) => prev.filter((s) => s.id !== deletingScheme.id));
      setDeletingScheme(null);
    } catch (error) {
      console.error("Failed to delete scheme:", error);
    }
  };

  const handleSave = async (data: IncentiveSchemeFormData) => {
    try {
      if (editingScheme) {
        await updateIncentiveScheme(editingScheme.id, data);
      } else {
        await createIncentiveScheme(data, currentUser?.uid || "");
      }
      await loadSchemes();
      setShowModal(false);
      setEditingScheme(null);
    } catch (error) {
      console.error("Failed to save scheme:", error);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-[var(--accent-cyan)] hover:text-[var(--text-primary)] text-sm font-medium mb-3 transition-colors group"
        >
          <svg className="w-4 h-4 transform group-hover:-translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Dashboard
        </Link>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-1 h-8 bg-gradient-to-b from-[var(--accent-gold)] to-[var(--accent-orange)] rounded-full" />
            <div>
              <h2 className="font-display text-3xl font-bold text-[var(--text-primary)]">
                Incentive Schemes
              </h2>
              <p className="font-mono text-sm text-[var(--text-muted)]">
                Manage buyer incentive programs
              </p>
            </div>
          </div>
          {can("editDevelopment") && (
            <button
              onClick={() => {
                setEditingScheme(null);
                setShowModal(true);
              }}
              className="btn-primary flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Create New Scheme
            </button>
          )}
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2">
        {(["active", "inactive", "all"] as FilterTab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setFilterTab(tab)}
            className={`px-4 py-2 rounded-lg font-display text-sm font-medium transition-all ${
              filterTab === tab
                ? "bg-[var(--accent-cyan)] text-[var(--bg-deep)]"
                : "bg-[var(--bg-card)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-subtle)]"
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
            <span className="ml-2 font-mono text-xs">
              ({tab === "active" ? schemes.filter((s) => s.active).length : tab === "inactive" ? schemes.filter((s) => !s.active).length : schemes.length})
            </span>
          </button>
        ))}
      </div>

      {/* Schemes List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-2 border-[var(--accent-cyan)] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filteredSchemes.length === 0 ? (
        <div className="card p-12 text-center">
          <svg className="w-16 h-16 mx-auto text-[var(--text-muted)] mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h3 className="font-display text-xl font-bold text-[var(--text-primary)] mb-2">
            No {filterTab !== "all" ? filterTab : ""} schemes found
          </h3>
          <p className="text-[var(--text-secondary)] mb-6">
            {filterTab === "active"
              ? "Create a new scheme to offer incentives to buyers"
              : "No inactive schemes at the moment"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredSchemes.map((scheme) => (
            <SchemeCard
              key={scheme.id}
              scheme={scheme}
              onEdit={() => handleEdit(scheme)}
              onDelete={() => setDeletingScheme(scheme)}
              canEdit={can("editDevelopment")}
            />
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <SchemeModal
          scheme={editingScheme}
          onClose={() => {
            setShowModal(false);
            setEditingScheme(null);
          }}
          onSave={handleSave}
        />
      )}

      {/* Delete Confirmation */}
      {deletingScheme && (
        <DeleteConfirmModal
          schemeName={deletingScheme.name}
          onConfirm={handleDelete}
          onCancel={() => setDeletingScheme(null)}
        />
      )}
    </div>
  );
}

function SchemeCard({
  scheme,
  onEdit,
  onDelete,
  canEdit,
}: {
  scheme: IncentiveScheme;
  onEdit: () => void;
  onDelete: () => void;
  canEdit: boolean;
}) {
  const totalValue = calculateTotalBenefitValue(scheme);
  const currency = scheme.benefits[0]?.currency || "EUR";

  return (
    <div className="card p-6">
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-display text-lg font-bold text-[var(--text-primary)]">
              {scheme.name}
            </h3>
            <span className={`badge text-xs ${scheme.active ? "badge-complete" : "badge-notstarted"}`}>
              {scheme.active ? "Active" : "Inactive"}
            </span>
          </div>
          {scheme.description && (
            <p className="text-sm text-[var(--text-secondary)]">{scheme.description}</p>
          )}
        </div>
        {canEdit && (
          <div className="flex gap-2">
            <button
              onClick={onEdit}
              className="p-2 rounded-lg border border-[var(--border-subtle)] hover:border-[var(--accent-cyan)] hover:bg-[var(--accent-cyan)]/10 transition-all"
              title="Edit"
            >
              <svg className="w-4 h-4 text-[var(--text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
            <button
              onClick={onDelete}
              className="p-2 rounded-lg border border-[var(--border-subtle)] hover:border-[var(--accent-rose)] hover:bg-[var(--accent-rose)]/10 transition-all"
              title="Delete"
            >
              <svg className="w-4 h-4 text-[var(--text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        )}
      </div>

      {/* Total Value */}
      <div className="bg-[var(--bg-deep)] rounded-lg p-4 mb-4">
        <p className="font-mono text-xs text-[var(--text-muted)] uppercase tracking-wider mb-1">
          Total Benefit Value
        </p>
        <p className="font-mono text-2xl font-bold text-[var(--accent-gold-bright)]">
          {formatBenefitValue(totalValue, currency)}
        </p>
      </div>

      {/* Benefits */}
      <div className="mb-4">
        <p className="font-display text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2">
          Benefits
        </p>
        <div className="space-y-2">
          {scheme.benefits.map((benefit, idx) => (
            <div key={idx} className="flex items-center justify-between text-sm">
              <span className="text-[var(--text-secondary)]">{benefit.type}</span>
              <span className="font-mono text-[var(--accent-emerald)]">
                {formatBenefitValue(benefit.value, benefit.currency)}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Requirements */}
      <div className="mb-4">
        <p className="font-display text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2">
          Requirements
        </p>
        <ul className="space-y-1">
          {scheme.requirements.map((req, idx) => (
            <li key={idx} className="flex items-start gap-2 text-sm text-[var(--text-secondary)]">
              <svg className="w-4 h-4 text-[var(--accent-cyan)] flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {req.description}
            </li>
          ))}
        </ul>
      </div>

      {/* Valid Dates */}
      {(scheme.validFrom || scheme.validTo) && (
        <div className="pt-3 border-t border-[var(--border-subtle)]">
          <p className="font-mono text-xs text-[var(--text-muted)]">
            Valid: {scheme.validFrom ? new Date(scheme.validFrom).toLocaleDateString() : "Any"} - {scheme.validTo ? new Date(scheme.validTo).toLocaleDateString() : "Ongoing"}
          </p>
        </div>
      )}
    </div>
  );
}

function SchemeModal({
  scheme,
  onClose,
  onSave,
}: {
  scheme: IncentiveScheme | null;
  onClose: () => void;
  onSave: (data: IncentiveSchemeFormData) => void;
}) {
  const [formData, setFormData] = useState<IncentiveSchemeFormData>({
    name: scheme?.name || "",
    description: scheme?.description || "",
    active: scheme?.active ?? true,
    benefits: scheme?.benefits || [{ type: "White Goods Voucher", value: 5000, currency: "EUR" }],
    requirements: scheme?.requirements || [{ description: "", type: "contract_signed_days", value: 21 }],
    validFrom: scheme?.validFrom ? scheme.validFrom.toISOString().split("T")[0] : "",
    validTo: scheme?.validTo ? scheme.validTo.toISOString().split("T")[0] : "",
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await onSave(formData);
    setSaving(false);
  };

  const addBenefit = () => {
    setFormData((prev) => ({
      ...prev,
      benefits: [...prev.benefits, { type: "Other", value: 0, currency: "EUR" }],
    }));
  };

  const removeBenefit = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      benefits: prev.benefits.filter((_, i) => i !== index),
    }));
  };

  const updateBenefit = (index: number, updates: Partial<IncentiveBenefit>) => {
    setFormData((prev) => ({
      ...prev,
      benefits: prev.benefits.map((b, i) => (i === index ? { ...b, ...updates } : b)),
    }));
  };

  const addRequirement = () => {
    setFormData((prev) => ({
      ...prev,
      requirements: [...prev.requirements, { description: "", type: "custom" as IncentiveRequirementType }],
    }));
  };

  const removeRequirement = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      requirements: prev.requirements.filter((_, i) => i !== index),
    }));
  };

  const updateRequirement = (index: number, updates: Partial<IncentiveRequirement>) => {
    setFormData((prev) => ({
      ...prev,
      requirements: prev.requirements.map((r, i) => (i === index ? { ...r, ...updates } : r)),
    }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 modal-backdrop animate-fade-in" />
      <div
        className="relative card-elevated max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-fade-in-up"
        onClick={(e) => e.stopPropagation()}
      >
        <form onSubmit={handleSubmit}>
          {/* Header */}
          <div className="sticky top-0 z-10 glass border-b border-[var(--border-subtle)] px-6 py-4 flex items-center justify-between rounded-t-xl">
            <h2 className="font-display text-xl font-bold text-[var(--text-primary)]">
              {scheme ? "Edit Scheme" : "Create New Scheme"}
            </h2>
            <button type="button" onClick={onClose} className="p-2 rounded-lg border border-[var(--border-subtle)] hover:border-[var(--accent-cyan)] transition-all">
              <svg className="w-5 h-5 text-[var(--text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Basic Info */}
            <div className="space-y-4">
              <div>
                <label className="block font-display text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider mb-2">
                  Scheme Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                  className="input"
                  placeholder="e.g., Spring 2024 Buyer Incentive"
                  required
                />
              </div>

              <div>
                <label className="block font-display text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                  className="input min-h-[80px] resize-none"
                  placeholder="Optional description of the scheme..."
                />
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setFormData((prev) => ({ ...prev, active: !prev.active }))}
                  className={`relative w-12 h-6 rounded-full transition-colors ${
                    formData.active ? "bg-[var(--accent-emerald)]" : "bg-[var(--bg-deep)]"
                  }`}
                >
                  <span className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                    formData.active ? "left-7" : "left-1"
                  }`} />
                </button>
                <span className="text-sm text-[var(--text-secondary)]">
                  {formData.active ? "Active" : "Inactive"}
                </span>
              </div>
            </div>

            {/* Benefits Section */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="font-display text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">
                  Benefits
                </label>
                <button type="button" onClick={addBenefit} className="text-sm text-[var(--accent-cyan)] hover:text-[var(--text-primary)] transition-colors">
                  + Add Benefit
                </button>
              </div>
              <div className="space-y-3">
                {formData.benefits.map((benefit, idx) => (
                  <div key={idx} className="flex gap-3 items-start">
                    <select
                      value={benefit.type}
                      onChange={(e) => updateBenefit(idx, { type: e.target.value })}
                      className="select flex-1"
                    >
                      {BENEFIT_TYPES.map((type) => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                    <input
                      type="number"
                      value={benefit.value}
                      onChange={(e) => updateBenefit(idx, { value: Number(e.target.value) })}
                      className="input w-28"
                      placeholder="Value"
                      min="0"
                    />
                    <select
                      value={benefit.currency}
                      onChange={(e) => updateBenefit(idx, { currency: e.target.value })}
                      className="select w-24"
                    >
                      {CURRENCIES.map((curr) => (
                        <option key={curr} value={curr}>{curr}</option>
                      ))}
                    </select>
                    {formData.benefits.length > 1 && (
                      <button type="button" onClick={() => removeBenefit(idx)} className="p-2 text-[var(--accent-rose)] hover:bg-[var(--accent-rose)]/10 rounded-lg transition-colors">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Requirements Section */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="font-display text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">
                  Requirements
                </label>
                <button type="button" onClick={addRequirement} className="text-sm text-[var(--accent-cyan)] hover:text-[var(--text-primary)] transition-colors">
                  + Add Requirement
                </button>
              </div>
              <div className="space-y-3">
                {formData.requirements.map((req, idx) => (
                  <div key={idx} className="bg-[var(--bg-deep)] rounded-lg p-4 border border-[var(--border-subtle)]">
                    <div className="flex gap-3 mb-3">
                      <select
                        value={req.type}
                        onChange={(e) => updateRequirement(idx, { type: e.target.value as IncentiveRequirementType })}
                        className="select flex-1"
                      >
                        {REQUIREMENT_TYPES.map((type) => (
                          <option key={type.value} value={type.value}>{type.label}</option>
                        ))}
                      </select>
                      {formData.requirements.length > 1 && (
                        <button type="button" onClick={() => removeRequirement(idx)} className="p-2 text-[var(--accent-rose)] hover:bg-[var(--accent-rose)]/10 rounded-lg transition-colors">
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      )}
                    </div>
                    <div className="flex gap-3">
                      <input
                        type="text"
                        value={req.description}
                        onChange={(e) => updateRequirement(idx, { description: e.target.value })}
                        className="input flex-1"
                        placeholder="Description (e.g., Contract signed within 21 days of issue)"
                      />
                      {req.type !== "custom" && (
                        <input
                          type="number"
                          value={req.value || ""}
                          onChange={(e) => updateRequirement(idx, { value: Number(e.target.value) })}
                          className="input w-20"
                          placeholder="Days"
                          min="0"
                        />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Valid Dates */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block font-display text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider mb-2">
                  Valid From
                </label>
                <input
                  type="date"
                  value={formData.validFrom}
                  onChange={(e) => setFormData((prev) => ({ ...prev, validFrom: e.target.value }))}
                  className="input"
                />
              </div>
              <div>
                <label className="block font-display text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider mb-2">
                  Valid To
                </label>
                <input
                  type="date"
                  value={formData.validTo}
                  onChange={(e) => setFormData((prev) => ({ ...prev, validTo: e.target.value }))}
                  className="input"
                />
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="sticky bottom-0 glass border-t border-[var(--border-subtle)] px-6 py-4 rounded-b-xl flex gap-3">
            <button type="button" onClick={onClose} className="btn-secondary flex-1" disabled={saving}>
              Cancel
            </button>
            <button type="submit" className="btn-primary flex-1" disabled={saving || !formData.name}>
              {saving ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Saving...
                </span>
              ) : scheme ? (
                "Save Changes"
              ) : (
                "Create Scheme"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function DeleteConfirmModal({
  schemeName,
  onConfirm,
  onCancel,
}: {
  schemeName: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onCancel}>
      <div className="absolute inset-0 modal-backdrop animate-fade-in" />
      <div
        className="relative card-elevated max-w-md w-full animate-fade-in-up p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-4 mb-4">
          <div className="w-12 h-12 rounded-full bg-[var(--accent-rose)]/10 flex items-center justify-center">
            <svg className="w-6 h-6 text-[var(--accent-rose)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div>
            <h3 className="font-display text-lg font-bold text-[var(--text-primary)]">
              Delete Scheme
            </h3>
            <p className="text-sm text-[var(--text-secondary)]">
              This action cannot be undone
            </p>
          </div>
        </div>
        <p className="text-[var(--text-secondary)] mb-6">
          Are you sure you want to delete <strong className="text-[var(--text-primary)]">{schemeName}</strong>?
        </p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="btn-secondary flex-1">
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-2.5 px-4 rounded-lg bg-[var(--accent-rose)] text-white font-display font-semibold hover:opacity-90 transition-opacity"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
