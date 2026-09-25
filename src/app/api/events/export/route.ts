import { readEvents } from "@/lib/events";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function csvEscape(value: string) {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export async function GET() {
  const events = await readEvents();
  const header = ["id", "receivedAt", "source", "event", "ticker", "interval", "side", "close", "payload"];
  const lines = [header.join(",")];

  for (const event of events) {
    const row = [
      event.id,
      event.receivedAt,
      event.source,
      String(event.payload.event ?? ""),
      String(event.payload.ticker ?? ""),
      String(event.payload.interval ?? ""),
      String(event.payload.side ?? event.payload.status ?? ""),
      String(event.payload.close ?? ""),
      JSON.stringify(event.payload),
    ].map((cell) => csvEscape(String(cell)));
    lines.push(row.join(","));
  }

  return new Response(lines.join("\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="signalrelay-events.csv"',
    },
  });
}
