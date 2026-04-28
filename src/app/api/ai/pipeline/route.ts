import { NextRequest } from 'next/server';
import { db, ensureDbInitialized } from '@/lib/db';
import { successResponse, errorResponse, countWords } from '@/lib/api-utils';
import { buildStoryBibleContext, buildOutlineContext, buildRecentChaptersContext } from '@/lib/ai-prompts';
import { getNimModelId, DEFAULT_MODEL } from '@/lib/models';
import { nvidiaNimGenerateWithFallback } from '@/lib/nvidia-nim';

// Set max duration for Vercel serverless function
// Hobby plan max is 60s; Pro plan allows up to 300s
export const maxDuration = 60;

// ─── Types ───────────────────────────────────────────────────────────────

type PipelineStep = 'concept' | 'worldbuilding' | 'outline' | 'chapters' | 'writing' | 'polish';

interface PipelineRequest {
  projectId: string;
  step: PipelineStep;
  model?: string;
  input: Record<string, unknown>;
  options?: {
    temperature?: number;
    maxTokens?: number;
  };
}

// ─── JSON Parsing Utility ────────────────────────────────────────────────

/**
 * Robustly parse JSON from AI response:
 * 1. Try direct JSON.parse
 * 2. Try extracting JSON from markdown code blocks (```json ... ```)
 * 3. Try extracting first { ... } or [ ... ] block
 * 4. Return null if all fail
 */
function parseJsonResponse(text: string): unknown | null {
  // 1. Direct parse
  try {
    return JSON.parse(text);
  } catch {
    // continue
  }

  // 2. Extract from markdown code blocks
  const codeBlockMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/);
  if (codeBlockMatch) {
    try {
      return JSON.parse(codeBlockMatch[1]);
    } catch {
      // continue
    }
  }

  // 3. Extract first { ... } or [ ... ] block
  const jsonBlockMatch = text.match(/(\{[\s\S]*\})|(\[[\s\S]*\])/);
  if (jsonBlockMatch) {
    try {
      return JSON.parse(jsonBlockMatch[0]);
    } catch {
      // continue
    }
  }

  return null;
}

// ─── Context Loading ─────────────────────────────────────────────────────

/**
 * Load full project context from the database
 */
async function loadProjectContext(projectId: string) {
  const project = await db.novelProject.findUnique({
    where: { id: projectId },
    include: {
      characters: { orderBy: { sortOrder: 'asc' } },
      locations: { orderBy: { sortOrder: 'asc' } },
      loreItems: { orderBy: { sortOrder: 'asc' } },
      factions: { orderBy: { sortOrder: 'asc' } },
      outlines: {
        orderBy: { sortOrder: 'asc' },
        include: {
          chapters: {
            orderBy: { sortOrder: 'asc' },
            select: { id: true, title: true, sortOrder: true, status: true, summary: true, beats: true },
          },
        },
      },
      chapters: {
        orderBy: { sortOrder: 'desc' },
        take: 5,
        select: {
          id: true,
          title: true,
          content: true,
          summary: true,
          wordCount: true,
          sortOrder: true,
          beats: true,
        },
      },
    },
  });

  return project;
}

/**
 * Build context strings from project data
 */
function buildContextFromProject(project: NonNullable<Awaited<ReturnType<typeof loadProjectContext>>>) {
  const storyBible = buildStoryBibleContext(project);

  const outlineData = project.outlines.map((outline) => ({
    ...outline,
    chapters: outline.chapters.map((ch) => ({ ...ch, sortOrder: ch.sortOrder ?? 0 })),
  }));
  const outline = buildOutlineContext(outlineData);

  const recentChaptersData = project.chapters.map((ch) => ({ ...ch, sortOrder: ch.sortOrder ?? 0 }));
  const recentChapters = buildRecentChaptersContext(recentChaptersData);

  return { storyBible, outline, recentChapters };
}

// ─── Step Handlers ───────────────────────────────────────────────────────

/**
 * CONCEPT step: Generate story concept from a premise
 * Saves to Project.premise, Project.genre, Project.setting fields
 */
async function handleConcept(
  project: NonNullable<Awaited<ReturnType<typeof loadProjectContext>>>,
  input: Record<string, unknown>,
  model: string,
  options: { temperature: number; maxTokens: number },
) {
  const premise = (input.premise as string) || project.premise || '';
  if (!premise) {
    throw new Error('concept步骤需要提供premise参数（故事前提）');
  }

  const systemPrompt = `你是一个专业的网文创意策划师。根据给定的故事前提，生成完整的故事概念框架。

要求：
1. 分析故事类型和子类型
2. 提炼核心主题（2-4个）
3. 设计世界观设定概述
4. 构建核心冲突
5. 确定故事基调和风格

输出格式为JSON：
{
  "concept": "故事概念概述（200-500字）",
  "genre": "类型（如：玄幻、都市、科幻、仙侠等）",
  "subGenre": "子类型（如：热血升级、系统流、重生流等）",
  "themes": ["主题1", "主题2", "主题3"],
  "setting": "世界观设定概述（100-300字）",
  "conflicts": ["核心冲突1", "核心冲突2"],
  "writingStyle": "推荐文风（如：热血升级、暗黑写实、轻松幽默等）"
}`;

  const userMessage = `请根据以下故事前提，生成完整的故事概念框架：

故事前提：${premise}

${project.genre ? '已有类型参考：' + project.genre : ''}
${project.writingStyle ? '已有文风参考：' + project.writingStyle : ''}

请以JSON格式输出。`;

  const { text: aiResponse } = await nvidiaNimGenerateWithFallback(model, systemPrompt, [{ role: 'user', content: userMessage }], { temperature: options.temperature, max_tokens: options.maxTokens });
  const parsed = parseJsonResponse(aiResponse);

  if (!parsed || typeof parsed !== 'object') {
    throw new Error('AI返回的概念格式无法解析，请重试');
  }

  const data = parsed as Record<string, unknown>;

  // Persist to project
  const updatedProject = await db.novelProject.update({
    where: { id: project.id },
    data: {
      premise: (data.concept as string) || premise,
      genre: (data.genre as string) || project.genre,
      subGenre: (data.subGenre as string) || project.subGenre,
      setting: (data.setting as string) || project.setting,
      writingStyle: (data.writingStyle as string) || project.writingStyle,
      description: (data.concept as string) || project.description,
    },
  });

  return {
    step: 'concept',
    generated: data,
    saved: {
      project: updatedProject,
    },
  };
}

/**
 * WORLDBUILDING step: Generate world building elements
 * Saves Characters, Locations, LoreItems, Factions to DB
 */
async function handleWorldbuilding(
  project: NonNullable<Awaited<ReturnType<typeof loadProjectContext>>>,
  input: Record<string, unknown>,
  model: string,
  options: { temperature: number; maxTokens: number },
) {
  const concept = (input.concept as string) || project.premise || project.description || '';
  const genre = project.genre || '玄幻';

  const systemPrompt = `你是网文世界观设计师。根据故事概念创建精简世界观设定。

输出JSON格式（每个字段尽量简短，1-2句话即可）：
{
  "characters": [
    {"name":"角色名","role":"protagonist|antagonist|supporting","description":"简短描述","personality":"性格","abilities":"能力"}
  ],
  "locations": [
    {"name":"地点名","description":"简短描述"}
  ],
  "lores": [
    {"name":"设定名","description":"简短描述","constraints":"限制"}
  ],
  "factions": [
    {"name":"势力名","description":"简短描述"}
  ]
}

要求：3-4个角色，2-3个地点，2-3个设定，1-2个势力。每个字段1-2句话，不要写太长。`;

  const userMessage = `故事概念：${concept}
类型：${genre}

请输出精简的JSON格式世界观设定。`;

  const { text: aiResponse } = await nvidiaNimGenerateWithFallback(model, systemPrompt, [{ role: 'user', content: userMessage }], { temperature: options.temperature, max_tokens: options.maxTokens || 4096 });
  const parsed = parseJsonResponse(aiResponse);

  if (!parsed || typeof parsed !== 'object') {
    throw new Error('AI返回的世界观格式无法解析，请重试');
  }

  const data = parsed as Record<string, unknown>;

  // Use batch inserts for better performance (avoid N individual DB round-trips)
  const characters = (data.characters as Array<Record<string, unknown>>) || [];
  const locations = (data.locations as Array<Record<string, unknown>>) || [];
  const lores = (data.lores as Array<Record<string, unknown>>) || [];
  const factions = (data.factions as Array<Record<string, unknown>>) || [];

  // Delete existing worldbuilding data for this project (regenerate)
  await db.faction.deleteMany({ where: { projectId: project.id } });
  await db.loreItem.deleteMany({ where: { projectId: project.id } });
  await db.location.deleteMany({ where: { projectId: project.id } });
  await db.character.deleteMany({ where: { projectId: project.id } });

  // Batch create all entities using createMany
  const charCount = await db.character.createMany({
    data: characters.map((c, i) => ({
      projectId: project.id,
      name: (c.name as string) || `角色${i + 1}`,
      role: (c.role as string) || 'supporting',
      title: (c.title as string) || null,
      description: (c.description as string) || null,
      personality: (c.personality as string) || null,
      background: (c.background as string) || null,
      abilities: (c.abilities as string) || null,
      relationships: (c.relationships as string) || null,
      motivation: (c.motivation as string) || null,
      arc: (c.arc as string) || null,
      sortOrder: i,
    })),
  });

  const locCount = await db.location.createMany({
    data: locations.map((l, i) => ({
      projectId: project.id,
      name: (l.name as string) || `地点${i + 1}`,
      category: (l.category as string) || null,
      description: (l.description as string) || null,
      history: (l.history as string) || null,
      features: (l.features as string) || null,
      atmosphere: (l.atmosphere as string) || null,
      sortOrder: i,
    })),
  });

  const loreCount = await db.loreItem.createMany({
    data: lores.map((l, i) => ({
      projectId: project.id,
      name: (l.name as string) || `设定${i + 1}`,
      category: (l.category as string) || null,
      description: (l.description as string) || null,
      details: (l.details as string) || null,
      constraints: (l.constraints as string) || null,
      sortOrder: i,
    })),
  });

  const factionCount = await db.faction.createMany({
    data: factions.map((f, i) => ({
      projectId: project.id,
      name: (f.name as string) || `势力${i + 1}`,
      description: (f.description as string) || null,
      goals: (f.goals as string) || null,
      members: (f.members as string) || null,
      territory: (f.territory as string) || null,
      power: (f.power as string) || null,
      sortOrder: i,
    })),
  });

  return {
    step: 'worldbuilding',
    generated: data,
    saved: {
      characters: { count: charCount.count },
      locations: { count: locCount.count },
      lore: { count: loreCount.count },
      factions: { count: factionCount.count },
    },
  };
}

/**
 * OUTLINE step: Generate outline structure
 * Saves Outline + Chapters to DB
 */
async function handleOutline(
  project: NonNullable<Awaited<ReturnType<typeof loadProjectContext>>>,
  _input: Record<string, unknown>,
  model: string,
  options: { temperature: number; maxTokens: number },
) {
  const { storyBible, outline: existingOutline } = buildContextFromProject(project);

  const systemPrompt = `你是一个专业的网文大纲创作者。根据给定的世界观设定，生成完整的大纲结构。

要求：
1. 按照3-5幕结构组织大纲
2. 每幕有明确的核心冲突和解决方案
3. 标注关键转折点和爽点
4. 每幕包含5-15个章节
5. 节奏要有起伏，遵循"三章一小爽，十章一大爽"
6. 每个章节有概要和场景节拍提示
7. 伏笔和回收要清晰标注

输出格式为JSON：
{
  "outlines": [
    {
      "title": "卷/幕标题",
      "type": "act|volume|arc",
      "description": "概述（100-200字）",
      "keyEvents": ["关键事件1", "关键事件2"],
      "chapters": [
        {
          "title": "章节标题",
          "summary": "章节概要（50-100字）",
          "beats": "场景节拍提示"
        }
      ]
    }
  ]
}`;

  const userMessage = `请根据以下作品设定，生成完整的大纲结构：

=== 作品设定 ===
${storyBible}

${existingOutline ? '=== 已有大纲 ===\n' + existingOutline : ''}

请生成包含3-5幕的完整大纲，每幕5-15章，总计30-80章。

请以JSON格式输出。`;

  const { text: aiResponse } = await nvidiaNimGenerateWithFallback(model, systemPrompt, [{ role: 'user', content: userMessage }], { temperature: options.temperature, max_tokens: options.maxTokens || 4096 });
  const parsed = parseJsonResponse(aiResponse);

  if (!parsed || typeof parsed !== 'object') {
    throw new Error('AI返回的大纲格式无法解析，请重试');
  }

  const data = parsed as Record<string, unknown>;

  // Delete existing outlines and chapters (regenerate)
  await db.chapter.deleteMany({ where: { projectId: project.id } });
  await db.outline.deleteMany({ where: { projectId: project.id } });

  // Create outlines first (need their IDs for chapter foreign keys)
  const outlines = (data.outlines as Array<Record<string, unknown>>) || [];
  const savedOutlines = [];
  const allChapterData: Array<{
    projectId: string;
    outlineId: string;
    title: string;
    summary: string | null;
    beats: string | null;
    status: string;
    sortOrder: number;
  }> = [];

  for (let oi = 0; oi < outlines.length; oi++) {
    const o = outlines[oi];
    const keyEvents = Array.isArray(o.keyEvents) ? (o.keyEvents as string[]).join('\n') : (o.keyEvents as string) || null;

    const outline = await db.outline.create({
      data: {
        projectId: project.id,
        title: (o.title as string) || `第${oi + 1}幕`,
        type: (o.type as string) || 'act',
        description: (o.description as string) || null,
        keyEvents,
        sortOrder: oi,
      },
    });
    savedOutlines.push(outline);

    // Collect chapter data for batch insert
    const chapters = (o.chapters as Array<Record<string, unknown>>) || [];
    for (let ci = 0; ci < chapters.length; ci++) {
      const ch = chapters[ci];
      allChapterData.push({
        projectId: project.id,
        outlineId: outline.id,
        title: (ch.title as string) || `第${ci + 1}章`,
        summary: (ch.summary as string) || null,
        beats: (ch.beats as string) || null,
        status: 'planned',
        sortOrder: ci,
      });
    }
  }

  // Batch create all chapters
  const chapterResult = allChapterData.length > 0
    ? await db.chapter.createMany({ data: allChapterData })
    : { count: 0 };

  return {
    step: 'outline',
    generated: data,
    saved: {
      outlines: { count: savedOutlines.length },
      chapters: { count: chapterResult.count },
    },
  };
}

/**
 * CHAPTERS step: Generate chapter beats/details for existing chapters
 * Updates Chapter records with beats and richer summaries
 */
async function handleChapters(
  project: NonNullable<Awaited<ReturnType<typeof loadProjectContext>>>,
  input: Record<string, unknown>,
  model: string,
  options: { temperature: number; maxTokens: number },
) {
  const outlineId = input.outlineId as string | undefined;
  const { storyBible, outline } = buildContextFromProject(project);

  // Find chapters to generate beats for
  let chaptersToUpdate: Array<{ id: string; title: string; summary: string | null; beats: string | null; sortOrder: number }>;

  if (outlineId) {
    const outlineRecord = await db.outline.findUnique({
      where: { id: outlineId },
      include: { chapters: { orderBy: { sortOrder: 'asc' } } },
    });
    if (!outlineRecord) {
      throw new Error(`大纲 ${outlineId} 不存在`);
    }
    chaptersToUpdate = outlineRecord.chapters.map((ch) => ({
      id: ch.id,
      title: ch.title,
      summary: ch.summary,
      beats: ch.beats,
      sortOrder: ch.sortOrder ?? 0,
    }));
  } else {
    // Get all planned chapters without beats
    const plannedChapters = await db.chapter.findMany({
      where: {
        projectId: project.id,
        status: 'planned',
      },
      orderBy: { sortOrder: 'asc' },
      take: 20,
    });
    chaptersToUpdate = plannedChapters.map((ch) => ({
      id: ch.id,
      title: ch.title,
      summary: ch.summary,
      beats: ch.beats,
      sortOrder: ch.sortOrder ?? 0,
    }));
  }

  if (chaptersToUpdate.length === 0) {
    throw new Error('没有找到需要生成节拍的章节');
  }

  const chaptersList = chaptersToUpdate
    .map((ch, i) => `${i + 1}. 【${ch.title}】${ch.summary ? ' 概要：' + ch.summary : ''}`)
    .join('\n');

  const systemPrompt = `你是一个专业的网文章节节拍设计师。根据给定的大纲和章节概要，为每个章节生成详细的场景节拍。

要求：
1. 每个章节3-6个节拍
2. 每个节拍有明确的目的（推进剧情/塑造角色/渲染氛围/埋设伏笔）
3. 节拍之间有逻辑递进
4. 标注涉及的角色
5. 标注情绪走向

输出格式为JSON：
{
  "chapters": [
    {
      "title": "章节标题",
      "summary": "优化后的章节概要",
      "beats": "1.【开场】描述... → 2.【发展】描述... → 3.【高潮】描述... → 4.【收尾】描述..."
    }
  ]
}`;

  const userMessage = `请为以下章节生成详细的场景节拍：

=== 作品设定 ===
${storyBible}

=== 大纲 ===
${outline}

=== 待生成节拍的章节 ===
${chaptersList}

请为每个章节生成3-6个场景节拍，并优化章节概要。

请以JSON格式输出。`;

  const { text: aiResponse } = await nvidiaNimGenerateWithFallback(model, systemPrompt, [{ role: 'user', content: userMessage }], { temperature: options.temperature, max_tokens: options.maxTokens || 4096 });
  const parsed = parseJsonResponse(aiResponse);

  if (!parsed || typeof parsed !== 'object') {
    throw new Error('AI返回的章节节拍格式无法解析，请重试');
  }

  const data = parsed as Record<string, unknown>;
  const generatedChapters = (data.chapters as Array<Record<string, unknown>>) || [];

  // Update chapters with beats
  const updatedChapters = [];
  for (let i = 0; i < Math.min(generatedChapters.length, chaptersToUpdate.length); i++) {
    const gc = generatedChapters[i];
    const targetChapter = chaptersToUpdate[i];

    const updated = await db.chapter.update({
      where: { id: targetChapter.id },
      data: {
        beats: (gc.beats as string) || targetChapter.beats,
        summary: (gc.summary as string) || targetChapter.summary,
      },
    });
    updatedChapters.push(updated);
  }

  return {
    step: 'chapters',
    generated: data,
    saved: {
      chapters: updatedChapters,
    },
  };
}

/**
 * WRITING step: Write chapter content
 * Saves content to Chapter and creates a ChapterVersion
 */
async function handleWriting(
  project: NonNullable<Awaited<ReturnType<typeof loadProjectContext>>>,
  input: Record<string, unknown>,
  model: string,
  options: { temperature: number; maxTokens: number },
) {
  const chapterId = input.chapterId as string;
  if (!chapterId) {
    throw new Error('writing步骤需要提供chapterId参数');
  }

  const chapter = await db.chapter.findUnique({
    where: { id: chapterId },
    include: {
      outline: true,
    },
  });

  if (!chapter) {
    throw new Error(`章节 ${chapterId} 不存在`);
  }

  const { storyBible, outline } = buildContextFromProject(project);

  // Get previous chapter for context continuity
  const previousChapter = await db.chapter.findFirst({
    where: {
      projectId: project.id,
      sortOrder: { lt: chapter.sortOrder },
      status: { in: ['written', 'polished'] },
    },
    orderBy: { sortOrder: 'desc' },
    select: { id: true, title: true, content: true, summary: true },
  });

  const systemPrompt = `你是一个专业的网文章节写手。根据给定的章节概要、场景节拍和上下文，撰写完整的章节内容。

要求：
1. 严格遵循场景节拍展开
2. 保持角色性格一致，对话有角色特色
3. 叙事节奏张弛有度
4. 章节结尾设置钩子，吸引读者继续阅读
5. 描写要有画面感，避免空洞叙述
6. 避免大段设定灌输，用情节展示设定
7. 字数在2000-4000字之间
8. 直接输出章节正文，不需要标题`;

  let userMessage = `请根据以下信息，撰写章节内容：

=== 作品设定 ===
${storyBible}

=== 大纲 ===
${outline}

=== 当前章节 ===
标题：${chapter.title}
概要：${chapter.summary || '暂无'}
场景节拍：${chapter.beats || '暂无'}`;

  if (previousChapter) {
    userMessage += `

=== 上一章（用于衔接） ===
标题：${previousChapter.title}
${previousChapter.summary ? '概要：' + previousChapter.summary : ''}
${previousChapter.content ? '正文（末尾500字）：\n' + previousChapter.content.slice(-500) : ''}`;
  }

  userMessage += `

请直接输出章节正文。`;

  const { text: aiResponse } = await nvidiaNimGenerateWithFallback(model, systemPrompt, [{ role: 'user', content: userMessage }], { temperature: options.temperature, max_tokens: options.maxTokens || 4096 });

  const wordCount = countWords(aiResponse);

  // Save content to chapter
  const updatedChapter = await db.chapter.update({
    where: { id: chapterId },
    data: {
      content: aiResponse,
      wordCount,
      status: 'written',
    },
  });

  // Create a version record
  const version = await db.chapterVersion.create({
    data: {
      chapterId,
      content: aiResponse,
      wordCount,
      label: 'AI初稿',
      changeNote: 'AI自动生成',
      source: 'ai-writing',
    },
  });

  // Update project word count
  const totalWords = await db.chapter.aggregate({
    where: { projectId: project.id },
    _sum: { wordCount: true },
  });
  await db.novelProject.update({
    where: { id: project.id },
    data: { wordCount: totalWords._sum.wordCount || 0 },
  });

  return {
    step: 'writing',
    generated: { content: aiResponse, wordCount },
    saved: {
      chapter: updatedChapter,
      version,
    },
  };
}

/**
 * POLISH step: Polish chapter content
 * Updates Chapter.content and creates a new ChapterVersion
 */
async function handlePolish(
  project: NonNullable<Awaited<ReturnType<typeof loadProjectContext>>>,
  input: Record<string, unknown>,
  model: string,
  options: { temperature: number; maxTokens: number },
) {
  const chapterId = input.chapterId as string;
  if (!chapterId) {
    throw new Error('polish步骤需要提供chapterId参数');
  }

  const chapter = await db.chapter.findUnique({
    where: { id: chapterId },
  });

  if (!chapter) {
    throw new Error(`章节 ${chapterId} 不存在`);
  }

  if (!chapter.content) {
    throw new Error('该章节没有内容可以润色，请先使用writing步骤生成内容');
  }

  const { storyBible } = buildContextFromProject(project);

  const systemPrompt = `你是一个专业的网文润色编辑。对给定的章节文本进行润色优化。

要求：
1. 提升文笔质量，增强画面感和代入感
2. 优化对话，使其更有角色特色和张力
3. 调整节奏，增强阅读体验
4. 修正不通顺的表述
5. 不改变核心情节和设定
6. 保持原文的基本字数（可以适当增减10%）
7. 直接输出润色后的完整文本`;

  const userMessage = `请润色以下章节内容：

=== 作品设定（参考） ===
${storyBible}

=== 待润色章节 ===
标题：${chapter.title}
${chapter.summary ? '概要：' + chapter.summary : ''}

正文：
${chapter.content}

润色重点：${(input.focus as string) || '全面提升文笔质量，增强画面感和代入感'}

请直接输出润色后的完整章节文本。`;

  const { text: aiResponse } = await nvidiaNimGenerateWithFallback(model, systemPrompt, [{ role: 'user', content: userMessage }], { temperature: options.temperature, max_tokens: options.maxTokens || 4096 });

  const wordCount = countWords(aiResponse);

  // Save original as version before overwriting
  if (chapter.content) {
    await db.chapterVersion.create({
      data: {
        chapterId,
        content: chapter.content,
        wordCount: chapter.wordCount,
        label: '润色前',
        changeNote: '润色前自动保存',
        source: 'pre-polish',
      },
    });
  }

  // Update chapter with polished content
  const updatedChapter = await db.chapter.update({
    where: { id: chapterId },
    data: {
      content: aiResponse,
      wordCount,
      status: 'polished',
    },
  });

  // Create polished version
  const version = await db.chapterVersion.create({
    data: {
      chapterId,
      content: aiResponse,
      wordCount,
      label: 'AI润色',
      changeNote: 'AI润色优化',
      source: 'ai-polish',
    },
  });

  // Update project word count
  const totalWords = await db.chapter.aggregate({
    where: { projectId: project.id },
    _sum: { wordCount: true },
  });
  await db.novelProject.update({
    where: { id: project.id },
    data: { wordCount: totalWords._sum.wordCount || 0 },
  });

  return {
    step: 'polish',
    generated: { content: aiResponse, wordCount },
    saved: {
      chapter: updatedChapter,
      version,
    },
  };
}

// ─── Main Route Handler ──────────────────────────────────────────────────

const VALID_STEPS: PipelineStep[] = ['concept', 'worldbuilding', 'outline', 'chapters', 'writing', 'polish'];

// POST /api/ai/pipeline - Execute a pipeline step
export async function POST(request: NextRequest) {
  try {
    await ensureDbInitialized();
    const body = (await request.json()) as PipelineRequest;

    const { projectId, step, model, input = {}, options = {} } = body;

    // Validate required fields
    if (!projectId) {
      return errorResponse('projectId is required', 400);
    }
    if (!step || !VALID_STEPS.includes(step)) {
      return errorResponse(`Invalid step. Valid steps: ${VALID_STEPS.join(', ')}`, 400);
    }

    // Load project context
    const project = await loadProjectContext(projectId);
    if (!project) {
      return errorResponse('Project not found', 404);
    }

    // Determine model
    const nimModelId = getNimModelId(model || DEFAULT_MODEL);
    const generationOptions = {
      temperature: options.temperature ?? 0.7,
      maxTokens: options.maxTokens ?? 4096,
    };

    // Execute step
    let result;
    switch (step) {
      case 'concept':
        result = await handleConcept(project, input, nimModelId, generationOptions);
        break;
      case 'worldbuilding':
        result = await handleWorldbuilding(project, input, nimModelId, generationOptions);
        break;
      case 'outline':
        result = await handleOutline(project, input, nimModelId, generationOptions);
        break;
      case 'chapters':
        result = await handleChapters(project, input, nimModelId, generationOptions);
        break;
      case 'writing':
        result = await handleWriting(project, input, nimModelId, generationOptions);
        break;
      case 'polish':
        result = await handlePolish(project, input, nimModelId, generationOptions);
        break;
      default:
        return errorResponse(`Unknown step: ${step}`, 400);
    }

    return successResponse(result);
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Pipeline step failed';
    console.error(`[Pipeline Error] ${message}`, e);
    return errorResponse(message);
  }
}
