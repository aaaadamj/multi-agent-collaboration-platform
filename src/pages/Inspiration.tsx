import { useState, useRef, useEffect } from 'react'
import {
  Send, User, Bot, Loader2, Lightbulb, Copy, CheckCircle, Sparkles,
  Wand2, Users, Wrench, MessageSquare
} from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface Message {
  id: number
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}

export default function Inspiration() {
  const [messages, setMessages] = useState<Message[]>([])
  const [inputMessage, setInputMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [copiedId, setCopiedId] = useState<number | null>(null)
  const chatEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // 初始化欢迎语
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([{
        id: Date.now(),
        role: 'assistant',
        content: `# 💡 灵感收集站

欢迎来到灵感收集站！我是您的 **AI 项目策划助手**，可以帮助您：

## 🎯 我能做什么

1. **需求挖掘**：深入理解您的想法，帮您梳理出完整的需求脉络
2. **Agent 推荐**：根据您的项目类型，推荐需要哪些 Agent 角色
3. **Prompt 生成**：为每个 Agent 生成专业、精准的提示词模板
4. **Skill 配置**：分析 Agent 需要哪些 Skill，并生成自定义 Skill 定义
5. **实现路径**：提供从想法到落地的完整技术路径建议

## 💬 开始对话

请描述您的项目想法，例如：

> "我想做一个在线教育平台，支持课程发布、视频播放、作业批改和学员管理"

我会帮您分析需要哪些 Agent、如何配置，以及完整的实现方案。

---

*Powered by DeepSeek V4 Pro*`,
        timestamp: new Date().toISOString(),
      }])
    }
  }, [])

  // 自动滚动
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async () => {
    if (!inputMessage.trim() || isLoading) return
    const userMsg: Message = {
      id: Date.now(),
      role: 'user',
      content: inputMessage,
      timestamp: new Date().toISOString(),
    }
    setMessages(prev => [...prev, userMsg])
    const sentContent = inputMessage
    setInputMessage('')
    setIsLoading(true)

    // 添加一个临时的 loading 消息
    const loadingId = Date.now() + 1
    setMessages(prev => [...prev, {
      id: loadingId,
      role: 'assistant',
      content: '',
      timestamp: new Date().toISOString(),
    }])

    try {
      const res = await fetch('/api/inspiration/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: sentContent, history: messages.slice(1) }),
      })
      const data = await res.json()
      if (data.success) {
        setMessages(prev => prev.map(m => m.id === loadingId ? {
          ...m,
          content: data.data,
          timestamp: new Date().toISOString(),
        } : m))
      } else {
        setMessages(prev => prev.map(m => m.id === loadingId ? {
          ...m,
          content: `抱歉，发生了错误：${data.error || '未知错误'}`,
          timestamp: new Date().toISOString(),
        } : m))
      }
    } catch (error) {
      setMessages(prev => prev.map(m => m.id === loadingId ? {
        ...m,
        content: '网络错误，请检查后端服务是否启动。',
        timestamp: new Date().toISOString(),
      } : m))
    } finally {
      setIsLoading(false)
    }
  }

  const handleCopy = async (content: string, id: number) => {
    await navigator.clipboard.writeText(content)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-64px-48px)] max-w-4xl mx-auto">
      {/* 顶部标题 */}
      <div className="flex items-center gap-3 mb-4 pb-4 border-b border-slate-200">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg">
          <Lightbulb className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-[#1e1b4b]">灵感收集站</h1>
          <p className="text-xs text-slate-500 flex items-center gap-1.5">
            <Sparkles className="w-3 h-3 text-amber-500" />
            AI 项目策划助手 · DeepSeek V4 Pro
          </p>
        </div>
      </div>

      {/* 快捷提示 */}
      {messages.length <= 1 && (
        <div className="grid grid-cols-2 gap-2 mb-4">
          {[
            { icon: MessageSquare, text: '帮我分析需求', prompt: '我有一个想法，但不确定该怎么做。' },
            { icon: Users, text: '推荐Agent角色', prompt: '我想做一个电商平台，需要哪些Agent？' },
            { icon: Wand2, text: '生成Agent Prompt', prompt: '请帮我为一个"前端开发工程师"Agent生成专业提示词。' },
            { icon: Wrench, text: '推荐Skill配置', prompt: '一个产品经理Agent需要哪些Skill？' },
          ].map((item, i) => (
            <button
              key={i}
              onClick={() => setInputMessage(item.prompt)}
              className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-600 hover:bg-amber-50 hover:border-amber-200 hover:text-amber-700 transition-all"
            >
              <item.icon className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="truncate">{item.text}</span>
            </button>
          ))}
        </div>
      )}

      {/* 消息列表 */}
      <div className="flex-1 overflow-auto space-y-4 mb-4 pr-1">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
            <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${
              msg.role === 'user'
                ? 'bg-amber-500'
                : 'bg-gradient-to-br from-indigo-500 to-purple-600'
            }`}>
              {msg.role === 'user' ? (
                <User className="w-4 h-4 text-white" />
              ) : (
                <Lightbulb className="w-4 h-4 text-white" />
              )}
            </div>
            <div className={`max-w-[85%] rounded-2xl px-4 py-3 ${
              msg.role === 'user'
                ? 'bg-amber-500 text-white'
                : 'bg-slate-100 text-slate-800'
            }`}>
              {msg.role === 'assistant' && msg.content === '' ? (
                <div className="flex gap-1.5 py-1">
                  <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              ) : msg.role === 'user' ? (
                <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
              ) : (
                <div className="relative group">
                  <div className="prose prose-sm max-w-none text-sm">
                    <ReactMarkdown remarkPlugins={[remarkGfm as any]}>
                      {msg.content}
                    </ReactMarkdown>
                  </div>
                  <button
                    onClick={() => handleCopy(msg.content, msg.id)}
                    className="absolute top-2 right-2 p-1.5 rounded-lg bg-white/80 border border-slate-200 text-slate-400 hover:text-blue-600 hover:border-blue-300 opacity-0 group-hover:opacity-100 transition-all"
                    title="复制内容"
                  >
                    {copiedId === msg.id ? (
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              )}
              <div className={`text-[10px] mt-1.5 ${msg.role === 'user' ? 'text-amber-100' : 'text-slate-400'}`}>
                {new Date(msg.timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          </div>
        ))}
        <div ref={chatEndRef} />
      </div>

      {/* 输入框 */}
      <div className="flex gap-2 items-end bg-white border border-slate-200 rounded-2xl p-2 shadow-sm">
        <textarea
          ref={textareaRef}
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="描述您的想法，按 Enter 发送..."
          className="flex-1 px-3 py-2 text-sm resize-none focus:outline-none min-h-[44px] max-h-40"
          rows={1}
          style={{ height: 'auto' }}
          onInput={(e) => {
            const target = e.target as HTMLTextAreaElement
            target.style.height = 'auto'
            target.style.height = Math.min(target.scrollHeight, 160) + 'px'
          }}
        />
        <button
          onClick={handleSend}
          disabled={isLoading || !inputMessage.trim()}
          className="w-10 h-10 bg-gradient-to-br from-[#1e1b4b] to-[#2d2a5e] text-white rounded-xl hover:from-[#2d2a5e] hover:to-[#3c3972] transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center flex-shrink-0"
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
        </button>
      </div>
    </div>
  )
}
