import { beforeEach, describe, expect, it } from 'vitest';
import { authenticateUser, clearActiveUser, getActiveUser, loadUsers, registerUser, setActiveUser } from '../js/auth.js';

const localStorageMock = (() => {
  const store = Object.create(null);
  return {
    getItem(key) {
      return Object.prototype.hasOwnProperty.call(store, key) ? store[key] : null;
    },
    setItem(key, value) {
      store[key] = String(value);
    },
    removeItem(key) {
      delete store[key];
    },
    clear() {
      Object.keys(store).forEach((key) => delete store[key]);
    }
  };
})();

Object.defineProperty(globalThis, 'localStorage', {
  value: localStorageMock,
  configurable: true
});

describe('authentication helpers', () => {
  beforeEach(() => {
    localStorageMock.clear();
    clearActiveUser();
  });

  it('registers a teacher account and stores hashed credentials', async () => {
    const user = await registerUser({ username: 'TeacherOne', password: 'secure123', displayName: 'Lead Teacher', role: 'teacher' });
    expect(user.username).toBe('TeacherOne');
    expect(user.role).toBe('teacher');
    expect(user.displayName).toBe('Lead Teacher');
    const stored = loadUsers({ includeSensitive: true });
    expect(stored).toHaveLength(1);
    expect(stored[0].passwordHash).toBeDefined();
    expect(stored[0].salt).toBeDefined();
  });

  it('prevents duplicate usernames', async () => {
    await registerUser({ username: 'teacherone', password: 'another123', displayName: 'First', role: 'teacher' });
    await expect(registerUser({ username: 'teacherone', password: 'another123', displayName: 'Duplicate', role: 'teacher' })).rejects.toThrow('Username already exists');
  });

  it('authenticates valid credentials and rejects invalid ones', async () => {
    await registerUser({ username: 'studentA', password: 'student123', displayName: 'Learner', role: 'student' });
    const good = await authenticateUser({ username: 'StudentA', password: 'student123' });
    expect(good).not.toBeNull();
    expect(good?.role).toBe('student');
    expect(good?.displayName).toBe('Learner');
    const bad = await authenticateUser({ username: 'studentA', password: 'wrong-password' });
    expect(bad).toBeNull();
  });

  it('tracks the active user session', async () => {
    const user = await registerUser({ username: 'teacherX', password: 'abc12345', displayName: 'Teacher X', role: 'teacher' });
    setActiveUser(user);
    const active = getActiveUser();
    expect(active?.username).toBe('teacherX');
    clearActiveUser();
    expect(getActiveUser()).toBeNull();
  });
});
