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
