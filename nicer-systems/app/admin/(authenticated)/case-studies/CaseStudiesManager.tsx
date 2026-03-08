"use client";

import type { CaseStudy } from "@/types/case-study";
import {
  createCaseStudy,
  deleteCaseStudy,
  reorderCaseStudies,
  toggleCaseStudyPublished,
  updateCaseStudy,
} from "@/lib/actions/case-studies";
import {
  AdminPageHeader,
  AdminPanel,
  AdminPill,
} from "@/components/admin/AdminPrimitives";
import ImageUploadField from "@/components/admin/ImageUploadField";
import { useCrudManager, INPUT_CLASS_NAME } from "@/hooks/useCrudManager";

type FormData = {
  title: string;
  slug: string;
  client_name: string;
  industry: string;
  tools: string;
  challenge: string;
  solution: string;
  metrics: { label: string; before: string; after: string }[];
  thumbnail_url: string;
  is_published: boolean;
  sort_order: number;
};

const emptyForm: FormData = {
  title: "",
  slug: "",
  client_name: "",
  industry: "",
  tools: "",
  challenge: "",
  solution: "",
  metrics: [{ label: "", before: "", after: "" }],
  thumbnail_url: "",
  is_published: false,
  sort_order: 0,
};

function toSlug(s: string) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

const actions = {
  create: createCaseStudy,
  update: updateCaseStudy,
  remove: deleteCaseStudy,
  toggle: toggleCaseStudyPublished,
  reorder: reorderCaseStudies,
};

function itemToForm(item: CaseStudy): FormData {
  return {
    title: item.title,
    slug: item.slug,
    client_name: item.client_name,
    industry: item.industry,
    tools: item.tools.join(", "),
    challenge: item.challenge,
    solution: item.solution,
    metrics: item.metrics.length
      ? item.metrics
      : [{ label: "", before: "", after: "" }],
    thumbnail_url: item.thumbnail_url,
    is_published: item.is_published,
    sort_order: item.sort_order,
  };
}

function preparePayload(form: FormData) {
  return {
    ...form,
    tools: form.tools
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean),
    metrics: form.metrics.filter((m) => m.label || m.before || m.after),
  };
}

export default function CaseStudiesManager({
  initialData,
}: {
  initialData: CaseStudy[];
}) {
  const crud = useCrudManager<CaseStudy, FormData>({
    initialData,
    emptyForm,
    actions,
    itemToForm,
    preparePayload,
  });

  function updateMetric(
    idx: number,
    field: "label" | "before" | "after",
    value: string
  ) {
    const metrics = [...crud.form.metrics];
    metrics[idx] = { ...metrics[idx], [field]: value };
    crud.updateField("metrics", metrics);
  }

  function addMetric() {
    crud.updateField("metrics", [
      ...crud.form.metrics,
      { label: "", before: "", after: "" },
    ]);
  }

  function removeMetric(idx: number) {
    crud.updateField(
      "metrics",
      crud.form.metrics.filter((_, i) => i !== idx)
    );
  }

  return (
    <div>
      <AdminPageHeader
        eyebrow="Content"
        title="Case Studies"
        description="Manage proof points, client context, and published ordering for the marketing site."
        actions={
          !crud.showForm ? (
            <button
              onClick={crud.openCreate}
              className="rounded-full bg-[#171d13] px-5 py-3 text-sm font-semibold text-[#f7f2e8] transition-transform hover:scale-[1.02]"
            >
              New Case Study
            </button>
          ) : null
        }
      />

      {crud.showForm && (
        <AdminPanel className="mt-8 mb-8">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-[#1d2318]">
                {crud.editingId ? "Edit Case Study" : "New Case Study"}
              </h2>
              <p className="mt-1 text-sm text-[#6c7467]">
                Keep metrics and narrative aligned with the published proof of work.
              </p>
            </div>
            <AdminPill tone={crud.form.is_published ? "green" : "neutral"}>
              {crud.form.is_published ? "Published" : "Draft"}
            </AdminPill>
          </div>

          {crud.error && (
            <div className="mb-4 rounded-[18px] border border-red-200 bg-[#fff4f2] p-3 text-sm text-[#9d3f3f]">
              {crud.error}
            </div>
          )}

          <form onSubmit={crud.handleSubmit} className="space-y-5">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm text-[#6c7467]">Title</label>
                <input
                  type="text"
                  value={crud.form.title}
                  onChange={(e) => {
                    crud.updateField("title", e.target.value);
                    if (!crud.editingId) crud.updateField("slug", toSlug(e.target.value));
                  }}
                  className={INPUT_CLASS_NAME}
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-sm text-[#6c7467]">Slug</label>
                <input
                  type="text"
                  value={crud.form.slug}
                  onChange={(e) => crud.updateField("slug", e.target.value)}
                  className={INPUT_CLASS_NAME}
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-sm text-[#6c7467]">Client Name</label>
                <input
                  type="text"
                  value={crud.form.client_name}
                  onChange={(e) => crud.updateField("client_name", e.target.value)}
                  className={INPUT_CLASS_NAME}
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-sm text-[#6c7467]">Industry</label>
                <input
                  type="text"
                  value={crud.form.industry}
                  onChange={(e) => crud.updateField("industry", e.target.value)}
                  className={INPUT_CLASS_NAME}
                  required
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm text-[#6c7467]">Tools (comma-separated)</label>
              <input
                type="text"
                value={crud.form.tools}
                onChange={(e) => crud.updateField("tools", e.target.value)}
                placeholder="Zapier, Google Sheets, Slack"
                className={INPUT_CLASS_NAME}
                required
              />
            </div>

            <div>
              <label className="mb-1 block text-sm text-[#6c7467]">Challenge</label>
              <textarea
                value={crud.form.challenge}
                onChange={(e) => crud.updateField("challenge", e.target.value)}
                rows={3}
                className={`${INPUT_CLASS_NAME} resize-y`}
                required
              />
            </div>

            <div>
              <label className="mb-1 block text-sm text-[#6c7467]">Solution</label>
              <textarea
                value={crud.form.solution}
                onChange={(e) => crud.updateField("solution", e.target.value)}
                rows={3}
                className={`${INPUT_CLASS_NAME} resize-y`}
                required
              />
            </div>

            <div>
              <ImageUploadField
                label="Thumbnail"
                value={crud.form.thumbnail_url}
                onChange={(value) => crud.updateField("thumbnail_url", value)}
                pathPrefix="admin/case-studies"
              />
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <label className="text-sm text-[#6c7467]">Metrics</label>
                <button
                  type="button"
                  onClick={addMetric}
                  className="text-sm font-medium text-[#4f6032] hover:underline"
                >
                  Add Metric
                </button>
              </div>
              <div className="space-y-3">
                {crud.form.metrics.map((m, idx) => (
                  <div
                    key={idx}
                    className="grid gap-2 rounded-[18px] border border-[#ddd5c7] bg-white/70 p-3 md:grid-cols-[1fr_130px_130px_auto]"
                  >
                    <input
                      type="text"
                      value={m.label}
                      onChange={(e) => updateMetric(idx, "label", e.target.value)}
                      placeholder="Label"
                      className={INPUT_CLASS_NAME}
                    />
                    <input
                      type="text"
                      value={m.before}
                      onChange={(e) => updateMetric(idx, "before", e.target.value)}
                      placeholder="Before"
                      className={INPUT_CLASS_NAME}
                    />
                    <input
                      type="text"
                      value={m.after}
                      onChange={(e) => updateMetric(idx, "after", e.target.value)}
                      placeholder="After"
                      className={INPUT_CLASS_NAME}
                    />
                    {crud.form.metrics.length > 1 ? (
                      <button
                        type="button"
                        onClick={() => removeMetric(idx)}
                        className="rounded-full border border-[#e3d8cb] px-3 py-2 text-sm text-[#8a4b4b] hover:bg-[#fff4f2]"
                      >
                        Remove
                      </button>
                    ) : (
                      <div />
                    )}
                  </div>
                ))}
              </div>
            </div>

            <label className="flex items-center gap-2 text-sm text-[#27311f]">
              <input
                type="checkbox"
                checked={crud.form.is_published}
                onChange={(e) => crud.updateField("is_published", e.target.checked)}
                className="rounded"
              />
              Published
            </label>

            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={crud.saving}
                className="rounded-full bg-[#171d13] px-5 py-3 text-sm font-semibold text-[#f7f2e8] transition-transform hover:scale-[1.02] disabled:opacity-50"
              >
                {crud.saving
                  ? "Saving..."
                  : crud.editingId
                    ? "Update Case Study"
                    : "Create Case Study"}
              </button>
              <button
                type="button"
                onClick={crud.cancelForm}
                className="rounded-full border border-[#d0c8b8] bg-[#fbf7ef] px-5 py-3 text-sm font-medium text-[#596351] transition-colors hover:bg-white"
              >
                Cancel
              </button>
            </div>
          </form>
        </AdminPanel>
      )}

      <AdminPanel className="mt-8 overflow-hidden p-0">
        <table className="w-full text-sm">
          <thead className="bg-white/55">
            <tr className="border-b border-[#ddd5c7] text-left">
              <th className="w-8 px-6 py-3 font-medium text-[#6c7467]"></th>
              <th className="px-6 py-3 font-medium text-[#6c7467]">Title</th>
              <th className="px-6 py-3 font-medium text-[#6c7467]">Industry</th>
              <th className="px-6 py-3 font-medium text-[#6c7467]">Status</th>
              <th className="px-6 py-3 text-right font-medium text-[#6c7467]">Actions</th>
            </tr>
          </thead>
          <tbody>
            {crud.items.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-[#6c7467]">
                  No case studies yet. Create your first one to get started.
                </td>
              </tr>
            ) : (
              crud.items.map((item, idx) => (
                <tr
                  key={item.id}
                  draggable
                  onDragStart={() => crud.handleDragStart(idx)}
                  onDragEnter={() => crud.handleDragEnter(idx)}
                  onDragEnd={crud.handleDragEnd}
                  onDragOver={(e) => e.preventDefault()}
                  className="cursor-grab border-b border-[#e1d9cb] transition-colors hover:bg-white/45 active:cursor-grabbing"
                >
                  <td className="px-6 py-4 text-[#8a8f7f]">⠿</td>
                  <td className="px-6 py-4 font-medium text-[#1d2318]">{item.title}</td>
                  <td className="px-6 py-4 text-[#596351]">{item.industry}</td>
                  <td className="px-6 py-4">
                    <button onClick={() => crud.handleTogglePublished(item)}>
                      <AdminPill tone={item.is_published ? "green" : "neutral"}>
                        {item.is_published ? "Published" : "Draft"}
                      </AdminPill>
                    </button>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-3">
                      <button
                        onClick={() => crud.openEdit(item)}
                        className="text-sm text-[#4f6032] hover:underline"
                      >
                        Edit
                      </button>
                      {crud.deleteConfirm === item.id ? (
                        <span className="flex items-center gap-2">
                          <button
                            onClick={() => crud.handleDelete(item.id)}
                            className="text-sm text-[#9d3f3f] hover:underline"
                          >
                            Confirm
                          </button>
                          <button
                            onClick={() => crud.setDeleteConfirm(null)}
                            className="text-sm text-[#6c7467] hover:underline"
                          >
                            Cancel
                          </button>
                        </span>
                      ) : (
                        <button
                          onClick={() => crud.setDeleteConfirm(item.id)}
                          className="text-sm text-[#9d3f3f] hover:underline"
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
      </AdminPanel>
    </div>
  );
}
