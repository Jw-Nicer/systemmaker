"use client";

import type { Offer, OfferCtaAction } from "@/types/offer";
import {
  createOffer,
  deleteOffer,
  reorderOffers,
  toggleOfferPublished,
  updateOffer,
} from "@/lib/actions/offers";
import {
  AdminPageHeader,
  AdminPanel,
  AdminPill,
} from "@/components/admin/AdminPrimitives";
import { useCrudManager, INPUT_CLASS_NAME } from "@/hooks/useCrudManager";

type FormData = {
  name: string;
  price: string;
  description: string;
  features: string;
  cta: string;
  cta_action: OfferCtaAction | "";
  highlighted: boolean;
  is_published: boolean;
  sort_order: number;
};

const emptyForm: FormData = {
  name: "",
  price: "",
  description: "",
  features: "",
  cta: "Book a Scoping Call",
  cta_action: "",
  highlighted: false,
  is_published: false,
  sort_order: 0,
};

const actions = {
  create: createOffer,
  update: updateOffer,
  remove: deleteOffer,
  toggle: toggleOfferPublished,
  reorder: reorderOffers,
};

function itemToForm(item: Offer): FormData {
  return {
    name: item.name,
    price: item.price,
    description: item.description,
    features: item.features.join("\n"),
    cta: item.cta,
    cta_action: item.cta_action ?? "",
    highlighted: item.highlighted,
    is_published: item.is_published,
    sort_order: item.sort_order,
  };
}

function preparePayload(form: FormData) {
  const { cta_action, ...rest } = form;
  return {
    ...rest,
    features: form.features
      .split("\n")
      .map((f) => f.trim())
      .filter(Boolean),
    ...(cta_action ? { cta_action } : {}),
  };
}

export default function OffersManager({
  initialData,
}: {
  initialData: Offer[];
}) {
  const crud = useCrudManager<Offer, FormData>({
    initialData,
    emptyForm,
    actions,
    itemToForm,
    preparePayload,
  });

  return (
    <div>
      <AdminPageHeader
        eyebrow="Growth"
        title="Offers"
        description="Manage pricing tiers, feature lists, and the CTA language shown on the site."
        actions={
          !crud.showForm ? (
            <button
              onClick={crud.openCreate}
              className="rounded-full bg-[#171d13] px-5 py-3 text-sm font-semibold text-[#f7f2e8] transition-transform hover:scale-[1.02]"
            >
              New Offer
            </button>
          ) : null
        }
      />

      {crud.showForm && (
        <AdminPanel className="mt-8 mb-8">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-[#1d2318]">
                {crud.editingId ? "Edit Offer" : "New Offer"}
              </h2>
              <p className="mt-1 text-sm text-[#6c7467]">
                Align price framing and CTA copy with the live pricing section.
              </p>
            </div>
            <div className="flex items-center gap-2">
              {crud.form.highlighted ? <AdminPill tone="blue">Featured</AdminPill> : null}
              <AdminPill tone={crud.form.is_published ? "green" : "neutral"}>
                {crud.form.is_published ? "Published" : "Draft"}
              </AdminPill>
            </div>
          </div>

          {crud.error && (
            <div className="mb-4 rounded-[18px] border border-red-200 bg-[#fff4f2] p-3 text-sm text-[#9d3f3f]">
              {crud.error}
            </div>
          )}

          <form onSubmit={crud.handleSubmit} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm text-[#6c7467]">Name</label>
                <input
                  type="text"
                  value={crud.form.name}
                  onChange={(e) => crud.updateField("name", e.target.value)}
                  placeholder="e.g. Starter"
                  className={INPUT_CLASS_NAME}
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-sm text-[#6c7467]">Price</label>
                <input
                  type="text"
                  value={crud.form.price}
                  onChange={(e) => crud.updateField("price", e.target.value)}
                  placeholder="e.g. One workflow"
                  className={INPUT_CLASS_NAME}
                  required
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm text-[#6c7467]">Description</label>
              <input
                type="text"
                value={crud.form.description}
                onChange={(e) => crud.updateField("description", e.target.value)}
                className={INPUT_CLASS_NAME}
                required
              />
            </div>

            <div>
              <label className="mb-1 block text-sm text-[#6c7467]">Features (one per line)</label>
              <textarea
                value={crud.form.features}
                onChange={(e) => crud.updateField("features", e.target.value)}
                rows={5}
                placeholder={"End-to-end process map\nSystem of record setup\nBasic live dashboard"}
                className={`${INPUT_CLASS_NAME} resize-y`}
                required
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm text-[#6c7467]">CTA Text</label>
                <input
                  type="text"
                  value={crud.form.cta}
                  onChange={(e) => crud.updateField("cta", e.target.value)}
                  className={INPUT_CLASS_NAME}
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-sm text-[#6c7467]">CTA Action</label>
                <select
                  value={crud.form.cta_action}
                  onChange={(e) =>
                    crud.updateField("cta_action", e.target.value as OfferCtaAction | "")
                  }
                  className={INPUT_CLASS_NAME}
                >
                  <option value="">Auto (route by CTA text)</option>
                  <option value="booking">Open booking modal</option>
                  <option value="audit">Link to /audit</option>
                  <option value="contact">Link to /contact</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2 text-sm text-[#27311f]">
                <input
                  type="checkbox"
                  checked={crud.form.highlighted}
                  onChange={(e) => crud.updateField("highlighted", e.target.checked)}
                  className="rounded"
                />
                Highlighted tier
              </label>
              <label className="flex items-center gap-2 text-sm text-[#27311f]">
                <input
                  type="checkbox"
                  checked={crud.form.is_published}
                  onChange={(e) => crud.updateField("is_published", e.target.checked)}
                  className="rounded"
                />
                Published
              </label>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={crud.saving}
                className="rounded-full bg-[#171d13] px-5 py-3 text-sm font-semibold text-[#f7f2e8] transition-transform hover:scale-[1.02] disabled:opacity-50"
              >
                {crud.saving ? "Saving..." : crud.editingId ? "Update Offer" : "Create Offer"}
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
              <th className="px-6 py-3 font-medium text-[#6c7467]">Price</th>
              <th className="px-6 py-3 font-medium text-[#6c7467]">Status</th>
              <th className="px-6 py-3 text-right font-medium text-[#6c7467]">Actions</th>
            </tr>
          </thead>
          <tbody>
            {crud.items.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-[#6c7467]">
                  No offers yet. Create your first pricing tier.
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
                    <span className="font-medium text-[#1d2318]">{item.name}</span>
                    {item.highlighted ? (
                      <span className="ml-2 rounded-full bg-[#e8f0df] px-2 py-0.5 text-xs text-[#4f6032]">
                        Featured
                      </span>
                    ) : null}
                  </td>
                  <td className="px-6 py-4 text-[#596351]">{item.price}</td>
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
