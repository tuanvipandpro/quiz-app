import authService from './authService';
import { createAppAiClient } from './llm/appAiClient.js';

export default createAppAiClient({
  baseUrl: import.meta.env.VITE_APP_AI_URL || '',
  getToken: (uid) => authService.getIdToken(uid),
});
