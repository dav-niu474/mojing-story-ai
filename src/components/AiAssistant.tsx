'use client'

import { useState, useRef, useEffect } from 'react'
import { Bot, Send, Trash2, Sparkles } from 'lucide-react'
import { useAppStore } from '@/lib/store'
import { api } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Input } from '@/components/ui/input'

const CONTEXT_OPTIONS = [
  { value: 'world-building', label: '世界观构建' },
  { value: 'outline', label: '大纲规划' },
  { value: 'writing', label: '写作辅助' },
  { value: 'review', label: '审稿修改' },
]

export function AiAssistant() {
  const { currentProject, aiMessages, addAiMessage, clearAiMessages, aiLoading, setAiLoading } = useAppStore()
  const [input, setInput] = useState('')
  const [contextType, setContextType] = useState('writing')
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [aiMessages])

  async function handleSend() {
    if (!input.trim() || !currentProject || aiLoading) return

    const userMsg = {
      role: 'user' as const,
      content: input.trim(),
      timestamp: Date.now(),
    }
    addAiMessage(userMsg)
    setInput('')
    setAiLoading(true)

    try {
      const res = await api.aiChat(currentProject.id, userMsg.content, contextType)
      addAiMessage({
        role: 'assistant',
        content: res.response,
        timestamp: Date.now(),
      })
    } catch (err) {
      addAiMessage({
        role: 'assistant',
        content: '抱歉，AI助手暂时无法响应，请稍后重试。',
        timestamp: Date.now(),
      })
    } finally {
      setAiLoading(false)
      inputRef.current?.focus()
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 border-b px-4 sm:px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-orange-400 to-rose-500 flex items-center justify-center">
              <Bot className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground">AI创作助手</h2>
              <p className="text-sm text-muted-foreground">
                智能对话，辅助创作
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Context type selector */}
            <div className="hidden sm:flex items-center gap-1 bg-muted rounded-lg p-1">
              {CONTEXT_OPTIONS.map((opt) => (
                <Button
                  key={opt.value}
                  variant={contextType === opt.value ? 'secondary' : 'ghost'}
                  size="sm"
                  className="text-xs h-7"
                  onClick={() => setContextType(opt.value)}
                >
                  {opt.label}
                </Button>
              ))}
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="text-muted-foreground"
              onClick={clearAiMessages}
              title="清空对话"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Chat area */}
      <div className="flex-1 overflow-hidden">
        <div className="max-w-4xl mx-auto h-full flex flex-col px-4 sm:px-6">
          <ScrollArea className="flex-1 py-4">
            <div ref={scrollRef} className="space-y-4">
              {aiMessages.length === 0 && (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-orange-100 to-rose-100 dark:from-orange-900/20 dark:to-rose-900/20 flex items-center justify-center mb-4">
                    <Sparkles className="h-10 w-10 text-orange-400" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">AI创作助手已就绪</h3>
                  <p className="text-sm text-muted-foreground max-w-sm">
                    你可以问我关于世界观构建、大纲规划、角色设计、写作技巧等问题，
                    我会结合当前项目上下文为你提供帮助。
                  </p>
                  <div className="flex flex-wrap gap-2 mt-4 justify-center">
                    {[
                      '帮我设计一个金手指',
                      '如何写出吸引人的开头',
                      '帮我规划第一卷大纲',
                      '分析一下主角的人设',
                    ].map((q) => (
                      <Button
                        key={q}
                        variant="outline"
                        size="sm"
                        className="text-xs"
                        onClick={() => {
                          setInput(q)
                          inputRef.current?.focus()
                        }}
                      >
                        {q}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              {aiMessages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${
                      msg.role === 'user'
                        ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white'
                        : 'bg-muted text-foreground'
                    }`}
                  >
                    {msg.role === 'assistant' && (
                      <div className="flex items-center gap-1.5 mb-1">
                        <Bot className="h-3.5 w-3.5 text-orange-500" />
                        <span className="text-[10px] font-medium text-muted-foreground">AI助手</span>
                      </div>
                    )}
                    <div className="whitespace-pre-wrap">{msg.content}</div>
                  </div>
                </div>
              ))}

              {aiLoading && (
                <div className="flex justify-start">
                  <div className="bg-muted rounded-2xl px-4 py-3 text-sm">
                    <div className="flex items-center gap-2">
                      <Bot className="h-3.5 w-3.5 text-orange-500" />
                      <div className="flex gap-1">
                        <span className="w-2 h-2 rounded-full bg-foreground/30 animate-bounce [animation-delay:0ms]" />
                        <span className="w-2 h-2 rounded-full bg-foreground/30 animate-bounce [animation-delay:150ms]" />
                        <span className="w-2 h-2 rounded-full bg-foreground/30 animate-bounce [animation-delay:300ms]" />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Input area */}
          <div className="flex-shrink-0 pb-4 pt-2">
            {/* Mobile context selector */}
            <div className="sm:hidden flex items-center gap-1 mb-2 overflow-x-auto">
              {CONTEXT_OPTIONS.map((opt) => (
                <Button
                  key={opt.value}
                  variant={contextType === opt.value ? 'secondary' : 'ghost'}
                  size="sm"
                  className="text-xs h-6 px-2 flex-shrink-0"
                  onClick={() => setContextType(opt.value)}
                >
                  {opt.label}
                </Button>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                ref={inputRef}
                placeholder="输入你的问题或创作需求..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={aiLoading}
                className="flex-1"
              />
              <Button
                onClick={handleSend}
                disabled={!input.trim() || aiLoading}
                className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
