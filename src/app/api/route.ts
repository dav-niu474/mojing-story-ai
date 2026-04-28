import { NextResponse } from 'next/server';
import { AI_MODELS, DEFAULT_MODEL } from '@/lib/models';

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    service: '墨境/MoJing AI网文创作平台',
    version: '1.0.0',
    defaultModel: DEFAULT_MODEL,
    modelsCount: AI_MODELS.length,
    activeModels: AI_MODELS.filter(m => m.status === 'active').map(m => m.id),
    thinkingModels: AI_MODELS.filter(m => m.status === 'thinking').map(m => m.id),
    downModels: AI_MODELS.filter(m => m.status === 'down' || m.status === 'error').map(m => m.id),
  });
}
