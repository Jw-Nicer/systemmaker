"use client";

import type { Testimonial } from "@/types/testimonial";
import {
  createTestimonial,
  deleteTestimonial,
  reorderTestimonials,
  toggleTestimonialPublished,
  updateTestimonial,
} from "@/lib/actions/testimonials";
import {
  AdminPageHeader,
  AdminPanel,
  AdminPill,
} from "@/components/admin/AdminPrimitives";
import ImageUploadField from "@/components/admin/ImageUploadField";
import { useCrudManager, INPUT_CLASS_NAME } from "@/hooks/useCrudManager";

type FormData = {
  name: string;
  role: string;
  company: string;
  quote: string;
  avatar_url: string;
  is_published: boolean;
  sort_order: number;
};

const emptyForm: FormData = {
  name: "",
  role: "",
  company: "",
  quote: "",
  avatar_url: "",
  is_published: false,
  sort_order: 0,
};

const actions = {
  create: createTestimonial,
  update: updateTestimonial,
  remove: deleteTestimonial,
  toggle: toggleTestimonialPublished,
  reorder: reorderTestimonials,
};

function itemToForm(item: Testimonial): FormData {
  return {
    name: item.name,
    role: item.role,
    company: item.company,
    quote: item.quote,
    avatar_url: item.avatar_url,
    is_published: item.is_published,
    sort_order: item.sort_order,
  };
}

export default function TestimonialsManager({
  initialData,
}: {
  initialData: Testimonial[];
}) {
  const crud = useCrudManager<Testimonial, FormData>({
    initialData,
    emptyForm,
    actions,
    itemToForm,
  });

  return (
    <div>
      <AdminPageHeader
        eyebrow="Content"
        title="Testimonials"
        description="Manage published quotes, speaker details, and testimonial order."
        actions={
          !crud.showForm ? (
            <button
              onClick={crud.openCreate}
              className="rounded-full bg-[#171d13] px-5 py-3 text-sm font-semibold text-[#f7f2e8] transition-transform hover:scale-[1.02]"
            >
              New Testimonial
            </button>
          ) : null
        }
      />

      {crud.showForm && (
        <AdminPanel className="mt-8 mb-8">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-[#1d2318]">
                {crud.editingId ? "Edit Testimonial" : "New Testimonial"}
              </h2>
              <p className="mt-1 text-sm text-[#6c7467]">
                Keep attribution and quote quality aligned with the public proof sections.
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
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <label className="mb-1 block text-sm text-[#6c7467]">Name</label>
                <input
                  type="text"
                  value={crud.form.name}
                  onChange={(e) => crud.updateField("name", e.target.value)}
                  className={INPUT_CLASS_NAME}
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-sm text-[#6c7467]">Role</label>
                <input
                  type="text"
                  value={crud.form.role}
                  onChange={(e) => crud.updateField("role", e.target.value)}
                  placeholder="e.g. Operations Manager"
                  className={INPUT_CLASS_NAME}
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-sm text-[#6c7467]">Company</label>
                <input
                  type="text"
                  value={crud.form.company}
                  onChange={(e) => crud.updateField("company", e.target.value)}
                  className={INPUT_CLASS_NAME}
                  required
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm text-[#6c7467]">Quote</label>
              <textarea
                value={crud.form.quote}
                onChange={(e) => crud.updateField("quote", e.target.value)}
                rows={4}
                className={`${INPUT_CLASS_NAME} resize-y`}
                required
              />
            </div>

            <div>
              <ImageUploadField
                label="Avatar"
                value={crud.form.avatar_url}
                onChange={(value) => crud.updateField("avatar_url", value)}
                pathPrefix="admin/testimonials"
              />
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
                    ? "Update Testimonial"
                    : "Create Testimonial"}
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
              <th className="px-6 py-3 font-medium text-[#6c7467]">Name</th>
              <th className="px-6 py-3 font-medium text-[#6c7467]">Company</th>
              <th className="px-6 py-3 font-medium text-[#6c7467]">Quote</th>
              <th className="px-6 py-3 font-medium text-[#6c7467]">Status</th>
              <th className="px-6 py-3 text-right font-medium text-[#6c7467]">Actions</th>
            </tr>
          </thead>
          <tbody>
            {crud.items.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-[#6c7467]">
                  No testimonials yet. Create your first one to get started.
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
                  <td className="px-6 py-4 font-medium text-[#1d2318]">
                    <div>{item.name}</div>
                    <div className="text-xs text-[#6c7467]">{item.role}</div>
                  </td>
                  <td className="px-6 py-4 text-[#596351]">{item.company}</td>
                  <td className="max-w-xs px-6 py-4 text-[#596351]">
                    {item.quote.length > 80
                      ? `${item.quote.slice(0, 80)}...`
                      : item.quote}
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
