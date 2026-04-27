'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard,
  Globe,
  ListTree,
  PenTool,
  Archive,
  GitBranch,
  Bot,
  Menu,
  X,
  BookOpen,
  ChevronLeft,
} from 'lucide-react'
import { useAppStore } from '@/lib/store'
import { api } from '@/lib/api'
import type { ViewMode, NovelProject } from '@/lib/types'
import { ProjectList } from '@/components/ProjectList'
import { Dashboard } from '@/components/Dashboard'
import { WorldBuilding } from '@/components/WorldBuilding'
import { OutlineView } from '@/components/OutlineView'
import { WritingView } from '@/components/WritingView'
import { MaterialsView } from '@/components/MaterialsView'
import { VersionsView } from '@/components/VersionsView'
import { AiAssistant } from '@/components/AiAssistant'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

const navItems: { view: ViewMode; label: string; icon: React.ElementType }[] = [
  { view: 'dashboard', label: '总览', icon: LayoutDashboard },
  { view: 'worldbuilding', label: '世界观', icon: Globe },
  { view: 'outline', label: '大纲', icon: ListTree },
  { view: 'writing', label: '写作', icon: PenTool },
  { view: 'materials', label: '素材', icon: Archive },
  { view: 'versions', label: '版本', icon: GitBranch },
  { view: 'ai-assistant', label: 'AI助手', icon: Bot },
]

function ViewRenderer({ view }: { view: ViewMode }) {
  switch (view) {
    case 'projects':
      return <ProjectList />
    case 'dashboard':
      return <Dashboard />
    case 'worldbuilding':
      return <WorldBuilding />
    case 'outline':
      return <OutlineView />
    case 'writing':
      return <WritingView />
    case 'materials':
      return <MaterialsView />
    case 'versions':
      return <VersionsView />
    case 'ai-assistant':
      return <AiAssistant />
    default:
      return <Dashboard />
  }
}

export default function Home() {
  const {
    currentView,
    currentProject,
    setCurrentView,
    setCurrentProject,
    setProjects,
    sidebarCollapsed,
    setSidebarCollapsed,
    setLoading,
  } = useAppStore()

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  // Load projects on mount
  useEffect(() => {
    async function loadProjects() {
      setLoading(true)
      try {
        const projects = await api.getProjects()
        setProjects(projects as NovelProject[])
      } catch (err) {
        console.error('Failed to load projects:', err)
      } finally {
        setLoading(false)
      }
    }
    loadProjects()
  }, [setProjects, setLoading])

  const handleNavClick = (view: ViewMode) => {
    setCurrentView(view)
    setMobileMenuOpen(false)
  }

  const handleBackToProjects = () => {
    setCurrentProject(null)
    setCurrentView('projects')
    setMobileMenuOpen(false)
  }

  const isProjectOpen = currentView !== 'projects' && currentProject

  return (
    <TooltipProvider delayDuration={200}>
      <div className="h-screen flex flex-col bg-background overflow-hidden">
        {/* Header */}
        <header className="h-14 flex-shrink-0 flex items-center justify-between px-4 border-b bg-gradient-to-r from-stone-900 via-stone-800 to-amber-900/80 text-white relative z-50">
          <div className="flex items-center gap-3">
            {/* Mobile menu toggle */}
            {isProjectOpen && (
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden text-white hover:bg-white/10"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </Button>
            )}

            {/* Logo & Title */}
            <div
              className="flex items-center gap-2 cursor-pointer"
              onClick={handleBackToProjects}
            >
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-orange-600 flex items-center justify-center shadow-lg">
                <BookOpen className="h-4 w-4 text-white" />
              </div>
              <h1 className="text-lg font-bold tracking-wide">
                墨境
                <span className="text-amber-300/80 ml-1 text-sm font-normal">
                  AI网文创作平台
                </span>
              </h1>
            </div>
          </div>

          {/* Right side - project info */}
          <div className="flex items-center gap-2">
            {isProjectOpen && (
              <div className="hidden sm:flex items-center gap-2 text-sm">
                <span className="text-amber-300/60">|</span>
                <span className="text-amber-100/90 font-medium truncate max-w-[200px]">
                  {currentProject.title}
                </span>
              </div>
            )}
          </div>
        </header>

        {/* Main layout */}
        <div className="flex-1 flex overflow-hidden">
          {/* Sidebar - Desktop */}
          {isProjectOpen && (
            <>
              {/* Desktop sidebar */}
              <aside
                className="hidden md:flex flex-col border-r bg-card transition-all duration-300 ease-in-out"
                style={{ width: sidebarCollapsed ? '64px' : '220px' }}
              >
                <div className="flex items-center justify-between p-3">
                  {!sidebarCollapsed && (
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      导航
                    </span>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-foreground"
                    onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                  >
                    <ChevronLeft className={`h-4 w-4 transition-transform ${sidebarCollapsed ? 'rotate-180' : ''}`} />
                  </Button>
                </div>
                <Separator />
                <ScrollArea className="flex-1 py-2">
                  <nav className="flex flex-col gap-1 px-2">
                    {navItems.map((item) => {
                      const Icon = item.icon
                      const isActive = currentView === item.view
                      return (
                        <Tooltip key={item.view}>
                          <TooltipTrigger asChild>
                            <Button
                              variant={isActive ? 'secondary' : 'ghost'}
                              className={`w-full justify-start gap-3 h-10 transition-all ${
                                sidebarCollapsed ? 'px-0 justify-center' : ''
                              } ${
                                isActive
                                  ? 'bg-amber-100 text-amber-900 hover:bg-amber-200 dark:bg-amber-900/30 dark:text-amber-200 dark:hover:bg-amber-900/50'
                                  : 'text-muted-foreground hover:text-foreground'
                              }`}
                              onClick={() => handleNavClick(item.view)}
                            >
                              <Icon className="h-5 w-5 flex-shrink-0" />
                              {!sidebarCollapsed && (
                                <span className="truncate">{item.label}</span>
                              )}
                            </Button>
                          </TooltipTrigger>
                          {sidebarCollapsed && (
                            <TooltipContent side="right">
                              {item.label}
                            </TooltipContent>
                          )}
                        </Tooltip>
                      )
                    })}
                  </nav>
                </ScrollArea>
                <Separator />
                <div className="p-3">
                  <Button
                    variant="outline"
                    className={`w-full ${sidebarCollapsed ? 'px-0' : ''} text-muted-foreground hover:text-foreground`}
                    onClick={handleBackToProjects}
                  >
                    <BookOpen className="h-4 w-4 flex-shrink-0" />
                    {!sidebarCollapsed && <span className="ml-2">项目列表</span>}
                  </Button>
                </div>
              </aside>

              {/* Mobile sidebar overlay */}
              <AnimatePresence>
                {mobileMenuOpen && (
                  <>
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="fixed inset-0 bg-black/50 z-40 md:hidden"
                      onClick={() => setMobileMenuOpen(false)}
                    />
                    <motion.aside
                      initial={{ x: -280 }}
                      animate={{ x: 0 }}
                      exit={{ x: -280 }}
                      transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                      className="fixed left-0 top-14 bottom-0 w-[280px] bg-card border-r z-50 md:hidden flex flex-col"
                    >
                      <div className="p-4">
                        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                          导航
                        </h2>
                      </div>
                      <Separator />
                      <ScrollArea className="flex-1 py-2">
                        <nav className="flex flex-col gap-1 px-3">
                          {navItems.map((item) => {
                            const Icon = item.icon
                            const isActive = currentView === item.view
                            return (
                              <Button
                                key={item.view}
                                variant={isActive ? 'secondary' : 'ghost'}
                                className={`w-full justify-start gap-3 h-11 ${
                                  isActive
                                    ? 'bg-amber-100 text-amber-900 hover:bg-amber-200 dark:bg-amber-900/30 dark:text-amber-200 dark:hover:bg-amber-900/50'
                                    : 'text-muted-foreground hover:text-foreground'
                                }`}
                                onClick={() => handleNavClick(item.view)}
                              >
                                <Icon className="h-5 w-5" />
                                <span>{item.label}</span>
                              </Button>
                            )
                          })}
                        </nav>
                      </ScrollArea>
                      <Separator />
                      <div className="p-4">
                        <Button
                          variant="outline"
                          className="w-full text-muted-foreground hover:text-foreground"
                          onClick={handleBackToProjects}
                        >
                          <BookOpen className="h-4 w-4 mr-2" />
                          返回项目列表
                        </Button>
                      </div>
                    </motion.aside>
                  </>
                )}
              </AnimatePresence>
            </>
          )}

          {/* Main content */}
          <main className="flex-1 overflow-hidden">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentView}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                className="h-full overflow-y-auto"
              >
                <ViewRenderer view={currentView} />
              </motion.div>
            </AnimatePresence>
          </main>
        </div>
      </div>
    </TooltipProvider>
  )
}
