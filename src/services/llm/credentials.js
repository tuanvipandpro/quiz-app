const GUEST_STORAGE_KEY = 'quiz_llm_guest_keys';
const LEGACY_STORAGE_KEY = 'gemini_api_key';
const SUPPORTED = ['gemini', 'groq'];

export function keysFromProfile(profile = {}) {
  return {
    // A null key is an explicit deletion, not an invitation to restore the legacy key.
    gemini: Object.hasOwn(profile.llmProviders?.gemini || {}, 'apiKey')
      ? profile.llmProviders.gemini.apiKey || '' : profile.geminiApiKey || '',
    groq: profile.llmProviders?.groq?.apiKey || ''
  };
}

export function createCredentialStore(service, getStorage = () => globalThis.localStorage) {
  const cache = new Map();
  const latest = new Map();
  let generation = 0;
  function guestKeys() {
    const storage = getStorage();
    let keys = {};
    try { keys = JSON.parse(storage?.getItem(GUEST_STORAGE_KEY) || '{}') || {}; } catch { /* Ignore damaged guest data. */ }
    return { gemini: keys.gemini ?? storage?.getItem(LEGACY_STORAGE_KEY) ?? '', groq: keys.groq || '' };
  }
  return {
    prime(uid, profile) {
      const keys = keysFromProfile(profile);
      latest.set(uid, keys);
      cache.set(uid, Promise.resolve(keys));
    },
    clearSession({ clearGuest = false } = {}) {
      generation++;
      cache.clear();
      latest.clear();
      // Never copy a previous account's key into another profile or guest session.
      if (clearGuest) {
        getStorage()?.removeItem(GUEST_STORAGE_KEY);
        getStorage()?.removeItem(LEGACY_STORAGE_KEY);
      }
    },
    async getKeys(uid = null) {
      if (!uid) return guestKeys();
      if (!cache.has(uid)) {
        const pending = service.getUserProfile(uid).then(result => {
          if (!result.success) throw new Error('Could not load AI keys from your profile. Please retry.');
          const keys = keysFromProfile(result.user);
          if (cache.get(uid) === pending) latest.set(uid, keys);
          return keys;
        });
        cache.set(uid, pending);
        pending.catch(() => { if (cache.get(uid) === pending) cache.delete(uid); });
      }
      return { ...await cache.get(uid) };
    },
    async saveKey(provider, key, uid = null) {
      if (!SUPPORTED.includes(provider)) throw new Error('Unknown AI provider.');
      const value = key.trim();
      const started = generation;
      const before = await this.getKeys(uid);
      if (started !== generation) throw new Error('Your sign-in session changed. Please retry.');
      if (uid) {
        const result = await service.saveLlmApiKey(uid, provider, value || null);
        if (!result.success) throw new Error('Could not save the AI key to your profile. Please retry.');
        if (started === generation) {
          const next = { ...(latest.get(uid) || before), [provider]: value };
          latest.set(uid, next);
          cache.set(uid, Promise.resolve(next));
        }
      } else {
        getStorage().setItem(GUEST_STORAGE_KEY, JSON.stringify({ ...guestKeys(), [provider]: value }));
        getStorage().removeItem(LEGACY_STORAGE_KEY);
      }
    }
  };
}
