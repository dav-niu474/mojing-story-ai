/**
 * NVIDIA NIM Text Models Configuration
 *
 * Model availability tested on 2025-01-20:
 *
 * ✅ WORKING (HTTP 200, returns content):
 *   - deepseek-ai/deepseek-v4-pro
 *   - meta/llama-3.3-70b-instruct
 *   - meta/llama-3.1-405b-instruct
 *   - meta/llama-4-maverick-17b-128e-instruct
 *   - mistralai/mistral-large-3-675b-instruct-2512
 *   - qwen/qwen3-coder-480b-a35b-instruct
 *   - qwen/qwen3.5-122b-a10b
 *   - qwen/qwen3-next-80b-a3b-instruct
 *   - moonshotai/kimi-k2-instruct
 *   - mistralai/mistral-nemotron
 *   - stockmark/stockmark-2-100b-instruct
 *
 * ⚠️ THINKING MODELS (HTTP 200, but content=null; use reasoning/reasoning_content):
 *   - moonshotai/kimi-k2.5
 *   - stepfun-ai/step-3.5-flash
 *   - bytedance/seed-oss-36b-instruct
 *   - nvidia/llama-3.3-nemotron-super-49b-v1.5
 *   - openai/gpt-oss-120b
 *   - sarvamai/sarvam-m
 *   - moonshotai/kimi-k2-thinking
 *
 * ❌ DOWN (Timeout / HTTP 000):
 *   - z-ai/glm-5.1 (was DEFAULT - now down!)
 *   - meta/llama-3.1-8b-instruct
 *   - abacusai/dracarys-llama-3.1-70b-instruct
 *   - minimaxai/minimax-m2.5
 *   - qwen/qwen2.5-coder-32b-instruct
 *   - deepseek-ai/deepseek-v3.1-terminus
 *   - mistralai/mistral-medium-3-instruct
 *   - microsoft/phi-4-mini-instruct
 *   - google/gemma-4-31b-it
 *
 * ❌ ERROR (400/404):
 *   - google/gemma-3-27b-it (400)
 *   - ibm/granite-3.0-8b-instruct (404)
 *
 * All models use the OpenAI-compatible API at https://integrate.api.nvidia.com/v1
 */

export type ModelCategory = '中文创作推荐' | '通用大模型' | '代码/推理' | '轻量快速';

export interface AiModel {
  id: string;             // Our internal ID
  nimModelId: string;     // NVIDIA NIM model ID (exact ID for API calls)
  name: string;           // Display name
  provider: string;       // Provider key for grouping
  providerLabel: string;  // Chinese display name for provider
  description: string;    // What this model is best for
  category: ModelCategory;// Category for organized UI
  tags: string[];         // Searchable tags
  contextLength: number;  // Max context window in tokens
  maxTokens: number;      // Max output tokens
  verified: boolean;      // true = HTTP 200 + content returned tested
  recommended?: boolean;  // Show in recommended section
  thinking?: boolean;     // Thinking model (content may be in reasoning field)
  status?: 'active' | 'thinking' | 'down' | 'error';  // Current operational status
}

// ─── 中文创作推荐 ────────────────────────────────────────────────────────

const CHINESE_WRITING_MODELS: AiModel[] = [
  {
    id: 'deepseek-v4-pro',
    nimModelId: 'deepseek-ai/deepseek-v4-pro',
    name: 'DeepSeek V4 Pro ⚠️',
    provider: 'deepseek',
    providerLabel: '深度求索',
    description: '深度求索最新Pro版，推理和创作能力顶尖，但当前不稳定可能超时',
    category: '中文创作推荐',
    tags: ['推荐', '最新', '推理强', '不稳定'],
    contextLength: 128000,
    maxTokens: 8192,
    verified: false,
    status: 'down',
  },
  {
    id: 'glm-5.1',
    nimModelId: 'z-ai/glm-5.1',
    name: 'GLM-5.1 ⚠️',
    provider: 'zhipu',
    providerLabel: '智谱AI',
    description: '智谱旗舰模型，中文创作顶尖，但当前不稳定可能超时',
    category: '中文创作推荐',
    tags: ['中文强', '不稳定'],
    contextLength: 128000,
    maxTokens: 8192,
    verified: false,
    status: 'down',
  },
  {
    id: 'kimi-k2.5',
    nimModelId: 'moonshotai/kimi-k2.5',
    name: 'Kimi K2.5 🧠',
    provider: 'moonshot',
    providerLabel: '月之暗面',
    description: 'Kimi旗舰思考模型，超长上下文，适合深度创作（思考模式）',
    category: '中文创作推荐',
    tags: ['长文本', '深度思考'],
    contextLength: 200000,
    maxTokens: 8192,
    verified: true,
    thinking: true,
    status: 'thinking',
  },
  {
    id: 'step-3.5-flash',
    nimModelId: 'stepfun-ai/step-3.5-flash',
    name: 'Step 3.5 Flash 🧠',
    provider: 'stepfun',
    providerLabel: '阶跃星辰',
    description: '阶跃星辰快速思考模型，中文能力强（思考模式）',
    category: '中文创作推荐',
    tags: ['中文强', '快速'],
    contextLength: 128000,
    maxTokens: 8192,
    verified: true,
    thinking: true,
    status: 'thinking',
  },
  {
    id: 'kimi-k2',
    nimModelId: 'moonshotai/kimi-k2-instruct',
    name: 'Kimi K2',
    provider: 'moonshot',
    providerLabel: '月之暗面',
    description: 'Kimi K2基础版，综合能力均衡，稳定可用',
    category: '中文创作推荐',
    tags: ['均衡', '稳定'],
    contextLength: 128000,
    maxTokens: 4096,
    verified: true,
    recommended: true,
    status: 'active',
  },
];

// ─── 通用大模型 ──────────────────────────────────────────────────────────

const GENERAL_MODELS: AiModel[] = [
  {
    id: 'llama-3.1-405b',
    nimModelId: 'meta/llama-3.1-405b-instruct',
    name: 'Llama 3.1 405B',
    provider: 'meta',
    providerLabel: 'Meta',
    description: 'Llama最大参数版本，综合能力最强，适合复杂创作任务',
    category: '通用大模型',
    tags: ['大参数', '稳定'],
    contextLength: 128000,
    maxTokens: 4096,
    verified: true,
    recommended: true,
    status: 'active',
  },
  {
    id: 'mistral-large-3',
    nimModelId: 'mistralai/mistral-large-3-675b-instruct-2512',
    name: 'Mistral Large 3 675B',
    provider: 'mistral',
    providerLabel: 'Mistral',
    description: 'Mistral最新旗舰，675B超大参数，多语言创作能力强大',
    category: '通用大模型',
    tags: ['大参数', '稳定'],
    contextLength: 128000,
    maxTokens: 4096,
    verified: true,
    status: 'active',
  },
  {
    id: 'llama-4-maverick',
    nimModelId: 'meta/llama-4-maverick-17b-128e-instruct',
    name: 'Llama 4 Maverick',
    provider: 'meta',
    providerLabel: 'Meta',
    description: 'Meta Llama 4系列，多语言创作能力强，创意写作出色',
    category: '通用大模型',
    tags: ['最新', '创意', '稳定'],
    contextLength: 128000,
    maxTokens: 4096,
    verified: true,
    status: 'active',
  },
  {
    id: 'llama-3.3-70b',
    nimModelId: 'meta/llama-3.3-70b-instruct',
    name: 'Llama 3.3 70B',
    provider: 'meta',
    providerLabel: 'Meta',
    description: 'Llama 3.3稳定版，广泛验证，均衡高效，响应快速',
    category: '通用大模型',
    tags: ['稳定', '快速', '推荐'],
    contextLength: 128000,
    maxTokens: 4096,
    verified: true,
    recommended: true,
    status: 'active',
  },
  {
    id: 'seed-oss-36b',
    nimModelId: 'bytedance/seed-oss-36b-instruct',
    name: 'Seed OSS 36B 🧠',
    provider: 'bytedance',
    providerLabel: '字节跳动',
    description: '字节跳动开源思考模型，中文能力强（思考模式）',
    category: '通用大模型',
    tags: ['中文强', '思考'],
    contextLength: 128000,
    maxTokens: 4096,
    verified: true,
    thinking: true,
    status: 'thinking',
  },
  {
    id: 'gpt-oss-120b',
    nimModelId: 'openai/gpt-oss-120b',
    name: 'GPT OSS 120B 🧠',
    provider: 'openai',
    providerLabel: 'OpenAI',
    description: '开源大模型120B参数版（思考模式）',
    category: '通用大模型',
    tags: ['大参数', '思考'],
    contextLength: 128000,
    maxTokens: 4096,
    verified: true,
    thinking: true,
    status: 'thinking',
  },
  {
    id: 'nemotron-super-49b',
    nimModelId: 'nvidia/llama-3.3-nemotron-super-49b-v1.5',
    name: 'Nemotron Super 49B 🧠',
    provider: 'nvidia',
    providerLabel: 'NVIDIA',
    description: 'NVIDIA优化思考模型（思考模式）',
    category: '通用大模型',
    tags: ['高效', '思考'],
    contextLength: 128000,
    maxTokens: 4096,
    verified: true,
    thinking: true,
    status: 'thinking',
  },
  {
    id: 'stockmark-2-100b',
    nimModelId: 'stockmark/stockmark-2-100b-instruct',
    name: 'Stockmark 2 100B',
    provider: 'stockmark',
    providerLabel: 'Stockmark',
    description: '日文/多语言专精模型，适合多语言创作场景',
    category: '通用大模型',
    tags: ['多语言', '日文'],
    contextLength: 128000,
    maxTokens: 4096,
    verified: true,
    status: 'active',
  },
  {
    id: 'mistral-nemotron',
    nimModelId: 'mistralai/mistral-nemotron',
    name: 'Mistral Nemotron',
    provider: 'mistral',
    providerLabel: 'Mistral',
    description: 'Mistral与NVIDIA联合优化，推理效率极高，稳定可用',
    category: '通用大模型',
    tags: ['高效', '稳定'],
    contextLength: 128000,
    maxTokens: 4096,
    verified: true,
    status: 'active',
  },
];

// ─── 代码/推理 ──────────────────────────────────────────────────────────

const CODE_REASONING_MODELS: AiModel[] = [
  {
    id: 'qwen3-coder-480b',
    nimModelId: 'qwen/qwen3-coder-480b-a35b-instruct',
    name: 'Qwen 3 Coder 480B',
    provider: 'qwen',
    providerLabel: '通义千问',
    description: '通义千问代码专精超大模型，辅助世界观规则设计',
    category: '代码/推理',
    tags: ['代码专精', '大参数', '稳定'],
    contextLength: 128000,
    maxTokens: 8192,
    verified: true,
    status: 'active',
  },
  {
    id: 'qwen3.5-122b',
    nimModelId: 'qwen/qwen3.5-122b-a10b',
    name: 'Qwen 3.5 122B',
    provider: 'qwen',
    providerLabel: '通义千问',
    description: '通义千问3.5系列，MoE架构高效推理，中文创作优秀，当前最稳定推荐',
    category: '中文创作推荐',
    tags: ['推荐', 'MoE', '稳定', '中文原生'],
    contextLength: 128000,
    maxTokens: 8192,
    verified: true,
    recommended: true,
    status: 'active',
  },
  {
    id: 'qwen3-next-80b',
    nimModelId: 'qwen/qwen3-next-80b-a3b-instruct',
    name: 'Qwen 3 Next 80B',
    provider: 'qwen',
    providerLabel: '通义千问',
    description: 'Qwen 3 Next系列，MoE稀疏激活，推理高效',
    category: '代码/推理',
    tags: ['MoE', '高效', '稳定'],
    contextLength: 128000,
    maxTokens: 4096,
    verified: true,
    status: 'active',
  },
  {
    id: 'kimi-k2-thinking',
    nimModelId: 'moonshotai/kimi-k2-thinking',
    name: 'Kimi K2 Thinking 🧠',
    provider: 'moonshot',
    providerLabel: '月之暗面',
    description: 'Kimi深度思考版，推理链条更深，适合复杂剧情推演（思考模式）',
    category: '代码/推理',
    tags: ['推理强', '深度思考'],
    contextLength: 200000,
    maxTokens: 8192,
    verified: true,
    thinking: true,
    status: 'thinking',
  },
];

// ─── 轻量快速 ──────────────────────────────────────────────────────────

const LIGHTWEIGHT_MODELS: AiModel[] = [
  {
    id: 'sarvam-m',
    nimModelId: 'sarvamai/sarvam-m',
    name: 'Sarvam M 🧠',
    provider: 'sarvamai',
    providerLabel: 'SarvamAI',
    description: 'Sarvam多语言思考模型，响应速度快（思考模式）',
    category: '轻量快速',
    tags: ['多语言', '思考'],
    contextLength: 128000,
    maxTokens: 4096,
    verified: true,
    thinking: true,
    status: 'thinking',
  },
];

// ─── All models combined ────────────────────────────────────────────────

export const AI_MODELS: AiModel[] = [
  ...CHINESE_WRITING_MODELS,
  ...GENERAL_MODELS,
  ...CODE_REASONING_MODELS,
  ...LIGHTWEIGHT_MODELS,
];

// ─── Category metadata for UI grouping ──────────────────────────────────

export const MODEL_CATEGORIES: { key: ModelCategory; label: string; icon: string }[] = [
  { key: '中文创作推荐', label: '🇨🇳 中文创作推荐', icon: '✍️' },
  { key: '通用大模型', label: '🌍 通用大模型', icon: '🌍' },
  { key: '代码/推理', label: '🧠 代码/推理', icon: '🧠' },
  { key: '轻量快速', label: '⚡ 轻量快速', icon: '⚡' },
];

/** Model groupings for organized UI (backward compatibility) */
export const MODEL_GROUPS: { label: string; providers: string[] }[] = [
  { label: '🇨🇳 中文创作推荐', providers: ['zhipu', 'deepseek', 'moonshot', 'stepfun', 'bytedance'] },
  { label: '🌍 通用大模型', providers: ['meta', 'mistral', 'openai', 'stockmark', 'nvidia'] },
  { label: '🧠 代码/推理', providers: ['qwen', 'moonshot'] },
  { label: '⚡ 轻量快速', providers: ['sarvamai'] },
];

// ─── Helper Functions ───────────────────────────────────────────────────

/** Get model by internal ID */
export function getModelById(id: string): AiModel | undefined {
  return AI_MODELS.find(m => m.id === id);
}

/** Get NVIDIA NIM model ID from our internal ID */
export function getNimModelId(internalId: string): string {
  const model = getModelById(internalId);
  return model?.nimModelId || internalId;
}

/**
 * Default model ID - changed to qwen3.5-122b
 * because deepseek-v4-pro is currently down (timeout).
 * Qwen 3.5 122B is Chinese-native, fast, and stable.
 *
 * Fallback chain: qwen3.5-122b → kimi-k2 → llama-3.1-405b → llama-3.3-70b
 */
export const DEFAULT_MODEL = 'qwen3.5-122b';

/**
 * Fallback model chain - if the primary model fails,
 * try these models in order until one works.
 */
export const FALLBACK_MODELS = [
  'qwen/qwen3.5-122b-a10b',
  'moonshotai/kimi-k2-instruct',
  'meta/llama-3.1-405b-instruct',
  'meta/llama-3.3-70b-instruct',
];

/**
 * Get the default model for novel writing.
 * Returns Qwen 3.5 122B as the current best stable model.
 */
export function getDefaultModel(): AiModel {
  return AI_MODELS.find(m => m.id === DEFAULT_MODEL)!;
}

/**
 * Get models grouped by category.
 * Returns a map of category key → model array, preserving the recommended order.
 */
export function getModelsByCategory(): Record<ModelCategory, AiModel[]> {
  const result: Record<ModelCategory, AiModel[]> = {
    '中文创作推荐': [],
    '通用大模型': [],
    '代码/推理': [],
    '轻量快速': [],
  };
  for (const model of AI_MODELS) {
    result[model.category].push(model);
  }
  return result;
}

/**
 * Get only verified models (tested with HTTP 200 + content returned).
 * Useful for users who want maximum reliability.
 */
export function getVerifiedModels(): AiModel[] {
  return AI_MODELS.filter(m => m.verified);
}

/**
 * Get only active models (status === 'active', not thinking or down).
 * These are the most reliable models for production use.
 */
export function getActiveModels(): AiModel[] {
  return AI_MODELS.filter(m => m.status === 'active');
}

/**
 * Get recommended models for the UI.
 * Only returns active models that are recommended.
 */
export function getRecommendedModels(): AiModel[] {
  return AI_MODELS.filter(m => m.recommended && m.status === 'active');
}
