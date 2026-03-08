function sanitizeFileName(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9.]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function buildStorageUploadPath(pathPrefix: string, fileName: string) {
  const timestamp = Date.now();
  const normalizedPrefix = pathPrefix.replace(/^\/+|\/+$/g, "");
  return `${normalizedPrefix}/${timestamp}-${sanitizeFileName(fileName)}`;
}
