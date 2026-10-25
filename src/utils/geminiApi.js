// Compatibility helpers for existing consumers. New UI uses services/llm directly.
import { credentials, generateExplanation } from '../services/llm';

export async function getApiKey(uid = null) {
  return (await credentials.getKeys(uid)).gemini || null;
}
export async function saveApiKey(apiKey, uid = null) {
  await credentials.saveKey('gemini', apiKey, uid);
}
export async function clearApiKey(uid = null) {
  await credentials.saveKey('gemini', '', uid);
}
export async function hasApiKey(uid = null) {
  return !!await getApiKey(uid);
}
export async function getExplanation(question, options, correctAnswer, uid = null) {
  const result = await generateExplanation({ question, options, answer: correctAnswer }, { uid });
  return `${result.text}\n\n---\n*${result.provider} · ${result.model}*`;
}
