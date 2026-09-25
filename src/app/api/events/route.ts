import { readEvents } from "@/lib/events";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET() {
  return Response.json({ events: readEvents() });
}
