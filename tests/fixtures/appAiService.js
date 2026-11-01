import authService from './authService';
import { createAppAiClient } from '../../src/services/llm/appAiClient.js';

// Exercise the real HTTP client with an absent URL as well as the local Worker.
// Only vite.e2e.config.js replaces this service boundary; production never imports it.
export default createAppAiClient({
  baseUrl: sessionStorage.getItem('quiz-e2e-app-ai-disabled')
    ? ''
    : import.meta.env.VITE_APP_AI_URL,
  getToken: (uid) => authService.getIdToken(uid),
});
