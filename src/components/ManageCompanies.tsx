import { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import type { DevelopmentCompany, CreateCompanyInput } from "../types/company";
import {
  getCompanies,
  createCompany,
  updateCompany,
  deleteCompany,
  toggleCompanyActive,
} from "../services/companyService";

interface CompanyFormData {
  name: string;
  companyNumber: string;
  line1: string;
  line2: string;
  city: string;
  county: string;
  postcode: string;
  country: string;
  active: boolean;
}

const emptyForm: CompanyFormData = {
  name: "",
  companyNumber: "",
  line1: "",
  line2: "",
  city: "",
  county: "",
  postcode: "",
  country: "Ireland",
  active: true,
};

export function ManageCompanies() {
  const { currentUser, can } = useAuth();
  const [companies, setCompanies] = useState<DevelopmentCompany[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<CompanyFormData>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  useEffect(() => {
    loadCompanies();
  }, []);

  async function loadCompanies() {
    try {
      setLoading(true);
      const data = await getCompanies();
      setCompanies(data);
      setError(null);
    } catch (err) {
      console.error("Failed to load companies:", err);
      setError("Failed to load companies");
    } finally {
      setLoading(false);
    }
  }

  function handleEdit(company: DevelopmentCompany) {
    setFormData({
      name: company.name,
      companyNumber: company.companyNumber,
      line1: company.registeredAddress.line1,
      line2: company.registeredAddress.line2 || "",
      city: company.registeredAddress.city,
      county: company.registeredAddress.county || "",
      postcode: company.registeredAddress.postcode,
      country: company.registeredAddress.country,
      active: company.active,
    });
    setEditingId(company.id);
    setShowForm(true);
  }

  function handleNew() {
    setFormData(emptyForm);
    setEditingId(null);
    setShowForm(true);
  }

  function handleCancel() {
    setFormData(emptyForm);
    setEditingId(null);
    setShowForm(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!currentUser) return;

    setSaving(true);
    try {
      const input: CreateCompanyInput = {
        name: formData.name,
        companyNumber: formData.companyNumber,
        registeredAddress: {
          line1: formData.line1,
          line2: formData.line2 || undefined,
          city: formData.city,
          county: formData.county || undefined,
          postcode: formData.postcode,
          country: formData.country,
        },
        active: formData.active,
      };

      if (editingId) {
        await updateCompany(editingId, input);
      } else {
        await createCompany(input, currentUser.uid);
      }

      await loadCompanies();
      handleCancel();
    } catch (err) {
      console.error("Failed to save company:", err);
      setError("Failed to save company");
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleActive(company: DevelopmentCompany) {
    try {
      await toggleCompanyActive(company.id, !company.active);
      await loadCompanies();
    } catch (err) {
      console.error("Failed to toggle company status:", err);
      setError("Failed to update company status");
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteCompany(id);
      setDeleteConfirm(null);
      await loadCompanies();
    } catch (err) {
      console.error("Failed to delete company:", err);
      setError("Failed to delete company");
    }
  }

  if (!can("editDevelopment")) {
    return (
      <div className="text-center py-12">
        <p className="text-[var(--text-muted)]">You do not have permission to manage companies.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-[var(--text-primary)]">
            Development Companies
          </h1>
          <p className="text-[var(--text-muted)] mt-1">
            Manage developer companies for unit assignments
          </p>
        </div>
        <button
          onClick={handleNew}
          className="px-4 py-2 bg-[var(--accent-cyan)] text-white rounded-lg hover:bg-[var(--accent-cyan)]/80 transition-colors flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Add Company
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400">
          {error}
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-subtle)] max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-[var(--border-subtle)]">
              <h2 className="text-xl font-display font-bold text-[var(--text-primary)]">
                {editingId ? "Edit Company" : "Add New Company"}
              </h2>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                    Company Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    className="w-full px-3 py-2 bg-[var(--bg-deep)] border border-[var(--border-subtle)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-cyan)]"
                    placeholder="Enter company name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                    Company Number *
                  </label>
                  <input
                    type="text"
                    value={formData.companyNumber}
                    onChange={(e) => setFormData({ ...formData, companyNumber: e.target.value })}
                    required
                    className="w-full px-3 py-2 bg-[var(--bg-deep)] border border-[var(--border-subtle)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-cyan)]"
                    placeholder="e.g., IE123456"
                  />
                </div>

                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.active}
                      onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                      className="w-4 h-4 rounded border-[var(--border-subtle)] bg-[var(--bg-deep)] text-[var(--accent-cyan)] focus:ring-[var(--accent-cyan)]"
                    />
                    <span className="text-sm text-[var(--text-secondary)]">Active</span>
                  </label>
                </div>
              </div>

              <div className="border-t border-[var(--border-subtle)] pt-4 mt-4">
                <h3 className="text-sm font-medium text-[var(--text-primary)] mb-3">
                  Registered Address
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                      Address Line 1 *
                    </label>
                    <input
                      type="text"
                      value={formData.line1}
                      onChange={(e) => setFormData({ ...formData, line1: e.target.value })}
                      required
                      className="w-full px-3 py-2 bg-[var(--bg-deep)] border border-[var(--border-subtle)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-cyan)]"
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                      Address Line 2
                    </label>
                    <input
                      type="text"
                      value={formData.line2}
                      onChange={(e) => setFormData({ ...formData, line2: e.target.value })}
                      className="w-full px-3 py-2 bg-[var(--bg-deep)] border border-[var(--border-subtle)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-cyan)]"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                      City *
                    </label>
                    <input
                      type="text"
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      required
                      className="w-full px-3 py-2 bg-[var(--bg-deep)] border border-[var(--border-subtle)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-cyan)]"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                      County
                    </label>
                    <input
                      type="text"
                      value={formData.county}
                      onChange={(e) => setFormData({ ...formData, county: e.target.value })}
                      className="w-full px-3 py-2 bg-[var(--bg-deep)] border border-[var(--border-subtle)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-cyan)]"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                      Postcode *
                    </label>
                    <input
                      type="text"
                      value={formData.postcode}
                      onChange={(e) => setFormData({ ...formData, postcode: e.target.value })}
                      required
                      className="w-full px-3 py-2 bg-[var(--bg-deep)] border border-[var(--border-subtle)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-cyan)]"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                      Country *
                    </label>
                    <input
                      type="text"
                      value={formData.country}
                      onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                      required
                      className="w-full px-3 py-2 bg-[var(--bg-deep)] border border-[var(--border-subtle)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-cyan)]"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-[var(--border-subtle)]">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="px-4 py-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-[var(--accent-cyan)] text-white rounded-lg hover:bg-[var(--accent-cyan)]/80 transition-colors disabled:opacity-50"
                >
                  {saving ? "Saving..." : editingId ? "Update Company" : "Create Company"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-subtle)] max-w-md w-full p-6">
            <h2 className="text-lg font-display font-bold text-[var(--text-primary)] mb-4">
              Delete Company?
            </h2>
            <p className="text-[var(--text-secondary)] mb-6">
              Are you sure you want to delete this company? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Company List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-2 border-[var(--accent-cyan)] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : companies.length === 0 ? (
        <div className="text-center py-12 bg-[var(--bg-card)] rounded-xl border border-[var(--border-subtle)]">
          <svg className="w-12 h-12 mx-auto text-[var(--text-muted)] mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
          <p className="text-[var(--text-muted)]">No companies added yet</p>
          <button
            onClick={handleNew}
            className="mt-4 px-4 py-2 bg-[var(--accent-cyan)] text-white rounded-lg hover:bg-[var(--accent-cyan)]/80 transition-colors"
          >
            Add First Company
          </button>
        </div>
      ) : (
        <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-subtle)] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--border-subtle)]">
                  <th className="px-6 py-3 text-left text-xs font-mono uppercase tracking-wider text-[var(--text-muted)]">
                    Company Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-mono uppercase tracking-wider text-[var(--text-muted)]">
                    Company Number
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-mono uppercase tracking-wider text-[var(--text-muted)]">
                    Address
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-mono uppercase tracking-wider text-[var(--text-muted)]">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-mono uppercase tracking-wider text-[var(--text-muted)]">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)]">
                {companies.map((company) => (
                  <tr key={company.id} className="hover:bg-[var(--bg-deep)] transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-medium text-[var(--text-primary)]">{company.name}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-mono text-sm text-[var(--text-secondary)]">
                        {company.companyNumber}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-[var(--text-secondary)]">
                        {company.registeredAddress.line1}
                        {company.registeredAddress.line2 && `, ${company.registeredAddress.line2}`}
                        <br />
                        {company.registeredAddress.city}, {company.registeredAddress.postcode}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => handleToggleActive(company)}
                        className={`px-2 py-1 text-xs font-medium rounded-full ${
                          company.active
                            ? "bg-green-500/20 text-green-400"
                            : "bg-gray-500/20 text-gray-400"
                        }`}
                      >
                        {company.active ? "Active" : "Inactive"}
                      </button>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleEdit(company)}
                          className="p-2 text-[var(--text-muted)] hover:text-[var(--accent-cyan)] transition-colors"
                          title="Edit"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(company.id)}
                          className="p-2 text-[var(--text-muted)] hover:text-red-400 transition-colors"
                          title="Delete"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
