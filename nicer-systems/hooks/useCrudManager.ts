"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

export interface CrudActions {
  create: (data: unknown) => Promise<{ success: boolean; error?: string }>;
  update: (id: string, data: unknown) => Promise<{ success: boolean; error?: string }>;
  remove: (id: string) => Promise<{ success: boolean; error?: string }>;
  toggle: (id: string, published: boolean) => Promise<{ success: boolean; error?: string }>;
  reorder: (ids: string[]) => Promise<{ success: boolean; error?: string } | void>;
}

interface CrudItem {
  id: string;
  is_published: boolean;
}

interface UseCrudManagerOptions<T extends CrudItem, F> {
  initialData: T[];
  emptyForm: F;
  actions: CrudActions;
  itemToForm: (item: T) => F;
  preparePayload?: (form: F) => unknown;
}

export function useCrudManager<T extends CrudItem, F>({
  initialData,
  emptyForm,
  actions,
  itemToForm,
  preparePayload,
}: UseCrudManagerOptions<T, F>) {
  const router = useRouter();
  const [items, setItems] = useState<T[]>(initialData);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<F>(emptyForm);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const dragItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);

  useEffect(() => {
    setItems(initialData);
  }, [initialData]);

  function openCreate() {
    setEditingId(null);
    setForm({ ...emptyForm, sort_order: items.length } as F);
    setShowForm(true);
    setError("");
  }

  function openEdit(item: T) {
    setEditingId(item.id);
    setForm(itemToForm(item));
    setShowForm(true);
    setError("");
  }

  function cancelForm() {
    setShowForm(false);
    setEditingId(null);
    setError("");
  }

  function updateField(field: keyof F, value: unknown) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");

    const payload = preparePayload ? preparePayload(form) : form;

    const result = editingId
      ? await actions.update(editingId, payload)
      : await actions.create(payload);

    setSaving(false);

    if (!result.success) {
      setError(result.error ?? "Something went wrong");
      return;
    }

    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm);
    router.refresh();
  }

  async function handleTogglePublished(item: T) {
    const result = await actions.toggle(item.id, !item.is_published);
    if (result.success) {
      setItems((prev) =>
        prev.map((i) =>
          i.id === item.id ? { ...i, is_published: !i.is_published } : i
        )
      );
    }
  }

  async function handleDelete(id: string) {
    const result = await actions.remove(id);
    if (result.success) {
      setItems((prev) => prev.filter((i) => i.id !== id));
      setDeleteConfirm(null);
    }
  }

  function handleDragStart(index: number) {
    dragItem.current = index;
  }

  function handleDragEnter(index: number) {
    dragOverItem.current = index;
  }

  async function handleDragEnd() {
    if (dragItem.current === null || dragOverItem.current === null) return;
    if (dragItem.current === dragOverItem.current) return;

    const previous = [...items];
    const reordered = [...items];
    const [removed] = reordered.splice(dragItem.current, 1);
    reordered.splice(dragOverItem.current, 0, removed);

    setItems(reordered);
    dragItem.current = null;
    dragOverItem.current = null;

    try {
      const result = await actions.reorder(reordered.map((i) => i.id));
      if (result && !result.success) {
        setItems(previous);
        setError(result.error ?? "Failed to reorder. Changes reverted.");
      }
    } catch {
      setItems(previous);
      setError("Failed to reorder. Changes reverted.");
    }
  }

  return {
    items,
    showForm,
    editingId,
    form,
    error,
    saving,
    deleteConfirm,
    setDeleteConfirm,
    openCreate,
    openEdit,
    cancelForm,
    updateField,
    handleSubmit,
    handleTogglePublished,
    handleDelete,
    handleDragStart,
    handleDragEnter,
    handleDragEnd,
  };
}

export const INPUT_CLASS_NAME =
  "w-full rounded-[18px] border border-[#d7d0c1] bg-[#fbf7ef] px-4 py-3 text-sm text-[#1d2318] outline-none transition-colors focus:border-[#92a07a]";
