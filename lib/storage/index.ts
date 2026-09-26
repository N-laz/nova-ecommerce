import "server-only";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomBytes } from "node:crypto";
import { AppError } from "@/lib/errors";

export type StoredFile = { url: string; storageKey: string; provider: string };

/**
 * Storage abstraction for product media. `local` writes to ./storage/uploads and is
 * served by app/media/[...key]/route.ts (works in dev and `next start`). Add Cloudinary/S3 by implementing StorageProvider and selecting it via
 * STORAGE_PROVIDER — ProductImage already stores provider + storageKey.
 */
export interface StorageProvider {
  readonly name: string;
  upload(file: File, folder: string): Promise<StoredFile>;
}

const ALLOWED = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
  ["image/avif", "avif"],
]);
export const UPLOAD_DIR = path.join(process.cwd(), "storage", "uploads");
export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

class LocalStorage implements StorageProvider {
  readonly name = "local";
  async upload(file: File, folder: string): Promise<StoredFile> {
    const ext = ALLOWED.get(file.type);
    if (!ext) throw new AppError("Only JPG, PNG, WebP or AVIF images are allowed.");
    if (file.size > MAX_UPLOAD_BYTES) throw new AppError("Images must be 5 MB or smaller.");
    const buf = Buffer.from(await file.arrayBuffer());
    // Magic-byte sniffing — don't trust the declared MIME type.
    const sig = buf.subarray(0, 12).toString("hex");
    const isImage = sig.startsWith("ffd8ff") || sig.startsWith("89504e47") || (sig.startsWith("52494646") && buf.subarray(8, 12).toString() === "WEBP") || buf.subarray(4, 12).toString().startsWith("ftypavi");
    if (!isImage) throw new AppError("That file doesn't look like a valid image.");
    const key = `${folder}/${Date.now()}-${randomBytes(6).toString("hex")}.${ext}`;
    const dest = path.join(UPLOAD_DIR, key);
    await mkdir(path.dirname(dest), { recursive: true });
    await writeFile(dest, buf);
    return { url: `/media/${key}`, storageKey: key, provider: this.name };
  }
}

export function getStorage(): StorageProvider {
  // STORAGE_PROVIDER=cloudinary|s3 → return the matching implementation here.
  return new LocalStorage();
}
