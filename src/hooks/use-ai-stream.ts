'use client';

import { useState, useCallback, useRef } from 'react';

// ─── Types ──────────────────────────────────────────────────────────

interface StreamMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface StreamOptions {
  model?: string;
  messages: StreamMessage[];
  systemPrompt?: string;
  maxTokens?: number;
  temperature?: number;
}

interface StreamChunk {
  content: string;
  done: boolean;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  error?: string;
}

interface UseAiStreamReturn {
  /** Accumulated content from the stream */
  content: string;
  /** Whether a stream is currently active */
  isStreaming: boolean;
  /** Error message if streaming failed */
  error: string | null;
  /** Token usage from the completed stream */
  usage: StreamChunk['usage'] | null;
  /** Start a new streaming request */
  stream: (options: StreamOptions) => Promise<void>;
  /** Abort the current stream */
  abort: () => void;
  /** Reset state for a new conversation */
  reset: () => void;
}

// ─── Hook ───────────────────────────────────────────────────────────

/**
 * Custom hook for consuming SSE streams from /api/ai/stream.
 *
 * Usage:
 *   const { stream, content, isStreaming, error, abort } = useAiStream();
 *   await stream({ messages: [{ role: 'user', content: 'Hello' }] });
 */
export function useAiStream(): UseAiStreamReturn {
  const [content, setContent] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [usage, setUsage] = useState<StreamChunk['usage'] | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);

  /** Abort the current stream */
  const abort = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsStreaming(false);
  }, []);

  /** Reset all state for a new conversation */
  const reset = useCallback(() => {
    abort();
    setContent('');
    setError(null);
    setUsage(null);
  }, [abort]);

  /** Start a new streaming request */
  const stream = useCallback(async (options: StreamOptions) => {
    // Abort any existing stream
    abort();

    // Reset state for new request
    setContent('');
    setError(null);
    setUsage(null);
    setIsStreaming(true);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const response = await fetch('/api/ai/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: options.model,
          messages: options.messages,
          systemPrompt: options.systemPrompt,
          maxTokens: options.maxTokens,
          temperature: options.temperature,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        let errorMsg = `Stream request failed (${response.status})`;
        try {
          const errBody = await response.json() as { error?: string };
          if (errBody.error) errorMsg = errBody.error;
        } catch {
          // ignore JSON parse error
        }
        setError(errorMsg);
        setIsStreaming(false);
        return;
      }

      const reader = response.body?.getReader();
      if (!reader) {
        setError('No response body received');
        setIsStreaming(false);
        return;
      }

      const decoder = new TextDecoder();
      let buffer = '';

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
            if (!line.startsWith('data: ')) continue;

            const data = line.slice(6).trim();
            if (!data) continue;

            try {
              const chunk: StreamChunk = JSON.parse(data);

              // Handle error in stream
              if (chunk.error) {
                setError(chunk.error);
                setIsStreaming(false);
                return;
              }

              // Accumulate content
              if (chunk.content) {
                setContent(prev => prev + chunk.content);
              }

              // Handle stream completion
              if (chunk.done) {
                if (chunk.usage) {
                  setUsage(chunk.usage);
                }
                setIsStreaming(false);
                abortControllerRef.current = null;
                return;
              }
            } catch {
              // Skip malformed JSON chunks
              continue;
            }
          }
        }
      }

      // Stream ended without explicit done signal
      setIsStreaming(false);
      abortControllerRef.current = null;
    } catch (err) {
      // Don't set error if the request was aborted (user-initiated)
      if (err instanceof DOMException && err.name === 'AbortError') {
        setIsStreaming(false);
        return;
      }
      setError(err instanceof Error ? err.message : 'Stream failed unexpectedly');
      setIsStreaming(false);
    } finally {
      abortControllerRef.current = null;
    }
  }, [abort]);

  return { content, isStreaming, error, usage, stream, abort, reset };
}
