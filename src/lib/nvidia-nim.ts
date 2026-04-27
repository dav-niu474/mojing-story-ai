/**
 * NVIDIA NIM API Client
 * Calls NVIDIA NIM's OpenAI-compatible API for chat completions
 * Endpoint: https://integrate.api.nvidia.com/v1/chat/completions
 */

const NVIDIA_NIM_BASE_URL = 'https://integrate.api.nvidia.com/v1';

interface NimMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface NimChatCompletionOptions {
  model: string;
  messages: NimMessage[];
  temperature?: number;
  top_p?: number;
  max_tokens?: number;
  stream?: boolean;
}

interface NimChatCompletionResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * Get NVIDIA API key from environment
 */
function getNvidiaApiKey(): string {
  const key = process.env.NVIDIA_API_KEY;
  if (!key) {
    throw new Error('NVIDIA_API_KEY environment variable is not set');
  }
  return key;
}

/**
 * Call NVIDIA NIM chat completions API
 */
export async function nvidiaNimChat(
  options: NimChatCompletionOptions,
): Promise<NimChatCompletionResponse> {
  const apiKey = getNvidiaApiKey();

  const response = await fetch(`${NVIDIA_NIM_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      'Accept': 'application/json',
    },
    body: JSON.stringify({
      model: options.model,
      messages: options.messages,
      temperature: options.temperature ?? 0.7,
      top_p: options.top_p ?? 0.9,
      max_tokens: options.max_tokens ?? 4096,
      stream: false,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Unknown error');
    let errorMessage: string;
    try {
      const errorJson = JSON.parse(errorText);
      errorMessage = errorJson.error?.message || errorJson.detail || errorText;
    } catch {
      errorMessage = errorText;
    }
    throw new Error(`NVIDIA NIM API error (${response.status}): ${errorMessage}`);
  }

  const data = await response.json() as NimChatCompletionResponse;
  return data;
}

/**
 * Simplified helper: send messages and get AI response text
 */
export async function nvidiaNimGenerate(
  model: string,
  systemPrompt: string,
  userMessages: Array<{ role: 'user' | 'assistant'; content: string }>,
  options?: { temperature?: number; max_tokens?: number },
): Promise<string> {
  const messages: NimMessage[] = [
    { role: 'system', content: systemPrompt },
    ...userMessages.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
  ];

  const result = await nvidiaNimChat({
    model,
    messages,
    temperature: options?.temperature ?? 0.7,
    max_tokens: options?.max_tokens ?? 4096,
  });

  return result.choices[0]?.message?.content || '';
}

// ─── Streaming Support ─────────────────────────────────────────────

/** A single chunk emitted during streaming */
export interface StreamChunk {
  content: string;
  done: boolean;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * Call NVIDIA NIM chat completions API with streaming enabled.
 *
 * Returns a ReadableStream<StreamChunk> that yields content deltas
 * as they arrive from the NVIDIA NIM SSE endpoint.
 *
 * SSE format (OpenAI-compatible):
 *   data: {"choices":[{"delta":{"content":"text"}}]}\n\n
 *   data: [DONE]\n\n
 */
export function nvidiaNimStream(
  options: NimChatCompletionOptions,
): ReadableStream<StreamChunk> {
  const apiKey = getNvidiaApiKey();

  return new ReadableStream<StreamChunk>({
    async start(controller) {
      try {
        const response = await fetch(`${NVIDIA_NIM_BASE_URL}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
            'Accept': 'text/event-stream',
          },
          body: JSON.stringify({
            model: options.model,
            messages: options.messages,
            temperature: options.temperature ?? 0.7,
            top_p: options.top_p ?? 0.9,
            max_tokens: options.max_tokens ?? 4096,
            stream: true,
          }),
        });

        if (!response.ok) {
          const errorText = await response.text().catch(() => 'Unknown error');
          let errorMessage: string;
          try {
            const errorJson = JSON.parse(errorText);
            errorMessage = errorJson.error?.message || errorJson.detail || errorText;
          } catch {
            errorMessage = errorText;
          }
          controller.error(new Error(`NVIDIA NIM API error (${response.status}): ${errorMessage}`));
          return;
        }

        const reader = response.body?.getReader();
        if (!reader) {
          controller.error(new Error('No response body from NVIDIA NIM API'));
          return;
        }

        const decoder = new TextDecoder();
        let buffer = ''; // Accumulate partial SSE lines

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          // SSE events are separated by double newlines
          const parts = buffer.split('\n\n');
          // Keep the last (potentially incomplete) part in the buffer
          buffer = parts.pop() || '';

          for (const part of parts) {
            const lines = part.split('\n');
            for (const line of lines) {
              // Only process lines that start with "data: "
              if (!line.startsWith('data: ')) continue;

              const data = line.slice(6).trim();

              // Check for the [DONE] marker
              if (data === '[DONE]') {
                controller.enqueue({ content: '', done: true });
                controller.close();
                return;
              }

              // Skip empty data lines
              if (!data) continue;

              try {
                const parsed = JSON.parse(data) as {
                  choices?: Array<{
                    delta?: { content?: string; role?: string };
                    finish_reason?: string | null;
                  }>;
                  usage?: {
                    prompt_tokens: number;
                    completion_tokens: number;
                    total_tokens: number;
                  };
                };

                // Extract content delta from the first choice
                const choice = parsed.choices?.[0];
                const content = choice?.delta?.content || '';

                // If finish_reason is set, this is the final chunk
                if (choice?.finish_reason) {
                  controller.enqueue({
                    content,
                    done: true,
                    usage: parsed.usage,
                  });
                  controller.close();
                  return;
                }

                // Skip empty deltas (e.g. role-only deltas at the start)
                if (!content) continue;

                controller.enqueue({ content, done: false });
              } catch {
                // If JSON parsing fails for a chunk, skip it
                // This can happen with malformed chunks
                continue;
              }
            }
          }
        }

        // If we exit the loop without [DONE] or finish_reason,
        // still signal completion
        controller.enqueue({ content: '', done: true });
        controller.close();
      } catch (err) {
        controller.error(err instanceof Error ? err : new Error(String(err)));
      }
    },
  });
}

/**
 * Convert a ReadableStream<StreamChunk> into a SSE-formatted
 * ReadableStream suitable for a Next.js Route Handler Response.
 *
 * Each SSE event has format:
 *   data: {"content":"chunk text","done":false}\n\n
 * Final event:
 *   data: {"content":"","done":true,"usage":{...}}\n\n
 */
export function streamToSse(stream: ReadableStream<StreamChunk>): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  const reader = stream.getReader();

  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      try {
        const { done, value } = await reader.read();
        if (done) {
          controller.close();
          return;
        }
        const sseData = `data: ${JSON.stringify(value)}\n\n`;
        controller.enqueue(encoder.encode(sseData));
      } catch (err) {
        // Emit an error event before closing
        const errorPayload = JSON.stringify({
          content: '',
          done: true,
          error: err instanceof Error ? err.message : String(err),
        });
        controller.enqueue(encoder.encode(`data: ${errorPayload}\n\n`));
        controller.close();
      }
    },
    cancel() {
      reader.cancel();
    },
  });
}
