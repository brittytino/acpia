/**
 * Browser-side SHA-256 hashing. The file never leaves the device.
 * Uses WebCrypto API — no dependencies, native, fast.
 */

export interface SealResult {
  sha256: string;
  sizeBytes: number;
  mimeType: string;
  filename: string;
  sealedAt: string;
}

/** Hashes entirely in-browser. No network call. The file never leaves the device. */
export async function sealFile(file: File): Promise<SealResult> {
  const buffer = await file.arrayBuffer();
  const digest = await crypto.subtle.digest("SHA-256", buffer);
  const sha256 = Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  return {
    sha256,
    sizeBytes: file.size,
    mimeType: file.type || "application/octet-stream",
    filename: file.name,
    sealedAt: new Date().toISOString(),
  };
}

/** Format SHA-256 in 4-character groups for readability. */
export function formatHash(sha256: string): string {
  return sha256.match(/.{1,16}/g)?.join("  ") ?? sha256;
}

/** Format file size human-readable. */
export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
