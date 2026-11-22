import type { NextRequest } from "next/server";
import { body, fail, guardAdmin, json, refreshStore } from "@/lib/server/api";
import { query } from "@/lib/server/db";
import { readSettings } from "@/lib/server/catalog";
import type { StoreSettings } from "@/lib/types";

const s = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

export async function PUT(req: NextRequest) {
  const denied = await guardAdmin(req);
  if (denied) return denied;
  const patch = await body<Partial<StoreSettings>>(req);
  if (!patch) return fail("Invalid request");
  const current = await readSettings();
  const next: StoreSettings = {
    storeName: patch.storeName !== undefined ? s(patch.storeName, 60) || current.storeName : current.storeName,
    phone: patch.phone !== undefined ? s(patch.phone, 30) : current.phone,
    whatsapp: patch.whatsapp !== undefined ? s(patch.whatsapp, 30) : current.whatsapp,
    supportEmail: patch.supportEmail !== undefined ? s(patch.supportEmail, 160) : current.supportEmail,
    orderPrefix: patch.orderPrefix !== undefined ? s(patch.orderPrefix, 8).replace(/[^A-Za-z0-9]/g, "") || "DW" : current.orderPrefix,
  };
  await query("INSERT INTO settings (key, value) VALUES ('store', $1) ON CONFLICT (key) DO UPDATE SET value = $1", [JSON.stringify(next)]);
  refreshStore();
  return json({ settings: next });
}
