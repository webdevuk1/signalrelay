export type AlertKind = "golden" | "fib" | "entry" | "level" | "burst" | "other";

export function eventName(payload: Record<string, unknown>) {
  return String(payload.event ?? "").toLowerCase();
}

export function isGoldenBounce(payload: Record<string, unknown>) {
  if (payload.goldenZoneBounce === true || payload.goldenZoneBounce === "true") return true;
  const event = eventName(payload);
  return event === "golden_zone_bounce";
}

export function isGoldenTouch(payload: Record<string, unknown>) {
  const event = eventName(payload);
  return event === "golden_zone_touch" || event === "golden_zone_in_zone";
}

export function isFibTouch(payload: Record<string, unknown>) {
  const event = eventName(payload);
  return event.startsWith("fib_") && event.includes("touch");
}

export function isLevelHit(payload: Record<string, unknown>) {
  const event = eventName(payload);
  return /^(tp[1-6]|sl)_hit$/.test(event) || event.includes("_hit");
}

export function isEntry(payload: Record<string, unknown>) {
  const event = eventName(payload);
  const side = String(payload.side ?? payload.status ?? "").toLowerCase();
  if (event.includes("entry") || event.includes("get_long") || event.includes("get_short")) return true;
  if (side.includes("long") || side.includes("short")) {
    if (isGoldenBounce(payload) || isFibTouch(payload) || isLevelHit(payload)) return false;
    if (event.includes("burst") || event.includes("bias")) return false;
    return Boolean(payload.entry) || event.includes("entry");
  }
  return Boolean(payload.entry) && event.includes("entry");
}

export function isBurst(payload: Record<string, unknown>) {
  const event = eventName(payload);
  return event.startsWith("burst_") || event.includes("bias");
}

export function classifyAlert(payload: Record<string, unknown>): AlertKind {
  if (isGoldenBounce(payload) || isGoldenTouch(payload)) return "golden";
  if (isFibTouch(payload)) return "fib";
  if (isLevelHit(payload)) return "level";
  if (isBurst(payload)) return "burst";
  if (isEntry(payload)) return "entry";
  return "other";
}

export function alertLabel(payload: Record<string, unknown>) {
  const event = eventName(payload);
  if (isGoldenBounce(payload)) return "Golden bounce";
  if (isGoldenTouch(payload)) return "Golden zone touch";
  if (event === "fib_100_touch") return "Fib 100% touch";
  if (event === "fib_1618_touch") return "Fib 161.8% touch";
  if (event === "fib_2618_touch") return "Fib 261.8% touch";
  if (event === "fib_618_touch") return "Fib 61.8% touch";
  if (event === "fib_786_touch") return "Fib 78.6% touch";
  if (event === "fib_neg027_touch") return "Fib -0.27 touch";
  if (event === "fib_neg618_touch") return "Fib -0.618 touch";
  if (event === "fib_neg10_touch") return "Fib -1.0 touch";
  if (/^tp[1-6]_hit$/.test(event)) return event.replace("_hit", "").toUpperCase() + " hit";
  if (event === "sl_hit") return "Stop hit";
  if (event === "burst_up") return "Burst up";
  if (event === "burst_down") return "Burst down";
  return String(payload.side ?? payload.status ?? payload.event ?? "Alert");
}
