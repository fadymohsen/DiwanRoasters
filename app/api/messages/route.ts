import { after, type NextRequest } from "next/server";
import { sendContactEmail } from "@/lib/server/email";
import { allow, body, clientIp, fail, guardOrigin, json } from "@/lib/server/api";
import { query } from "@/lib/server/db";

/** Contact page and the business enquiry form. */
export async function POST(req: NextRequest) {
  const bad = guardOrigin(req);
  if (bad) return bad;
  const data = await body<{ name: string; contact: string; topic: string; body: string; website?: string }>(req);
  if (!data) return fail("Invalid request");
  if (data.website) return json({ ok: true });
  const t = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");
  const m = { name: t(data.name, 160), contact: t(data.contact, 160), topic: t(data.topic, 40), body: t(data.body, 4000) };
  if (!m.name || !m.contact) return fail("Name and a way to reach you are required.");
  try {
    if (!(await allow(`msg:${clientIp(req)}`, 5, 10 * 60_000))) return fail("Too many messages. Please try again later.", 429);
    const id = `MSG-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`;
    await query("INSERT INTO messages (id, created_at, name, contact, topic, body) VALUES ($1,$2,$3,$4,$5,$6)", [id, Date.now(), m.name, m.contact, m.topic, m.body]);
    after(() => sendContactEmail(m));
    return json({ ok: true });
  } catch (e) {
    console.error("message failed", e);
    return fail("Could not send the message.", 500);
  }
}
