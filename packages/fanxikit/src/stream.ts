export type StreamChunk = string | Uint8Array;

export interface StreamOptions {
  status?: number;
  headers?: HeadersInit;
}

export function streamResponse(chunks: AsyncIterable<StreamChunk>, options: StreamOptions = {}): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      for await (const chunk of chunks) {
        if (typeof chunk === "string") {
          controller.enqueue(encoder.encode(chunk));
        } else {
          controller.enqueue(chunk);
        }
      }
      controller.close();
    },
  });

  const headers = new Headers(options.headers);
  if (!headers.has("content-type")) {
    headers.set("content-type", "text/html; charset=utf-8");
  }
  return new Response(stream, {
    status: options.status ?? 200,
    headers,
  });
}

export async function* splitHtmlStream(html: string, chunkSize = 1024): AsyncGenerator<string> {
  if (chunkSize <= 0) {
    yield html;
    return;
  }
  for (let i = 0; i < html.length; i += chunkSize) {
    yield html.slice(i, i + chunkSize);
  }
}
