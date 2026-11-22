import type { NextRequest } from "next/server";
import { body, guardAdmin, json } from "@/lib/server/api";
import { query } from "@/lib/server/db";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = await guardAdmin(req);
  if (denied) return denied;
  const { id } = await params;
  const d = await body<{ read?: boolean }>(req);
  await query("UPDATE messages SET read = $2 WHERE id = $1", [id, d?.read !== false]);
  return json({ ok: true });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = await guardAdmin(req);
  if (denied) return denied;
  const { id } = await params;
  await query("DELETE FROM messages WHERE id = $1", [id]);
  return json({ ok: true });
}
