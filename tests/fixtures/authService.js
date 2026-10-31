const KEY = 'quiz-e2e-auth';
const listeners = new Set();
const readUser = () => JSON.parse(localStorage.getItem(KEY) || 'null');
const publish = (user) => {
  localStorage.setItem(KEY, JSON.stringify(user));
  listeners.forEach((listener) => listener(user));
};

export default {
  onAuthStateChanged(listener) {
    listeners.add(listener);
    queueMicrotask(() => listeners.has(listener) && listener(readUser()));
    return () => listeners.delete(listener);
  },
  async signInWithGoogle() {
    const user = {
      uid: 'test-alice',
      displayName: 'Test account',
      email: 'alice@example.test',
      emailVerified: true,
    };
    publish(user);
    return { success: true, user };
  },
  async signOut() {
    const count = Number(sessionStorage.getItem('quiz-e2e-signout-count') || 0);
    sessionStorage.setItem('quiz-e2e-signout-count', String(count + 1));
    if (sessionStorage.getItem('quiz-e2e-fail-signout')) return { success: false };
    publish(null);
    return { success: true };
  },
  getCurrentUser: readUser,
  async getIdToken(uid) {
    if (readUser()?.uid !== uid) throw new Error('Sign in to use App AI.');
    const response = await fetch(
      `http://127.0.0.1:5176/__test/token?uid=${encodeURIComponent(uid)}`
    );
    return (await response.json()).token;
  },
};
