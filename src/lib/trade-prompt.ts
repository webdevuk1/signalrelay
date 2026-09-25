import type { RelayEvent } from "@/lib/events";

export type PromptStyle = "review" | "risk" | "scalp" | "swing";

function line(label: string, value: unknown) {
  if (value === undefined || value === null || value === "") return null;
  return `- **${label}:** ${String(value)}`;
}

const styleIntro: Record<PromptStyle, string> = {
  review:
    "Review this TradingView alert for a discretionary trade. Say clearly if it is worth taking, what would confirm it, and what would invalidate it. Keep it practical, not hype.",
  risk:
    "Risk-first review: position size sanity, stop placement, R:R to TP1–TP3, what news/session risk applies, and hard invalidation. Say PASS or WAIT if edge is unclear.",
  scalp:
    "This is a scalp-style alert (fast timeframe). Focus on spread/slippage, immediate structure, and whether chasing is justified. One paragraph max.",
  swing:
    "This is a swing-style alert (higher timeframe). Focus on HTF trend, zone quality, patience, and whether this is early or late. One paragraph max.",
};

export function buildTradeAnalysisPrompt(event: RelayEvent, style: PromptStyle = "review"): string {
  const p = event.payload;
  const chart = String(p.interval ?? "—");
  const sections: string[] = [
    styleIntro[style],
    "",
    "## Signal",
    line("Script", event.source) ?? "",
    line("Event", p.event) ?? "",
    line("Side / bias", p.side ?? p.status) ?? "",
    line("Strategy mode", p.strategy) ?? "",
    line("Received (UTC)", event.receivedAt) ?? "",
    "",
    "## Symbol & bar",
    line("Ticker", p.ticker) ?? "",
    line("Exchange", p.exchange) ?? "",
    line("Interval", chart) ?? "",
    line("Bar time", p.time) ?? "",
    line("Open", p.open) ?? "",
    line("High", p.high) ?? "",
    line("Low", p.low) ?? "",
    line("Close", p.close) ?? "",
    line("Volume", p.volume) ?? "",
    "",
    "## Structure",
    line("Trend", p.trend) ?? "",
    line("Golden zone", p.goldenZone) ?? "",
    line("Golden zone top", p.goldenZoneTop) ?? "",
    line("Golden zone bottom", p.goldenZoneBottom) ?? "",
    line("Fib 38.2%", p.fib382) ?? "",
    line("Fib 61.8%", p.fib618) ?? "",
    line("Fib 78.6%", p.fib786) ?? "",
    line("Fib 100%", p.fib100) ?? "",
    line("Fib 161.8%", p.fib1618) ?? "",
    line("Fib 261.8%", p.fib2618) ?? "",
    line("Fib -0.27", p.fibNeg027) ?? "",
    line("Fib -0.618", p.fibNeg618) ?? "",
    "",
    "## Risk levels (from script)",
    line("Entry", p.entry) ?? "",
    line("Stop", p.sl) ?? "",
    line("TP1", p.tp1) ?? "",
    line("TP2", p.tp2) ?? "",
    line("TP3", p.tp3) ?? "",
    line("TP4", p.tp4) ?? "",
    line("TP5", p.tp5) ?? "",
    line("TP6", p.tp6) ?? "",
    "",
    "## Indicators & confluence",
    line("RSI", p.rsi) ?? "",
    line("MFI", p.mfi) ?? "",
    line("ATR", p.atr) ?? "",
    line("ADX", p.adx) ?? "",
    line("Confidence %", p.confidence) ?? "",
    line("Confluence stars", p.confluence) ?? "",
    line("High volume", p.volumeHigh) ?? "",
    line("Bull RSI div", p.bullDivRSI) ?? "",
    line("Bear RSI div", p.bearDivRSI) ?? "",
    line("Order block dir", p.orderBlockDir) ?? "",
    line("Burst high", p.burstHigh) ?? "",
    line("Burst low", p.burstLow) ?? "",
    line("Win rate (script table)", p.winRate) ?? "",
    line("Last outcomes", p.lastOutcomes) ?? "",
    "",
    "## Notes from script",
    p.note ? String(p.note).replace(/\s*\|\s*/g, "\n") : "",
    "",
    "## Raw payload (JSON)",
    "```json",
    JSON.stringify(p, null, 2),
    "```",
  ];

  return sections.filter((row) => row !== "").join("\n");
}
