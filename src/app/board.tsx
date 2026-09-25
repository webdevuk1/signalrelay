"use client";

import { useEffect, useMemo, useState } from "react";
import {
  alertLabel,
  classifyAlert,
  isEntry as isEntryAlert,
  isFibTouch,
  isGoldenBounce,
  isGoldenTouch,
  isLevelHit,
  type AlertKind,
} from "@/lib/alert-classify";
import { buildTradeAnalysisPrompt, type PromptStyle } from "@/lib/trade-prompt";

type RelaySource = "momentum-master" | "hope-failure" | "unknown";
type Horizon = "scalp" | "intraday" | "swing" | "all";
type Kind = "all" | AlertKind;
type Retention = "all" | "24h" | "7d";
type ScriptFilter = "all" | RelaySource;

type RelayEvent = {
  id: string;
  receivedAt: string;
  source: RelaySource;
  payload: Record<string, unknown>;
};

const horizons: { id: Horizon; label: string; hint: string }[] = [
  { id: "scalp", label: "Scalp", hint: "1m–5m" },
  { id: "intraday", label: "Intraday", hint: "15m–2H" },
  { id: "swing", label: "Swing", hint: "4H–1W" },
  { id: "all", label: "All", hint: "every chart" },
];

const kinds: { id: Kind; label: string }[] = [
  { id: "all", label: "All alerts" },
  { id: "golden", label: "Golden" },
  { id: "fib", label: "Fib touch" },
  { id: "level", label: "TP/SL hit" },
  { id: "entry", label: "Entries" },
  { id: "burst", label: "Burst" },
];

const scripts: { id: ScriptFilter; label: string }[] = [
  { id: "all", label: "Both scripts" },
  { id: "momentum-master", label: "Momentum" },
  { id: "hope-failure", label: "Hope" },
];

const detailOrder = [
  "ticker",
  "exchange",
  "interval",
  "time",
  "timenow",
  "open",
  "high",
  "low",
  "close",
  "volume",
  "event",
  "side",
  "strategy",
  "status",
  "trend",
  "goldenZone",
  "goldenZoneTop",
  "goldenZoneBottom",
  "fib382",
  "fib618",
  "fib786",
  "fib100",
  "fib1618",
  "fib2618",
  "fibNeg027",
  "fibNeg618",
  "fib5",
  "entry",
  "sl",
  "tp1",
  "tp2",
  "tp3",
  "tp4",
  "tp5",
  "tp6",
  "rsi",
  "mfi",
  "atr",
  "adx",
  "confidence",
  "confluence",
  "volumeHigh",
  "bullDivRSI",
  "bearDivRSI",
  "orderBlockDir",
  "burstHigh",
  "burstLow",
  "winRate",
  "lastOutcomes",
  "note",
];

function text(value: unknown) {
  if (value === undefined || value === null || value === "") return "";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function isLit(value: unknown) {
  if (value === undefined || value === null || value === "") return false;
  if (value === false || value === "false" || value === 0 || value === "0") return false;
  return true;
}

function chartLabel(raw: unknown) {
  const value = String(raw ?? "").trim().toUpperCase();
  const named: Record<string, string> = {
    "1": "1m",
    "3": "3m",
    "5": "5m",
    "15": "15m",
    "30": "30m",
    "45": "45m",
    "60": "1H",
    "120": "2H",
    "180": "3H",
    "240": "4H",
    D: "1D",
    "1D": "1D",
    W: "1W",
    "1W": "1W",
    M: "1M",
    "1M": "1M",
  };
  if (named[value]) return named[value];
  if (/^\d+$/.test(value)) {
    const minutes = Number(value);
    if (minutes < 60) return `${minutes}m`;
    if (minutes % 60 === 0) return `${minutes / 60}H`;
  }
  return value || "—";
}

function horizonOf(label: string): Exclude<Horizon, "all"> | "other" {
  if (["1m", "3m", "5m"].includes(label)) return "scalp";
  if (["15m", "30m", "45m", "1H", "2H", "3H"].includes(label)) return "intraday";
  if (["4H", "1D", "1W", "1M"].includes(label)) return "swing";
  return "other";
}

function matchesHorizon(label: string, horizon: Horizon) {
  if (horizon === "all") return true;
  const bucket = horizonOf(label);
  return bucket === "other" || bucket === horizon;
}

function formatStamp(iso: string) {
  return new Intl.DateTimeFormat(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    month: "short",
    day: "numeric",
  }).format(new Date(iso));
}

function ago(iso: string) {
  const seconds = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return `${Math.floor(seconds)}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  return `${Math.floor(seconds / 86400)}d`;
}

function TimeAgo({ iso }: { iso: string }) {
  const [relative, setRelative] = useState<string | null>(null);

  useEffect(() => {
    const tick = () => setRelative(ago(iso));
    tick();
    const id = setInterval(tick, 15000);
    return () => clearInterval(id);
  }, [iso]);

  return <span suppressHydrationWarning>{relative ?? formatStamp(iso)}</span>;
}

function sideTone(value: unknown) {
  const side = String(value ?? "").toLowerCase();
  if (side.includes("long") || side === "buy" || side.includes("get long")) return "text-emerald-300";
  if (side.includes("short") || side === "sell" || side.includes("get short")) return "text-rose-300";
  return "text-zinc-200";
}

function badgeClass(label: string, kind: AlertKind) {
  if (kind === "golden") return "bg-amber-400/20 text-amber-100 ring-amber-300/40";
  if (kind === "fib") return "bg-cyan-400/15 text-cyan-100 ring-cyan-300/35";
  if (kind === "level") return "bg-violet-400/15 text-violet-100 ring-violet-300/35";
  if (kind === "burst") return "bg-fuchsia-400/15 text-fuchsia-100 ring-fuchsia-300/35";
  const bucket = horizonOf(label);
  if (bucket === "swing") return "bg-orange-400/15 text-orange-100 ring-orange-300/30";
  if (bucket === "intraday") return "bg-sky-400/15 text-sky-100 ring-sky-300/30";
  return "bg-white/5 text-zinc-400 ring-white/10";
}

function cardGlow(kind: AlertKind) {
  if (kind === "golden") return "shadow-[0_0_24px_rgba(251,191,36,0.12)]";
  if (kind === "fib") return "shadow-[0_0_20px_rgba(34,211,238,0.1)]";
  if (kind === "entry") return "shadow-[0_0_20px_rgba(52,211,153,0.1)]";
  return "";
}

function matchesRetention(receivedAt: string, retention: Retention) {
  if (retention === "all") return true;
  const ageMs = Date.now() - new Date(receivedAt).getTime();
  if (retention === "24h") return ageMs <= 86400000;
  return ageMs <= 86400000 * 7;
}

export function Board() {
  const [events, setEvents] = useState<RelayEvent[]>([]);
  const [live, setLive] = useState(false);
  const [horizon, setHorizon] = useState<Horizon>("intraday");
  const [kind, setKind] = useState<Kind>("all");
  const [script, setScript] = useState<ScriptFilter>("all");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [promptStyle, setPromptStyle] = useState<PromptStyle>("review");
  const [retention, setRetention] = useState<Retention>("all");
  const [storage, setStorage] = useState<"redis" | "file" | "unknown">("unknown");
  const [showAllLanes, setShowAllLanes] = useState(false);

  useEffect(() => {
    let stop = false;

    const apply = (body: { events?: RelayEvent[]; storage?: string }) => {
      if (stop) return;
      setEvents(body.events ?? []);
      setStorage(body.storage === "redis" ? "redis" : body.storage === "file" ? "file" : "unknown");
      setLive(true);
    };

    const load = async () => {
      try {
        const response = await fetch("/api/events", { cache: "no-store" });
        if (!response.ok) return;
        apply((await response.json()) as { events: RelayEvent[]; storage?: string });
      } catch {
        if (!stop) setLive(false);
      }
    };

    let es: EventSource | null = null;
    if (typeof EventSource !== "undefined") {
      es = new EventSource("/api/events/stream");
      es.onmessage = (message) => {
        try {
          apply(JSON.parse(message.data) as { events: RelayEvent[] });
        } catch {
          void load();
        }
      };
      es.onerror = () => {
        es?.close();
        es = null;
        void load();
      };
    } else {
      void load();
    }

    const timer = setInterval(() => {
      if (!es) void load();
    }, 5000);

    return () => {
      stop = true;
      es?.close();
      clearInterval(timer);
    };
  }, []);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return events.filter((event) => {
      const chart = chartLabel(event.payload.interval);
      const ticker = String(event.payload.ticker ?? "").toLowerCase();
      const alertKind = classifyAlert(event.payload);
      if (script !== "all" && event.source !== script) return false;
      if (!matchesHorizon(chart, horizon)) return false;
      if (!matchesRetention(event.receivedAt, retention)) return false;
      if (kind !== "all" && alertKind !== kind) return false;
      if (needle && !ticker.includes(needle) && !chart.toLowerCase().includes(needle)) return false;
      return true;
    });
  }, [events, horizon, kind, query, script, retention]);

  const lanes = useMemo(() => {
    if (showAllLanes) return filtered.slice(0, 40);
    const seen = new Set<string>();
    const rows: RelayEvent[] = [];
    for (const event of filtered) {
      const key = `${event.source}|${String(event.payload.ticker ?? "—")}|${chartLabel(event.payload.interval)}`;
      if (seen.has(key)) continue;
      seen.add(key);
      rows.push(event);
    }
    return rows;
  }, [filtered, showAllLanes]);

  const selected = filtered.find((event) => event.id === selectedId) ?? filtered[0] ?? null;
  const filled = selected
    ? detailOrder.filter(
        (key) =>
          isLit(selected.payload[key]) ||
          (key === "goldenZone" && (isGoldenBounce(selected.payload) || isGoldenTouch(selected.payload))),
      )
    : [];

  return (
    <div className="mx-auto flex min-h-full w-full max-w-7xl flex-1 flex-col gap-5 px-4 py-6 sm:px-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] tracking-[0.32em] text-amber-200/70 uppercase">SignalRelay</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">Alert desk</h1>
        </div>
        <p className="text-xs text-zinc-500">
          <span className={`mr-2 inline-block h-1.5 w-1.5 rounded-full ${live ? "bg-emerald-400" : "bg-zinc-600"}`} />
          {filtered.length} showing · {events.length} stored
          {storage === "redis" ? " · Redis" : storage === "file" ? " · local file (dev)" : ""}
        </p>
      </header>

      <div className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-[#10131a] p-3">
        <div className="flex flex-wrap gap-2">
          {horizons.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setHorizon(item.id)}
              className={`rounded-full px-3 py-1.5 text-left text-xs ${
                horizon === item.id ? "bg-amber-300 text-black" : "bg-white/5 text-zinc-300"
              }`}
            >
              <span className="font-medium">{item.label}</span>
              <span className={`ml-2 ${horizon === item.id ? "text-black/60" : "text-zinc-500"}`}>{item.hint}</span>
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {kinds.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setKind(item.id)}
              className={`rounded-full px-3 py-1 text-xs ${kind === item.id ? "bg-white text-black" : "text-zinc-400"}`}
            >
              {item.label}
            </button>
          ))}
          <span className="mx-1 hidden h-4 w-px bg-white/10 sm:block" />
          {scripts.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setScript(item.id)}
              className={`rounded-full px-3 py-1 text-xs ${script === item.id ? "text-amber-200" : "text-zinc-500"}`}
            >
              {item.label}
            </button>
          ))}
          <select
            value={retention}
            onChange={(e) => setRetention(e.target.value as Retention)}
            className="rounded-full border border-white/10 bg-black/30 px-3 py-1.5 text-xs text-zinc-300"
          >
            <option value="all">All time</option>
            <option value="24h">Last 24h</option>
            <option value="7d">Last 7d</option>
          </select>
          <button
            type="button"
            onClick={() => setShowAllLanes((v) => !v)}
            className={`rounded-full px-3 py-1 text-xs ${showAllLanes ? "bg-white/15 text-zinc-100" : "text-zinc-500"}`}
          >
            {showAllLanes ? "Latest per lane" : "All lanes"}
          </button>
          <a
            href="/api/events/export"
            className="rounded-full border border-white/10 px-3 py-1 text-xs text-zinc-400 hover:text-zinc-200"
          >
            Export CSV
          </a>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Symbol"
            className="ml-auto w-36 rounded-full border border-white/10 bg-black/30 px-3 py-1.5 text-xs text-zinc-100 outline-none placeholder:text-zinc-600"
          />
        </div>
      </div>

      <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(280px,0.8fr)]">
        <section className="flex min-h-0 flex-col gap-4">
          <div>
            <h2 className="mb-2 text-[11px] tracking-[0.18em] text-zinc-500 uppercase">One card per symbol and timeframe</h2>
            <div className="relay-scroll flex gap-2 overflow-x-auto pb-1">
              {lanes.length === 0 ? (
                <p className="text-sm text-zinc-500">Nothing in this view yet.</p>
              ) : (
                lanes.map((event) => {
                  const chart = chartLabel(event.payload.interval);
                  const alertKind = classifyAlert(event.payload);
                  const label = alertLabel(event.payload);
                  const active = selected?.id === event.id;
                  return (
                    <button
                      key={event.id}
                      type="button"
                      onClick={() => setSelectedId(event.id)}
                      className={`min-w-44 shrink-0 rounded-2xl border px-3 py-3 text-left ${
                        active ? "border-amber-300/50 bg-white/10" : "border-white/10 bg-[#12151c]"
                      } ${cardGlow(alertKind)} ${horizonOf(chart) === "scalp" ? "opacity-80" : ""}`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className={`rounded-full px-2 py-0.5 text-[10px] ring-1 ${badgeClass(chart, alertKind)}`}>{chart}</span>
                        <span className="text-[10px] text-zinc-500"><TimeAgo iso={event.receivedAt} /></span>
                      </div>
                      <p className="mt-2 truncate text-sm font-medium">{text(event.payload.ticker) || "Chart"}</p>
                      <p
                        className={`mt-1 text-xs ${
                          alertKind === "golden"
                            ? "text-amber-200"
                            : alertKind === "fib"
                              ? "text-cyan-200"
                              : alertKind === "level"
                                ? "text-violet-200"
                                : sideTone(event.payload.side ?? event.payload.status)
                        }`}
                      >
                        {label}
                      </p>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          <div className="min-h-0 flex-1 rounded-2xl border border-white/10 bg-[#12151c] p-3">
            <h2 className="mb-2 text-[11px] tracking-[0.18em] text-zinc-500 uppercase">Tape</h2>
            <ul className="relay-scroll max-h-[28rem] space-y-1 overflow-auto pr-1">
              {filtered.map((event) => {
                const chart = chartLabel(event.payload.interval);
                const alertKind = classifyAlert(event.payload);
                const label = alertLabel(event.payload);
                return (
                  <li key={event.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(event.id)}
                      className={`flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left text-sm ${
                        selected?.id === event.id ? "bg-white/10" : "hover:bg-white/5"
                      }`}
                    >
                      <span className={`w-10 shrink-0 rounded-md px-1.5 py-0.5 text-center text-[10px] ring-1 ${badgeClass(chart, alertKind)}`}>
                        {chart}
                      </span>
                      <span className="w-24 shrink-0 truncate">{text(event.payload.ticker) || "—"}</span>
                      <span
                        className={`min-w-0 flex-1 truncate ${
                          alertKind === "golden"
                            ? "text-amber-200"
                            : alertKind === "fib"
                              ? "text-cyan-200"
                              : alertKind === "level"
                                ? "text-violet-200"
                                : sideTone(event.payload.side)
                        }`}
                      >
                        {label}
                      </span>
                      <span className="shrink-0 text-[11px] text-zinc-500"><TimeAgo iso={event.receivedAt} /></span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>

        <aside className="rounded-2xl border border-white/10 bg-[#12151c] p-4">
          {selected ? (
            <>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-lg font-medium">{text(selected.payload.ticker) || "Alert"}</p>
                  <p className="mt-1 text-xs text-zinc-500">
                    {chartLabel(selected.payload.interval)} · <TimeAgo iso={selected.receivedAt} /> · {selected.source}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-2">
                <p className={`text-sm ${classifyAlert(selected.payload) === "golden" ? "text-amber-200" : sideTone(selected.payload.side)}`}>
                  {alertLabel(selected.payload)}
                </p>
                  <select
                    value={promptStyle}
                    onChange={(e) => setPromptStyle(e.target.value as PromptStyle)}
                    className="rounded-full border border-white/10 bg-black/40 px-2 py-1 text-[10px] text-zinc-300"
                  >
                    <option value="review">Review</option>
                    <option value="risk">Risk</option>
                    <option value="scalp">Scalp</option>
                    <option value="swing">Swing</option>
                  </select>
                  <button
                    type="button"
                    onClick={async () => {
                      const prompt = buildTradeAnalysisPrompt(selected, promptStyle);
                      try {
                        await navigator.clipboard.writeText(prompt);
                        setCopied(true);
                        window.setTimeout(() => setCopied(false), 2000);
                      } catch {
                        window.prompt("Copy this prompt for Cursor:", prompt);
                      }
                    }}
                    className="rounded-full border border-amber-300/40 bg-amber-400/10 px-3 py-1 text-[11px] font-medium text-amber-100 hover:bg-amber-400/20"
                  >
                    {copied ? "Copied" : "Copy Cursor prompt"}
                  </button>
                </div>
              </div>
              <dl className="mt-4 grid grid-cols-2 gap-2">
                {filled.map((key) => {
                  const golden =
                    (key === "goldenZone" || key.startsWith("goldenZone")) &&
                    (isGoldenBounce(selected.payload) || isGoldenTouch(selected.payload));
                  const fibHit = key.startsWith("fib") && isFibTouch(selected.payload);
                  const entry = key === "entry" && isEntryAlert(selected.payload);
                  const level = isLevelHit(selected.payload) && (key === "entry" || key === "sl" || key.startsWith("tp"));
                  return (
                    <div
                      key={key}
                      className={`rounded-xl px-3 py-2 ${key === "note" ? "col-span-2" : ""} ${
                        golden
                          ? "border border-amber-300/50 bg-amber-400/15 shadow-[0_0_18px_rgba(251,191,36,0.18)]"
                          : fibHit
                            ? "border border-cyan-300/40 bg-cyan-400/10"
                            : entry
                              ? "border border-emerald-300/40 bg-emerald-400/10"
                              : level
                                ? "border border-violet-300/40 bg-violet-400/10"
                                : "bg-black/30"
                      }`}
                    >
                      <dt className="text-[10px] tracking-wide text-zinc-500 uppercase">{key}</dt>
                      <dd className={`mt-1 text-sm ${key === "note" ? "whitespace-pre-wrap" : "truncate"} ${golden ? "text-amber-50" : "text-zinc-100"}`}>
                        {key === "interval" ? chartLabel(selected.payload.interval) : key === "goldenZone" && golden ? "BOUNCE" : text(selected.payload[key])}
                      </dd>
                    </div>
                  );
                })}
              </dl>
            </>
          ) : (
            <p className="text-sm text-zinc-500">Pick a timeframe. Higher charts stay separate from 1-minute noise.</p>
          )}
        </aside>
      </div>
    </div>
  );
}
