---
Task ID: 3-b
Agent: frontend-main-page
Task: Create main page layout, ProjectList, Dashboard, and placeholder components

Work Log:
- Fixed `/src/lib/api.ts` - Updated response format to match actual API responses (removed `.project`/`.projects` extraction since API returns data directly)
- Created `/src/app/page.tsx` - Main page with header, collapsible sidebar, view routing, mobile-responsive design
  - Header: gradient background (stone-900 to amber-900/80), logo with amber-orange gradient, project title display
  - Sidebar: 7 navigation items with lucide-react icons, collapsible with tooltips, "项目列表" back button
  - Mobile: slide-out sidebar with overlay, hamburger menu toggle
  - View switching with framer-motion AnimatePresence transitions
  - Projects auto-loaded on mount via Zustand store
- Created `/src/components/ProjectList.tsx` - Project grid with create dialog
  - Project cards with: title, description, genre badge, status badge, word count, chapter count, time ago
  - Progress bar for projects with targetWords
  - Create project dialog with: title (required), description, genre select (13 genres), writing style select (5 styles), target words, premise textarea
  - Delete project with confirmation dialog
  - Empty state with call-to-action
  - Staggered card entrance animations
- Created `/src/components/Dashboard.tsx` - Project overview dashboard
  - Project header with title, status badge, genre, premise highlight
  - 4 stat cards: 总字数, 章节数, 角色数, 世界观条目数
  - Writing progress bar (when targetWords set)
  - Quick actions: AI生成大纲, 创建角色, 开始写作, AI创作助手
  - Recent chapters list (up to 5, sorted by updatedAt)
  - Auto-loads full project data from API on mount
- Created `/src/components/WorldBuilding.tsx` - Placeholder with tab navigation (角色/地点/设定/势力)
- Created `/src/components/OutlineView.tsx` - Placeholder with outline list and AI generation buttons
- Created `/src/components/WritingView.tsx` - Placeholder with chapter list and status badges
- Created `/src/components/MaterialsView.tsx` - Placeholder with material grid
- Created `/src/components/VersionsView.tsx` - Placeholder with tabs (快照/变更提案)
- Created `/src/components/AiAssistant.tsx` - Functional AI chat component
  - Context type selector (世界观构建/大纲规划/写作辅助/审稿修改)
  - Chat interface with user/assistant message bubbles
  - Loading animation with bouncing dots
  - Quick suggestion buttons
  - API integration via api.aiChat
- Updated `/src/app/layout.tsx` - Changed metadata to "墨境 · AI网文创作平台", lang="zh-CN"
- Updated `/src/app/globals.css` - Warm amber/stone color theme (oklch hue 55-75), custom scrollbar styling

Stage Summary:
- 9 component files created/modified
- All named exports match import statements (no default export issues)
- Lint passes with zero errors
- App loads successfully (HTTP 200)
- Full API integration: projects list, create, delete, project detail with relations
- Responsive design: mobile sidebar overlay, collapsible desktop sidebar
- Warm color palette: amber/orange/stone tones, no blue/indigo
- Framer Motion animations: card entrance stagger, page transitions, sidebar slide
