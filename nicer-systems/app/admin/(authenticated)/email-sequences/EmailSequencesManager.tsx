"use client";

import { useState } from "react";
import type { EmailSequence } from "@/types/email-sequence";
import {
  createEmailSequence,
  updateEmailSequence,
  deleteEmailSequence,
  toggleEmailSequenceActive,
} from "@/lib/actions/email-sequences";

type StepForm = {
  delay_days: number;
  subject: string;
  body_html: string;
};

type FormData = {
  name: string;
  trigger: "lead_submit" | "preview_plan_sent";
  steps: StepForm[];
  is_active: boolean;
};

const emptyStep: StepForm = { delay_days: 1, subject: "", body_html: "" };

const emptyForm: FormData = {
  name: "",
  trigger: "lead_submit",
  steps: [{ ...emptyStep }],
  is_active: false,
};

export default function EmailSequencesManager({
  initialData,
}: {
  initialData: EmailSequence[];
}) {
  const [items, setItems] = useState<EmailSequence[]>(initialData);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm);
    setShowForm(true);
    setError("");
  }

  function openEdit(item: EmailSequence) {
    setEditingId(item.id);
    setForm({
      name: item.name,
      trigger: item.trigger,
      steps: item.steps.length ? item.steps : [{ ...emptyStep }],
      is_active: item.is_active,
    });
    setShowForm(true);
    setError("");
  }

  function cancelForm() {
    setShowForm(false);
    setEditingId(null);
    setError("");
  }

  function updateStep(idx: number, field: keyof StepForm, value: string | number) {
    setForm((f) => {
      const steps = [...f.steps];
      steps[idx] = { ...steps[idx], [field]: value };
      return { ...f, steps };
    });
  }

  function addStep() {
    setForm((f) => ({
      ...f,
      steps: [...f.steps, { ...emptyStep, delay_days: f.steps.length + 1 }],
    }));
  }

  function removeStep(idx: number) {
    setForm((f) => ({
      ...f,
      steps: f.steps.filter((_, i) => i !== idx),
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");

    const payload = {
      ...form,
      steps: form.steps.filter((s) => s.subject && s.body_html),
    };

    const result = editingId
      ? await updateEmailSequence(editingId, payload)
      : await createEmailSequence(payload);

    setSaving(false);

    if (!result.success) {
      setError(result.error ?? "Something went wrong");
      return;
    }

    window.location.reload();
  }

  async function handleToggleActive(item: EmailSequence) {
    const result = await toggleEmailSequenceActive(item.id, !item.is_active);
    if (result.success) {
      setItems((prev) =>
        prev.map((i) =>
          i.id === item.id ? { ...i, is_active: !i.is_active } : i
        )
      );
    }
  }

  async function handleDelete(id: string) {
    const result = await deleteEmailSequence(id);
    if (result.success) {
      setItems((prev) => prev.filter((i) => i.id !== id));
      setDeleteConfirm(null);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold mb-1">Email Sequences</h1>
          <p className="text-muted text-sm">
            Automated nurture emails triggered by lead actions.
          </p>
        </div>
        {!showForm && (
          <button
            onClick={openCreate}
            className="px-4 py-2 rounded-lg bg-primary text-background text-sm font-medium hover:opacity-90 transition-opacity"
          >
            + New Sequence
          </button>
        )}
      </div>

      {showForm && (
        <div className="mb-8 rounded-xl border border-border bg-surface p-6">
          <h2 className="text-lg font-semibold mb-4">
            {editingId ? "Edit Sequence" : "New Sequence"}
          </h2>
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              {error}
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-muted mb-1">Sequence Name</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm"
                  placeholder="e.g. Welcome nurture"
                  required
                />
              </div>
              <div>
                <label className="block text-sm text-muted mb-1">Trigger</label>
                <select
                  value={form.trigger}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      trigger: e.target.value as FormData["trigger"],
                    }))
                  }
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm"
                >
                  <option value="lead_submit">Lead Submit (contact form)</option>
                  <option value="preview_plan_sent">Preview Plan Sent</option>
                </select>
              </div>
            </div>

            {/* Steps */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm text-muted">
                  Email Steps ({form.steps.length})
                </label>
                <button
                  type="button"
                  onClick={addStep}
                  className="text-xs text-primary hover:opacity-80"
                >
                  + Add Step
                </button>
              </div>
              <div className="space-y-3">
                {form.steps.map((step, idx) => (
                  <div
                    key={idx}
                    className="rounded-lg border border-border bg-background p-4"
                  >
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-sm font-medium text-muted">
                        Step {idx + 1}
                      </span>
                      <div className="flex items-center gap-3">
                        <label className="text-xs text-muted">
                          Delay (days):
                          <input
                            type="number"
                            value={step.delay_days}
                            onChange={(e) =>
                              updateStep(idx, "delay_days", Number(e.target.value))
                            }
                            className="ml-1 w-16 px-2 py-1 rounded border border-border bg-surface text-sm"
                            min="0"
                            max="90"
                          />
                        </label>
                        {form.steps.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeStep(idx)}
                            className="text-red-400 hover:text-red-300 text-sm"
                          >
                            &times;
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={step.subject}
                        onChange={(e) => updateStep(idx, "subject", e.target.value)}
                        placeholder="Email subject line"
                        className="w-full px-3 py-2 rounded-lg border border-border bg-surface text-foreground text-sm"
                      />
                      <textarea
                        value={step.body_html}
                        onChange={(e) => updateStep(idx, "body_html", e.target.value)}
                        placeholder="Email body (HTML). Use {{name}} for personalization."
                        rows={4}
                        className="w-full px-3 py-2 rounded-lg border border-border bg-surface text-foreground text-sm resize-y font-mono text-xs"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
                  className="rounded"
                />
                Active
              </label>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 rounded-lg bg-primary text-background text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {saving ? "Saving..." : editingId ? "Update" : "Create"}
              </button>
              <button
                type="button"
                onClick={cancelForm}
                className="px-4 py-2 rounded-lg border border-border text-sm text-muted hover:text-foreground transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* List */}
      <div className="rounded-xl border border-border bg-surface overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left">
              <th className="px-6 py-3 text-muted font-medium">Name</th>
              <th className="px-6 py-3 text-muted font-medium">Trigger</th>
              <th className="px-6 py-3 text-muted font-medium">Steps</th>
              <th className="px-6 py-3 text-muted font-medium">Status</th>
              <th className="px-6 py-3 text-muted font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-muted">
                  No email sequences yet. Create your first one.
                </td>
              </tr>
            ) : (
              items.map((item) => (
                <tr
                  key={item.id}
                  className="border-b border-border last:border-b-0 hover:bg-surface-light/50"
                >
                  <td className="px-6 py-3 font-medium">{item.name}</td>
                  <td className="px-6 py-3 text-muted text-xs">
                    {item.trigger === "lead_submit" ? "Lead Submit" : "Preview Plan Sent"}
                  </td>
                  <td className="px-6 py-3 text-muted">{item.steps.length}</td>
                  <td className="px-6 py-3">
                    <button
                      onClick={() => handleToggleActive(item)}
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        item.is_active
                          ? "bg-green-500/10 text-green-400"
                          : "bg-yellow-500/10 text-yellow-400"
                      }`}
                    >
                      {item.is_active ? "Active" : "Paused"}
                    </button>
                  </td>
                  <td className="px-6 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => openEdit(item)}
                        className="text-xs text-muted hover:text-foreground transition-colors"
                      >
                        Edit
                      </button>
                      {deleteConfirm === item.id ? (
                        <span className="flex items-center gap-1">
                          <button
                            onClick={() => handleDelete(item.id)}
                            className="text-xs text-red-400 hover:text-red-300"
                          >
                            Confirm
                          </button>
                          <button
                            onClick={() => setDeleteConfirm(null)}
                            className="text-xs text-muted hover:text-foreground"
                          >
                            Cancel
                          </button>
                        </span>
                      ) : (
                        <button
                          onClick={() => setDeleteConfirm(item.id)}
                          className="text-xs text-red-400 hover:text-red-300 transition-colors"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
