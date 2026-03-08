"use client";

import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { auth, storage } from "@/lib/firebase/client";
import { buildStorageUploadPath } from "@/lib/firebase/storage-upload-path";

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

export async function uploadImageFile(pathPrefix: string, file: File) {
  if (!auth.currentUser) {
    throw new Error("You must be signed in to upload media.");
  }

  if (!file.type.startsWith("image/")) {
    throw new Error("Please choose an image file.");
  }

  if (file.size > MAX_UPLOAD_BYTES) {
    throw new Error("Image must be 10 MB or smaller.");
  }

  const uploadRef = ref(storage, buildStorageUploadPath(pathPrefix, file.name));
  const snapshot = await uploadBytes(uploadRef, file, {
    contentType: file.type,
  });

  return getDownloadURL(snapshot.ref);
}
