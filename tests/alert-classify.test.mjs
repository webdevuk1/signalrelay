import assert from "node:assert/strict";
import test from "node:test";

// Mirrors src/lib/alert-classify.ts for zero-config node --test
function eventName(payload) {
  return String(payload.event ?? "").toLowerCase();
}

function isGoldenBounce(payload) {
  if (payload.goldenZoneBounce === true || payload.goldenZoneBounce === "true") return true;
  return eventName(payload) === "golden_zone_bounce";
}

function isFibTouch(payload) {
  return eventName(payload).startsWith("fib_") && eventName(payload).includes("touch");
}

function classifyAlert(payload) {
  const event = eventName(payload);
  if (isGoldenBounce(payload) || event === "golden_zone_touch") return "golden";
  if (isFibTouch(payload)) return "fib";
  if (/^(tp[1-6]|sl)_hit$/.test(event)) return "level";
  if (event.startsWith("burst_")) return "burst";
  if (event.includes("entry")) return "entry";
  return "other";
}

function detectSource(payload, raw) {
  const event = String(payload.event ?? "").toLowerCase();
  if (event.startsWith("fib_") || event === "golden_zone_bounce" || event.startsWith("golden_zone")) {
    return "momentum-master";
  }
  const hint = String(payload.source ?? "").toLowerCase();
  if (hint.includes("hope")) return "hope-failure";
  if (hint.includes("momentum")) return "momentum-master";
  if (/hope/i.test(raw)) return "hope-failure";
  return "unknown";
}

test("golden bounce", () => {
  assert.equal(classifyAlert({ event: "golden_zone_bounce", goldenZoneBounce: true }), "golden");
});

test("fib touch", () => {
  assert.equal(classifyAlert({ event: "fib_100_touch" }), "fib");
});

test("detectSource", () => {
  assert.equal(detectSource({ event: "fib_1618_touch", source: "momentum-master" }, "{}"), "momentum-master");
  assert.equal(detectSource({ source: "hope-failure", event: "burst_up" }, "{}"), "hope-failure");
});
