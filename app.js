// macrow — IBDP Economics · Macroeconomics learning app.
// Routes: home, course, lesson, simulator, glossary, about.

import { GRAPH, defaults, clamp, lerp, computeFromParams, AD, ASshape, equilibrium, adLineSegment, SRAS_VIEWS, asPolyline } from './js/calculations.js';
import { buildScenarioUrl, parseScenarioPayloadFromUrl } from './js/scenario-share.js';
import { storageGet, storageSet } from './js/local-storage.js';
import { COURSE, GLOSSARY, GLOSSARY_SORTED } from './js/course.js';
import { getDiagram, DEFAULT_CAPTION } from './js/diagrams.js';
import { glossaryByTopic, topicTitle, topicForTerm } from './js/topics.js';
import { getQuiz, QUIZZES } from './js/quizzes.js';

// ---------- Tiny DOM helpers ----------
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
const el = (tag, attrs = {}, children = []) => {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') e.className = v;
    else if (k === 'dataset') Object.assign(e.dataset, v);
    else if (k.startsWith('on') && typeof v === 'function') e.addEventListener(k.slice(2), v);
    else if (v === false || v == null) continue;
    else if (v === true) e.setAttribute(k, '');
    else e.setAttribute(k, v);
  }
  for (const c of [].concat(children)) {
    if (c == null) continue;
    e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
  }
  return e;
};
const escapeHtml = (s) => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[c]));

// ---------- State ----------
const PROGRESS_KEY = 'macrow_progress_v2';
const SCENARIOS_KEY = 'macrow_scenarios_v2';
const THEME_KEY = 'macrow_theme_mode_v1';
const PROGRESS_COMPLETED_LESSONS_KEY = 'macrow_completed_lessons_v2';
const LAST_ROUTE_KEY = 'macrow_last_route_v2';
const ACCESSIBILITY_KEY = 'macrow_access';

function getProgress() {
  try { return JSON.parse(storageGet(PROGRESS_KEY) || '{}') || {}; }
  catch (_e) { return {}; }
}
function setProgress(p) { storageSet(PROGRESS_KEY, JSON.stringify(p || {})); }
function getCompletedLessons() {
  try { return JSON.parse(storageGet(PROGRESS_COMPLETED_LESSONS_KEY) || '[]') || []; }
  catch (_e) { return []; }
}
function setCompletedLessons(arr) { storageSet(PROGRESS_COMPLETED_LESSONS_KEY, JSON.stringify(arr || [])); }
function isLessonCompleted(lessonId) { return getCompletedLessons().includes(lessonId); }
function markLessonCompleted(lessonId) {
  const list = getCompletedLessons();
  if (!list.includes(lessonId)) {
    list.push(lessonId);
    setCompletedLessons(list);
  }
}
function totalLessons() { return COURSE.reduce((n, m) => n + m.lessons.length, 0); }
function completedLessonCount() { return getCompletedLessons().length; }

function getScenarios() {
  try { return JSON.parse(storageGet(SCENARIOS_KEY) || '[]') || []; }
  catch (_e) { return []; }
}
function setScenarios(s) { storageSet(SCENARIOS_KEY, JSON.stringify(s || [])); }

// ---------- Theme ----------
const ThemeMode = { LIGHT: 'light', DARK: 'dark' };
let currentTheme = ThemeMode.LIGHT;
function detectSystemDark() {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(prefers-color-scheme: dark)').matches;
}
function getPreferredTheme() {
  const stored = storageGet(THEME_KEY);
  if (stored === ThemeMode.LIGHT || stored === ThemeMode.DARK) return stored;
  return detectSystemDark() ? ThemeMode.DARK : ThemeMode.LIGHT;
}
function applyTheme(theme, { persist = true } = {}) {
  currentTheme = theme === ThemeMode.DARK ? ThemeMode.DARK : ThemeMode.LIGHT;
  document.documentElement.dataset.theme = currentTheme;
  if (persist) storageSet(THEME_KEY, currentTheme);
  const toggle = $('#themeToggle');
  if (toggle) {
    toggle.setAttribute('aria-pressed', currentTheme === ThemeMode.DARK ? 'true' : 'false');
    toggle.setAttribute('aria-label', currentTheme === ThemeMode.DARK ? 'Switch to light mode' : 'Switch to dark mode');
    const icon = toggle.querySelector('.themeToggle__icon');
    const label = toggle.querySelector('.themeToggle__label');
    if (icon) icon.textContent = currentTheme === ThemeMode.DARK ? '🌙' : '☀️';
    if (label) label.textContent = currentTheme === ThemeMode.DARK ? 'Dark' : 'Light';
  }
}
function initThemeToggle() {
  const toggle = $('#themeToggle');
  if (!toggle) return;
  toggle.addEventListener('click', () => {
    applyTheme(currentTheme === ThemeMode.DARK ? ThemeMode.LIGHT : ThemeMode.DARK);
  });
}

// ---------- Sidebar / drawer ----------
function initSidebarToggle() {
  const sidebar = $('.sidebar');
  const backdrop = $('.sidebarBackdrop');
  const openBtn = $('#btnSidebarOpen');
  const closeBtn = $('#btnSidebarClose');
  if (!sidebar) return;
  const open = () => {
    sidebar.classList.add('sidebar--open');
    backdrop?.classList.add('sidebarBackdrop--open');
    document.body.classList.add('sidebar-open');
    const first = sidebar.querySelector('.navBtn');
    if (first) setTimeout(() => first.focus(), 50);
  };
  const close = () => {
    sidebar.classList.remove('sidebar--open');
    backdrop?.classList.remove('sidebarBackdrop--open');
    document.body.classList.remove('sidebar-open');
    openBtn?.focus();
  };
  openBtn?.addEventListener('click', open);
  closeBtn?.addEventListener('click', close);
  backdrop?.addEventListener('click', close);
  // Focus trap
  sidebar.addEventListener('keydown', (e) => {
    if (e.key !== 'Tab') return;
    const focusables = $$('a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])', sidebar)
      .filter(el => !el.classList.contains('hidden'));
    if (!focusables.length) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });
  // Arrow key nav
  sidebar.addEventListener('keydown', (e) => {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    const items = $$('.navBtn', sidebar);
    const idx = items.indexOf(document.activeElement);
    if (idx === -1) return;
    e.preventDefault();
    const next = e.key === 'ArrowDown' ? (idx + 1) % items.length : (idx - 1 + items.length) % items.length;
    items[next].focus();
  });
}

// ---------- Router ----------
const ROUTES = ['home', 'course', 'simulator', 'glossary', 'about', 'recall'];
let currentRoute = { name: 'home', params: {} };

function navigate(name, params = {}) {
  if (!ROUTES.includes(name) && name !== 'module' && name !== 'lesson') name = 'home';
  currentRoute = { name, params };
  storageSet(LAST_ROUTE_KEY, JSON.stringify({ name, params }));
  render();
  // Close mobile drawer
  $('.sidebar')?.classList.remove('sidebar--open');
  $('.sidebarBackdrop')?.classList.remove('sidebarBackdrop--open');
  document.body.classList.remove('sidebar-open');
  // Scroll to top
  window.scrollTo({ top: 0, behavior: 'instant' });
  // Focus main for a11y
  $('#mainContent')?.focus();
}

function render() {
  // Show only the active view
  $$('.view').forEach(v => v.hidden = true);
  $$('.navBtn').forEach(b => b.removeAttribute('aria-current'));

  const navMap = { home: 'home', course: 'course', module: 'course', lesson: 'course', simulator: 'simulator', glossary: 'glossary', about: 'about', recall: 'recall' };
  const navName = navMap[currentRoute.name];
  $(`.navBtn[data-nav="${navName}"]`)?.setAttribute('aria-current', 'page');

  if (currentRoute.name === 'home') renderHome();
  else if (currentRoute.name === 'course') renderCourseIndex();
  else if (currentRoute.name === 'module') renderModuleView(currentRoute.params.moduleId);
  else if (currentRoute.name === 'lesson') renderLessonView(currentRoute.params.moduleId, currentRoute.params.lessonId);
  else if (currentRoute.name === 'simulator') renderSimulator();
  else if (currentRoute.name === 'glossary') renderGlossary();
  else if (currentRoute.name === 'about') renderAbout();
  else if (currentRoute.name === 'recall') renderRecall();
}

// ---------- HOME ----------
function renderHome() {
  $('.view--home').hidden = false;
  renderModuleGrid();
  renderProgress();
  renderContinueCard();
}

function renderProgress() {
  const total = totalLessons();
  const done = completedLessonCount();
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  const fill = $('#progressFill');
  const count = $('#progressCount');
  if (fill) fill.style.width = pct + '%';
  if (count) count.textContent = `${done} / ${total}`;
}

function renderContinueCard() {
  const card = $('#continueCard');
  if (!card) return;
  const last = getProgress().lastLesson;
  if (!last) { card.hidden = true; return; }
  const mod = COURSE.find(m => m.id === last.moduleId);
  const lesson = mod?.lessons.find(l => l.id === last.lessonId);
  if (!mod || !lesson) { card.hidden = true; return; }
  card.hidden = false;
  $('#continueMeta').textContent = `Pick up where you left off · ${mod.code}`;
  $('#continueTitle').textContent = lesson.title;
  $('#continueSub').textContent = `${mod.title} · ${lesson.minutes} min`;
}

function renderModuleGrid() {
  const grid = $('#moduleGrid');
  if (!grid) return;
  grid.innerHTML = '';
  COURSE.forEach(mod => {
    const done = mod.lessons.filter(l => isLessonCompleted(l.id)).length;
    const total = mod.lessons.length;
    const status = done === 0 ? 'not-started' : done === total ? 'completed' : 'in-progress';
    const statusText = done === 0 ? `${total} lessons` : `${done} / ${total} done`;
    const card = el('button', {
      class: 'moduleCard',
      type: 'button',
      onclick: () => navigate('module', { moduleId: mod.id }),
      'aria-label': `Open ${mod.code} ${mod.title}`,
    }, [
      el('div', { class: 'moduleCard__code' }, mod.code),
      el('div', { class: 'moduleCard__title' }, mod.title),
      el('div', { class: 'moduleCard__blurb' }, mod.blurb),
      el('div', { class: 'moduleCard__foot' }, [
        el('span', { class: 'moduleCard__count' }, statusText),
        el('span', { class: 'moduleCard__progress' + (status === 'in-progress' ? ' moduleCard__progress--inprogress' : '') },
          status === 'completed' ? '✓ Complete' : status === 'in-progress' ? 'In progress' : 'Start'),
      ]),
    ]);
    grid.appendChild(card);
  });
}

// ---------- COURSE ----------
let currentCourseFilter = 'all';
function renderCourseIndex() {
  $('.view--course').hidden = false;
  $('#courseIndex').hidden = false;
  $('#moduleView').hidden = true;
  const list = $('#moduleList');
  if (!list) return;
  list.innerHTML = '';
  let modules = COURSE;
  if (currentCourseFilter === 'inprogress') {
    modules = modules.filter(m => {
      const done = m.lessons.filter(l => isLessonCompleted(l.id)).length;
      return done > 0 && done < m.lessons.length;
    });
  } else if (currentCourseFilter === 'completed') {
    modules = modules.filter(m => m.lessons.every(l => isLessonCompleted(l.id)));
  }
  modules.forEach(mod => {
    const done = mod.lessons.filter(l => isLessonCompleted(l.id)).length;
    const total = mod.lessons.length;
    const item = el('li', { class: 'moduleListItem', role: 'button', tabindex: '0', onclick: () => navigate('module', { moduleId: mod.id }), onkeydown: (e) => { if (e.key === 'Enter') navigate('module', { moduleId: mod.id }); } }, [
      el('div', { class: 'moduleListItem__code' }, mod.code),
      el('div', { class: 'moduleListItem__body' }, [
        el('div', { class: 'moduleListItem__title' }, mod.title),
        el('div', { class: 'moduleListItem__blurb' }, mod.blurb),
      ]),
      el('div', { class: 'moduleListItem__meta' }, `${done} / ${total} lessons`),
      el('svg', { class: 'moduleListItem__arrow', width: 18, height: 18, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': 1.6, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, [
        Object.assign(document.createElementNS('http://www.w3.org/2000/svg', 'path'), { d: 'M9 6l6 6-6 6' }),
      ]),
    ]);
    list.appendChild(item);
  });
  if (modules.length === 0) {
    list.appendChild(el('li', { class: 'sectionHint', style: { textAlign: 'center', padding: '24px 0', listStyle: 'none' } }, 'No modules in this filter yet.'));
  }
}

function renderModuleView(moduleId) {
  $('.view--course').hidden = false;
  $('#courseIndex').hidden = true;
  $('#moduleView').hidden = false;
  const mod = COURSE.find(m => m.id === moduleId);
  if (!mod) { navigate('course'); return; }
  $('#moduleCode').textContent = mod.code;
  $('#moduleTitle').textContent = mod.title;
  $('#moduleBlurb').textContent = mod.blurb;
  const outcomes = $('#moduleOutcomes');
  outcomes.innerHTML = '';
  mod.outcomes.forEach(o => outcomes.appendChild(el('li', {}, o)));
  const list = $('#lessonList');
  list.innerHTML = '';
  mod.lessons.forEach((lesson, i) => {
    const done = isLessonCompleted(lesson.id);
    const status = done ? 'done' : 'current';
    const item = el('li', { class: 'lessonListItem', role: 'button', tabindex: '0', onclick: () => navigate('lesson', { moduleId: mod.id, lessonId: lesson.id }), onkeydown: (e) => { if (e.key === 'Enter') navigate('lesson', { moduleId: mod.id, lessonId: lesson.id }); } }, [
      el('div', { class: 'lessonListItem__index' }, lesson.id),
      el('div', { class: 'lessonListItem__body' }, [
        el('div', { class: 'lessonListItem__title' }, lesson.title),
        el('div', { class: 'lessonListItem__meta' }, `${lesson.minutes} min read`),
      ]),
      el('div', { class: `lessonListItem__status lessonListItem__status--${status}` }, done ? '✓ Done' : (i === 0 ? 'Start' : 'Up next')),
    ]);
    list.appendChild(item);
  });

  // Quiz CTA at the bottom
  const quiz = getQuiz(moduleId);
  if (quiz) {
    $('#moduleQuizCta').hidden = false;
    $('#moduleQuizCtaTitle').textContent = `Quiz · ${quiz.questions.length} questions`;
    $('#moduleQuizCtaSub').textContent = quiz.blurb;
  } else {
    $('#moduleQuizCta').hidden = true;
  }
}

// ---------- LESSON ----------
function renderLessonView(moduleId, lessonId) {
  $('.view--lesson').hidden = false;
  const mod = COURSE.find(m => m.id === moduleId);
  const lesson = mod?.lessons.find(l => l.id === lessonId);
  if (!mod || !lesson) { navigate('course'); return; }

  // Save as "last lesson" for the home continue card
  const progress = getProgress();
  progress.lastLesson = { moduleId: mod.id, lessonId: lesson.id };
  setProgress(progress);

  // Breadcrumb
  $('#lessonModuleLink').textContent = `${mod.code} ${mod.title}`;
  $('#lessonModuleLink').onclick = (e) => { e.preventDefault(); navigate('module', { moduleId: mod.id }); };
  $('#lessonCrumbTitle').textContent = lesson.title;
  $('#lessonCode').textContent = lesson.id;
  $('#lessonTitle').textContent = lesson.title;
  $('#lessonTime').innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg> ${lesson.minutes} min read`;
  const done = isLessonCompleted(lesson.id);
  const statusEl = $('#lessonStatus');
  statusEl.textContent = done ? '✓ Completed' : '○ Not started';
  statusEl.className = `lessonMeta__chip ${done ? 'lessonMeta__chip--done' : 'lessonMeta__chip--muted'}`;
  $('#lessonComplete').hidden = done;
  $('#lessonCompleted').hidden = !done;
  if (done) $('#lessonComplete').hidden = true, $('#lessonCompleted').hidden = false;

  // Body
  const body = $('#lessonBody');
  body.innerHTML = '';
  // Paragraphs
  const renderList = (items) => {
    const ul = el('ul', {});
    items.forEach(p => ul.appendChild(el('li', {}, p)));
    return ul;
  };
  if (lesson.body) lesson.body.forEach(p => body.appendChild(el('p', {}, p)));
  if (lesson.bullets) body.appendChild(renderList(lesson.bullets));
  if (lesson.bodyAfter) lesson.bodyAfter.forEach(p => body.appendChild(el('p', {}, p)));
  if (lesson.formula) {
    body.appendChild(el('div', { class: 'formulaCallout' }, [
      el('span', { class: 'formulaCallout__label' }, 'Formula'),
      lesson.formula,
    ]));
  }
  // Key takeaways
  if (lesson.keyTakeaways && lesson.keyTakeaways.length) {
    const box = el('div', { class: 'takeawaysCallout' }, [
      el('div', { class: 'takeawaysCallout__label' }, 'Key takeaways'),
      el('ul', { class: 'takeawaysCallout__list' },
        lesson.keyTakeaways.map(t => el('li', {}, t))
      ),
    ]);
    body.appendChild(box);
  }
  // Worked example
  if (lesson.workedExample) {
    const we = lesson.workedExample;
    body.appendChild(el('div', { class: 'exampleCallout' }, [
      el('div', { class: 'exampleCallout__label' }, we.title || 'Worked example'),
      we.scenario ? el('p', { class: 'exampleCallout__scenario' }, we.scenario) : null,
      we.steps ? el('ol', { class: 'exampleCallout__steps' }, we.steps.map(s => el('li', {}, s))) : null,
      we.answer ? el('div', { class: 'exampleCallout__answer' }, [
        el('span', { class: 'exampleCallout__answerLabel' }, 'Answer'),
        we.answer,
      ]) : null,
    ]));
  }
  // Common mistakes
  if (lesson.commonMistakes && lesson.commonMistakes.length) {
    const box = el('div', { class: 'mistakesCallout' }, [
      el('div', { class: 'mistakesCallout__label' }, 'Common mistakes to avoid'),
      el('ul', { class: 'mistakesCallout__list' },
        lesson.commonMistakes.map(m => el('li', {}, m))
      ),
    ]);
    body.appendChild(box);
  }
  // Diagram
  if (lesson.diagram) {
    const diag = getDiagram(lesson.diagram);
    if (diag.src) {
      const figure = el('figure', { class: 'diagramFrame' });
      const img = el('img', {
        class: 'diagramImg',
        src: diag.src,
        alt: diag.alt,
        loading: 'lazy',
        decoding: 'async',
      });
      figure.appendChild(img);
      if (diag.caption && diag.caption !== DEFAULT_CAPTION) {
        const cap = el('figcaption', { class: 'diagramFrame__caption' }, diag.caption);
        figure.appendChild(cap);
      }
      body.appendChild(figure);
    }
  }

  // Key terms
  if (lesson.keyTerms && lesson.keyTerms.length) {
    $('#keyTermsBox').hidden = false;
    const list = $('#keyTermsList');
    list.innerHTML = '';
    lesson.keyTerms.forEach(term => {
      const chip = el('button', { class: 'keyTerm', type: 'button', onclick: () => { navigate('glossary', { search: term }); } }, term);
      list.appendChild(chip);
    });
  } else {
    $('#keyTermsBox').hidden = true;
  }

  // Nav buttons
  const lessonIdx = mod.lessons.findIndex(l => l.id === lesson.id);
  const prev = lessonIdx > 0 ? mod.lessons[lessonIdx - 1] : null;
  const next = lessonIdx < mod.lessons.length - 1 ? mod.lessons[lessonIdx + 1] : null;
  const prevBtn = $('#lessonPrev');
  const nextBtn = $('#lessonNext');
  prevBtn.disabled = !prev;
  nextBtn.disabled = !next;
  prevBtn.onclick = () => prev && navigate('lesson', { moduleId: mod.id, lessonId: prev.id });
  nextBtn.onclick = () => next && navigate('lesson', { moduleId: mod.id, lessonId: next.id });

  // Mark complete
  $('#lessonComplete').onclick = () => {
    markLessonCompleted(lesson.id);
    renderLessonView(moduleId, lessonId);
  };
}

// ---------- GLOSSARY ----------
function renderGlossary() {
  $('.view--glossary').hidden = false;
  const list = $('#glossaryList');
  if (!list) return;
  const search = (currentRoute.params.search || $('#glossarySearch')?.value || '').trim().toLowerCase();
  if (search) {
    const searchEl = $('#glossarySearch');
    if (searchEl && searchEl.value !== search) searchEl.value = search;
  }
  list.innerHTML = '';
  const sorted = GLOSSARY_SORTED;
  const filtered = search
    ? sorted.filter(e => e.term.toLowerCase().includes(search) || e.definition.toLowerCase().includes(search))
    : sorted;
  filtered.forEach(entry => {
    const isHl = search && entry.term.toLowerCase().includes(search);
    const item = el('div', { class: 'glossaryItem' + (isHl ? ' glossaryItem--hl' : '') }, [
      el('div', { class: 'glossaryItem__term' }, entry.term),
      el('div', { class: 'glossaryItem__def' }, entry.definition),
    ]);
    list.appendChild(item);
  });
  if (filtered.length === 0) {
    list.appendChild(el('div', { class: 'sectionHint' }, 'No terms match.'));
  }
}

// ---------- ABOUT ----------
function renderAbout() {
  $('.view--about').hidden = false;
  const accessToggle = $('#toggleAccess');
  if (accessToggle) {
    accessToggle.checked = storageGet(ACCESSIBILITY_KEY) === '1';
    accessToggle.onchange = (e) => {
      storageSet(ACCESSIBILITY_KEY, e.target.checked ? '1' : '0');
      document.body.classList.toggle('accessibility-mode', e.target.checked);
    };
  }
  const shortcutsBtn = $('#btnOpenShortcuts');
  shortcutsBtn?.addEventListener('click', () => openShortcuts());
}

// ---------- SIMULATOR ----------
// Self-contained AD–AS simulation. We reimplement chart rendering here so we
// don't depend on app.js internals from the previous version.
const simState = {
  params: { ...defaults.params },
  history: [],
  historyIndex: -1,
  compare: { on: false, snapshot: null },
  showAxisNumbers: true,
  view: SRAS_VIEWS.KEYNESIAN,
};

const PARAM_DEFS = [
  { key: 'govSpending', label: 'Government spending (G)', hint: 'Higher G shifts AD right.', min: 0, max: 100, step: 1, format: v => `${v}` },
  { key: 'taxRate', label: 'Tax rate (T)', hint: 'Higher T shifts AD left.', min: 0, max: 50, step: 1, format: v => `${v}%` },
  { key: 'interestRate', label: 'Interest rate (i)', hint: 'Lower i shifts AD right.', min: 0, max: 10, step: 0.1, format: v => `${v.toFixed(1)}%` },
  { key: 'productionCosts', label: 'Production costs', hint: 'Higher costs shift AS left.', min: 0, max: 100, step: 1, format: v => `${v}` },
  { key: 'productivity', label: 'Productivity', hint: 'Shifts LRAS right/left.', min: 0, max: 100, step: 1, format: v => `${v}` },
  { key: 'supplySideReform', label: 'Supply-side reform intensity', hint: 'Captures tax/regulation/training bundles.', min: 0, max: 100, step: 1, format: v => `${v}` },
];

const PRESETS = {
  baseline: { govSpending: 50, taxRate: 25, interestRate: 3.5, productionCosts: 50, productivity: 50, supplySideReform: 50 },
  recession: { govSpending: 30, taxRate: 40, interestRate: 6, productionCosts: 50, productivity: 50, supplySideReform: 50 },
  demandPull: { govSpending: 80, taxRate: 10, interestRate: 1, productionCosts: 50, productivity: 50, supplySideReform: 50 },
  costPush: { govSpending: 50, taxRate: 25, interestRate: 3.5, productionCosts: 90, productivity: 40, supplySideReform: 30 },
  expFiscal: { govSpending: 80, taxRate: 10, interestRate: 3.5, productionCosts: 50, productivity: 50, supplySideReform: 50 },
  conFiscal: { govSpending: 20, taxRate: 40, interestRate: 3.5, productionCosts: 50, productivity: 50, supplySideReform: 50 },
  expMonetary: { govSpending: 50, taxRate: 25, interestRate: 1, productionCosts: 50, productivity: 50, supplySideReform: 50 },
  conMonetary: { govSpending: 50, taxRate: 25, interestRate: 8, productionCosts: 50, productivity: 50, supplySideReform: 50 },
  supplyReform: { govSpending: 50, taxRate: 25, interestRate: 3.5, productionCosts: 50, productivity: 50, supplySideReform: 90 },
  supplyInvest: { govSpending: 55, taxRate: 25, interestRate: 3.5, productionCosts: 40, productivity: 80, supplySideReform: 70 },
};

function applyPreset(presetKey) {
  const p = PRESETS[presetKey];
  if (!p) return;
  simState.params = { ...p };
  onParamsChanged(true);
  showStatus(`Loaded preset: ${presetKey}`, false, 1800);
}

function renderParametersPanel() {
  const root = $('#panelParameters');
  if (!root) return;
  root.innerHTML = '';
  PARAM_DEFS.forEach(d => {
    const wrap = el('div', { class: 'slider' });
    wrap.innerHTML = `
      <div class="slider__top">
        <div>
          <div class="slider__label">${escapeHtml(d.label)}</div>
          <div class="slider__hint">${escapeHtml(d.hint)}</div>
        </div>
        <div class="slider__value" id="val_${d.key}">—</div>
      </div>
      <input type="range" id="rng_${d.key}" min="${d.min}" max="${d.max}" step="${d.step}" />
    `;
    root.appendChild(wrap);
    const rng = wrap.querySelector(`#rng_${d.key}`);
    rng.value = simState.params[d.key];
    rng.oninput = () => {
      simState.params[d.key] = Number(rng.value);
      onParamsChanged(true);
    };
  });
  syncParamReadouts();
}

function syncParamReadouts() {
  PARAM_DEFS.forEach(d => {
    const val = $(`#val_${d.key}`);
    const rng = $(`#rng_${d.key}`);
    if (val) val.textContent = d.format(simState.params[d.key]);
    if (rng) rng.value = simState.params[d.key];
  });
}

function pushPolicyHistory() {
  const stamp = { ts: Date.now(), params: { ...simState.params } };
  simState.history = simState.history.slice(0, simState.historyIndex + 1);
  simState.history.push(stamp);
  simState.historyIndex = simState.history.length - 1;
  if (simState.history.length > 50) {
    simState.history = simState.history.slice(-50);
    simState.historyIndex = simState.history.length - 1;
  }
}

function replayHistory(dir) {
  if (!simState.history.length) return;
  simState.historyIndex = clamp(simState.historyIndex + dir, 0, simState.history.length - 1);
  simState.params = { ...simState.history[simState.historyIndex].params };
  syncParamReadouts();
  onParamsChanged(false);
}

function onParamsChanged(pushHistory) {
  if (pushHistory) pushPolicyHistory();
  syncParamReadouts();
  renderMainChart();
}

const CHART = { W: 860, H: 560, pad: { l: 86, r: 28, t: 20, b: 78 } };
const CHART_NS = 'http://www.w3.org/2000/svg';

function svgEl(tag, attrs = {}) {
  const e = document.createElementNS(CHART_NS, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  return e;
}

function clearSvg(svg) { while (svg.firstChild) svg.removeChild(svg.firstChild); }

function renderMainChart() {
  const svg = $('#chartSvg');
  if (!svg) return;
  clearSvg(svg);
  const { W, H, pad } = CHART;
  const x = (Y) => pad.l + ((Y - GRAPH.Ymin) / (GRAPH.Ymax - GRAPH.Ymin)) * (W - pad.l - pad.r);
  const y = (P) => pad.t + (1 - (P - GRAPH.Pmin) / (GRAPH.Pmax - GRAPH.Pmin)) * (H - pad.t - pad.b);

  const base = { ...computeFromParams(defaults.params), view: simState.view };
  const cur = computeFromParams(simState.params);

  // Box / background
  svg.appendChild(svgEl('rect', { x: 0, y: 0, width: W, height: H, fill: 'transparent' }));

  // Yf vertical
  svg.appendChild(svgEl('line', { x1: x(base.yFe), y1: pad.t, x2: x(base.yFe), y2: H - pad.b, stroke: 'var(--chart-lras)', 'stroke-width': 2, 'stroke-dasharray': '4 4' }));
  svg.appendChild(svgEl('text', { x: x(base.yFe) - 6, y: H - pad.b + 16, 'font-family': 'var(--font-sans)', 'font-size': 11, fill: 'var(--chart-lras)' })).textContent = 'Yf';

  // Axes
  svg.appendChild(svgEl('line', { x1: pad.l, y1: H - pad.b, x2: W - pad.r, y2: H - pad.b, stroke: 'var(--text-2)', 'stroke-width': 1.4 }));
  svg.appendChild(svgEl('line', { x1: pad.l, y1: pad.t, x2: pad.l, y2: H - pad.b, stroke: 'var(--text-2)', 'stroke-width': 1.4 }));

  // Axis labels
  const lblX = svgEl('text', { x: (pad.l + W - pad.r) / 2, y: H - pad.b + 38, 'text-anchor': 'middle', 'font-family': 'var(--font-sans)', 'font-size': 12, fill: 'var(--text-2)' });
  lblX.textContent = 'Real output (Y)';
  svg.appendChild(lblX);
  const lblY = svgEl('text', { x: 18, y: (pad.t + H - pad.b) / 2, 'text-anchor': 'middle', 'font-family': 'var(--font-sans)', 'font-size': 12, fill: 'var(--text-2)', transform: `rotate(-90 18 ${(pad.t + H - pad.b) / 2})` });
  lblY.textContent = 'Price level (P)';
  svg.appendChild(lblY);

  // Axis numbers
  if (simState.showAxisNumbers) {
    for (let Y = 60; Y <= 180; Y += 30) {
      const tx = svgEl('text', { x: x(Y), y: H - pad.b + 14, 'text-anchor': 'middle', 'font-family': 'var(--font-sans)', 'font-size': 10, fill: 'var(--muted)' });
      tx.textContent = Y;
      svg.appendChild(tx);
    }
    for (let P = 30; P <= 110; P += 20) {
      const ty = svgEl('text', { x: pad.l - 8, y: y(P) + 4, 'text-anchor': 'end', 'font-family': 'var(--font-sans)', 'font-size': 10, fill: 'var(--muted)' });
      ty.textContent = P;
      svg.appendChild(ty);
    }
  }

  // AD curve (current)
  const AD_seg = adLineSegment(cur.adShiftY).seg;
  if (AD_seg) {
    const d = `M ${x(AD_seg[0][0])} ${y(AD_seg[0][1])} L ${x(AD_seg[1][0])} ${y(AD_seg[1][1])}`;
    svg.appendChild(svgEl('path', { d, stroke: 'var(--chart-ad)', 'stroke-width': 3, fill: 'none' }));
    const lbl = svgEl('text', { x: x(AD_seg[1][0]) - 6, y: y(AD_seg[1][1]) - 6, 'text-anchor': 'end', 'font-family': 'var(--font-sans)', 'font-size': 12, 'font-weight': 700, fill: 'var(--chart-ad)' });
    lbl.textContent = 'AD';
    svg.appendChild(lbl);
  }

  // SRAS (current) — draw the full curve as a smooth polyline. In the
  // Keynesian view this is the textbook three-region shape (flat at low Y,
  // rising in the middle, vertical near Yf). In the Monetarist view it is
  // a single vertical line at Yf.
  const sras = asPolyline({ asShiftP: cur.asShiftP, yFe: cur.yFe, view: simState.view });
  if (sras && sras.pts && sras.pts.length >= 2) {
    const d = 'M ' + sras.pts.map(([Y, P]) => `${x(Y)} ${y(P)}`).join(' L ');
    svg.appendChild(svgEl('path', { d, stroke: 'var(--chart-as)', 'stroke-width': 3, fill: 'none', 'stroke-linejoin': 'round', 'stroke-linecap': 'round' }));
    // Place the SRAS label near the upper portion of the curve, but on the
    // left side so it doesn't collide with the AD label.
    const labelPoint = simState.view === SRAS_VIEWS.MONETARIST
      ? [sras.yFe, sras.pFlat + (sras.pEnd - sras.pFlat) * 0.15]
      : [sras.yKink + 4, sras.pFlat - 4];
    const lbl = svgEl('text', { x: x(labelPoint[0]) + 6, y: y(labelPoint[1]) - 4, 'font-family': 'var(--font-sans)', 'font-size': 12, 'font-weight': 700, fill: 'var(--chart-as)' });
    lbl.textContent = 'SRAS';
    svg.appendChild(lbl);
  }

  // Equilibrium
  const eq = equilibrium({ ...cur, view: simState.view });
  svg.appendChild(svgEl('circle', { cx: x(eq.y), cy: y(eq.p), r: 5, fill: 'var(--text)' }));
  const dP = svgEl('line', { x1: x(eq.y), y1: y(eq.p), x2: x(eq.y), y2: H - pad.b, stroke: 'var(--text)', 'stroke-width': 1, 'stroke-dasharray': '3 3', opacity: 0.5 });
  svg.appendChild(dP);
  svg.appendChild(svgEl('line', { x1: pad.l, y1: y(eq.p), x2: x(eq.y), y2: y(eq.p), stroke: 'var(--text)', 'stroke-width': 1, 'stroke-dasharray': '3 3', opacity: 0.5 }));

  // Update stat boxes
  const num = (v) => Number(v).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  $('#statOutputValue').textContent = `Y ${num(eq.y)}`;
  $('#statPriceValue').textContent = `P ${num(eq.p)}`;
  $('#statPotentialValue').textContent = `Yf ${num(cur.yFe)}`;
  // Baseline equilibrium must use the SAME view as the current state, otherwise
  // deltas are apples-to-oranges (e.g. monetarist Y is always Yf, so a
  // Keynesian baseline would always show a misleading gap).
  const baseEq = equilibrium({ ...base, view: simState.view });
  const dY = eq.y - baseEq.y; const dP2 = eq.p - baseEq.p; const dYf = cur.yFe - base.yFe;
  $('#statOutputDelta').textContent = `Δ ${dY > 0 ? '+' : ''}${num(dY)}`;
  $('#statPriceDelta').textContent = `Δ ${dP2 > 0 ? '+' : ''}${num(dP2)}`;
  $('#statPotentialDelta').textContent = `Δ ${dYf > 0 ? '+' : ''}${num(dYf)}`;

  // State label
  const gap = eq.y - cur.yFe;
  const gapPct = (gap / cur.yFe) * 100;
  // Price level deviation: how far above or below baseline (P=80 at defaults)
  const dPStat = eq.p - baseEq.p;
  const sl = $('#gapLabel');
  if (sl) {
    if (simState.view === SRAS_VIEWS.MONETARIST) {
      sl.textContent = 'Monetarist: output pinned at Yf, prices absorb shocks';
      sl.dataset.state = 'monetarist';
    } else if (gap < -2) {
      sl.textContent = `Recessionary gap: ${Math.abs(gapPct).toFixed(1)}% below potential`;
      sl.dataset.state = 'recessionary';
    } else if (gap > 2) {
      sl.textContent = `Inflationary gap: ${gapPct.toFixed(1)}% above potential`;
      sl.dataset.state = 'inflationary';
    } else if (dPStat > 3) {
      // Y is at Yf (no output gap) but prices are pushed up — latent inflationary pressure
      sl.textContent = `Above potential: prices ${dPStat > 0 ? '+' : ''}${dPStat.toFixed(1)} above baseline, Y at Yf`;
      sl.dataset.state = 'inflationary-latent';
    } else if (dPStat < -3) {
      sl.textContent = `Below potential: prices ${dPStat.toFixed(1)} below baseline, Y at Yf`;
      sl.dataset.state = 'deflationary-latent';
    } else {
      sl.textContent = 'Near full-employment equilibrium';
      sl.dataset.state = '';
    }
  }

  // Chip row
  const chips = $('#changeChips');
  if (chips) {
    chips.innerHTML = '';
    const mk = (txt) => { const c = el('span', { class: 'chip' }, txt); chips.appendChild(c); };
    if (Math.abs(dY) > 0.05) mk(`Output ${dY > 0 ? '↑' : '↓'} ${Math.abs(dY).toFixed(1)}`);
    if (Math.abs(dP2) > 0.05) mk(`Prices ${dP2 > 0 ? '↑' : '↓'} ${Math.abs(dP2).toFixed(1)}`);
    if (Math.abs(dYf) > 0.05) mk(`Yf ${dYf > 0 ? '↑' : '↓'} ${Math.abs(dYf).toFixed(1)}`);
  }
}

function exportChartPng() {
  const svg = $('#chartSvg');
  if (!svg) return;
  const clone = svg.cloneNode(true);
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  clone.setAttribute('width', String(860));
  clone.setAttribute('height', String(560));
  const bg = svgEl('rect', { x: 0, y: 0, width: 860, height: 560, fill: getComputedStyle(document.body).getPropertyValue('--surface') || '#fff' });
  clone.insertBefore(bg, clone.firstChild);
  const markup = new XMLSerializer().serializeToString(clone);
  const blob = new Blob([markup], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const img = new Image();
  img.onload = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 860; canvas.height = 560;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = getComputedStyle(document.body).getPropertyValue('--surface') || '#fff';
    ctx.fillRect(0, 0, 860, 560);
    ctx.drawImage(img, 0, 0);
    canvas.toBlob((b) => {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(b);
      a.download = 'macrow-chart.png';
      a.click();
      showStatus('PNG downloaded', false, 1500);
    }, 'image/png');
    URL.revokeObjectURL(url);
  };
  img.onerror = () => showStatus('Failed to export PNG', true, 2000);
  img.src = url;
}

function exportChartSvg() {
  const svg = $('#chartSvg');
  if (!svg) return;
  const clone = svg.cloneNode(true);
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  const markup = new XMLSerializer().serializeToString(clone);
  const blob = new Blob([markup], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'macrow-chart.svg';
  a.click();
  URL.revokeObjectURL(url);
  showStatus('SVG downloaded', false, 1500);
}

// Scenario management
function getScenarioForShare() {
  return { v: 1, params: simState.params };
}

function openSharePanel() {
  $('#sharePanel')?.classList.remove('hidden');
  refreshShareLinkPreview();
}
function closeSharePanel() { $('#sharePanel')?.classList.add('hidden'); }
function refreshShareLinkPreview() {
  const el = $('#shareLinkPreview');
  if (!el) return;
  const url = buildScenarioUrl(getScenarioForShare());
  el.textContent = url;
  el.classList.remove('hidden');
}
async function copyScenarioShareLink() {
  const link = buildScenarioUrl(getScenarioForShare());
  try {
    await navigator.clipboard.writeText(link);
    showStatus('Scenario link copied', false, 1800);
  } catch {
    prompt('Copy scenario URL:', link);
  }
  refreshShareLinkPreview();
}

function showStatus(text, isError = false, ms = 2000) {
  const s = $('#appStatus');
  if (!s) return;
  s.textContent = text;
  s.dataset.type = isError ? 'error' : '';
  s.classList.remove('hidden');
  clearTimeout(showStatus._t);
  showStatus._t = setTimeout(() => s.classList.add('hidden'), ms);
}

function initSimulator() {
  // Sliders
  renderParametersPanel();
  // Quick scenarios
  $('#btnMakeRecession')?.addEventListener('click', () => applyPreset('recession'));
  $('#btnMakeDemandPull')?.addEventListener('click', () => applyPreset('demandPull'));
  $('#btnMakeCostPush')?.addEventListener('click', () => applyPreset('costPush'));
  $('#btnClearGap')?.addEventListener('click', () => applyPreset('baseline'));
  // Reset
  $('#btnReset')?.addEventListener('click', () => applyPreset('baseline'));
  // Presets
  $$('.presetBtn').forEach(b => b.addEventListener('click', () => applyPreset(b.dataset.preset)));
  // Chart controls
  $('#toggleAxisNumbers')?.addEventListener('change', (e) => { simState.showAxisNumbers = e.target.checked; renderMainChart(); });
  $('#btnExportPng')?.addEventListener('click', exportChartPng);
  $('#btnExportSvg')?.addEventListener('click', exportChartSvg);

  // SRAS view toggle (Keynesian vs Monetarist)
  const viewBtns = $$('.viewToggle__btn');
  const updateViewLabel = () => {
    const lbl = $('#viewLabel');
    if (lbl) lbl.textContent = simState.view === SRAS_VIEWS.MONETARIST ? 'Monetarist view' : 'Keynesian view';
    viewBtns.forEach(b => b.classList.toggle('is-active', b.dataset.view === simState.view));
  };
  viewBtns.forEach(b => b.addEventListener('click', () => {
    simState.view = b.dataset.view === SRAS_VIEWS.MONETARIST ? SRAS_VIEWS.MONETARIST : SRAS_VIEWS.KEYNESIAN;
    updateViewLabel();
    pushPolicyHistory();
    renderMainChart();
  }));
  updateViewLabel();
  // Share
  $('#btnOpenSharePanel')?.addEventListener('click', openSharePanel);
  $('#btnCloseSharePanel')?.addEventListener('click', closeSharePanel);
  $('#btnShareLinkPanel')?.addEventListener('click', copyScenarioShareLink);
  // Scenarios
  $('#btnScenarios')?.addEventListener('click', () => $('#scenarioOverlay')?.classList.remove('hidden'));
  $('#scenarioClose')?.addEventListener('click', () => $('#scenarioOverlay')?.classList.add('hidden'));
  $('#btnSaveScenario')?.addEventListener('click', saveScenario);
  $('#btnExportJson')?.addEventListener('click', exportScenariosJson);
  $('#btnShareScenario')?.addEventListener('click', () => copyScenarioShareLink());
  $('#scenarioImportFile')?.addEventListener('change', importScenariosJson);
  renderScenarioList();

  // Apply scenario from URL
  applyScenarioFromUrl();
  onParamsChanged(true);
}

function applyScenarioFromUrl() {
  const payload = parseScenarioPayloadFromUrl(location.href);
  if (payload?.params) {
    simState.params = { ...simState.params, ...payload.params };
  }
}

function saveScenario() {
  const name = $('#scenarioName')?.value?.trim();
  if (!name) { showStatus('Give the scenario a name first.', true, 2000); return; }
  const list = getScenarios();
  const entry = { id: 'sc_' + Date.now(), name, params: { ...simState.params }, createdAt: Date.now() };
  list.push(entry);
  setScenarios(list);
  renderScenarioList();
  showStatus(`Saved "${name}"`, false, 1500);
  $('#scenarioName').value = '';
}

function renderScenarioList() {
  const root = $('#scenarioListRoot');
  if (!root) return;
  const list = getScenarios();
  root.innerHTML = '';
  if (list.length === 0) {
    root.appendChild(el('div', { class: 'sectionHint' }, 'No saved scenarios yet. Save the current state to start a collection.'));
    return;
  }
  list.slice().reverse().forEach(sc => {
    const card = el('div', { class: 'lessonListItem', style: { marginBottom: '6px' } }, [
      el('div', { class: 'lessonListItem__body' }, [
        el('div', { class: 'lessonListItem__title' }, sc.name),
        el('div', { class: 'lessonListItem__meta' }, new Date(sc.createdAt).toLocaleString()),
      ]),
      el('div', { class: 'lessonListItem__meta' }, [
        el('button', { class: 'btn btn--mini', onclick: () => loadScenario(sc.id) }, 'Load'),
        el('button', { class: 'btn btn--ghost btn--mini', style: { marginLeft: '6px' }, onclick: () => deleteScenario(sc.id) }, 'Delete'),
      ]),
    ]);
    root.appendChild(card);
  });
}

function loadScenario(id) {
  const list = getScenarios();
  const sc = list.find(s => s.id === id);
  if (!sc) return;
  simState.params = { ...sc.params };
  onParamsChanged(true);
  $('#scenarioOverlay')?.classList.add('hidden');
  showStatus(`Loaded "${sc.name}"`, false, 1500);
}
function deleteScenario(id) {
  setScenarios(getScenarios().filter(s => s.id !== id));
  renderScenarioList();
}
function exportScenariosJson() {
  const blob = new Blob([JSON.stringify(getScenarios(), null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'macrow-scenarios.json';
  a.click();
  showStatus('Scenarios exported', false, 1500);
}
function importScenariosJson(e) {
  const file = e.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);
      if (!Array.isArray(data)) throw new Error('Invalid format');
      setScenarios([...getScenarios(), ...data]);
      renderScenarioList();
      showStatus(`Imported ${data.length} scenarios`, false, 1500);
    } catch (err) {
      showStatus('Import failed: invalid JSON', true, 2000);
    }
  };
  reader.readAsText(file);
}

function renderSimulator() {
  $('.view--simulator').hidden = false;
  // ensure sim wiring exists once
  if (!renderSimulator._wired) {
    initSimulator();
    renderSimulator._wired = true;
  }
}

// ---------- MODULE QUIZ ----------
// Quiz state lives in a module-level object so a learner can navigate away
// and come back without losing progress.
const quizState = {
  moduleId: null,
  quiz: null,
  // Per-question state: { [qid]: { selected: 'a', submitted: true, correct: true } }
  answers: {},
  startedAt: null,
};

function resetQuizState(moduleId) {
  const quiz = getQuiz(moduleId);
  if (!quiz) return;
  quizState.moduleId = moduleId;
  quizState.quiz = quiz;
  quizState.answers = {};
  quizState.startedAt = Date.now();
}

function renderQuizModal() {
  const overlay = $('#moduleQuizOverlay');
  if (!overlay) return;
  const quiz = quizState.quiz;
  if (!quiz) { overlay.classList.add('hidden'); return; }

  // Update header
  $('#moduleQuizEyebrow').textContent = `Module ${quiz.moduleId} quiz`;
  $('#moduleQuizTitle').textContent = quiz.title;

  const body = $('#moduleQuizBody');
  body.innerHTML = '';

  // Progress
  const answered = Object.keys(quizState.answers).filter(k => quizState.answers[k]?.submitted).length;
  const total = quiz.questions.length;
  const intro = el('div', { class: 'quizIntro' }, [
    el('p', {}, `Answer all ${total} questions. Short answers are self-marked — check yours against the model answer before continuing.`),
    el('div', { class: 'quizProgress' }, [
      el('div', { class: 'quizProgress__label' }, `Progress: ${answered} / ${total}`),
      el('div', { class: 'quizProgress__bar' }, [
        el('div', { class: 'quizProgress__fill', style: { width: `${(answered / total) * 100}%` } }),
      ]),
    ]),
  ]);
  body.appendChild(intro);

  quiz.questions.forEach((q, qi) => {
    const ans = quizState.answers[q.id] || {};
    const card = el('div', { class: 'quizCard' + (ans.submitted ? (ans.correct ? ' quizCard--correct' : ' quizCard--wrong') : '') }, [
      el('div', { class: 'quizCard__q' }, [
        el('span', { class: 'quizCard__num' }, `${qi + 1}.`),
        el('span', {}, q.prompt),
      ]),
    ]);
    // Render input by type
    if (q.type === 'mc' || q.type === 'tf') {
      const list = el('div', { class: 'quizOptions' });
      q.options.forEach(opt => {
        const selected = ans.selected === opt.id;
        const btn = el('button', {
          class: 'quizOption' + (selected ? ' is-selected' : '') + (ans.submitted ? (opt.id === q.correct ? ' quizOption--correct' : (opt.id === ans.selected ? ' quizOption--wrong' : '')) : ''),
          type: 'button',
          disabled: ans.submitted ? true : false,
          onclick: () => {
            quizState.answers[q.id] = { ...(quizState.answers[q.id] || {}), selected: opt.id };
            renderQuizModal();
          },
        }, [
          el('span', { class: 'quizOption__mark' }, ans.submitted ? (opt.id === q.correct ? '✓' : (opt.id === ans.selected ? '✕' : '')) : (selected ? '●' : '')),
          el('span', {}, opt.text),
        ]);
        list.appendChild(btn);
      });
      card.appendChild(list);
    } else if (q.type === 'short') {
      const ta = el('textarea', {
        class: 'quizShortInput',
        rows: 2,
        placeholder: 'Type your answer here…',
        oninput: (e) => { quizState.answers[q.id] = { ...(quizState.answers[q.id] || {}), text: e.target.value }; },
      });
      if (ans.text) ta.value = ans.text;
      card.appendChild(ta);
    }
    // Submit / submitted status
    const actions = el('div', { class: 'quizCard__actions' });
    if (!ans.submitted) {
      const btn = el('button', { class: 'btn btn--primary btn--mini', type: 'button', onclick: () => {
        if (q.type === 'short' && !(quizState.answers[q.id]?.text || '').trim()) return;
        if (q.type !== 'short' && !quizState.answers[q.id]?.selected) return;
        const correct = checkQuizAnswer(q, quizState.answers[q.id]);
        quizState.answers[q.id] = { ...(quizState.answers[q.id] || {}), submitted: true, correct };
        renderQuizModal();
      } }, 'Check answer');
      actions.appendChild(btn);
    } else {
      if (q.type !== 'short') {
        const verdict = ans.correct ? 'Correct' : 'Not quite — see below';
        actions.appendChild(el('span', { class: 'quizCard__verdict' + (ans.correct ? ' quizCard__verdict--ok' : ' quizCard__verdict--bad') }, verdict));
      } else {
        // For short, show the model answer and a "Got it / Try again" pair
        const ok = el('button', { class: 'btn btn--ghost btn--mini', type: 'button', onclick: () => {
          quizState.answers[q.id] = { ...(quizState.answers[q.id] || {}), submitted: true, correct: true };
          renderQuizModal();
        } }, 'I got it');
        const miss = el('button', { class: 'btn btn--ghost btn--mini', type: 'button', style: { marginLeft: '6px' }, onclick: () => {
          quizState.answers[q.id] = { ...(quizState.answers[q.id] || {}), submitted: true, correct: false };
          renderQuizModal();
        } }, 'Didn\u2019t get it');
        actions.appendChild(ok);
        actions.appendChild(miss);
      }
    }
    card.appendChild(actions);
    // Explain / model answer (only after submit)
    if (ans.submitted) {
      const ex = el('div', { class: 'quizCard__explain' }, [
        el('div', { class: 'quizCard__explainLabel' }, q.type === 'short' ? 'Model answer' : 'Explanation'),
        el('p', {}, q.explain),
        q.type === 'short' ? el('p', { class: 'quizCard__model' }, `Acceptable answers: ${q.accepted.map(a => `\u201C${a}\u201D`).join(', ')}.`) : null,
      ]);
      card.appendChild(ex);
    }
    body.appendChild(card);
  });

  // Score summary + retry
  const autoScored = quiz.questions.filter(q => q.type !== 'short');
  const autoCorrect = autoScored.filter(q => quizState.answers[q.id]?.correct).length;
  const shortScored = quiz.questions.filter(q => q.type === 'short' && quizState.answers[q.id]?.submitted);
  const shortCorrect = shortScored.filter(q => quizState.answers[q.id]?.correct).length;
  const allDone = quiz.questions.every(q => quizState.answers[q.id]?.submitted);

  const footer = el('div', { class: 'quizFooter' });
  const score = el('div', { class: 'quizFooter__score' });
  if (allDone) {
    score.appendChild(el('div', { class: 'quizFooter__scoreNum' }, `${autoCorrect}/${autoScored.length}`));
    score.appendChild(el('div', { class: 'quizFooter__scoreLabel' }, 'auto-graded correct'));
    if (shortScored.length) {
      score.appendChild(el('div', { class: 'quizFooter__scoreSub' }, `+ ${shortCorrect}/${shortScored.length} short answers you marked as got-it`));
    }
  } else {
    score.appendChild(el('div', { class: 'quizFooter__scoreLabel' }, `Answered: ${answered} / ${total}`));
  }
  footer.appendChild(score);
  const btns = el('div', { class: 'quizFooter__actions' });
  if (allDone) {
    const retry = el('button', { class: 'btn btn--ghost', type: 'button', onclick: () => { resetQuizState(quizState.moduleId); renderQuizModal(); } }, 'Retry');
    const close = el('button', { class: 'btn btn--primary', type: 'button', onclick: () => closeQuizModal() }, 'Close');
    btns.appendChild(retry);
    btns.appendChild(close);
  } else {
    btns.appendChild(el('button', { class: 'btn btn--ghost', type: 'button', onclick: () => closeQuizModal() }, 'Close'));
  }
  footer.appendChild(btns);
  body.appendChild(footer);
}

function openQuizModal(moduleId) {
  resetQuizState(moduleId);
  const overlay = $('#moduleQuizOverlay');
  if (!overlay) return;
  overlay.classList.remove('hidden');
  overlay.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
  renderQuizModal();
}

function closeQuizModal() {
  const overlay = $('#moduleQuizOverlay');
  if (!overlay) return;
  overlay.classList.add('hidden');
  overlay.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
}

function checkQuizAnswer(q, ans) {
  if (q.type === 'mc' || q.type === 'tf') return ans.selected === q.correct;
  if (q.type === 'short') {
    const text = (ans.text || '').trim().toLowerCase();
    return q.accepted.some(a => a.toLowerCase() === text);
  }
  return false;
}

// ---------- ACTIVE RECALL ----------
// Map of deck id -> human title (for filename / download headers).
const RECALL_DECK_TITLES = (() => {
  const m = { all: 'Every unit' };
  COURSE.forEach(cmod => { m[cmod.id] = `${cmod.code} ${cmod.title}`; });
  m['cross-cutting'] = 'Cross-cutting';
  return m;
})();

function recallCardsFor(deckId) {
  const groups = glossaryByTopic();
  if (deckId === 'all' || !deckId) {
    return COURSE.flatMap(cmod => groups[cmod.id] || []);
  }
  return groups[deckId] || [];
}

function recallFilename(deckId, ext) {
  const slug = (RECALL_DECK_TITLES[deckId] || deckId)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
  return `macrow-${slug}.${ext}`;
}

// Quote a single CSV field per RFC 4180: wrap in double quotes if it
// contains comma, double-quote, or newline; escape inner double-quotes by
// doubling them.
function csvField(v) {
  const s = String(v == null ? '' : v);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function recallToCsv(cards) {
  const lines = ['term,definition,topic'];
  cards.forEach(c => lines.push([csvField(c.term), csvField(c.definition), csvField(c.topic)].join(',')));
  return lines.join('\n') + '\n';
}

function recallToTsv(cards) {
  // Anki's preferred import format: tab-separated, no header.
  const sanitize = (s) => String(s == null ? '' : s).replace(/[\t\r\n]+/g, ' ').trim();
  return cards.map(c => `${sanitize(c.term)}\t${sanitize(c.definition)}`).join('\n') + '\n';
}

function recallToJson(cards) {
  return JSON.stringify({
    deck: currentRoute.params.deck || 'all',
    generatedAt: new Date().toISOString(),
    source: 'macrow.app',
    cards: cards.map(c => ({ term: c.term, definition: c.definition, topic: c.topic })),
  }, null, 2) + '\n';
}

function recallToMarkdown(cards) {
  const lines = [`# macrow flashcards — ${RECALL_DECK_TITLES[currentRoute.params.deck || 'all'] || 'Deck'}`, ''];
  cards.forEach((c, i) => {
    lines.push(`## ${i + 1}. ${c.term}`, '', c.definition, '', `*Topic: ${topicTitle(c.topic)}*`, '', '---', '');
  });
  return lines.join('\n');
}

function downloadFile(filename, content, mime) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 100);
  showStatus(`Downloaded ${filename}`);
}

function copyToClipboard(text) {
  if (navigator.clipboard && window.isSecureContext) {
    return navigator.clipboard.writeText(text);
  }
  // Fallback: textarea + execCommand
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.position = 'fixed';
  ta.style.opacity = '0';
  document.body.appendChild(ta);
  ta.select();
  try { document.execCommand('copy'); } finally { ta.remove(); }
  return Promise.resolve();
}

function renderRecall() {
  $('.view--recall').hidden = false;
  const groups = glossaryByTopic();
  const topicIds = COURSE.map(m => m.id);
  const allKey = 'all';
  const allCards = topicIds.flatMap(t => groups[t] || []);
  const selected = currentRoute.params.deck || allKey;
  // Sidebar list of decks
  const list = $('#recallDeckList');
  if (!list) return;
  list.innerHTML = '';
  const items = [{ topic: allKey, label: 'Every unit', count: allCards.length }];
  topicIds.forEach(t => {
    items.push({ topic: t, label: topicTitle(t), count: (groups[t] || []).length });
  });
  items.forEach(({ topic, label, count }) => {
    const li = el('li', {
      class: 'recallDeckList__item' + (selected === topic ? ' is-active' : ''),
      role: 'button',
      tabindex: '0',
      'aria-current': selected === topic ? 'true' : 'false',
      onclick: () => navigate('recall', { deck: topic }),
      onkeydown: (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate('recall', { deck: topic }); } },
    }, [
      el('div', { class: 'recallDeckList__code' }, topic === allKey ? 'ALL' : topic),
      el('div', { class: 'recallDeckList__body' }, [
        el('div', { class: 'recallDeckList__title' }, label),
        el('div', { class: 'recallDeckList__meta' }, `${count} card${count === 1 ? '' : 's'}`),
      ]),
    ]);
    list.appendChild(li);
  });

  // Selected deck cards
  const cards = selected === allKey ? allCards : (groups[selected] || []);
  const eyebrow = selected === allKey ? 'Every unit' : topicTitle(selected);
  const meta = selected === allKey
    ? `${cards.length} cards across ${topicIds.length} units`
    : `${cards.length} cards`;
  $('#recallDeckEyebrow').textContent = eyebrow;
  $('#recallDeckTitle').textContent = selected === allKey ? 'Every term, every unit' : eyebrow;
  $('#recallDeckMeta').textContent = meta;
  $('#recallPreviewCount').textContent = `${cards.length} card${cards.length === 1 ? '' : 's'}`;

  // Preview
  const preview = $('#recallPreview');
  preview.innerHTML = '';
  const showN = Math.min(cards.length, 8);
  for (let i = 0; i < showN; i++) {
    const c = cards[i];
    const li = el('li', { class: 'recallPreview__item' }, [
      el('div', { class: 'recallPreview__face recallPreview__face--front' }, [
        el('span', { class: 'recallPreview__tag' }, c.topic),
        el('span', { class: 'recallPreview__term' }, c.term),
      ]),
      el('div', { class: 'recallPreview__face recallPreview__face--back' }, c.definition),
    ]);
    preview.appendChild(li);
  }
  if (cards.length > showN) {
    const more = el('li', { class: 'recallPreview__more' }, `+ ${cards.length - showN} more card${cards.length - showN === 1 ? '' : 's'} — download to see all.`);
    preview.appendChild(more);
  }
  if (cards.length === 0) {
    preview.appendChild(el('li', { class: 'recallPreview__empty' }, 'No cards in this deck yet.'));
  }

  // Enable / disable download buttons based on whether we have cards
  const haveCards = cards.length > 0;
  ['#recallDownloadCsv', '#recallDownloadTsv', '#recallDownloadJson', '#recallCopyMarkdown', '#recallOpenQuizlet'].forEach(sel => {
    const btn = $(sel);
    if (btn) {
      btn.disabled = !haveCards;
      btn.dataset.deck = selected;
    }
  });
}

// ---------- Shortcuts overlay ----------
const SHORTCUTS = [
  { keys: ['g', 'h'], desc: 'Go to Home' },
  { keys: ['g', 'c'], desc: 'Open Course' },
  { keys: ['g', 's'], desc: 'Open Simulator' },
  { keys: ['g', 'g'], desc: 'Open Glossary' },
  { keys: ['?'], desc: 'Show all shortcuts' },
  { keys: ['Esc'], desc: 'Close overlays' },
];
function openShortcuts() {
  const ov = $('#shortcutsOverlay');
  if (!ov) return;
  const list = $('#shortcutsList');
  list.innerHTML = '';
  SHORTCUTS.forEach(s => {
    const row = el('div', { class: 'lessonListItem', style: { marginBottom: '4px' } }, [
      el('div', { class: 'lessonListItem__body' }, s.desc),
      el('div', { class: 'lessonListItem__meta' },
        s.keys.map((k, i) => el('span', {}, (i ? ' then ' : '') + k))
      ),
    ]);
    list.appendChild(row);
  });
  ov.classList.remove('hidden');
  ov.setAttribute('aria-hidden', 'false');
}
function closeShortcuts() {
  const ov = $('#shortcutsOverlay');
  if (!ov) return;
  ov.classList.add('hidden');
  ov.setAttribute('aria-hidden', 'true');
}

// ---------- Event wiring ----------
function wireGlobalEvents() {
  // Sidebar nav
  $$('.navBtn[data-nav]').forEach(b => {
    b.addEventListener('click', () => navigate(b.dataset.nav));
  });
  // Brand click goes home
  $('.brand')?.addEventListener('click', (e) => { e.preventDefault(); navigate('home'); });
  // Back buttons / course navigation
  $$('[data-action="back-to-course"]').forEach(b => b.addEventListener('click', () => navigate('course')));
  $$('[data-action="back-to-module"]').forEach(b => b.addEventListener('click', () => {
    if (currentRoute.params.moduleId) navigate('module', { moduleId: currentRoute.params.moduleId });
  }));
  // Continue / start buttons
  $$('[data-action="resume"]').forEach(b => b.addEventListener('click', () => {
    const last = getProgress().lastLesson;
    if (last) navigate('lesson', last);
    else navigate('course');
  }));
  $$('[data-action="start-course"]').forEach(b => b.addEventListener('click', () => navigate('module', { moduleId: COURSE[0].id })));
  // Course filter
  $$('input[name="courseFilter"]').forEach(r => r.addEventListener('change', (e) => {
    currentCourseFilter = e.target.value;
    renderCourseIndex();
  }));
  // Glossary search
  const s = $('#glossarySearch');
  if (s) s.addEventListener('input', (e) => { currentRoute.params.search = e.target.value; renderGlossary(); });
  // Shortcuts
  $('#shortcutsClose')?.addEventListener('click', closeShortcuts);
  $('#btnOpenShortcuts')?.addEventListener('click', openShortcuts);

  // Active Recall: download buttons
  $('#btnStartModuleQuiz')?.addEventListener('click', () => {
    if (currentRoute.params.moduleId) openQuizModal(currentRoute.params.moduleId);
  });
  $('#moduleQuizClose')?.addEventListener('click', closeQuizModal);
  $('#moduleQuizOverlay')?.addEventListener('click', (e) => {
    if (e.target.id === 'moduleQuizOverlay') closeQuizModal();
  });

  $('#recallDownloadCsv')?.addEventListener('click', () => {
    const deck = $('#recallDownloadCsv').dataset.deck || 'all';
    downloadFile(recallFilename(deck, 'csv'), recallToCsv(recallCardsFor(deck)), 'text/csv;charset=utf-8');
  });
  $('#recallDownloadTsv')?.addEventListener('click', () => {
    const deck = $('#recallDownloadTsv').dataset.deck || 'all';
    downloadFile(recallFilename(deck, 'tsv'), recallToTsv(recallCardsFor(deck)), 'text/tab-separated-values;charset=utf-8');
  });
  $('#recallDownloadJson')?.addEventListener('click', () => {
    const deck = $('#recallDownloadJson').dataset.deck || 'all';
    downloadFile(recallFilename(deck, 'json'), recallToJson(recallCardsFor(deck)), 'application/json');
  });
  $('#recallCopyMarkdown')?.addEventListener('click', async () => {
    const deck = $('#recallCopyMarkdown').dataset.deck || 'all';
    try {
      await copyToClipboard(recallToMarkdown(recallCardsFor(deck)));
      showStatus('Markdown copied to clipboard');
    } catch (e) {
      showStatus('Could not copy — see console for details', true);
      console.error(e);
    }
  });
  $('#recallOpenQuizlet')?.addEventListener('click', () => {
    const deck = $('#recallOpenQuizlet').dataset.deck || 'all';
    const title = RECALL_DECK_TITLES[deck] || deck;
    showStatus(`Quizlet import for "${title}" — coming soon. We are wiring up deep links so you can drop this deck into a Quizlet folder in one click.`, false, 4000);
  });
  // Keyboard
  let pendingG = false;
  document.addEventListener('keydown', (e) => {
    if (e.target.matches('input, textarea, select')) return;
    if (e.key === 'Escape') {
      // Quiz overlay first
      if ($('#moduleQuizOverlay') && !$('#moduleQuizOverlay').classList.contains('hidden')) {
        closeQuizModal();
        return;
      }
      const overlay = $('.overlay:not(.hidden)');
      if (overlay) {
        const closeBtn = overlay.querySelector('.iconBtn[aria-label*="Close" i]');
        closeBtn?.click();
        return;
      }
      if ($('.sidebar')?.classList.contains('sidebar--open')) {
        $('.sidebar')?.classList.remove('sidebar--open');
        $('.sidebarBackdrop')?.classList.remove('sidebarBackdrop--open');
        document.body.classList.remove('sidebar-open');
        $('#btnSidebarOpen')?.focus();
        return;
      }
    }
    if (e.key === '?') { openShortcuts(); return; }
    if (e.key === 'g' || e.key === 'G') { pendingG = true; setTimeout(() => pendingG = false, 600); return; }
    if (pendingG) {
      pendingG = false;
      if (e.key === 'h' || e.key === 'H') navigate('home');
      else if (e.key === 'c' || e.key === 'C') navigate('course');
      else if (e.key === 's' || e.key === 'S') navigate('simulator');
      else if (e.key === 'g' || e.key === 'G') navigate('glossary');
      else if (e.key === 'r' || e.key === 'R') navigate('recall');
    }
  });
}

// ---------- Init ----------
function init() {
  applyTheme(getPreferredTheme(), { persist: false });
  initThemeToggle();
  initSidebarToggle();
  wireGlobalEvents();

  // Restore last route
  let last = null;
  try { last = JSON.parse(storageGet(LAST_ROUTE_KEY) || 'null'); } catch (_e) {}
  if (last && (ROUTES.includes(last.name) || ['module', 'lesson'].includes(last.name))) {
    currentRoute = last;
  }

  // Apply scenario from URL (overrides default state)
  const payload = parseScenarioPayloadFromUrl(location.href);
  if (payload?.params) {
    simState.params = { ...simState.params, ...payload.params };
  }

  render();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
