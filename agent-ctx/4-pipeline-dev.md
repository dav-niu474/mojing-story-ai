---
Task ID: 4
Agent: pipeline-dev
Task: Create AI-driven pipeline API routes with auto-persist

Work Log:
- Read existing files: schema.prisma, db.ts, nvidia-nim.ts, ai-prompts.ts, models.ts, api-utils.ts, generate/route.ts, projects/route.ts
- Created /api/ai/pipeline/route.ts with 6 pipeline steps
- Created /api/ai/one-click/route.ts for one-click project creation
- Each step auto-persists results to database
- Robust JSON parsing from AI responses (direct parse → code block → regex extraction)
- Lint passes with zero errors

Stage Summary:
- Pipeline API with 6 steps: concept, worldbuilding, outline, chapters, writing, polish
- One-click creation endpoint: creates project + runs concept → worldbuilding → outline
- All results auto-persist to DB (characters, locations, lore, factions, outlines, chapters, versions)
- Writing step creates ChapterVersion records for version tracking
- Polish step auto-saves pre-polish version before overwriting
