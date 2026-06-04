import axios from 'axios'

interface ModelConfig {
  provider: string
  model_name: string
  api_base: string
  api_key: string
}

export async function callExternalLLM(
  model: ModelConfig,
  systemPrompt: string,
  userMessage: string,
  context: any
): Promise<string> {
  const fullPrompt = `${systemPrompt}\n\n项目上下文：${JSON.stringify(context, null, 2)}\n\n用户消息：${userMessage}`

  switch (model.provider) {
    case 'openai':
      return callOpenAI(model, fullPrompt)
    case 'anthropic':
      return callAnthropic(model, fullPrompt)
    case 'deepseek':
      return callDeepSeek(model, fullPrompt)
    case 'zhipu':
      return callZhipu(model, fullPrompt)
    case 'moonshot':
      return callMoonshot(model, fullPrompt)
    case 'qwen':
      return callQwen(model, fullPrompt)
    case 'custom':
      return callOpenAICompatible(model, fullPrompt)
    default:
      throw new Error(`Unsupported provider: ${model.provider}`)
  }
}

async function callOpenAI(model: ModelConfig, prompt: string): Promise<string> {
  const res = await axios.post(
    `${model.api_base}/chat/completions`,
    {
      model: model.model_name,
      messages: [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.7,
    },
    {
      headers: {
        Authorization: `Bearer ${model.api_key}`,
        'Content-Type': 'application/json',
      },
      timeout: 60000,
    }
  )
  return res.data.choices[0].message.content
}

async function callAnthropic(model: ModelConfig, prompt: string): Promise<string> {
  const res = await axios.post(
    `${model.api_base}/messages`,
    {
      model: model.model_name,
      max_tokens: 4096,
      messages: [{ role: 'user', content: prompt }],
    },
    {
      headers: {
        'x-api-key': model.api_key,
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01',
      },
      timeout: 60000,
    }
  )
  return res.data.content[0].text
}

async function callDeepSeek(model: ModelConfig, prompt: string): Promise<string> {
  const res = await axios.post(
    `${model.api_base}/chat/completions`,
    {
      model: model.model_name,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
    },
    {
      headers: {
        Authorization: `Bearer ${model.api_key}`,
        'Content-Type': 'application/json',
      },
      timeout: 60000,
    }
  )
  return res.data.choices[0].message.content
}

async function callZhipu(model: ModelConfig, prompt: string): Promise<string> {
  const res = await axios.post(
    `${model.api_base}/chat/completions`,
    {
      model: model.model_name,
      messages: [{ role: 'user', content: prompt }],
    },
    {
      headers: {
        Authorization: `${model.api_key}`,
        'Content-Type': 'application/json',
      },
      timeout: 60000,
    }
  )
  return res.data.choices[0].message.content
}

async function callMoonshot(model: ModelConfig, prompt: string): Promise<string> {
  const res = await axios.post(
    `${model.api_base}/chat/completions`,
    {
      model: model.model_name,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
    },
    {
      headers: {
        Authorization: `Bearer ${model.api_key}`,
        'Content-Type': 'application/json',
      },
      timeout: 60000,
    }
  )
  return res.data.choices[0].message.content
}

async function callQwen(model: ModelConfig, prompt: string): Promise<string> {
  const res = await axios.post(
    `${model.api_base}/chat/completions`,
    {
      model: model.model_name,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
    },
    {
      headers: {
        Authorization: `Bearer ${model.api_key}`,
        'Content-Type': 'application/json',
      },
      timeout: 60000,
    }
  )
  return res.data.choices[0].message.content
}

async function callOpenAICompatible(model: ModelConfig, prompt: string): Promise<string> {
  const res = await axios.post(
    `${model.api_base}/chat/completions`,
    {
      model: model.model_name,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
    },
    {
      headers: {
        Authorization: `Bearer ${model.api_key}`,
        'Content-Type': 'application/json',
      },
      timeout: 60000,
    }
  )
  return res.data.choices[0].message.content
}
