import type { NextRequest } from "next/server";
import { put } from "@vercel/blob";
import { fail, guardAdmin, json } from "@/lib/server/api";

const TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/avif": "avif", "image/gif": "gif" };
// Vercel functions accept bodies up to 4.5 MB
const MAX = 4 * 1024 * 1024;

/** Product and category photos go to Vercel Blob; the page keeps the public address. */
export async function POST(req: NextRequest) {
  const denied = await guardAdmin(req);
  if (denied) return denied;
  if (!process.env.BLOB_READ_WRITE_TOKEN) return fail("Image storage is not connected (BLOB_READ_WRITE_TOKEN).", 500);
  let file: File | null = null;
  try {
    const form = await req.formData();
    const f = form.get("file");
    file = f instanceof File ? f : null;
  } catch {
    return fail("Send the image as a file upload.");
  }
  if (!file) return fail("Choose an image.");
  const ext = TYPES[file.type];
  if (!ext) return fail("Use a JPG, PNG, WebP, AVIF or GIF image.");
  if (file.size > MAX) return fail("This image is over 4 MB. Make it smaller and try again.", 413);
  try {
    const base = file.name.replace(/\.[^.]+$/, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "image";
    const blob = await put(`diwan/${base}.${ext}`, file, { access: "public", addRandomSuffix: true, contentType: file.type });
    return json({ url: blob.url });
  } catch (e) {
    console.error("upload failed", e);
    return fail("Could not upload the image.", 500);
  }
}
