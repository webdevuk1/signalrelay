import { readEvents } from "@/lib/events";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json({ events: await readEvents(), storage: process.env.UPSTASH_REDIS_REST_URL ? "redis" : "file" });
}
