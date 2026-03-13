import { storageGet, storageSet, storageRemove } from './local-storage.js';

const USERS_KEY = 'macrow_users_v1';
const SESSION_KEY = 'macrow_active_user_v1';
const ALLOWED_ROLES = new Set(['teacher', 'student']);

const textEncoder = new TextEncoder();

function safeString(value = '') {
  return String(value ?? '').trim();
}

function normalizeUsername(value = '') {
  return safeString(value).toLowerCase();
}

function bufferToHex(buffer) {
  const arr = buffer instanceof ArrayBuffer ? new Uint8Array(buffer) : buffer;
  return Array.from(arr).map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

function getRandomBytes(length = 16) {
  const bytes = new Uint8Array(length);
  const rng = globalThis.crypto?.getRandomValues?.bind(globalThis.crypto);
  if (rng) {
    rng(bytes);
    return bytes;
  }
  for (let i = 0; i < length; i += 1) {
    bytes[i] = Math.floor(Math.random() * 256);
  }
  return bytes;
}

function loadUsersFromStorage() {
  try {
    const raw = storageGet(USERS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.warn('Unable to read stored users', err);
    return [];
  }
}

function saveUsersToStorage(users) {
  storageSet(USERS_KEY, JSON.stringify(users));
}

function findUser(users, normalized) {
  return users.find((user) => user.normalized === normalized);
}

function sanitizeUser(user) {
  return {
    username: user.username,
    displayName: user.displayName || user.username,
    role: user.role,
    createdAt: user.createdAt,
    normalized: user.normalized
  };
}

async function hashPassword(password, salt) {
  const data = textEncoder.encode(`${salt}:${password}`);
  const subtle = globalThis.crypto?.subtle;
  if (subtle?.digest) {
    const digest = await subtle.digest('SHA-256', data);
    return bufferToHex(digest);
  }
  let hash = 0;
  for (const byte of data) {
    hash = Math.imul(31, hash) + byte;
    hash = hash >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
}

function generateSalt() {
  const bytes = getRandomBytes(12);
  return bufferToHex(bytes);
}

export async function registerUser({ username, password, displayName = '', role = 'teacher' }) {
  const normalized = normalizeUsername(username);
  if (!normalized) throw new Error('Username cannot be empty');
  if (typeof password !== 'string' || password.length < 6) {
    throw new Error('Password must be at least 6 characters');
  }
  const trimmedRole = safeString(role || 'teacher');
  if (!ALLOWED_ROLES.has(trimmedRole)) throw new Error('Role not recognized');
  const users = loadUsersFromStorage();
  if (findUser(users, normalized)) throw new Error('Username already exists');
  const salt = generateSalt();
  const passwordHash = await hashPassword(password, salt);
  const newUser = {
    username: safeString(username),
    normalized,
    displayName: safeString(displayName) || safeString(username),
    role: trimmedRole,
    salt,
    passwordHash,
    createdAt: Date.now()
  };
  users.push(newUser);
  saveUsersToStorage(users);
  return sanitizeUser(newUser);
}

export async function authenticateUser({ username, password }) {
  const normalized = normalizeUsername(username);
  if (!normalized) return null;
  const users = loadUsersFromStorage();
  const user = findUser(users, normalized);
  if (!user) return null;
  const candidateHash = await hashPassword(password, user.salt);
  if (candidateHash !== user.passwordHash) return null;
  return sanitizeUser(user);
}

export function getActiveUser() {
  const normalized = storageGet(SESSION_KEY);
  if (!normalized) return null;
  const users = loadUsersFromStorage();
  const user = findUser(users, normalized);
  return user ? sanitizeUser(user) : null;
}

export function setActiveUser(payload) {
  let normalized;
  if (typeof payload === 'string') normalized = normalizeUsername(payload);
  else normalized = payload?.normalized;
  if (!normalized) return;
  storageSet(SESSION_KEY, normalized);
}

export function clearActiveUser() {
  storageRemove(SESSION_KEY);
}

export function loadUsers(options = {}) {
  const { includeSensitive = false } = options;
  const stored = loadUsersFromStorage();
  if (includeSensitive) return stored.map((user) => ({ ...user }));
  return stored.map(sanitizeUser);
}
