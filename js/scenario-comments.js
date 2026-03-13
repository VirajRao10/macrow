const defaultFormatter = new Intl.DateTimeFormat(undefined, {
  month: 'short',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit'
});

const hasCrypto = typeof globalThis !== 'undefined' && typeof globalThis.crypto !== 'undefined';
const randomId = () => {
  if (hasCrypto && typeof globalThis.crypto.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
};

const sanitizeComments = (raw) => {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((entry) => {
      if (!entry || typeof entry !== 'object') return null;
      const text = typeof entry.text === 'string' ? entry.text.trim() : '';
      if (!text) return null;
      const createdAt = Number(entry.createdAt) || Date.now();
      return { id: entry.id || randomId(), text, createdAt };
    })
    .filter(Boolean);
};

const normalizeScenario = (entry, defaults = {}) => {
  const base = entry && typeof entry === 'object' ? entry : {};
  return {
    ...base,
    params: { ...defaults, ...(base.params || {}) },
    comments: sanitizeComments(base.comments),
    favorite: Boolean(base.favorite)
  };
};

export function normalizeScenarios(raw, defaults = {}) {
  if (!Array.isArray(raw)) return [];
  return raw.map((entry) => normalizeScenario(entry, defaults));
}

export function addCommentToScenario(scenario, text, now = Date.now()) {
  if (!scenario || typeof scenario !== 'object') return null;
  if (typeof text !== 'string') return null;
  const cleaned = text.trim();
  if (!cleaned) return null;
  const comment = {
    id: randomId(),
    text: cleaned,
    createdAt: Number(now) || Date.now()
  };
  if (!Array.isArray(scenario.comments)) {
    scenario.comments = [];
  }
  scenario.comments.unshift(comment);
  return comment;
}

export function formatCommentTimestamp(value) {
  if (value == null) return '';
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return '';
  try {
    return defaultFormatter.format(date);
  } catch {
    return '';
  }
}
