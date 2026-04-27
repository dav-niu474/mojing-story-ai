import { NextRequest, NextResponse } from 'next/server';
import { ensureDbInitialized } from '@/lib/db';

/**
 * Count Chinese characters + English words
 */
export function countWords(text: string): number {
  const chinese = text.match(/[\u4e00-\u9fff]/g)?.length || 0;
  const english = text.match(/[a-zA-Z]+/g)?.length || 0;
  return chinese + english;
}

/**
 * Parse JSON body from request
 */
export async function parseBody<T>(request: NextRequest): Promise<T> {
  const body = await request.json();
  return body as T;
}

/**
 * Standard error response helper
 */
export function errorResponse(message: string, status: number = 500) {
  return NextResponse.json({ error: message }, { status });
}

/**
 * Standard success response helper
 */
export function successResponse(data: unknown, status: number = 200) {
  return NextResponse.json(data, { status });
}

/**
 * Ensure the database is initialized (for Vercel serverless)
 * Call this at the start of each API handler
 */
export async function withDb<T>(handler: () => Promise<T>): Promise<T> {
  await ensureDbInitialized();
  return handler();
}
