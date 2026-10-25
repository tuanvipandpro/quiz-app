import userService from '../userService';
import { createCredentialStore } from './credentials.js';
import { createRouter } from './router.js';
import { MODELS } from './modelRegistry.js';
import { generate as gemini } from './providers/gemini.js';
import { generate as groq } from './providers/groq.js';
import { createExplanationService } from './explanations.js';
import { LlmError } from './errors.js';

export const credentials = createCredentialStore(userService);
const providers = { gemini, groq };
const router = createRouter({ providers });
const explanations = createExplanationService({ credentials, router });
export function clearLlmSession(options) {
  explanations.reset();
  credentials.clearSession(options);
  router.reset();
}
export async function generateExplanation(question, options) {
  return explanations.generate(question, options);
}
export async function testConnection(provider, apiKey, signal) {
  if (!apiKey.trim()) throw new LlmError('NO_API_KEY', 'Enter an API key to test.');
  const model = MODELS.find(item => item.provider === provider)?.model;
  if (!model) throw new LlmError('INVALID_REQUEST', 'Unknown AI provider.');
  const result = await providers[provider]({ model, apiKey: apiKey.trim(), prompt: 'Reply with the single word OK.', signal, timeoutMs: 15_000, maxTokens: 1024 });
  // A successful test can clear an earlier authentication failure for this key.
  router.allowKey(provider, apiKey.trim());
  return result;
}
