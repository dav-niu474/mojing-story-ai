/**
 * NVIDIA NIM API Client
 * Calls NVIDIA NIM's OpenAI-compatible API for chat completions
 * Endpoint: https://integrate.api.nvidia.com/v1/chat/completions
 *
 * Handles both standard and "thinking" models:
 * - Standard models: content in message.content
 * - Thinking models: content may be null, with reasoning in message.reasoning or message.reasoning_content
 */

const NVIDIA_NIM_BASE_URL = 'https://integrate.api.nvidia.com/v1';

// Request timeout in milliseconds (30s for non-streaming)
const REQUEST_TIMEOUT_MS = 60_000;

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
      content: string | null;
      reasoning?: string | null;
      reasoning_content?: string | null;
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
 * Extract the actual content from a chat completion message.
 * Handles both standard and "thinking" model responses:
 * 1. If message.content is non-null, return it directly
 * 2. If message.content is null, fall back to reasoning or reasoning_content
 * 3. If all are null/empty, return empty string
 */
function extractMessageContent(message: NimChatCompletionResponse['choices'][0]['message']): string {
  // Standard models return content directly
  if (message.content) {
    return message.content;
  }

  // Thinking models may put the actual response in reasoning/reasoning_content
  // when content is null (e.g., kimi-k2.5, step-3.5-flash, seed-oss-36b)
  if (message.reasoning) {
    return message.reasoning;
  }

  if (message.reasoning_content) {
    return message.reasoning_content;
  }

  return '';
}

/**
 * Call NVIDIA NIM chat completions API
 */
export async function nvidiaNimChat(
  options: NimChatCompletionOptions,
): Promise<NimChatCompletionResponse> {
  const apiKey = getNvidiaApiKey();

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
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
      signal: controller.signal,
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
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new Error(`NVIDIA NIM API request timed out after ${REQUEST_TIMEOUT_MS / 1000}s for model: ${options.model}. The model may be temporarily unavailable.`);
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Simplified helper: send messages and get AI response text.
 * Automatically handles thinking models that return null content.
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

  const message = result.choices[0]?.message;
  if (!message) return '';

  return extractMessageContent(message);
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
 * Handles both standard and thinking model SSE formats:
 * - Standard: delta.content contains text
 * - Thinking: delta.reasoning or delta.reasoning_content contains text when content is absent
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
                    delta?: {
                      content?: string | null;
                      role?: string;
                      reasoning?: string | null;
                      reasoning_content?: string | null;
                    };
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
                const delta = choice?.delta;

                // Extract content: prefer content field, fall back to reasoning fields
                let content = delta?.content || '';

                // If content is empty but reasoning fields exist, use those (thinking models)
                if (!content) {
                  content = delta?.reasoning || delta?.reasoning_content || '';
                }

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
