/**
 * NVIDIA NIM Text Models Configuration
 * 31 models available for AI-powered novel writing
 */

export interface AiModel {
  id: string;
  name: string;
  provider: string;
  providerLabel: string;
  description: string;
  tags: string[];
  contextLength: number;
  recommended?: boolean;
  latest?: boolean;
  thinking?: boolean;
}

export const AI_MODELS: AiModel[] = [
  // ─── 智谱 GLM 系列 ────────────────────────────────────────────
  {
    id: 'glm-5.1',
    name: 'GLM-5.1',
    provider: 'zhipu',
    providerLabel: '智谱',
    description: '智谱最新旗舰模型，强大的中文理解和创作能力',
    tags: ['推荐', '最新', '中文强'],
    contextLength: 128000,
    recommended: true,
    latest: true,
  },
  {
    id: 'glm-5',
    name: 'GLM-5',
    provider: 'zhipu',
    providerLabel: '智谱',
    description: '智谱GLM第五代，综合能力出色',
    tags: ['中文强'],
    contextLength: 128000,
  },
  {
    id: 'glm-4.7',
    name: 'GLM-4.7',
    provider: 'zhipu',
    providerLabel: '智谱',
    description: '智谱GLM系列稳定版本，性价比高',
    tags: ['稳定'],
    contextLength: 128000,
  },

  // ─── 深度求索 DeepSeek 系列 ────────────────────────────────────
  {
    id: 'deepseek-v4-pro',
    name: 'DeepSeek V4 Pro',
    provider: 'deepseek',
    providerLabel: '深度求索',
    description: '深度求索最新Pro版，推理和创作能力顶尖',
    tags: ['推荐', '最新', '推理强'],
    contextLength: 128000,
    recommended: true,
    latest: true,
  },
  {
    id: 'deepseek-v4-flash',
    name: 'DeepSeek V4 Flash',
    provider: 'deepseek',
    providerLabel: '深度求索',
    description: 'DeepSeek V4快速版，响应速度极快',
    tags: ['快速', '高性价比'],
    contextLength: 128000,
  },

  // ─── MiniMax 系列 ──────────────────────────────────────────────
  {
    id: 'minimax-m2.7',
    name: 'MiniMax M2.7',
    provider: 'minimax',
    providerLabel: 'MiniMax',
    description: 'MiniMax最新旗舰，长文本理解出色',
    tags: ['最新', '长文本'],
    contextLength: 256000,
    latest: true,
  },
  {
    id: 'minimax-m2.5',
    name: 'MiniMax M2.5',
    provider: 'minimax',
    providerLabel: 'MiniMax',
    description: 'MiniMax M2系列稳定版',
    tags: ['稳定'],
    contextLength: 256000,
  },

  // ─── 通义千问 Qwen 系列 ───────────────────────────────────────
  {
    id: 'qwen-3.5-397b',
    name: 'Qwen 3.5 397B',
    provider: 'qwen',
    providerLabel: '通义千问',
    description: '通义千问最新超大参数模型，中文创作顶级',
    tags: ['推荐', '最新', '大参数'],
    contextLength: 128000,
    recommended: true,
    latest: true,
  },
  {
    id: 'qwen-3.5-122b',
    name: 'Qwen 3.5 122B',
    provider: 'qwen',
    providerLabel: '通义千问',
    description: '通义千问3.5系列均衡版本，速度与质量兼顾',
    tags: ['均衡'],
    contextLength: 128000,
  },

  // ─── 月之暗面 Kimi 系列 ───────────────────────────────────────
  {
    id: 'kimi-k2.5',
    name: 'Kimi K2.5',
    provider: 'moonshot',
    providerLabel: '月之暗面',
    description: 'Kimi最新旗舰，超长上下文理解',
    tags: ['最新', '长文本'],
    contextLength: 200000,
    latest: true,
  },
  {
    id: 'kimi-k2-thinking',
    name: 'Kimi K2 Thinking',
    provider: 'moonshot',
    providerLabel: '月之暗面',
    description: 'Kimi深度思考版，推理链条更深',
    tags: ['推理强', '深度思考'],
    contextLength: 200000,
    thinking: true,
  },

  // ─── Meta Llama 系列 ──────────────────────────────────────────
  {
    id: 'llama-4-maverick',
    name: 'Llama 4 Maverick',
    provider: 'meta',
    providerLabel: 'Meta',
    description: 'Meta Llama 4系列，多语言创作能力强大',
    tags: ['最新', '开源'],
    contextLength: 128000,
    latest: true,
  },
  {
    id: 'llama-3.3',
    name: 'Llama 3.3',
    provider: 'meta',
    providerLabel: 'Meta',
    description: 'Llama 3.3稳定版本，广泛验证',
    tags: ['稳定', '开源'],
    contextLength: 128000,
  },

  // ─── NVIDIA Nemotron 系列 ─────────────────────────────────────
  {
    id: 'nemotron-ultra-253b',
    name: 'Nemotron Ultra 253B',
    provider: 'nvidia',
    providerLabel: 'NVIDIA',
    description: 'NVIDIA最强模型，超大规模参数，推理和创作顶级',
    tags: ['推荐', '最强', '大参数'],
    contextLength: 128000,
    recommended: true,
  },

  // ─── Mistral 系列 ─────────────────────────────────────────────
  {
    id: 'mistral-large-3-675b',
    name: 'Mistral Large 3 675B',
    provider: 'mistral',
    providerLabel: 'Mistral',
    description: 'Mistral最新旗舰，675B超大参数',
    tags: ['最新', '大参数'],
    contextLength: 128000,
    latest: true,
  },

  // ─── 零一万物 Yi 系列 ─────────────────────────────────────────
  {
    id: 'yi-large',
    name: 'Yi Large',
    provider: 'yi',
    providerLabel: '零一万物',
    description: '零一万物旗舰模型，中文创作能力强',
    tags: ['中文强'],
    contextLength: 128000,
  },

  // ─── Seed OSS 系列 ────────────────────────────────────────────
  {
    id: 'seed-oss',
    name: 'Seed OSS',
    provider: 'seed',
    providerLabel: 'Seed',
    description: 'Seed开源模型，创作风格多样',
    tags: ['开源'],
    contextLength: 128000,
  },

  // ─── GPT-OSS 系列 ─────────────────────────────────────────────
  {
    id: 'gpt-oss-120b',
    name: 'GPT-OSS 120B',
    provider: 'gpt-oss',
    providerLabel: 'GPT-OSS',
    description: '开源大模型120B参数版，综合能力强',
    tags: ['开源', '大参数'],
    contextLength: 128000,
  },

  // ─── 其他 NVIDIA NIM 可用模型 ─────────────────────────────────
  {
    id: 'qwen-2.5-72b',
    name: 'Qwen 2.5 72B',
    provider: 'qwen',
    providerLabel: '通义千问',
    description: 'Qwen 2.5系列高性价比版本',
    tags: ['高性价比'],
    contextLength: 128000,
  },
  {
    id: 'qwen-2.5-coder-32b',
    name: 'Qwen 2.5 Coder 32B',
    provider: 'qwen',
    providerLabel: '通义千问',
    description: 'Qwen代码专精模型，辅助世界观规则设计',
    tags: ['专精'],
    contextLength: 128000,
  },
  {
    id: 'deepseek-r1',
    name: 'DeepSeek R1',
    provider: 'deepseek',
    providerLabel: '深度求索',
    description: 'DeepSeek推理专精版，深度思考和规划',
    tags: ['推理强', '深度思考'],
    contextLength: 128000,
    thinking: true,
  },
  {
    id: 'llama-3.1-405b',
    name: 'Llama 3.1 405B',
    provider: 'meta',
    providerLabel: 'Meta',
    description: 'Llama 3.1超大参数版本',
    tags: ['大参数', '开源'],
    contextLength: 128000,
  },
  {
    id: 'llama-3.1-70b',
    name: 'Llama 3.1 70B',
    provider: 'meta',
    providerLabel: 'Meta',
    description: 'Llama 3.1均衡版本，速度快',
    tags: ['快速', '开源'],
    contextLength: 128000,
  },
  {
    id: 'mistral-small',
    name: 'Mistral Small',
    provider: 'mistral',
    providerLabel: 'Mistral',
    description: 'Mistral轻量版，响应极快',
    tags: ['快速', '轻量'],
    contextLength: 128000,
  },
  {
    id: 'nemotron-70b',
    name: 'Nemotron 70B',
    provider: 'nvidia',
    providerLabel: 'NVIDIA',
    description: 'NVIDIA Nemotron 70B，均衡高效',
    tags: ['均衡'],
    contextLength: 128000,
  },
  {
    id: 'phi-4',
    name: 'Phi-4',
    provider: 'microsoft',
    providerLabel: 'Microsoft',
    description: '微软Phi-4小参数高效率模型',
    tags: ['轻量', '快速'],
    contextLength: 128000,
  },
  {
    id: 'gemma-3-27b',
    name: 'Gemma 3 27B',
    provider: 'google',
    providerLabel: 'Google',
    description: 'Google Gemma 3开源模型',
    tags: ['开源'],
    contextLength: 128000,
  },
  {
    id: 'command-r-plus',
    name: 'Command R+',
    provider: 'cohere',
    providerLabel: 'Cohere',
    description: 'Cohere RAG专精模型，检索增强生成',
    tags: ['RAG专精'],
    contextLength: 128000,
  },
  {
    id: 'arctic',
    name: 'Snowflake Arctic',
    provider: 'snowflake',
    providerLabel: 'Snowflake',
    description: 'Snowflake开源MoE架构模型',
    tags: ['开源', 'MoE'],
    contextLength: 128000,
  },
  {
    id: 'granite-34b',
    name: 'Granite 34B',
    provider: 'ibm',
    providerLabel: 'IBM',
    description: 'IBM Granite企业级模型',
    tags: ['企业级'],
    contextLength: 128000,
  },
  {
    id: 'starcoder2-15b',
    name: 'StarCoder2 15B',
    provider: 'bigcode',
    providerLabel: 'BigCode',
    description: '代码生成专精模型',
    tags: ['代码专精'],
    contextLength: 128000,
  },
  {
    id: 'mixtral-8x22b',
    name: 'Mixtral 8x22B',
    provider: 'mistral',
    providerLabel: 'Mistral',
    description: 'Mistral MoE架构，高效推理',
    tags: ['MoE', '高效'],
    contextLength: 128000,
  },
  {
    id: 'dbrx',
    name: 'DBRX',
    provider: 'databricks',
    providerLabel: 'Databricks',
    description: 'Databricks开源MoE模型',
    tags: ['开源', 'MoE'],
    contextLength: 128000,
  },
];

/** Model groupings for organized UI */
export const MODEL_GROUPS: { label: string; providers: string[] }[] = [
  { label: '🇨🇳 国内模型', providers: ['zhipu', 'deepseek', 'minimax', 'qwen', 'moonshot', 'yi'] },
  { label: '🌍 国际模型', providers: ['meta', 'nvidia', 'mistral', 'microsoft', 'google', 'cohere', 'snowflake', 'ibm', 'bigcode', 'databricks', 'seed', 'gpt-oss'] },
];

/** Get model by ID */
export function getModelById(id: string): AiModel | undefined {
  return AI_MODELS.find(m => m.id === id);
}

/** Default model */
export const DEFAULT_MODEL = 'glm-5.1';
