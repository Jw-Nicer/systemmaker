"use client";

import type { FAQ } from "@/types/faq";
import {
  createFAQ,
  deleteFAQ,
  reorderFAQs,
  toggleFAQPublished,
  updateFAQ,
} from "@/lib/actions/faqs";
import {
  AdminPageHeader,
  AdminPanel,
  AdminPill,
} from "@/components/admin/AdminPrimitives";
import { useCrudManager, INPUT_CLASS_NAME } from "@/hooks/useCrudManager";

type FormData = {
  question: string;
  answer: string;
  is_published: boolean;
  sort_order: number;
};

const emptyForm: FormData = {
  question: "",
  answer: "",
  is_published: false,
  sort_order: 0,
};

const actions = {
  create: createFAQ,
  update: updateFAQ,
  remove: deleteFAQ,
  toggle: toggleFAQPublished,
  reorder: reorderFAQs,
};

function itemToForm(item: FAQ): FormData {
  return {
    question: item.question,
    answer: item.answer,
    is_published: item.is_published,
    sort_order: item.sort_order,
  };
}

export default function FAQsManager({
  initialData,
}: {
  initialData: FAQ[];
}) {
  const crud = useCrudManager<FAQ, FormData>({
    initialData,
    emptyForm,
    actions,
    itemToForm,
  });

  return (
    <div>
      <AdminPageHeader
        eyebrow="Content"
        title="FAQs"
        description="Keep public answers concise, up to date, and aligned with current offer language."
        actions={
          !crud.showForm ? (
            <button
              onClick={crud.openCreate}
              className="rounded-full bg-[#171d13] px-5 py-3 text-sm font-semibold text-[#f7f2e8] transition-transform hover:scale-[1.02]"
            >
              New FAQ
            </button>
          ) : null
        }
      />

      {crud.showForm && (
        <AdminPanel className="mt-8 mb-8">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-[#1d2318]">
                {crud.editingId ? "Edit FAQ" : "New FAQ"}
              </h2>
              <p className="mt-1 text-sm text-[#6c7467]">
                Keep answers short, direct, and consistent with the live site.
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
            <div>
              <label className="mb-1 block text-sm text-[#6c7467]">Question</label>
              <input
                type="text"
                value={crud.form.question}
                onChange={(e) => crud.updateField("question", e.target.value)}
                className={INPUT_CLASS_NAME}
                required
              />
            </div>

            <div>
              <label className="mb-1 block text-sm text-[#6c7467]">Answer</label>
              <textarea
                value={crud.form.answer}
                onChange={(e) => crud.updateField("answer", e.target.value)}
                rows={4}
                className={`${INPUT_CLASS_NAME} resize-y`}
                required
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
                {crud.saving ? "Saving..." : crud.editingId ? "Update FAQ" : "Create FAQ"}
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
              <th className="px-6 py-3 font-medium text-[#6c7467]">Question</th>
              <th className="px-6 py-3 font-medium text-[#6c7467]">Status</th>
              <th className="px-6 py-3 text-right font-medium text-[#6c7467]">Actions</th>
            </tr>
          </thead>
          <tbody>
            {crud.items.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-12 text-center text-[#6c7467]">
                  No FAQs yet. Create your first one to get started.
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
                    <p className="font-medium text-[#1d2318]">{item.question}</p>
                    <p className="mt-0.5 line-clamp-1 text-xs text-[#6c7467]">{item.answer}</p>
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
