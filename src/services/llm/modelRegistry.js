export const PROVIDERS = [
  { id: 'gemini', name: 'Google Gemini', keyUrl: 'https://aistudio.google.com/app/apikey' },
  { id: 'groq', name: 'Groq', keyUrl: 'https://console.groq.com/keys' }
];

// Prefer higher request quotas, keeping Gemma as the last resort.
export const MODELS = [
  { provider: 'gemini', model: 'gemini-3.5-flash-lite' },
  { provider: 'gemini', model: 'gemini-3.1-flash-lite' },
  { provider: 'groq', model: 'openai/gpt-oss-120b' },
  { provider: 'groq', model: 'openai/gpt-oss-20b' },
  { provider: 'gemini', model: 'gemini-3.8-flash' },
  { provider: 'gemini', model: 'gemini-3.6-flash' },
  { provider: 'gemini', model: 'gemma-4-31b-it' },
  { provider: 'gemini', model: 'gemma-4-26b-a4b-it' }
];
