export class LlmError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = 'LlmError';
    this.code = code;
    Object.assign(this, details);
  }
}

export const cancelled = () => new LlmError('CANCELLED', 'Request cancelled.');
