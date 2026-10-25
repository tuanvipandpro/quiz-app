import { requestJson } from '../http.js';
import { LlmError } from '../errors.js';

export async function generate({ model, apiKey, prompt, signal, timeoutMs, maxTokens = 3072, fetchImpl }) {
  const data = await requestJson(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    apiKey: { 'x-goog-api-key': apiKey }, signal, timeoutMs, fetchImpl,
    body: { contents: [{ role: 'user', parts: [{ text: prompt }] }], generationConfig: { maxOutputTokens: maxTokens } }
  });
  const candidate = data.candidates?.[0];
  if (data.promptFeedback?.blockReason || ['SAFETY', 'RECITATION', 'BLOCKLIST', 'PROHIBITED_CONTENT', 'SPII'].includes(candidate?.finishReason)) {
    throw new LlmError('BLOCKED', 'The AI provider declined to explain this content.');
  }
  const text = candidate?.content?.parts?.filter(part => !part.thought && typeof part.text === 'string').map(part => part.text).join('').trim();
  if (!text) throw new LlmError('EMPTY_RESPONSE', 'The model returned no explanation.');
  return { text, model: data.modelVersion || model };
}
