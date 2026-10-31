export const AI_POLICY = Object.freeze({
  model: '@cf/meta/llama-3.2-3b-instruct',
  promptVersion: '1',
  userLimit: 5,
  globalLimit: 100,
  maxOutputTokens: 600,
  maxBodyBytes: 16 * 1024,
  maxPromptBytes: 12 * 1024,
  timeoutMs: 25_000,
  pendingLeaseMs: 120_000,
  retentionDays: 2,
});
export const utcDay = (now) => new Date(now).toISOString().slice(0, 10);
export const resetAt = (now) => Date.parse(utcDay(now)) + 86_400_000;
export class ApiError extends Error {
  constructor(code, status = 400) {
    super(code);
    this.code = code;
    this.status = status;
  }
}
