import fs from "fs";
import path from "path";

export type RelaySource = "momentum-master" | "hope-failure" | "unknown";

export type RelayEvent = {
  id: string;
  receivedAt: string;
  source: RelaySource;
  payload: Record<string, unknown>;
};

const filePath = path.join(process.cwd(), "data", "events.json");
const maxEvents = 200;

function detectSource(payload: Record<string, unknown>, raw: string): RelaySource {
  const event = String(payload.event ?? "").toLowerCase();
  if (event === "golden_zone_bounce") return "momentum-master";

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

export function readEvents(): RelayEvent[] {
  try {
    const parsed = JSON.parse(fs.readFileSync(filePath, "utf8")) as RelayEvent[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveEvent(rawBody: string, payload: Record<string, unknown>): RelayEvent {
  const cleaned = { ...payload };
  delete cleaned.secret;

  const event: RelayEvent = {
    id: crypto.randomUUID(),
    receivedAt: new Date().toISOString(),
    source: detectSource(cleaned, rawBody),
    payload: Object.keys(cleaned).length > 0 ? cleaned : { message: rawBody },
  };

  const next = [event, ...readEvents()].slice(0, maxEvents);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(next, null, 2));
  return event;
}
