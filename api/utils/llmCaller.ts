/**
 * LLM 调用器 — 模板方法模式
 * 
 * 消除各 provider 的重复代码，统一请求构造、错误处理、超时重试。
 */

import axios from 'axios'

interface ModelConfig {
  provider: string
  model_name: string
  api_base: string
  api_key: string
}

interface ProviderTemplate {
  endpoint: string
  buildBody: (model: ModelConfig, messages: any[]) => object
  buildHeaders: (model: ModelConfig) => Record<string, string>
  extractContent: (data: any) => string
}

// === Provider 注册表 ===
const providers: Record<string, ProviderTemplate> = {
  openai: {
    endpoint: '/chat/completions',
    buildBody: (m, msgs) => ({ model: m.model_name, messages: msgs, temperature: 0.7 }),
    buildHeaders: (m) => ({ Authorization: `Bearer ${m.api_key}`, 'Content-Type': 'application/json' }),
    extractContent: (d) => d.choices[0].message.content,
  },
  deepseek: {
    endpoint: '/chat/completions',
    buildBody: (m, msgs) => ({ model: m.model_name, messages: msgs, temperature: 0.7 }),
    buildHeaders: (m) => ({ Authorization: `Bearer ${m.api_key}`, 'Content-Type': 'application/json' }),
    extractContent: (d) => d.choices[0].message.content,
  },
  zhipu: {
    endpoint: '/chat/completions',
    buildBody: (m, msgs) => ({ model: m.model_name, messages: msgs }),
    buildHeaders: (m) => ({ Authorization: m.api_key, 'Content-Type': 'application/json' }),
    extractContent: (d) => d.choices[0].message.content,
  },
  moonshot: {
    endpoint: '/chat/completions',
    buildBody: (m, msgs) => ({ model: m.model_name, messages: msgs, temperature: 0.7 }),
    buildHeaders: (m) => ({ Authorization: `Bearer ${m.api_key}`, 'Content-Type': 'application/json' }),
    extractContent: (d) => d.choices[0].message.content,
  },
  qwen: {
    endpoint: '/chat/completions',
    buildBody: (m, msgs) => ({ model: m.model_name, messages: msgs, temperature: 0.7 }),
    buildHeaders: (m) => ({ Authorization: `Bearer ${m.api_key}`, 'Content-Type': 'application/json' }),
    extractContent: (d) => d.choices[0].message.content,
  },
  anthropic: {
    endpoint: '/messages',
    buildBody: (m, msgs) => ({
      model: m.model_name,
      max_tokens: 4096,
      messages: msgs.filter((msg: any) => msg.role !== 'system'),
      ...(msgs.some((msg: any) => msg.role === 'system') && {
        system: msgs.find((msg: any) => msg.role === 'system')?.content
      }),
    }),
    buildHeaders: (m) => ({
      'x-api-key': m.api_key,
      'Content-Type': 'application/json',
      'anthropic-version': '2023-06-01',
    }),
    extractContent: (d) => d.content[0].text,
  },
  custom: {
    endpoint: '/chat/completions',
    buildBody: (m, msgs) => ({ model: m.model_name, messages: msgs, temperature: 0.7 }),
    buildHeaders: (m) => ({ Authorization: `Bearer ${m.api_key}`, 'Content-Type': 'application/json' }),
    extractContent: (d) => d.choices[0].message.content,
  },
}

/**
 * 统一 LLM 调用入口
 */
export async function callExternalLLM(
  model: ModelConfig,
  systemPrompt: string,
  userMessage: string,
  context: any
): Promise<string> {
  const provider = providers[model.provider]
  if (!provider) throw new Error(`Unsupported provider: ${model.provider}`)

  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: `项目上下文：${JSON.stringify(context, null, 2)}\n\n用户消息：${userMessage}` },
  ]

  return callWithTemplate(model, provider, messages)
}

/**
 * 模板方法：统一请求 → 提取 → 错误处理
 */
async function callWithTemplate(
  model: ModelConfig,
  tpl: ProviderTemplate,
  messages: any[]
): Promise<string> {
  const url = `${model.api_base}${tpl.endpoint}`
  const body = tpl.buildBody(model, messages)
  const headers = tpl.buildHeaders(model)

  let lastError: Error | null = null
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const res = await axios.post(url, body, { headers, timeout: 120000 })
      return tpl.extractContent(res.data)
    } catch (e: any) {
      lastError = e
      if (attempt < 2) await new Promise(r => setTimeout(r, 2000))
    }
  }
  throw lastError || new Error('LLM call failed')
}

/**
 * 流式调用（用于实时输出）
 */
export async function* callExternalLLMStream(
  model: ModelConfig,
  systemPrompt: string,
  userMessage: string,
  context: any
): AsyncGenerator<string> {
  const provider = providers[model.provider]
  if (!provider) throw new Error(`Unsupported provider: ${model.provider}`)

  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: `项目上下文：${JSON.stringify(context, null, 2)}\n\n用户消息：${userMessage}` },
  ]

  const url = `${model.api_base}${provider.endpoint}`
  const body = { ...provider.buildBody(model, messages), stream: true }
  const headers = provider.buildHeaders(model)

  const res = await axios.post(url, body, {
    headers,
    timeout: 120000,
    responseType: 'stream',
  })

  for await (const chunk of res.data) {
    const lines = chunk.toString().split('\n').filter((l: string) => l.startsWith('data: '))
    for (const line of lines) {
      const data = line.slice(6)
      if (data === '[DONE]') return
      try {
        const parsed = JSON.parse(data)
        const content = provider.extractContent(parsed)
        if (content) yield content
      } catch {}
    }
  }
}
