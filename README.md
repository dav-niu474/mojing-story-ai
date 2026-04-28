# 墨境 · MoJing — AI网文创作平台

> AI驱动的全流程网文创作引擎，从灵感到成稿，一键生成。

---

## 项目简介

**墨境（MoJing）** 是一款基于 NVIDIA NIM 大模型的全流程 AI 网文创作平台。不同于传统写作工具的"手动输入+AI辅助"模式，墨境采用 **AI Pipeline 驱动的一键创作流程**——只需一个创意种子，AI 即可自动完成：创意展开 → 世界观构建 → 大纲生成 → 章节规划 → 场景扩写 → 正文润色，全流程结果自动持久化到数据库。

### 核心理念

- **AI 优先**：创作者提供创意，AI 完成执行，而非 AI 仅做润色工具
- **全流程覆盖**：从灵感到成稿的完整创作链路，每一步都可人工干预或全交给 AI
- **自动持久化**：AI 生成的所有内容（角色、地点、设定、大纲、章节）自动保存，无需手动复制
- **多模型选择**：30+ NVIDIA NIM 模型可选，从中文专精到通用大模型到轻量快速，按需切换

---

## 功能一览

### 已上线功能（v1.0）

| 模块 | 功能 | 说明 |
|------|------|------|
| **一键创作 Pipeline** | 6步AI流水线 | 创意→世界观→大纲→章节→正文→润色，每步自动持久化 |
| **项目管理** | 创建/删除/切换 | 多项目并行管理，独立世界观和章节体系 |
| **世界观构建** | 角色/地点/设定/势力 | 4类实体完整 CRUD，AI 可扩展已有设定 |
| **大纲系统** | 多幕大纲 + 章节节拍 | 层级结构，AI 自动规划情节节奏 |
| **写作工作台** | 章节编辑 + 版本历史 | 多版本对比，AI 续写/扩写/润色 |
| **素材库** | 模板/参考/灵感/生成器 | 分类管理，跨项目共享素材 |
| **版本管理** | 快照 + 变更提案 | OpenSpec 风格，proposed→approved→applied 工作流 |
| **AI 助手** | 上下文感知对话 | 自动注入当前项目世界观/角色信息作为上下文 |
| **流式输出** | SSE 实时流式生成 | 打字机效果，支持中途取消 |
| **多模型选择** | 30+ NVIDIA NIM 模型 | 中文推荐/通用/推理/轻量四大分类，14个已验证模型 |

### 支持的 AI 模型

#### 中文创作推荐（4款已验证）
| 模型 | 参数 | 特点 |
|------|------|------|
| GLM-5.1 | 128K上下文 | 智谱旗舰，中文创作首选（默认模型） |
| DeepSeek V4 Pro | 128K上下文 | 推理+创作顶尖，中文流畅 |
| Kimi K2.5 | 200K上下文 | 超长上下文，长篇创作利器 |
| Step 3.5 Flash | 128K上下文 | 速度快质量高，实时辅助 |

#### 通用大模型（13款）
Llama 3.1 405B、Mistral Large 3 675B、Llama 4 Maverick、Llama 3.3 70B、Seed OSS 36B、GPT OSS 120B、Dracarys 70B、MiniMax M2.5 等

#### 代码/推理（7款）
Qwen 3 Coder 480B、Qwen 3.5 122B、Kimi K2 Thinking（深度思考版）、DeepSeek V3.1 等

#### 轻量快速（6款）
Llama 3.1 8B、Phi-4 Mini、Gemma 3 27B、Gemma 4 31B 等

---

## 技术架构

### 技术栈

```
Frontend:  Next.js 16 + TypeScript + Tailwind CSS 4 + shadcn/ui + Zustand
Backend:   Next.js API Routes + Prisma ORM
AI:        NVIDIA NIM API (OpenAI 兼容协议, SSE 流式输出)
Database:  PostgreSQL (Vercel Neon) / SQLite (本地开发)
Deploy:    Vercel (Serverless) + Caddy Gateway
```

### 系统架构图

```
┌─────────────────────────────────────────────────────┐
│                    用户浏览器                         │
│  ┌──────────┐ ┌──────────┐ ┌───────────┐ ┌───────┐ │
│  │ ProjectList│ │Dashboard │ │CreationPi│ │Writing│ │
│  └─────┬─────┘ └─────┬────┘ └─────┬─────┘ └───┬───┘ │
│        └──────────────┴────────────┴────────────┘     │
│                         │ fetch API                    │
├─────────────────────────┼─────────────────────────────┤
│                    Next.js 16                         │
│  ┌──────────────────────┴──────────────────────────┐  │
│  │              API Routes (App Router)              │  │
│  │  /api/projects  /api/ai/generate  /api/ai/stream │  │
│  │  /api/ai/pipeline  /api/ai/one-click  /api/ai/chat│  │
│  │  /api/projects/[id]/characters|locations|lore|... │  │
│  └──────────┬──────────────┬───────────────────────┘  │
│             │              │                           │
│  ┌──────────▼──────┐ ┌────▼────────────────────────┐ │
│  │  Prisma ORM     │ │  NVIDIA NIM Client           │ │
│  │  (db.ts)        │ │  (nvidia-nim.ts)             │ │
│  │  Auto-detect:   │ │  - nvidiaNimGenerate()       │ │
│  │  PostgreSQL/    │ │  - nvidiaNimStream()         │ │
│  │  SQLite         │ │  - streamToSse()             │ │
│  └──────┬──────────┘ └──────────────────────────────┘ │
├─────────┼────────────────────────────────────────────┤
│  ┌──────▼──────┐   ┌──────────────────────────────┐  │
│  │ PostgreSQL  │   │  NVIDIA NIM API               │  │
│  │ (Vercel Neon)│  │  integrate.api.nvidia.com/v1  │  │
│  │ 或 SQLite   │   │  30+ 模型, OpenAI兼容协议      │  │
│  └─────────────┘   └──────────────────────────────┘  │
└──────────────────────────────────────────────────────┘
```

### 数据库模型（12个）

| 模型 | 用途 |
|------|------|
| NovelProject | 项目管理，含体裁/字数/风格 |
| Character | 角色设定（性格/背景/能力/人物弧） |
| Location | 地点设定（历史/特征/氛围） |
| LoreItem | 世界观设定（规则/约束） |
| Faction | 势力组织（目标/成员/领地） |
| Outline | 大纲（幕/卷/弧，含关键事件） |
| Chapter | 章节（节拍/内容/字数/状态） |
| ChapterVersion | 章节版本（变更记录/来源追踪） |
| Material | 素材库（模板/参考/灵感/生成器） |
| VersionSnapshot | 版本快照（里程碑/检查点） |
| ChangeProposal | 变更提案（proposed→applied工作流） |
| AiConversation | AI对话记录（上下文/消息历史） |

### 项目结构

```
src/
├── app/
│   ├── page.tsx                    # 主页面（单页应用）
│   ├── layout.tsx                  # 全局布局
│   └── api/
│       ├── projects/               # 项目 CRUD
│       │   └── [id]/               # 子资源 CRUD
│       │       ├── characters/     # 角色
│       │       ├── locations/      # 地点
│       │       ├── lore/           # 设定
│       │       ├── factions/       # 势力
│       │       ├── outlines/       # 大纲
│       │       ├── chapters/       # 章节
│       │       ├── materials/      # 素材
│       │       ├── snapshots/      # 快照
│       │       └── changes/        # 变更提案
│       └── ai/
│           ├── generate/           # AI 单次生成
│           ├── stream/             # AI 流式生成 (SSE)
│           ├── chat/               # AI 对话
│           ├── pipeline/           # AI Pipeline 6步流水线
│           └── one-click/          # AI 一键创作
├── components/
│   ├── ProjectList.tsx             # 项目列表
│   ├── Dashboard.tsx               # 仪表盘
│   ├── CreationPipeline.tsx        # AI 创作流水线
│   ├── WorldBuilding.tsx           # 世界观构建
│   ├── OutlineView.tsx             # 大纲视图
│   ├── WritingView.tsx             # 写作工作台
│   ├── MaterialsView.tsx           # 素材库
│   ├── VersionsView.tsx            # 版本管理
│   ├── AiAssistant.tsx             # AI 助手
│   ├── ModelSelector.tsx           # 模型选择器
│   └── ui/                         # shadcn/ui 组件库
├── hooks/
│   └── use-ai-stream.ts            # SSE 流式消费 Hook
└── lib/
    ├── db.ts                       # Prisma 数据库（自动检测 PostgreSQL/SQLite）
    ├── nvidia-nim.ts               # NVIDIA NIM API 客户端
    ├── ai-prompts.ts               # AI 提示词（8种生成类型）
    ├── models.ts                   # 模型配置（30+ 模型）
    ├── store.ts                    # Zustand 全局状态
    ├── api.ts                      # API 调用层
    ├── types.ts                    # TypeScript 类型定义
    └── utils.ts                    # 工具函数
```

---

## 快速开始

### 环境要求

- Node.js 18+ / Bun
- NVIDIA NIM API Key（从 [build.nvidia.com](https://build.nvidia.com/) 获取）

### 本地开发

```bash
# 1. 克隆仓库
git clone https://github.com/dav-niu474/mojing-story-ai.git
cd mojing-story-ai

# 2. 安装依赖
bun install

# 3. 配置环境变量
cp .env.example .env
# 编辑 .env，填入:
#   DATABASE_URL=file:./db/custom.db
#   NVIDIA_API_KEY=nvapi-your-key-here

# 4. 初始化数据库
bun run db:push:local
bun run db:generate:local

# 5. 启动开发服务器
bun run dev
```

### Vercel 部署

1. Fork 本仓库到你的 GitHub
2. 在 Vercel 导入项目
3. 配置环境变量：
   - `DATABASE_URL`：PostgreSQL 连接串（推荐 Vercel Postgres / Neon）
   - `NVIDIA_API_KEY`：NVIDIA NIM API Key
4. 部署完成

---

## AI Pipeline 工作流

墨境的核心是 AI 驱动的 6 步创作流水线，每步结果自动持久化：

```
┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│  创意展开  │ →  │ 世界观构建 │ →  │ 大纲生成  │ →  │ 章节规划  │ →  │ 正文扩写  │ →  │ 润色优化  │
│ concept   │    │ world    │    │ outline  │    │ chapters │    │ writing  │    │ polish   │
└─────┬────┘    └─────┬────┘    └─────┬────┘    └─────┬────┘    └─────┬────┘    └─────┬────┘
      │               │               │               │               │               │
      ▼               ▼               ▼               ▼               ▼               ▼
  项目设定保存    角色/地点/设定    大纲+关键事件    章节标题+节拍    ChapterVersion   润色版本保存
  (NovelProject)  (4类实体)       (Outline)        (Chapter)       自动创建         (覆盖前备份)
```

### 一键创作

通过 `/api/ai/one-click` 接口，只需提供创意种子，AI 自动执行 concept → worldbuilding → outline 三步，即刻生成完整的项目骨架。

---

## 后期功能迭代计划

### Phase 1：创作体验增强（v1.1）— 预计 2-3 周

> 目标：让创作过程更流畅、更可控

| 功能 | 优先级 | 说明 |
|------|--------|------|
| **富文本编辑器** | P0 | 集成 MDX Editor / TipTap，替代纯文本 textarea，支持标题/加粗/列表/引用等格式 |
| **章节拖拽排序** | P1 | 基于 @dnd-kit 实现大纲和章节的拖拽重排 |
| **AI 生成进度可视化** | P1 | Pipeline 每步显示实时进度条和中间结果，不再"黑盒等待" |
| **生成结果预览确认** | P1 | AI 生成内容先展示预览，用户确认后再持久化，避免错误覆盖 |
| **角色关系图谱** | P2 | 可视化角色间关系网络（朋友/敌对/师徒/恋人等），力导向图展示 |
| **快捷键支持** | P2 | Ctrl+S 保存、Ctrl+Z 撤销、Ctrl+Enter 提交 AI 生成等 |

### Phase 2：智能创作引擎（v1.2）— 预计 3-4 周

> 目标：让 AI 更懂网文，更会写网文

| 功能 | 优先级 | 说明 |
|------|--------|------|
| **网文类型模板** | P0 | 玄幻/都市/修仙/系统流/无限流/规则怪谈等 15+ 类型模板，含专用 Prompt 和结构 |
| **拆文分析引擎** | P1 | 上传经典网文 → AI 自动拆解结构/角色/节奏/爽点 → 提取创作规律 → 素材入库 |
| **场景级仿写** | P1 | 选择经典场景模式（开篇/爽点/反转/伏笔/高潮），AI 按模式仿写并注入创意 |
| **一致性检查器** | P1 | AI 自动扫描全文，检测设定矛盾（角色能力变化/时间线错误/世界观冲突） |
| **上下文窗口优化** | P1 | 智能摘要策略：对话自动注入相关世界观/角色摘要，突破上下文限制 |
| **多模型协作** | P2 | 不同步骤使用不同模型：创意用 GLM-5.1、推理用 Kimi K2 Thinking、润色用 DeepSeek V4 Pro |
| **AI 记忆系统** | P2 | 跨章节记住角色状态/剧情进展/未解伏笔，避免 AI "遗忘"前文 |

### Phase 3：协作与分享（v2.0）— 预计 4-6 周

> 目标：从单人创作到协作共创

| 功能 | 优先级 | 说明 |
|------|--------|------|
| **用户认证系统** | P0 | NextAuth.js 集成，GitHub/Google/邮箱登录，项目按用户隔离 |
| **多用户协作** | P1 | WebSocket 实时协作编辑，类似 Google Docs 的多人同时写作 |
| **评论与批注** | P1 | 段落级评论、行内批注、@提及通知 |
| **作品分享** | P1 | 生成分享链接，读者可在线阅读，支持章节级发布控制 |
| **创作社区** | P2 | 作品广场、创作挑战、排行榜，发现优秀作品和创作者 |
| **模板市场** | P2 | 用户可发布/下载创作模板、Prompt 模板、世界观模板 |

### Phase 4：商业化与生态（v3.0）— 预计 6-8 周

> 目标：可持续的商业模型

| 功能 | 优先级 | 说明 |
|------|--------|------|
| **会员订阅** | P0 | 免费版（日限次）/ Pro 版（无限生成+高级模型）/ Team 版（协作+管理） |
| **Token 计费系统** | P0 | 精确追踪每用户的 AI 调用 Token 消耗，用量仪表盘 |
| **付费模型接入** | P1 | 支持 OpenAI GPT-4o / Claude / Gemini 等付费 API，用户自带 Key 或平台代扣 |
| **导出与出版** | P1 | 导出为 TXT/EPUB/PDF/DOCX，支持排版模板，一键生成电子书 |
| **API 开放平台** | P2 | 开放创作 API，允许第三方应用集成墨境的 AI 创作能力 |
| **插件系统** | P2 | 支持社区开发插件（自定义 Prompt 模板/生成器/分析器/可视化工具） |

### Phase 5：多模态与 AI 创新（v4.0）— 远期规划

> 目标：突破文本边界，AI 创作的全媒体化

| 功能 | 说明 |
|------|------|
| **AI 角色画像生成** | 根据角色描述自动生成人物立绘/头像（Stable Diffusion / DALL-E） |
| **AI 场景插画** | 关键场景自动配图，增强阅读沉浸感 |
| **AI 语音朗读** | TTS 生成有声小说，支持角色配音切换 |
| **AI 视频预告** | 为作品生成短视频预告片（图生视频技术） |
| **多语言翻译** | AI 自动翻译为英/日/韩等语言，一键出海 |
| **AI 编辑审稿** | 模拟专业编辑审稿：剧情评分/商业潜力评估/改进建议 |
| **Agent 自主创作** | AI Agent 自主完成长篇创作，人类仅做最终审核和方向指导 |

---

## 安全与隐私

- `.env` 文件已加入 `.gitignore`，绝对不会提交到代码仓库
- 所有 API Key 仅存储在环境变量中，不硬编码
- Vercel 环境变量加密存储
- 数据库连接使用 SSL 加密（Neon PostgreSQL）

---

## 技术选型说明

| 选型 | 理由 |
|------|------|
| **Next.js 16 + App Router** | React 全栈框架，API Routes 天然支持，Vercel 一键部署 |
| **NVIDIA NIM API** | 免费额度、30+ 模型、OpenAI 兼容协议、无需自建推理服务 |
| **Prisma ORM** | 类型安全的数据库操作，双 schema 支持 PostgreSQL/SQLite 无缝切换 |
| **Vercel Neon PostgreSQL** | Serverless 数据库，与 Vercel 深度集成，冷启动快 |
| **Zustand** | 轻量状态管理，无 boilerplate，适合中等复杂度 SPA |
| **shadcn/ui** | 高质量 UI 组件，可定制，无运行时依赖 |

---

## 链接

- **在线体验**：[mojing-story-ai.vercel.app](https://mojing-story-ai.vercel.app)
- **GitHub 仓库**：[github.com/dav-niu474/mojing-story-ai](https://github.com/dav-niu474/mojing-story-ai)
- **NVIDIA NIM**：[build.nvidia.com](https://build.nvidia.com/)

---

## License

MIT
