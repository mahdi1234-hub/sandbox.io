import { NextRequest, NextResponse } from "next/server";

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || "http://127.0.0.1:11434";
const MODEL = process.env.OLLAMA_MODEL || "tinyllama";

export async function GET() {
  try {
    const res = await fetch(`${OLLAMA_BASE_URL}/api/tags`, {
      signal: AbortSignal.timeout(3000),
    });
    if (res.ok) {
      return NextResponse.json({ status: "ok", model: MODEL });
    }
    return NextResponse.json({ status: "error", message: "Ollama not responding" }, { status: 503 });
  } catch {
    return NextResponse.json({ status: "error", message: "Ollama not reachable" }, { status: 503 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: "messages array is required" },
        { status: 400 }
      );
    }

    const ollamaMessages = messages.map((m: { role: string; content: string }) => ({
      role: m.role,
      content: m.content,
    }));

    // Add system prompt
    const systemMessage = {
      role: "system",
      content:
        "You are Novera AI, an elegant and knowledgeable assistant. You provide clear, thoughtful, and well-structured responses. You are helpful, concise, and maintain a refined tone. Format your responses with proper paragraphs when needed.",
    };

    const response = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: MODEL,
        messages: [systemMessage, ...ollamaMessages],
        stream: true,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { error: `Ollama error: ${errorText}` },
        { status: response.status }
      );
    }

    // Stream the response back using SSE format
    const encoder = new TextEncoder();
    const reader = response.body?.getReader();

    if (!reader) {
      return NextResponse.json(
        { error: "No response body from Ollama" },
        { status: 500 }
      );
    }

    const stream = new ReadableStream({
      async start(controller) {
        const decoder = new TextDecoder();
        let buffer = "";

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() || "";

            for (const line of lines) {
              if (!line.trim()) continue;
              try {
                const parsed = JSON.parse(line);
                if (parsed.message?.content) {
                  controller.enqueue(
                    encoder.encode(
                      `data: ${JSON.stringify({ content: parsed.message.content })}\n\n`
                    )
                  );
                }
                if (parsed.done) {
                  controller.enqueue(encoder.encode("data: [DONE]\n\n"));
                }
              } catch {
                // skip malformed lines
              }
            }
          }

          // Process remaining buffer
          if (buffer.trim()) {
            try {
              const parsed = JSON.parse(buffer);
              if (parsed.message?.content) {
                controller.enqueue(
                  encoder.encode(
                    `data: ${JSON.stringify({ content: parsed.message.content })}\n\n`
                  )
                );
              }
            } catch {
              // ignore
            }
          }

          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        } catch (err) {
          controller.error(err);
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
