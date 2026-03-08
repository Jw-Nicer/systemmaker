import test from "node:test";
import assert from "node:assert/strict";
import { buildStorageUploadPath } from "@/lib/firebase/storage-upload-path";

test("buildStorageUploadPath prefixes uploads and sanitizes filenames", () => {
  const path = buildStorageUploadPath("admin/case-studies", "My Hero Image.PNG");

  assert.match(path, /^admin\/case-studies\/\d+-my-hero-image\.png$/);
});
