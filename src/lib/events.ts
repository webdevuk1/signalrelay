import fs from "fs";
import path from "path";
import { Redis } from "@upstash/redis";

export type RelaySource = "momentum-master" | "hope-failure" | "unknown";

export type RelayEvent = {
  id: string;
  receivedAt: string;
  source: RelaySource;
  payload: Record<string, unknown>;
};

const filePath = path.join(process.cwd(), "data", "events.json");
const redisKey = "signalrelay:events";
export const maxEvents = 200;

function getRedis(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  return new Redis({ url, token });
}

export function detectSource(payload: Record<string, unknown>, raw: string): RelaySource {
  const event = String(payload.event ?? "").toLowerCase();
  if (event.startsWith("fib_") || event === "golden_zone_bounce" || event.startsWith("golden_zone")) {
    return "momentum-master";
  }

  const hint = String(payload.source ?? payload.script ?? "").toLowerCase();
  if (hint.includes("hope") || hint.includes("failure") || hint.includes("burst")) {
    return "hope-failure";
  }
  if (hint.includes("momentum")) return "momentum-master";

  const blob = `${raw}\n${JSON.stringify(payload)}`;
  if (/hope\s*&\s*failure|burst reversal|short bias|long bias|get short|get long/i.test(blob)) {
    return "hope-failure";
  }
  if (/momentum master|long entry|short entry/i.test(blob)) return "momentum-master";
  return "unknown";
}

function readEventsFromFile(): RelayEvent[] {
  try {
    const parsed = JSON.parse(fs.readFileSync(filePath, "utf8")) as RelayEvent[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeEventsToFile(events: RelayEvent[]) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(events, null, 2));
}

async function readEventsFromRedis(redis: Redis): Promise<RelayEvent[]> {
  const rows = await redis.lrange<string>(redisKey, 0, maxEvents - 1);
  const events: RelayEvent[] = [];
  for (const row of rows ?? []) {
    try {
      const parsed = typeof row === "string" ? JSON.parse(row) : row;
      if (parsed && typeof parsed === "object" && "id" in parsed) {
        events.push(parsed as RelayEvent);
      }
    } catch {
      // skip corrupt row
    }
  }
  return events;
}

export async function readEvents(): Promise<RelayEvent[]> {
  const redis = getRedis();
  if (redis) return readEventsFromRedis(redis);
  return readEventsFromFile();
}

export async function saveEvent(rawBody: string, payload: Record<string, unknown>): Promise<RelayEvent> {
  const cleaned = { ...payload };
  delete cleaned.secret;

  const event: RelayEvent = {
    id: crypto.randomUUID(),
    receivedAt: new Date().toISOString(),
    source: detectSource(cleaned, rawBody),
    payload: Object.keys(cleaned).length > 0 ? cleaned : { message: rawBody },
  };

  const redis = getRedis();
  if (redis) {
    await redis.lpush(redisKey, JSON.stringify(event));
    await redis.ltrim(redisKey, 0, maxEvents - 1);
    return event;
  }

  const next = [event, ...readEventsFromFile()].slice(0, maxEvents);
  writeEventsToFile(next);
  return event;
}

export async function clearEvents(): Promise<void> {
  const redis = getRedis();
  if (redis) {
    await redis.del(redisKey);
    return;
  }
  writeEventsToFile([]);
}
