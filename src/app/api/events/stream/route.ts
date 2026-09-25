import { readEvents } from "@/lib/events";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const encoder = new TextEncoder();
  let closed = false;

  const stream = new ReadableStream({
    async start(controller) {
      const push = async () => {
        if (closed) return;
        try {
          const events = await readEvents();
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ events })}\n\n`));
        } catch {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ events: [], error: true })}\n\n`));
        }
      };

      await push();
      const timer = setInterval(() => {
        void push();
      }, 2000);

      const cleanup = () => {
        closed = true;
        clearInterval(timer);
      };

      (controller as { _cleanup?: () => void })._cleanup = cleanup;
    },
    cancel() {
      closed = true;
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
