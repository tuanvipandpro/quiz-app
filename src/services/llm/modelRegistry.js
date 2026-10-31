export const AI_LABELS = { app: 'App AI', gemini: 'Google Gemini', groq: 'Groq' };
export const PROVIDERS = [
  {
    id: 'gemini',
    name: 'Google Gemini',
    keyUrl: 'https://aistudio.google.com/app/apikey',
    keySteps: [
      'Sign in to Google AI Studio with your Google account and open API Keys.',
      'Choose Create API key and select a project. If your existing project is missing, import it from Dashboard → Projects first.',
      'Copy the generated key, paste it below and select Save. You can then use Test connection to check it.',
    ],
    keyHelpUrl: 'https://ai.google.dev/gemini-api/docs/api-key',
  },
  {
    id: 'groq',
    name: 'Groq',
    keyUrl: 'https://console.groq.com/keys',
    keySteps: [
      'Sign in to GroqCloud and open API Keys.',
      'Choose Create API Key, give the key a name and create it.',
      'Copy the new key, paste it below and select Save. You can then use Test connection to check it.',
    ],
    keyHelpUrl: 'https://console.groq.com/docs/quickstart',
  },
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
  { provider: 'gemini', model: 'gemma-4-26b-a4b-it' },
];
