"use client";

import type { IndustryProbing } from "@/types/industry-probing";
import {
  createIndustryProbing,
  deleteIndustryProbing,
  reorderIndustryProbings,
  toggleIndustryProbingPublished,
  updateIndustryProbing,
} from "@/lib/actions/industry-probing";
import {
  AdminPageHeader,
  AdminPanel,
  AdminPill,
} from "@/components/admin/AdminPrimitives";
import { useCrudManager, INPUT_CLASS_NAME } from "@/hooks/useCrudManager";

// The form keeps array fields as newline-separated strings so admins can
// edit them in plain textareas. preparePayload converts them back to
// string[] before submitting to the server action.
type FormData = {
  slug: string;
  display_name: string;
  common_bottlenecks: string;
  common_tools: string;
  probing_angles: string;
  aliases: string;
  is_published: boolean;
  sort_order: number;
};

const emptyForm: FormData = {
  slug: "",
  display_name: "",
  common_bottlenecks: "",
  common_tools: "",
  probing_angles: "",
  aliases: "",
  is_published: false,
  sort_order: 0,
};

const actions = {
  create: createIndustryProbing,
  update: updateIndustryProbing,
  remove: deleteIndustryProbing,
  toggle: toggleIndustryProbingPublished,
  reorder: reorderIndustryProbings,
};

function joinLines(values: string[] | undefined): string {
  return (values ?? []).join("\n");
}

function splitLines(text: string): string[] {
  return text
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
}

function itemToForm(item: IndustryProbing): FormData {
  return {
    slug: item.slug,
    display_name: item.display_name,
    common_bottlenecks: joinLines(item.common_bottlenecks),
    common_tools: joinLines(item.common_tools),
    probing_angles: joinLines(item.probing_angles),
    aliases: joinLines(item.aliases),
    is_published: item.is_published,
    sort_order: item.sort_order,
  };
}

function preparePayload(form: FormData) {
  return {
    slug: form.slug.trim().toLowerCase(),
    display_name: form.display_name.trim(),
    common_bottlenecks: splitLines(form.common_bottlenecks),
    common_tools: splitLines(form.common_tools),
    probing_angles: splitLines(form.probing_angles),
    aliases: splitLines(form.aliases),
    is_published: form.is_published,
    sort_order: form.sort_order,
  };
}

export default function IndustryProbingManager({
  initialData,
}: {
  initialData: IndustryProbing[];
}) {
  const crud = useCrudManager<IndustryProbing, FormData>({
    initialData,
    emptyForm,
    actions,
    itemToForm,
    preparePayload,
  });

  return (
    <div>
      <AdminPageHeader
        eyebrow="Agent config"
        title="Industry probing"
        description="Per-industry context the chat agent uses to ask sharper, more relevant follow-up questions during intake. Add a new entry whenever you start serving a new vertical."
        actions={
          !crud.showForm ? (
            <button
              onClick={crud.openCreate}
              className="rounded-full bg-[#171d13] px-5 py-3 text-sm font-semibold text-[#f7f2e8] transition-transform hover:scale-[1.02]"
            >
              New industry
            </button>
          ) : null
        }
      />

      {crud.showForm && (
        <AdminPanel className="mt-8 mb-8">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-[#1d2318]">
                {crud.editingId ? "Edit industry" : "New industry"}
              </h2>
              <p className="mt-1 text-sm text-[#6c7467]">
                The chat agent uses this entry whenever a visitor&apos;s industry matches the slug or any alias.
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

          <form onSubmit={crud.handleSubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm text-[#6c7467]">
                  Slug (lowercase, used for matching)
                </label>
                <input
                  type="text"
                  value={crud.form.slug}
                  onChange={(e) => crud.updateField("slug", e.target.value)}
                  placeholder="property management"
                  className={INPUT_CLASS_NAME}
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-sm text-[#6c7467]">Display name</label>
                <input
                  type="text"
                  value={crud.form.display_name}
                  onChange={(e) => crud.updateField("display_name", e.target.value)}
                  placeholder="Property Management"
                  className={INPUT_CLASS_NAME}
                  required
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm text-[#6c7467]">
                Common bottlenecks{" "}
                <span className="text-xs text-[#9aa192]">(one per line)</span>
              </label>
              <textarea
                value={crud.form.common_bottlenecks}
                onChange={(e) => crud.updateField("common_bottlenecks", e.target.value)}
                rows={5}
                placeholder={"tenant communication and requests\nmaintenance work order tracking\nlease renewal management"}
                className={`${INPUT_CLASS_NAME} resize-y font-mono text-xs`}
              />
            </div>

            <div>
              <label className="mb-1 block text-sm text-[#6c7467]">
                Common tools{" "}
                <span className="text-xs text-[#9aa192]">(one per line)</span>
              </label>
              <textarea
                value={crud.form.common_tools}
                onChange={(e) => crud.updateField("common_tools", e.target.value)}
                rows={4}
                placeholder={"AppFolio\nBuildium\nspreadsheets"}
                className={`${INPUT_CLASS_NAME} resize-y font-mono text-xs`}
              />
            </div>

            <div>
              <label className="mb-1 block text-sm text-[#6c7467]">
                Probing angles{" "}
                <span className="text-xs text-[#9aa192]">(one per line — the agent picks one)</span>
              </label>
              <textarea
                value={crud.form.probing_angles}
                onChange={(e) => crud.updateField("probing_angles", e.target.value)}
                rows={4}
                placeholder={"How do maintenance requests flow from tenant to vendor to completion?\nWhat happens when a lease is approaching renewal?"}
                className={`${INPUT_CLASS_NAME} resize-y text-xs`}
              />
            </div>

            <div>
              <label className="mb-1 block text-sm text-[#6c7467]">
                Aliases{" "}
                <span className="text-xs text-[#9aa192]">(one per line — alternate names that map to this entry)</span>
              </label>
              <textarea
                value={crud.form.aliases}
                onChange={(e) => crud.updateField("aliases", e.target.value)}
                rows={3}
                placeholder={"real estate\nrental management"}
                className={`${INPUT_CLASS_NAME} resize-y font-mono text-xs`}
              />
            </div>

            <label className="flex items-center gap-2 text-sm text-[#27311f]">
              <input
                type="checkbox"
                checked={crud.form.is_published}
                onChange={(e) => crud.updateField("is_published", e.target.checked)}
                className="rounded"
              />
              Published (chat agent will use this entry)
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
                    ? "Update industry"
                    : "Create industry"}
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
              <th className="px-6 py-3 font-medium text-[#6c7467]">Industry</th>
              <th className="px-6 py-3 font-medium text-[#6c7467]">Aliases</th>
              <th className="px-6 py-3 font-medium text-[#6c7467]">Coverage</th>
              <th className="px-6 py-3 font-medium text-[#6c7467]">Status</th>
              <th className="px-6 py-3 text-right font-medium text-[#6c7467]">Actions</th>
            </tr>
          </thead>
          <tbody>
            {crud.items.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-[#6c7467]">
                  No industries yet. Run{" "}
                  <code className="rounded bg-[#f4eedd] px-1.5 py-0.5 text-xs">
                    npx tsx scripts/seed-industry-probing.ts
                  </code>{" "}
                  to seed the defaults.
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
                  <td className="px-6 py-4">
                    <p className="font-medium text-[#1d2318]">{item.display_name}</p>
                    <p className="mt-0.5 font-mono text-xs text-[#6c7467]">{item.slug}</p>
                  </td>
                  <td className="px-6 py-4 text-xs text-[#6c7467]">
                    {(item.aliases ?? []).slice(0, 4).join(", ") || "—"}
                    {(item.aliases ?? []).length > 4
                      ? ` +${(item.aliases ?? []).length - 4}`
                      : ""}
                  </td>
                  <td className="px-6 py-4 text-xs text-[#6c7467]">
                    {(item.common_bottlenecks ?? []).length} bottlenecks ·{" "}
                    {(item.common_tools ?? []).length} tools ·{" "}
                    {(item.probing_angles ?? []).length} angles
                  </td>
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
