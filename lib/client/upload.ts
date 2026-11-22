const MAX_EDGE = 2000;

/** Shrink big photos in the browser first: phone photos are often over the 4 MB upload limit and far larger than a product page needs. */
async function prepare(file: File): Promise<File> {
  if (file.type === "image/gif" || !file.type.startsWith("image/")) return file;
  try {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, MAX_EDGE / Math.max(bmp.width, bmp.height));
    if (scale === 1 && file.size < 1_500_000) return file;
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bmp.width * scale);
    canvas.height = Math.round(bmp.height * scale);
    canvas.getContext("2d")!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((ok) => canvas.toBlob(ok, "image/webp", 0.86));
    if (!blob || blob.size >= file.size) return file;
    return new File([blob], file.name.replace(/\.[^.]+$/, "") + ".webp", { type: "image/webp" });
  } catch {
    return file;
  }
}

/** Send one image to the store's image storage and get back its public address. */
export async function uploadImage(file: File): Promise<string> {
  const body = new FormData();
  body.append("file", await prepare(file));
  const res = await fetch("/api/admin/upload", { method: "POST", body });
  if (res.status === 401) {
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.href = "/admin/login";
    throw new Error("Signed out");
  }
  const out = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
  if (!res.ok || !out.url) throw new Error(out.error || "Upload failed");
  return out.url;
}
