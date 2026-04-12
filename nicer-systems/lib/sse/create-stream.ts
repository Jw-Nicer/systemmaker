/**
 * Shared SSE stream factory.
 *
 * Extracted from app/api/agent/chat/route.ts so that both the chat and
 * audit routes (and any future SSE endpoint) use the same implementation.
 */

export function sseEncode(type: string, data: Record<string, unknown>): string {
  return `event: ${type}\ndata: ${JSON.stringify(data)}\n\n`;
}

/**
 * Create a ReadableStream<Uint8Array> that emits Server-Sent Events.
 *
 * The `handler` receives `write(eventType, data)` and `close()` callbacks.
 * If the handler throws, an `error` event is emitted before closing.
 */
export function createSSEStream(
  handler: (
    write: (type: string, data: Record<string, unknown>) => void,
    close: () => void
  ) => Promise<void>,
  onClose?: () => void
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  let finalized = false;

  const finalize = () => {
    if (finalized) return;
    finalized = true;
    onClose?.();
  };

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      const write = (type: string, data: Record<string, unknown>) => {
        try {
          controller.enqueue(encoder.encode(sseEncode(type, data)));
        } catch {
          // Stream may have been closed by the client
        }
      };

      const close = () => {
        try {
          write("done", {});
          controller.close();
        } catch {
          // Already closed
        } finally {
          finalize();
        }
      };

      try {
        await handler(write, close);
      } catch (err) {
        console.error("SSE handler error:", err);
        write("error", { message: "Something went wrong. Please try again." });
        close();
      }
    },
    cancel() {
      finalize();
    },
  });
}

/** Standard SSE response headers. */
export const SSE_HEADERS = {
  "Content-Type": "text/event-stream",
  "Cache-Control": "no-cache, no-transform",
  Connection: "keep-alive",
  "X-Accel-Buffering": "no",
} as const;
