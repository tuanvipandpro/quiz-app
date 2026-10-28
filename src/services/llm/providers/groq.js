import { requestJson } from '../http.js';
import { LlmError } from '../errors.js';

export async function generate({
  model,
  apiKey,
  prompt,
  signal,
  timeoutMs,
  maxTokens = 3072,
  fetchImpl,
}) {
  const data = await requestJson('https://api.groq.com/openai/v1/chat/completions', {
    apiKey: { Authorization: `Bearer ${apiKey}` },
    signal,
    timeoutMs,
    fetchImpl,
    body: {
      model,
      messages: [{ role: 'user', content: prompt }],
      max_completion_tokens: maxTokens,
    },
  });
  const choice = data.choices?.[0];
  if (choice?.finish_reason === 'content_filter' || choice?.message?.refusal) {
    throw new LlmError('BLOCKED', 'The AI provider declined to explain this content.');
  }
  const text = choice?.message?.content?.trim();
  if (!text) throw new LlmError('EMPTY_RESPONSE', 'The model returned no explanation.');
  return { text, model: data.model || model };
}
