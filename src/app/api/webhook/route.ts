import { saveEvent } from "@/lib/events";

export const runtime = "nodejs";

function unauthorized() {
  return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
}

export async function POST(request: Request) {
  const raw = await request.text();
  let payload: Record<string, unknown> = {};

  if (raw.trim()) {
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        payload = parsed as Record<string, unknown>;
      } else {
        payload = { message: raw };
      }
    } catch {
      payload = { message: raw };
    }
  }

  const expected = process.env.SIGNALRELAY_WEBHOOK_SECRET;
  if (expected) {
    const header = request.headers.get("x-signalrelay-secret");
    const bodySecret = typeof payload.secret === "string" ? payload.secret : "";
    if (header !== expected && bodySecret !== expected) return unauthorized();
  }

  const event = await saveEvent(raw, payload);
  return Response.json({ ok: true, id: event.id, source: event.source });
}
