/**
 * NVIDIA NIM Text Models Configuration
 * Only includes models verified or likely available on the NVIDIA NIM platform.
 * Dead models (410 Gone / 404 Not Found) have been removed:
 *   - deepseek-ai/deepseek-r1 (Gone)
 *   - qwen/qwen3-235b-a22b (Gone)
 *   - 01-ai/yi-large (404)
 *   - nvidia/llama-3.1-nemotron-70b-instruct (404)
 *   - nvidia/llama-3.1-nemotron-ultra-253b-v1 (404)
 *   - nvidia/llama-3.1-nemotron-51b-instruct (404)
 *   - writer/palmyra-creative-122b (404)
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
  verified: boolean;      // true = HTTP 200 tested, false = likely available from API list
  recommended?: boolean;  // Show in recommended section
  thinking?: boolean;     // Supports extended thinking / chain-of-thought
}

// ─── 中文创作推荐 ────────────────────────────────────────────────────────

const CHINESE_WRITING_MODELS: AiModel[] = [
  {
    id: 'glm-5.1',
    nimModelId: 'z-ai/glm-5.1',
    name: 'GLM-5.1',
    provider: 'zhipu',
    providerLabel: '智谱AI',
    description: '智谱最新旗舰模型，中文理解和创作能力顶尖，网文写作首选',
    category: '中文创作推荐',
    tags: ['推荐', '最新', '中文强'],
    contextLength: 128000,
    maxTokens: 8192,
    verified: true,
    recommended: true,
  },
  {
    id: 'deepseek-v4-pro',
    nimModelId: 'deepseek-ai/deepseek-v4-pro',
    name: 'DeepSeek V4 Pro',
    provider: 'deepseek',
    providerLabel: '深度求索',
    description: '深度求索最新Pro版，推理和创作能力顶尖，中文表达流畅',
    category: '中文创作推荐',
    tags: ['推荐', '最新', '推理强'],
    contextLength: 128000,
    maxTokens: 8192,
    verified: true,
    recommended: true,
  },
  {
    id: 'kimi-k2.5',
    nimModelId: 'moonshotai/kimi-k2.5',
    name: 'Kimi K2.5',
    provider: 'moonshot',
    providerLabel: '月之暗面',
    description: 'Kimi最新旗舰，超长上下文理解出色，适合长篇小说创作',
    category: '中文创作推荐',
    tags: ['推荐', '最新', '长文本'],
    contextLength: 200000,
    maxTokens: 8192,
    verified: true,
    recommended: true,
  },
  {
    id: 'step-3.5-flash',
    nimModelId: 'stepfun-ai/step-3.5-flash',
    name: 'Step 3.5 Flash',
    provider: 'stepfun',
    providerLabel: '阶跃星辰',
    description: '阶跃星辰快速模型，中文写作速度快、质量高，适合实时辅助',
    category: '中文创作推荐',
    tags: ['推荐', '中文强', '快速'],
    contextLength: 128000,
    maxTokens: 8192,
    verified: true,
    recommended: true,
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
    tags: ['大参数', '开源'],
    contextLength: 128000,
    maxTokens: 4096,
    verified: true,
  },
  {
    id: 'mistral-large-3',
    nimModelId: 'mistralai/mistral-large-3-675b-instruct-2512',
    name: 'Mistral Large 3 675B',
    provider: 'mistral',
    providerLabel: 'Mistral',
    description: 'Mistral最新旗舰，675B超大参数，多语言创作能力强大',
    category: '通用大模型',
    tags: ['最新', '大参数'],
    contextLength: 128000,
    maxTokens: 4096,
    verified: true,
  },
  {
    id: 'llama-4-maverick',
    nimModelId: 'meta/llama-4-maverick-17b-128e-instruct',
    name: 'Llama 4 Maverick',
    provider: 'meta',
    providerLabel: 'Meta',
    description: 'Meta Llama 4系列，多语言创作能力强，创意写作出色',
    category: '通用大模型',
    tags: ['最新', '创意'],
    contextLength: 128000,
    maxTokens: 4096,
    verified: true,
  },
  {
    id: 'llama-3.3-70b',
    nimModelId: 'meta/llama-3.3-70b-instruct',
    name: 'Llama 3.3 70B',
    provider: 'meta',
    providerLabel: 'Meta',
    description: 'Llama 3.3最新稳定版，广泛验证，均衡高效',
    category: '通用大模型',
    tags: ['稳定', '开源'],
    contextLength: 128000,
    maxTokens: 4096,
    verified: true,
  },
  {
    id: 'llama-3.1-70b',
    nimModelId: 'meta/llama-3.1-70b-instruct',
    name: 'Llama 3.1 70B',
    provider: 'meta',
    providerLabel: 'Meta',
    description: 'Llama 3.1均衡版本，速度快、质量稳定',
    category: '通用大模型',
    tags: ['稳定', '开源'],
    contextLength: 128000,
    maxTokens: 4096,
    verified: true,
  },
  {
    id: 'seed-oss-36b',
    nimModelId: 'bytedance/seed-oss-36b-instruct',
    name: 'Seed OSS 36B',
    provider: 'bytedance',
    providerLabel: '字节跳动',
    description: '字节跳动开源模型，中文能力强，创作风格多样',
    category: '通用大模型',
    tags: ['中文强', '开源'],
    contextLength: 128000,
    maxTokens: 4096,
    verified: true,
  },
  {
    id: 'gpt-oss-120b',
    nimModelId: 'openai/gpt-oss-120b',
    name: 'GPT OSS 120B',
    provider: 'openai',
    providerLabel: 'OpenAI',
    description: '开源大模型120B参数版，综合能力均衡',
    category: '通用大模型',
    tags: ['大参数', '开源'],
    contextLength: 128000,
    maxTokens: 4096,
    verified: true,
  },
  {
    id: 'dracarys-70b',
    nimModelId: 'abacusai/dracarys-llama-3.1-70b-instruct',
    name: 'Dracarys 70B',
    provider: 'abacusai',
    providerLabel: 'AbacusAI',
    description: '基于Llama的创意写作优化模型，叙事风格独特',
    category: '通用大模型',
    tags: ['创意', '写作优化'],
    contextLength: 128000,
    maxTokens: 4096,
    verified: true,
  },
  {
    id: 'minimax-m2.5',
    nimModelId: 'minimaxai/minimax-m2.5',
    name: 'MiniMax M2.5',
    provider: 'minimax',
    providerLabel: 'MiniMax',
    description: 'MiniMax旗舰模型，长文本理解出色，中文能力好',
    category: '通用大模型',
    tags: ['长文本', '中文强'],
    contextLength: 256000,
    maxTokens: 8192,
    verified: false,
  },
  {
    id: 'kimi-k2',
    nimModelId: 'moonshotai/kimi-k2-instruct',
    name: 'Kimi K2',
    provider: 'moonshot',
    providerLabel: '月之暗面',
    description: 'Kimi K2基础版，综合能力均衡',
    category: '通用大模型',
    tags: ['均衡'],
    contextLength: 128000,
    maxTokens: 4096,
    verified: false,
  },
  {
    id: 'mistral-medium-3',
    nimModelId: 'mistralai/mistral-medium-3-instruct',
    name: 'Mistral Medium 3',
    provider: 'mistral',
    providerLabel: 'Mistral',
    description: 'Mistral中端模型，速度与质量兼顾',
    category: '通用大模型',
    tags: ['均衡'],
    contextLength: 128000,
    maxTokens: 4096,
    verified: false,
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
  },
  {
    id: 'nemotron-super-49b',
    nimModelId: 'nvidia/llama-3.3-nemotron-super-49b-v1.5',
    name: 'Nemotron Super 49B',
    provider: 'nvidia',
    providerLabel: 'NVIDIA',
    description: 'NVIDIA优化模型，推理效率高，质量稳定',
    category: '通用大模型',
    tags: ['高效', '稳定'],
    contextLength: 128000,
    maxTokens: 4096,
    verified: false,
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
    tags: ['代码专精', '大参数'],
    contextLength: 128000,
    maxTokens: 8192,
    verified: false,
  },
  {
    id: 'qwen3.5-122b',
    nimModelId: 'qwen/qwen3.5-122b-a10b',
    name: 'Qwen 3.5 122B',
    provider: 'qwen',
    providerLabel: '通义千问',
    description: '通义千问3.5系列，MoE架构高效推理，中文创作优秀',
    category: '代码/推理',
    tags: ['最新', 'MoE'],
    contextLength: 128000,
    maxTokens: 8192,
    verified: false,
  },
  {
    id: 'qwen3-next-80b',
    nimModelId: 'qwen/qwen3-next-80b-a3b-instruct',
    name: 'Qwen 3 Next 80B',
    provider: 'qwen',
    providerLabel: '通义千问',
    description: 'Qwen 3 Next系列，MoE稀疏激活，推理高效',
    category: '代码/推理',
    tags: ['MoE', '高效'],
    contextLength: 128000,
    maxTokens: 4096,
    verified: false,
  },
  {
    id: 'qwen2.5-coder-32b',
    nimModelId: 'qwen/qwen2.5-coder-32b-instruct',
    name: 'Qwen 2.5 Coder 32B',
    provider: 'qwen',
    providerLabel: '通义千问',
    description: 'Qwen代码专精模型，辅助结构化设定设计',
    category: '代码/推理',
    tags: ['代码专精'],
    contextLength: 128000,
    maxTokens: 4096,
    verified: false,
  },
  {
    id: 'deepseek-v3.1',
    nimModelId: 'deepseek-ai/deepseek-v3.1-terminus',
    name: 'DeepSeek V3.1',
    provider: 'deepseek',
    providerLabel: '深度求索',
    description: 'DeepSeek V3.1版，推理能力强，适合情节规划',
    category: '代码/推理',
    tags: ['推理强'],
    contextLength: 128000,
    maxTokens: 4096,
    verified: false,
  },
  {
    id: 'kimi-k2-thinking',
    nimModelId: 'moonshotai/kimi-k2-thinking',
    name: 'Kimi K2 Thinking',
    provider: 'moonshot',
    providerLabel: '月之暗面',
    description: 'Kimi深度思考版，推理链条更深，适合复杂剧情推演',
    category: '代码/推理',
    tags: ['推理强', '深度思考'],
    contextLength: 200000,
    maxTokens: 8192,
    verified: false,
    thinking: true,
  },
  {
    id: 'mistral-nemotron',
    nimModelId: 'mistralai/mistral-nemotron',
    name: 'Mistral Nemotron',
    provider: 'mistral',
    providerLabel: 'Mistral',
    description: 'Mistral与NVIDIA联合优化，推理效率极高',
    category: '代码/推理',
    tags: ['高效', '推理强'],
    contextLength: 128000,
    maxTokens: 4096,
    verified: false,
  },
];

// ─── 轻量快速 ──────────────────────────────────────────────────────────

const LIGHTWEIGHT_MODELS: AiModel[] = [
  {
    id: 'llama-3.1-8b',
    nimModelId: 'meta/llama-3.1-8b-instruct',
    name: 'Llama 3.1 8B',
    provider: 'meta',
    providerLabel: 'Meta',
    description: '最轻量Llama模型，响应极快，适合简单续写和润色',
    category: '轻量快速',
    tags: ['快速', '轻量'],
    contextLength: 128000,
    maxTokens: 4096,
    verified: true,
  },
  {
    id: 'phi-4-mini',
    nimModelId: 'microsoft/phi-4-mini-instruct',
    name: 'Phi-4 Mini',
    provider: 'microsoft',
    providerLabel: 'Microsoft',
    description: '微软Phi-4迷你版，小参数高效率，快速生成',
    category: '轻量快速',
    tags: ['轻量', '快速'],
    contextLength: 128000,
    maxTokens: 4096,
    verified: false,
  },
  {
    id: 'gemma-3-27b',
    nimModelId: 'google/gemma-3-27b-it',
    name: 'Gemma 3 27B',
    provider: 'google',
    providerLabel: 'Google',
    description: 'Google Gemma 3开源模型，轻量高效',
    category: '轻量快速',
    tags: ['开源', '轻量'],
    contextLength: 128000,
    maxTokens: 4096,
    verified: false,
  },
  {
    id: 'gemma-4-31b',
    nimModelId: 'google/gemma-4-31b-it',
    name: 'Gemma 4 31B',
    provider: 'google',
    providerLabel: 'Google',
    description: 'Google Gemma 4最新版，轻量但能力提升显著',
    category: '轻量快速',
    tags: ['最新', '轻量'],
    contextLength: 128000,
    maxTokens: 4096,
    verified: false,
  },
  {
    id: 'granite-3-8b',
    nimModelId: 'ibm/granite-3.0-8b-instruct',
    name: 'Granite 3 8B',
    provider: 'ibm',
    providerLabel: 'IBM',
    description: 'IBM Granite企业级轻量模型，稳定可靠',
    category: '轻量快速',
    tags: ['企业级', '轻量'],
    contextLength: 128000,
    maxTokens: 4096,
    verified: false,
  },
  {
    id: 'sarvam-m',
    nimModelId: 'sarvamai/sarvam-m',
    name: 'Sarvam M',
    provider: 'sarvamai',
    providerLabel: 'SarvamAI',
    description: 'Sarvam多语言轻量模型，响应速度快',
    category: '轻量快速',
    tags: ['多语言', '轻量'],
    contextLength: 128000,
    maxTokens: 4096,
    verified: false,
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
  { label: '🇨🇳 中文创作推荐', providers: ['zhipu', 'deepseek', 'moonshot', 'stepfun', 'bytedance', 'minimax'] },
  { label: '🌍 通用大模型', providers: ['meta', 'mistral', 'openai', 'abacusai', 'stockmark', 'nvidia'] },
  { label: '🧠 代码/推理', providers: ['qwen', 'mistral'] },
  { label: '⚡ 轻量快速', providers: ['meta', 'microsoft', 'google', 'ibm', 'sarvamai'] },
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

/** Default model ID constant */
export const DEFAULT_MODEL = 'glm-5.1';

/**
 * Get the default model for novel writing.
 * Returns GLM-5.1 as the best model for Chinese creative writing.
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
 * Get only verified models (tested with HTTP 200).
 * Useful for users who want maximum reliability.
 */
export function getVerifiedModels(): AiModel[] {
  return AI_MODELS.filter(m => m.verified);
}
