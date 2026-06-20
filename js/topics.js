// macrow topic map — assigns each glossary term to a syllabus unit
// (3.1 – 3.7) for the Active Recall flashcard feature, and "cross-cutting"
// for terms that span multiple units.
//
// Strategy: build a per-module corpus from COURSE (title, blurb, outcomes,
// lesson titles, bodies, key terms, bullets). For each glossary term, score
// it against every module's corpus. Exact key-term matches get a heavy bonus.
// The highest-scoring module wins. Ties go to the first module the term
// matches.
//
// This is deterministic and runs at module-load — no manual curation of 374
// entries. If the course content changes, the mapping updates automatically.

import { COURSE, GLOSSARY } from './course.js';

// Stopwords: common words that match too many modules to be useful signals.
const STOPWORDS = new Set([
  'the', 'and', 'for', 'with', 'this', 'that', 'from', 'into', 'than', 'then',
  'when', 'what', 'where', 'which', 'who', 'how', 'are', 'was', 'were', 'been',
  'have', 'has', 'had', 'does', 'did', 'doing', 'would', 'should', 'could',
  'will', 'shall', 'may', 'might', 'must', 'can', 'cannot', 'could', 'about',
  'after', 'before', 'between', 'through', 'during', 'above', 'below', 'under',
  'over', 'same', 'other', 'such', 'more', 'less', 'most', 'least', 'very',
  'much', 'many', 'some', 'any', 'all', 'each', 'every', 'both', 'either',
  'neither', 'one', 'two', 'three', 'first', 'last', 'next', 'previous',
  'also', 'just', 'only', 'even', 'still', 'now', 'here', 'there', 'when',
  'why', 'yes', 'not', 'no', 'but', 'because', 'so', 'if', 'or', 'its',
  'their', 'they', 'them', 'these', 'those', 'your', 'you', 'our', 'ours',
  'than', 'out', 'use', 'using', 'used', 'make', 'made', 'see', 'seen',
  'high', 'low', 'big', 'small', 'new', 'old', 'long', 'short', 'large',
  'real', 'true', 'false', 'good', 'bad',
]);

function tokenize(text) {
  if (!text) return new Set();
  return new Set(
    text.toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter(w => w.length > 3 && !STOPWORDS.has(w))
  );
}

// Build per-module corpus once at module load.
const MODULE_CORPORA = {};
const MODULE_KEY_TERMS = {}; // exact lowercase terms per module for bonus scoring
COURSE.forEach(mod => {
  const words = new Set();
  const addText = (s) => tokenize(s).forEach(w => words.add(w));
  addText(`${mod.title} ${mod.blurb}`);
  mod.outcomes?.forEach(addText);
  mod.lessons.forEach(l => {
    addText(l.title);
    l.body?.forEach(addText);
    l.bullets?.forEach(addText);
  });
  MODULE_CORPORA[mod.id] = words;

  const keys = new Set();
  mod.lessons.forEach(l => l.keyTerms?.forEach(k => keys.add(k.toLowerCase())));
  MODULE_KEY_TERMS[mod.id] = keys;
});

/**
 * Assigns a topic (3.1–3.7 or 'cross-cutting') to a glossary term.
 * @param {string} term - the term name
 * @param {string} definition - the term definition
 * @returns {string} module id like '3.1' or 'cross-cutting'
 */
export function topicForTerm(term, definition) {
  const lower = (term || '').toLowerCase();
  const text = `${term} ${definition || ''}`.toLowerCase();
  const textWords = tokenize(text);

  // Strong signal: exact key-term match against any module
  for (const mod of COURSE) {
    if (MODULE_KEY_TERMS[mod.id].has(lower)) return mod.id;
  }

  // Medium signal: definition contains the module's key term as a substring
  // (e.g. "GDP" appears in "Gross Domestic Product" body text)
  for (const mod of COURSE) {
    for (const kt of MODULE_KEY_TERMS[mod.id]) {
      if (kt.length > 3 && text.includes(kt)) return mod.id;
    }
  }

  // Weak signal: shared words with the module's corpus
  let best = 'cross-cutting';
  let bestScore = 0;
  for (const mod of COURSE) {
    const corpus = MODULE_CORPORA[mod.id];
    let score = 0;
    textWords.forEach(w => { if (corpus.has(w)) score++; });
    if (score > bestScore) { bestScore = score; best = mod.id; }
  }
  // If the best module only matched a single stopword-filtered word, leave it as
  // cross-cutting rather than guessing.
  return bestScore >= 1 ? best : 'cross-cutting';
}

/**
 * Returns an array of {term, definition, topic} objects grouped by topic.
 * Topics are syllabus units (3.1–3.7) plus 'cross-cutting' for shared terms.
 */
export function glossaryByTopic() {
  const grouped = {};
  COURSE.forEach(mod => { grouped[mod.id] = []; });
  grouped['cross-cutting'] = [];
  GLOSSARY.forEach(entry => {
    const topic = topicForTerm(entry.term, entry.definition);
    if (!grouped[topic]) grouped[topic] = [];
    grouped[topic].push({ ...entry, topic });
  });
  return grouped;
}

/**
 * Returns the count of glossary terms per topic.
 */
export function topicCounts() {
  const grouped = glossaryByTopic();
  const out = {};
  Object.keys(grouped).sort().forEach(k => { out[k] = grouped[k].length; });
  return out;
}

/**
 * Returns a human-readable title for a topic id.
 */
export function topicTitle(topicId) {
  if (topicId === 'cross-cutting') return 'Cross-cutting';
  const mod = COURSE.find(m => m.id === topicId);
  return mod ? `${mod.code} · ${mod.title}` : topicId;
}
