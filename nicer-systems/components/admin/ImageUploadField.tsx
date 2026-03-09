"use client";

import Image from "next/image";
import { useId, useState, type ChangeEvent } from "react";
import { INPUT_CLASS_NAME } from "@/hooks/useCrudManager";
import { uploadImageFile } from "@/lib/firebase/storage-upload";

const PREVIEW_IMAGE_HOSTS = new Set([
  "firebasestorage.googleapis.com",
  "storage.googleapis.com",
  "images.unsplash.com",
]);

function canUseNextImage(src: string) {
  if (src.startsWith("/")) return true;

  try {
    const url = new URL(src);
    return url.protocol === "https:" && PREVIEW_IMAGE_HOSTS.has(url.hostname);
  } catch {
    return false;
  }
}

export default function ImageUploadField({
  label,
  value,
  onChange,
  pathPrefix,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  pathPrefix: string;
}) {
  const inputId = useId();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError("");

    try {
      const url = await uploadImageFile(pathPrefix, file);
      onChange(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <label htmlFor={inputId} className="block text-sm text-[#6c7467]">
          {label}
        </label>
        <label
          htmlFor={inputId}
          className="cursor-pointer rounded-full border border-[#d0c8b8] bg-[#fbf7ef] px-4 py-2 text-xs font-medium text-[#27311f] transition-colors hover:bg-white"
        >
          {uploading ? "Uploading..." : "Upload Image"}
        </label>
      </div>

      <input
        id={inputId}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        disabled={uploading}
        className="sr-only"
      />

      <input
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={INPUT_CLASS_NAME}
        placeholder="Paste an image URL or upload a file"
      />

      {value ? (
        <div className="overflow-hidden rounded-[20px] border border-[#ddd5c7] bg-white/70 p-3">
          {canUseNextImage(value) ? (
            <Image
              src={value}
              alt={`${label} preview`}
              width={1200}
              height={320}
              unoptimized
              className="h-40 w-full rounded-[16px] object-cover"
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={value}
              alt={`${label} preview`}
              className="h-40 w-full rounded-[16px] object-cover"
            />
          )}
        </div>
      ) : null}

      {error ? (
        <p className="text-sm text-[#9d3f3f]">{error}</p>
      ) : (
        <p className="text-xs text-[#6c7467]">
          Uploads go to Firebase Storage. PNG, JPG, WebP, and similar image formats are supported.
        </p>
      )}
    </div>
  );
}
