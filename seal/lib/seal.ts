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

// Loading the whole file into an ArrayBuffer before hashing means a
// multi-gigabyte phone-camera video can hang or crash the tab, especially
// on the lower-end devices the QR pairing flow is meant to support. Cap it
// client-side; the server enforces the real limit independently.
export const MAX_SEAL_FILE_BYTES = 500 * 1024 * 1024; // 500 MB, matches backend MAX_UPLOAD_SIZE_MB

/** Hashes entirely in-browser. No network call. The file never leaves the device. */
export async function sealFile(file: File): Promise<SealResult> {
  if (file.size > MAX_SEAL_FILE_BYTES) {
    throw new Error(
      `This file is ${formatSize(file.size)}, which is larger than this browser can safely fingerprint (500 MB limit). Try a shorter export or a smaller file.`
    );
  }
  let sha256: string;
  if (crypto.subtle) {
    const buffer = await file.arrayBuffer();
    const digest = await crypto.subtle.digest("SHA-256", buffer);
    sha256 = Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  } else {
    // Fallback for non-HTTPS local network testing (mobile phones accessing HTTP IP)
    const CryptoJS = (await import("crypto-js")).default;
    const buffer = await file.arrayBuffer();
    const wordArr = CryptoJS.lib.WordArray.create(buffer as any);
    sha256 = CryptoJS.SHA256(wordArr).toString(CryptoJS.enc.Hex);
  }

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
