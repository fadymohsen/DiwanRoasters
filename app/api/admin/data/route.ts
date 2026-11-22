import type { NextRequest } from "next/server";
import { fail, guardAdmin, json } from "@/lib/server/api";
import { getAdminData } from "@/lib/server/catalog";

export async function GET(req: NextRequest) {
  const denied = await guardAdmin(req);
  if (denied) return denied;
  try {
    return json(await getAdminData());
  } catch (e) {
    console.error("admin data failed", e);
    return fail("Could not load the data.", 500);
  }
}
