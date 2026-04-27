---
Task ID: 3-a
Agent: backend-builder
Task: Build all backend API routes

Work Log:
- Created `/src/lib/api-utils.ts` - Shared utilities (countWords, parseBody, errorResponse, successResponse)
- Created `/src/lib/ai-prompts.ts` - AI system prompts and context builders for novel writing
- Created `/src/app/api/projects/route.ts` - GET (list with stats), POST (create)
- Created `/src/app/api/projects/[id]/route.ts` - GET (with all relations), PUT, DELETE (cascade)
- Created `/src/app/api/projects/[id]/characters/route.ts` - Full CRUD
- Created `/src/app/api/projects/[id]/locations/route.ts` - Full CRUD
- Created `/src/app/api/projects/[id]/lore/route.ts` - Full CRUD
- Created `/src/app/api/projects/[id]/factions/route.ts` - Full CRUD
- Created `/src/app/api/projects/[id]/outlines/route.ts` - Full CRUD with chapter count
- Created `/src/app/api/projects/[id]/chapters/route.ts` - Full CRUD with word count calc, outlineId filter
- Created `/src/app/api/chapters/[chapterId]/versions/route.ts` - GET, POST (snapshot)
- Created `/src/app/api/projects/[id]/materials/route.ts` - Full CRUD
- Created `/src/app/api/projects/[id]/snapshots/route.ts` - GET, POST (create/restore)
- Created `/src/app/api/projects/[id]/changes/route.ts` - GET, POST, PUT (status transitions)
- Created `/src/app/api/ai/chat/route.ts` - POST (chat with AI, conversation persistence)
- Created `/src/app/api/ai/generate/route.ts` - POST (8 generation types: outline, chapter, continuation, polish, character, worldbuilding, beats, consistency-check)

Stage Summary:
- All 13 API route groups created (15 route files + 2 utility files)
- Lint passes with zero errors
- All endpoints tested via curl: projects, characters, locations, lore, factions, outlines, chapters, versions, snapshots, changes, materials
- AI routes (chat + generate) implemented with z-ai-web-dev-sdk integration
- Word count calculation supports Chinese characters + English words
- Snapshot creation serializes full project state; restore rebuilds from snapshot
- AI prompts are professional Chinese prompts specific to 网文 conventions
- Proper error handling with try/catch and appropriate HTTP status codes
