import { NextRequest } from 'next/server';
import { nvidiaNimStream, streamToSse } from '@/lib/nvidia-nim';
import { getNimModelId, DEFAULT_MODEL } from '@/lib/models';

interface StreamRequestBody {
  model?: string;
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
  systemPrompt?: string;
  maxTokens?: number;
  temperature?: number;
}

// POST /api/ai/stream — Streaming SSE endpoint for AI chat
export async function POST(request: NextRequest) {
  try {
    const body: StreamRequestBody = await request.json();
    const { model, messages, systemPrompt, maxTokens, temperature } = body;

    if (!messages || messages.length === 0) {
      return new Response(
        JSON.stringify({ error: 'messages are required and must not be empty' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } },
      );
    }

    // Build the full messages array: prepend system prompt if provided
    const fullMessages = systemPrompt
      ? [{ role: 'system' as const, content: systemPrompt }, ...messages]
      : messages;

    const nimModelId = getNimModelId(model || DEFAULT_MODEL);

    // Create the upstream stream from NVIDIA NIM
    const nimStream = nvidiaNimStream({
      model: nimModelId,
      messages: fullMessages,
      temperature: temperature ?? 0.7,
      max_tokens: maxTokens ?? 4096,
    });

    // Convert to SSE-formatted bytes
    const sseStream = streamToSse(nimStream);

    // Return SSE response with proper headers
    return new Response(sseStream, {
      status: 200,
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no', // Disable nginx buffering
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to start stream';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }
}
